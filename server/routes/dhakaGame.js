const router = require('express').Router();
const { pool, query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const MISSIONS = Object.freeze({
  explore: { reward: 500, minimumSeconds: 20 },
  taxi: { reward: 850, minimumSeconds: 25 },
  delivery: { reward: 700, minimumSeconds: 25 },
  race: { reward: 1200, minimumSeconds: 30 },
  rickshaw: { reward: 600, minimumSeconds: 20 },
  bus: { reward: 1000, minimumSeconds: 30 },
  collection: { reward: 450, minimumSeconds: 15 },
});

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/profile', wrap(async (req, res) => {
  await query('INSERT INTO dhaka_game_profiles(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [req.user.id]);
  const profile = await query('SELECT score,missions_completed,play_seconds,created_at,updated_at FROM dhaka_game_profiles WHERE user_id=$1', [req.user.id]);
  const recent = await query('SELECT mission_id,reward,completed_at FROM dhaka_game_mission_completions WHERE user_id=$1 ORDER BY completed_at DESC LIMIT 20', [req.user.id]);
  res.json({ profile: profile.rows[0], recentMissions: recent.rows });
}));

router.get('/leaderboard', wrap(async (req, res) => {
  const result = await query(`SELECT u.id,u.username,u.full_name,u.profile_picture,
    p.score,p.missions_completed,p.play_seconds
    FROM dhaka_game_profiles p JOIN users u ON u.id=p.user_id
    WHERE u.is_active=true AND u.is_suspended=false
    ORDER BY p.score DESC,p.missions_completed DESC,p.updated_at ASC LIMIT 50`);
  res.json(result.rows);
}));

router.post('/sessions', wrap(async (req, res) => {
  await query('INSERT INTO dhaka_game_profiles(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [req.user.id]);
  await query(`UPDATE dhaka_game_sessions SET status='expired',ended_at=NOW()
    WHERE user_id=$1 AND status='active' AND started_at < NOW()-INTERVAL '8 hours'`, [req.user.id]);
  await query(`UPDATE dhaka_game_sessions SET status='finished',ended_at=NOW()
    WHERE user_id=$1 AND status='active'`, [req.user.id]);
  const result = await query(`INSERT INTO dhaka_game_sessions(user_id,active_mission_id,mission_started_at)
    VALUES($1,'explore',NOW()) RETURNING id,active_mission_id,started_at`, [req.user.id]);
  res.status(201).json({ session: result.rows[0] });
}));

router.post('/sessions/:sessionId/missions/:missionId/start', wrap(async (req, res) => {
  const mission = MISSIONS[req.params.missionId];
  if (!mission) return res.status(400).json({ error: 'Unknown mission.' });
  const result = await query(`UPDATE dhaka_game_sessions SET active_mission_id=$3,mission_started_at=NOW()
    WHERE id=$1 AND user_id=$2 AND status='active' AND started_at > NOW()-INTERVAL '8 hours'
    RETURNING id,active_mission_id,mission_started_at`, [req.params.sessionId, req.user.id, req.params.missionId]);
  if (!result.rows.length) return res.status(404).json({ error: 'Active game session not found.' });
  res.json({ session: result.rows[0], reward: mission.reward, minimumSeconds: mission.minimumSeconds });
}));

router.post('/sessions/:sessionId/missions/:missionId/complete', wrap(async (req, res) => {
  const mission = MISSIONS[req.params.missionId];
  if (!mission) return res.status(400).json({ error: 'Unknown mission.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(`SELECT id,active_mission_id,mission_started_at,started_at
      FROM dhaka_game_sessions WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE`, [req.params.sessionId, req.user.id]);
    if (!locked.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Active game session not found.' }); }
    const session = locked.rows[0];
    if (session.active_mission_id !== req.params.missionId) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'This mission is not active in the server session.' }); }
    const seconds = (Date.now() - new Date(session.mission_started_at).getTime()) / 1000;
    if (seconds < mission.minimumSeconds) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Mission duration is too short to validate.' }); }
    if (seconds > 2700 || Date.now() - new Date(session.started_at).getTime() > 8 * 60 * 60 * 1000) {
      await client.query(`UPDATE dhaka_game_sessions SET status='expired',ended_at=NOW() WHERE id=$1`, [session.id]);
      await client.query('COMMIT'); return res.status(410).json({ error: 'Game session expired. Start a new session.' });
    }
    const existing = await client.query(`SELECT id FROM dhaka_game_mission_completions
      WHERE user_id=$1 AND mission_id=$2 AND completion_day=CURRENT_DATE`, [req.user.id, req.params.missionId]);
    if (existing.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'This mission reward has already been claimed today.' }); }
    await client.query(`INSERT INTO dhaka_game_mission_completions(user_id,session_id,mission_id,reward)
      VALUES($1,$2,$3,$4)`, [req.user.id, session.id, req.params.missionId, mission.reward]);
    const profile = await client.query(`INSERT INTO dhaka_game_profiles(user_id,score,missions_completed)
      VALUES($1,$2,1) ON CONFLICT(user_id) DO UPDATE SET
      score=dhaka_game_profiles.score+EXCLUDED.score,
      missions_completed=dhaka_game_profiles.missions_completed+1,updated_at=NOW()
      RETURNING score,missions_completed,play_seconds`, [req.user.id, mission.reward]);
    await client.query(`UPDATE dhaka_game_sessions SET active_mission_id=NULL,mission_started_at=NULL WHERE id=$1`, [session.id]);
    await client.query('COMMIT');
    res.json({ verified: true, reward: mission.reward, profile: profile.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'This mission reward has already been claimed today.' });
    throw error;
  } finally { client.release(); }
}));


router.post('/sessions/:sessionId/heartbeat', wrap(async (req, res) => {
  const x = Number(req.body.x), z = Number(req.body.z), heading = Number(req.body.heading || 0);
  const allowed = new Set(['car','suv','van','pickup','bus','minibus','truck','ambulance','cng','rickshaw','motorcycle','scooter','bicycle']);
  const vehicleType = allowed.has(req.body.vehicleType) ? req.body.vehicleType : 'car';
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(heading) || Math.abs(x)>1650 || Math.abs(z)>1650) {
    return res.status(400).json({ error: 'Invalid player position.' });
  }
  const result = await query(`UPDATE dhaka_game_sessions SET player_x=$3,player_z=$4,player_heading=$5,
    vehicle_type=$6,last_seen_at=NOW()
    WHERE id=$1 AND user_id=$2 AND status='active' AND started_at > NOW()-INTERVAL '8 hours'`,
    [req.params.sessionId,req.user.id,x,z,heading,vehicleType]);
  if (!result.rowCount) return res.status(404).json({ error: 'Active game session not found.' });
  res.status(204).end();
}));

router.get('/sessions/nearby', wrap(async (req, res) => {
  const x = Number(req.query.x), z = Number(req.query.z);
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x)>1650 || Math.abs(z)>1650) {
    return res.status(400).json({ error: 'Valid player coordinates are required.' });
  }
  const result = await query(`SELECT s.id,u.id AS user_id,u.username,s.player_x,s.player_z,s.player_heading,s.vehicle_type
    FROM dhaka_game_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.user_id<>$1 AND s.status='active' AND s.last_seen_at>NOW()-INTERVAL '20 seconds'
      AND s.player_x BETWEEN $2-500 AND $2+500 AND s.player_z BETWEEN $3-500 AND $3+500
    ORDER BY s.last_seen_at DESC LIMIT 24`, [req.user.id,x,z]);
  res.json(result.rows);
}));

router.post('/sessions/:sessionId/finish', wrap(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE dhaka_game_sessions SET status='finished',ended_at=NOW()
      WHERE id=$1 AND user_id=$2 AND status='active' RETURNING started_at`, [req.params.sessionId, req.user.id]);
    if (!result.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Active game session not found.' }); }
    const seconds = Math.min(14400, Math.max(0, Math.floor((Date.now()-new Date(result.rows[0].started_at).getTime())/1000)));
    await client.query(`INSERT INTO dhaka_game_profiles(user_id,play_seconds) VALUES($1,$2)
      ON CONFLICT(user_id) DO UPDATE SET play_seconds=dhaka_game_profiles.play_seconds+EXCLUDED.play_seconds,updated_at=NOW()`, [req.user.id, seconds]);
    await client.query('COMMIT');
    res.json({ finished: true, playSecondsAdded: seconds });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

module.exports = router;
