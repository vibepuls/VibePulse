import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const app = express(); const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4000); const AUTH_SECRET = process.env.AUTH_SECRET || 'development-only-change-this-secret-please';
app.use(helmet()); app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' })); app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
function auth(req:any,res:any,next:any){const h=req.headers.authorization; if(!h?.startsWith('Bearer ')) return res.status(401).json({error:'Please log in'}); try {req.user=jwt.verify(h.slice(7),AUTH_SECRET) as any; next();} catch{return res.status(401).json({error:'Invalid or expired session'});}}
function admin(req:any,res:any,next:any){if(req.user?.role!=='ADMIN') return res.status(403).json({error:'Admin access required'}); next();}
const safeUser=(u:any)=>({id:u.id,username:u.username,displayName:u.displayName,bio:u.bio,avatarUrl:u.avatarUrl,points:u.points,role:u.role,createdAt:u.createdAt});
const dayKey = () => new Date().toISOString().slice(0, 10);
async function recordMissionProgress(tx:any,userId:string,actionType:string,amount=1) {
  const missions = await tx.dailyMission.findMany({ where: { actionType, active: true } });
  const periodKey = dayKey();
  for (const mission of missions) {
    const where = { userId_missionId_periodKey: { userId, missionId: mission.id, periodKey } };
    const existing = await tx.missionProgress.findUnique({ where });
    const nextProgress = Math.min(mission.target, (existing?.progress || 0) + amount);
    const values = { progress: nextProgress, completed: nextProgress >= mission.target };
    if (existing) await tx.missionProgress.update({ where: { id: existing.id }, data: values });
    else await tx.missionProgress.create({ data: { userId, missionId: mission.id, periodKey, ...values } });
  }
}
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'VibePulse API'}));
app.post('/api/auth/register',async(req,res)=>{try{const data=z.object({username:z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),displayName:z.string().min(1).max(60),email:z.string().email().optional().or(z.literal('')),password:z.string().min(8).max(100)}).parse(req.body); const username=data.username.toLowerCase(); const hash=await bcrypt.hash(data.password,12); const user=await prisma.user.create({data:{username,displayName:data.displayName,email:data.email||null,passwordHash:hash}}); const token=jwt.sign({id:user.id,username:user.username,role:user.role},AUTH_SECRET,{expiresIn:'7d'}); res.status(201).json({token,user:safeUser(user)});}catch(e:any){res.status(e?.code==='P2002'?409:400).json({error:e?.code==='P2002'?'Username or email already exists':e.message||'Registration failed'});}});
app.post('/api/auth/login',async(req,res)=>{const data=z.object({username:z.string(),password:z.string()}).safeParse(req.body);if(!data.success)return res.status(400).json({error:'Username and password required'});const user=await prisma.user.findUnique({where:{username:data.data.username.toLowerCase()}});if(!user||!(await bcrypt.compare(data.data.password,user.passwordHash)))return res.status(401).json({error:'Incorrect username or password'});if(user.status!=='ACTIVE')return res.status(403).json({error:'Account is not active'});const token=jwt.sign({id:user.id,username:user.username,role:user.role},AUTH_SECRET,{expiresIn:'7d'});res.json({token,user:safeUser(user)});});
app.get('/api/me',auth,async(req:any,res)=>{const u=await prisma.user.findUnique({where:{id:req.user.id}});if(!u)return res.status(404).json({error:'User not found'});res.json(safeUser(u));});
app.get('/api/users',async(req,res)=>{const q=String(req.query.q||'').slice(0,40);const users=await prisma.user.findMany({where:{status:'ACTIVE',OR:[{username:{contains:q,mode:'insensitive'}},{displayName:{contains:q,mode:'insensitive'}}]},select:{id:true,username:true,displayName:true,avatarUrl:true,points:true},take:20,orderBy:{points:'desc'}});res.json(users);});
app.get('/api/leaderboard',async(_req,res)=>{const users=await prisma.user.findMany({where:{status:'ACTIVE'},select:{id:true,username:true,displayName:true,avatarUrl:true,points:true},orderBy:{points:'desc'},take:50});res.json(users.map((u,i)=>({...u,rank:i+1})));});
app.get('/api/posts',async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1);const posts=await prisma.post.findMany({where:{hidden:false},include:{author:{select:{username:true,displayName:true,avatarUrl:true}},_count:{select:{likes:true,comments:true}}},orderBy:[{points:'desc'},{createdAt:'desc'}],skip:(page-1)*20,take:20});res.json(posts);});
app.post('/api/posts',auth,async(req:any,res)=>{
  const d=z.object({imageUrl:z.string().url().max(2000),caption:z.string().max(2000).default('')}).safeParse(req.body);
  if(!d.success)return res.status(400).json({error:'A valid image URL and caption are required'});
  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const postsToday = await tx.post.count({ where: { authorId: req.user.id, createdAt: { gte: dayStart } } });
      const post = await tx.post.create({data:{authorId:req.user.id,...d.data},include:{author:{select:{username:true,displayName:true,avatarUrl:true}}}});
      await recordMissionProgress(tx, req.user.id, 'POST', 1);
      let reward = 0;
      if (postsToday < 5) {
        reward = 10;
        await tx.user.update({where:{id:req.user.id},data:{points:{increment:reward}}});
        await tx.pointTransaction.create({data:{receiverId:req.user.id,amount:reward,type:'POST_REWARD',note:'Daily photo post reward'}});
      }
      return { post, reward };
    });
    res.status(201).json({ ...result.post, reward: result.reward });
  } catch (error:any) {
    res.status(400).json({error:'Could not publish post'});
  }
});
app.patch('/api/posts/:id',auth,async(req:any,res)=>{const post=await prisma.post.findUnique({where:{id:req.params.id}});if(!post)return res.status(404).json({error:'Post not found'});if(post.authorId!==req.user.id&&req.user.role!=='ADMIN')return res.status(403).json({error:'Not your post'});if(post.lastEditedAt&&Date.now()-post.lastEditedAt.getTime()<4*60*60*1000)return res.status(429).json({error:`You can edit again after ${new Date(post.lastEditedAt.getTime()+4*60*60*1000).toISOString()}`});const d=z.object({imageUrl:z.string().url().optional(),caption:z.string().max(2000).optional()}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid post data'});const updated=await prisma.post.update({where:{id:post.id},data:{...d.data,lastEditedAt:new Date()}});res.json(updated);});
app.post('/api/posts/:id/like',auth,async(req:any,res)=>{try{const like=await prisma.$transaction(async tx=>{const created=await tx.like.create({data:{postId:req.params.id,userId:req.user.id}});await recordMissionProgress(tx,req.user.id,'LIKE',1);return created;});res.json({liked:true,id:like.id});}catch{return res.status(409).json({error:'Already liked or post does not exist'});}});
app.post('/api/posts/:id/comments',auth,async(req:any,res)=>{const body=z.string().trim().min(1).max(1000).safeParse(req.body.body);if(!body.success)return res.status(400).json({error:'Comment must be 1–1000 characters'});const comment=await prisma.$transaction(async tx=>{const created=await tx.comment.create({data:{postId:req.params.id,authorId:req.user.id,body:body.data},include:{author:{select:{username:true,displayName:true}}}});await recordMissionProgress(tx,req.user.id,'COMMENT',1);return created;});res.status(201).json(comment);});
app.post('/api/points/steal/:targetUsername',auth,async(req:any,res)=>{const thiefId=req.user.id;const target=await prisma.user.findUnique({where:{username:String(req.params.targetUsername).toLowerCase()}});if(!target)return res.status(404).json({error:'User not found'});if(target.id===thiefId)return res.status(400).json({error:'You cannot steal from yourself'});if(target.shieldUntil&&target.shieldUntil>new Date())return res.status(409).json({error:'This user is protected by a shield'});try{const result=await prisma.$transaction(async tx=>{const now=new Date();const prior=await tx.stealCooldown.findUnique({where:{thiefId_targetId:{thiefId,targetId:target.id}}});if(prior){const claimed=await tx.stealCooldown.updateMany({where:{id:prior.id,lastAt:{lte:new Date(now.getTime()-4000)}},data:{lastAt:now}});if(!claimed.count)throw new Error('COOLDOWN');}else{await tx.stealCooldown.create({data:{thiefId,targetId:target.id,lastAt:now}});}const debit=await tx.user.updateMany({where:{id:target.id,points:{gte:3}},data:{points:{decrement:3}}});if(!debit.count)throw new Error('LOW_BALANCE');const me=await tx.user.update({where:{id:thiefId},data:{points:{increment:3}}});await tx.pointTransaction.create({data:{senderId:target.id,receiverId:thiefId,amount:3,type:'STEAL',note:'Points stolen'}});await tx.notification.create({data:{userId:target.id,text:`@${req.user.username} stole 3 points from you.`}});return me;});res.json({success:true,stolen:3,balance:result.points});}catch(e:any){const msg=e.message==='COOLDOWN'||e?.code==='P2002'?'Wait 4 seconds before stealing from this user again':e.message==='LOW_BALANCE'?'This user does not have enough points':e.message;res.status(409).json({error:msg});}});
app.post('/api/points/gift',auth,async(req:any,res)=>{const d=z.object({username:z.string(),amount:z.number().int().min(1).max(1000000)}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid gift amount or recipient'});const target=await prisma.user.findUnique({where:{username:d.data.username.toLowerCase()}});if(!target||target.id===req.user.id)return res.status(400).json({error:'Invalid recipient'});try{const updated=await prisma.$transaction(async tx=>{const debit=await tx.user.updateMany({where:{id:req.user.id,points:{gte:d.data.amount}},data:{points:{decrement:d.data.amount}}});if(!debit.count)throw new Error('NOT_ENOUGH');const sender=await tx.user.findUniqueOrThrow({where:{id:req.user.id}});const receiver=await tx.user.update({where:{id:target.id},data:{points:{increment:d.data.amount}}});await tx.pointTransaction.create({data:{senderId:sender.id,receiverId:receiver.id,amount:d.data.amount,type:'GIFT',note:'User gift'}});await tx.notification.create({data:{userId:receiver.id,text:`@${sender.username} sent you ${d.data.amount.toLocaleString()} points.`}});return {balance:sender.points};});res.json({success:true,...updated});}catch(e:any){res.status(409).json({error:e.message==='NOT_ENOUGH'?'Not enough points': 'Gift could not be completed'});}});
app.post('/api/games/quick-tap/start', auth, async (req:any, res) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const playedToday = await prisma.gameSession.count({ where: { userId: req.user.id, startedAt: { gte: startOfDay } } });
  if (playedToday >= 5) return res.status(429).json({ error: 'Daily practice reward limit reached. Try again tomorrow.' });
  const session = await prisma.gameSession.create({ data: { userId: req.user.id, endsAt: new Date(Date.now() + 10_000) } });
  res.status(201).json({ id: session.id, endsAt: session.endsAt, durationSeconds: 10, dailyGamesRemaining: 4 - playedToday });
});

app.post('/api/games/quick-tap/:id/finish', auth, async (req:any, res) => {
  const parsed = z.object({ score: z.number().int().min(0).max(120) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid tap score' });
  const session = await prisma.gameSession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!session) return res.status(404).json({ error: 'Game session not found' });
  if (session.claimedAt) return res.status(409).json({ error: 'This game reward was already claimed' });
  const now = new Date();
  if (now < session.endsAt) return res.status(409).json({ error: 'Finish the full 10-second round before claiming points' });
  const elapsedSeconds = (now.getTime() - session.startedAt.getTime()) / 1000;
  const maxAllowedScore = Math.min(120, Math.floor(elapsedSeconds * 12));
  if (parsed.data.score > maxAllowedScore) return res.status(400).json({ error: `Score exceeds the server limit of ${maxAllowedScore} taps for this session` });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.gameSession.updateMany({
        where: { id: session.id, userId: req.user.id, claimedAt: null, endsAt: { lte: now } },
        data: { claimedAt: now, score: parsed.data.score }
      });
      if (!claimed.count) throw new Error('ALREADY_CLAIMED');
      const user = await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: parsed.data.score } } });
      if (parsed.data.score > 0) await tx.pointTransaction.create({ data: { receiverId: user.id, amount: parsed.data.score, type: 'GAME', note: 'Quick Tap skill game' } });
      return { score: parsed.data.score, balance: user.points };
    });
    res.json({ success: true, ...result });
  } catch (error:any) {
    res.status(409).json({ error: 'This game reward was already claimed' });
  }
});

app.get('/api/battles', async (_req, res) => {
  const battles = await prisma.battle.findMany({
    include: {
      challenger: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      opponent: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      challengerPost: { select: { id: true, imageUrl: true, caption: true } },
      opponentPost: { select: { id: true, imageUrl: true, caption: true } },
      _count: { select: { votes: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json(battles);
});

app.post('/api/battles', auth, async (req:any, res) => {
  const parsed = z.object({
    opponentUsername: z.string().min(3).max(24),
    challengerPostId: z.string().min(1),
    opponentPostId: z.string().min(1),
    title: z.string().max(120).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose an opponent and one photo from each player' });
  const opponent = await prisma.user.findUnique({ where: { username: parsed.data.opponentUsername.toLowerCase() } });
  if (!opponent || opponent.status !== 'ACTIVE') return res.status(404).json({ error: 'Opponent not found' });
  if (opponent.id === req.user.id) return res.status(400).json({ error: 'You cannot battle yourself' });
  const [myPost, opponentPost] = await Promise.all([
    prisma.post.findUnique({ where: { id: parsed.data.challengerPostId } }),
    prisma.post.findUnique({ where: { id: parsed.data.opponentPostId } })
  ]);
  if (!myPost || myPost.authorId !== req.user.id) return res.status(400).json({ error: 'Choose one of your own photo posts' });
  if (!opponentPost || opponentPost.authorId !== opponent.id || opponentPost.hidden) return res.status(400).json({ error: 'Opponent photo is invalid or hidden' });
  const battle = await prisma.$transaction(async (tx) => {
    const created = await tx.battle.create({
      data: {
        title: parsed.data.title?.trim() || `@${req.user.username} vs @${opponent.username}`,
        status: 'OPEN',
        creatorId: req.user.id,
        challengerId: req.user.id,
        opponentId: opponent.id,
        challengerPostId: myPost.id,
        opponentPostId: opponentPost.id,
        reward: 100,
        endsAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
    await tx.notification.create({ data: { userId: opponent.id, text: `@${req.user.username} challenged you to a photo battle. Voting closes in 10 minutes.` } });
    return created;
  });
  res.status(201).json(battle);
});

app.post('/api/battles/:id/vote', auth, async (req:any, res) => {
  const parsed = z.object({ choice: z.enum(['CHALLENGER', 'OPPONENT']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a battle photo to vote for' });
  const battle = await prisma.battle.findUnique({ where: { id: req.params.id } });
  if (!battle || !battle.challengerId || !battle.opponentId) return res.status(404).json({ error: 'Battle not found' });
  if (battle.status !== 'OPEN' || !battle.endsAt || battle.endsAt <= new Date()) return res.status(409).json({ error: 'Voting has closed for this battle' });
  if (battle.challengerId === req.user.id || battle.opponentId === req.user.id) return res.status(403).json({ error: 'Battle participants cannot vote in their own battle' });
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.battleVote.create({ data: { battleId: battle.id, userId: req.user.id, choice: parsed.data.choice } });
      return tx.battle.update({
        where: { id: battle.id },
        data: parsed.data.choice === 'CHALLENGER' ? { challengerVotes: { increment: 1 } } : { opponentVotes: { increment: 1 } }
      });
    });
    res.json({ success: true, challengerVotes: updated.challengerVotes, opponentVotes: updated.opponentVotes });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'You have already voted in this battle' });
    res.status(400).json({ error: 'Vote could not be saved' });
  }
});

app.post('/api/battles/:id/finish', auth, async (req:any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const battle = await tx.battle.findUnique({ where: { id: req.params.id } });
      if (!battle) throw new Error('NOT_FOUND');
      if (battle.status !== 'OPEN') return { status: battle.status, winnerId: battle.winnerId, alreadyFinished: true };
      if (!battle.endsAt || battle.endsAt > new Date()) throw new Error('TOO_EARLY');
      const locked = await tx.battle.updateMany({ where: { id: battle.id, status: 'OPEN', endsAt: { lte: new Date() } }, data: { status: 'FINISHING' } });
      if (!locked.count) {
        const current = await tx.battle.findUniqueOrThrow({ where: { id: battle.id } });
        return { status: current.status, winnerId: current.winnerId, alreadyFinished: true };
      }
      const winnerId = battle.challengerVotes === battle.opponentVotes ? null : battle.challengerVotes > battle.opponentVotes ? battle.challengerId : battle.opponentId;
      const status = winnerId ? 'FINISHED' : 'TIED';
      await tx.battle.update({ where: { id: battle.id }, data: { status, winnerId } });
      if (winnerId) {
        await tx.user.update({ where: { id: winnerId }, data: { points: { increment: battle.reward } } });
        await tx.pointTransaction.create({ data: { receiverId: winnerId, amount: battle.reward, type: 'BATTLE', note: `Won photo battle: ${battle.title}` } });
        await tx.notification.create({ data: { userId: winnerId, text: `You won the photo battle “${battle.title}” and earned ${battle.reward} points.` } });
      }
      return { status, winnerId, reward: winnerId ? battle.reward : 0 };
    });
    res.json(result);
  } catch (error:any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Battle not found' });
    if (error.message === 'TOO_EARLY') return res.status(409).json({ error: 'This battle is still accepting votes' });
    res.status(400).json({ error: 'Battle could not be finished' });
  }
});

app.get('/api/missions', auth, async (req:any, res) => {
  const defaults = [
    { key: 'daily-post', title: 'Photo starter', description: 'Publish one photo post today.', actionType: 'POST', target: 1, reward: 100, active: true },
    { key: 'follow-three', title: 'Meet the community', description: 'Follow three players today.', actionType: 'FOLLOW', target: 3, reward: 150, active: true },
    { key: 'comment-five', title: 'Join the conversation', description: 'Write five comments today.', actionType: 'COMMENT', target: 5, reward: 150, active: true },
    { key: 'like-ten', title: 'Show appreciation', description: 'Like ten posts today.', actionType: 'LIKE', target: 10, reward: 100, active: true },
    { key: 'shield-posts', title: 'Protect your points', description: 'Publish three photo posts today to earn a 30-minute shield.', actionType: 'POST', target: 3, reward: 0, rewardType: 'SHIELD', active: true }
  ];
  for (const mission of defaults) await prisma.dailyMission.upsert({ where: { key: mission.key }, update: {}, create: mission });
  const rows = await prisma.dailyMission.findMany({
    where: { active: true },
    include: { progress: { where: { userId: req.user.id, periodKey: dayKey() } } },
    orderBy: { reward: 'desc' }
  });
  res.json(rows.map((mission:any) => {
    const progress = mission.progress[0];
    return { id: mission.id, key: mission.key, title: mission.title, description: mission.description, target: mission.target, reward: mission.reward, rewardType: mission.rewardType, progress: progress?.progress || 0, completed: Boolean(progress?.completed), claimed: Boolean(progress?.claimed) };
  }));
});

app.post('/api/missions/:id/claim', auth, async (req:any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const progress = await tx.missionProgress.findUnique({
        where: { userId_missionId_periodKey: { userId: req.user.id, missionId: req.params.id, periodKey: dayKey() } },
        include: { mission: true }
      });
      if (!progress || !progress.completed || progress.claimed) throw new Error('NOT_READY');
      await tx.missionProgress.update({ where: { id: progress.id }, data: { claimed: true } });
      let user:any;
      if (progress.mission.rewardType === 'SHIELD') {
        const shieldUntil = new Date(Date.now() + 30 * 60 * 1000);
        user = await tx.user.update({ where: { id: req.user.id }, data: { shieldUntil } });
        await tx.notification.create({ data: { userId: user.id, text: `Mission complete: ${progress.mission.title}. Your points are protected for 30 minutes.` } });
        return { reward: 0, balance: user.points, shieldUntil };
      }
      user = await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: progress.mission.reward } } });
      await tx.pointTransaction.create({ data: { receiverId: user.id, amount: progress.mission.reward, type: 'MISSION', note: progress.mission.title } });
      await tx.notification.create({ data: { userId: user.id, text: `Mission complete: ${progress.mission.title}. +${progress.mission.reward} points.` } });
      return { reward: progress.mission.reward, balance: user.points };
    });
    res.json({ success: true, ...result });
  } catch (error:any) {
    res.status(409).json({ error: error.message === 'NOT_READY' ? 'Complete the mission first or it has already been claimed' : 'Mission reward could not be claimed' });
  }
});

app.get('/api/notifications',auth,async(req:any,res)=>res.json(await prisma.notification.findMany({where:{userId:req.user.id},orderBy:{createdAt:'desc'},take:50})));
app.post('/api/messages',auth,async(req:any,res)=>{const d=z.object({toUsername:z.string(),body:z.string().trim().min(1).max(2000)}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid message'});const to=await prisma.user.findUnique({where:{username:d.data.toUsername.toLowerCase()}});if(!to||to.id===req.user.id)return res.status(400).json({error:'Invalid recipient'});const message=await prisma.message.create({data:{senderId:req.user.id,receiverId:to.id,body:d.data.body}});res.status(201).json(message);});
app.get('/api/messages/:username',auth,async(req:any,res)=>{const other=await prisma.user.findUnique({where:{username:String(req.params.username).toLowerCase()}});if(!other)return res.status(404).json({error:'User not found'});const msgs=await prisma.message.findMany({where:{OR:[{senderId:req.user.id,receiverId:other.id},{senderId:other.id,receiverId:req.user.id}]},orderBy:{createdAt:'asc'},take:200});await prisma.message.updateMany({where:{senderId:other.id,receiverId:req.user.id,readAt:null},data:{readAt:new Date()}});res.json(msgs);});
app.post('/api/reports',auth,async(req:any,res)=>{const d=z.object({targetType:z.enum(['USER','POST','COMMENT','MESSAGE']),targetId:z.string().min(1),category:z.enum(['SPAM','HARASSMENT','FAKE_ACCOUNT','ILLEGAL_CONTENT','COPYRIGHT','ABUSE','OTHER']),details:z.string().max(1000).optional()}).safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid report'});res.status(201).json(await prisma.report.create({data:{reporterId:req.user.id,...d.data}}));});
app.get('/api/admin/reports',auth,admin,async(_req,res)=>res.json(await prisma.report.findMany({where:{status:'OPEN'},orderBy:{createdAt:'asc'},take:100})));
app.post('/api/admin/points',auth,admin,async(req:any,res)=>{const d=z.object({username:z.string(),amount:z.number().int().min(-1000000).max(1000000),note:z.string().max(200).default('Admin adjustment')}).safeParse(req.body);if(!d.success||d.data.amount===0)return res.status(400).json({error:'Invalid adjustment'});const u=await prisma.user.findUnique({where:{username:d.data.username.toLowerCase()}});if(!u)return res.status(404).json({error:'User not found'});try{const updated=await prisma.$transaction(async tx=>{const current=await tx.user.findUniqueOrThrow({where:{id:u.id}});if(current.points+d.data.amount<0)throw new Error('NEGATIVE');const next=await tx.user.update({where:{id:u.id},data:{points:{increment:d.data.amount}}});await tx.pointTransaction.create({data:{senderId:d.data.amount<0?u.id:null,receiverId:d.data.amount>0?u.id:null,amount:Math.abs(d.data.amount),type:'ADMIN_ADJUSTMENT',note:`${d.data.note} (${d.data.amount>0?'+':''}${d.data.amount})`}});return next;});res.json(safeUser(updated));}catch{return res.status(409).json({error:'Adjustment would make balance negative'});}});
app.get('/api/admin/users',auth,admin,async(_req,res)=>res.json((await prisma.user.findMany({select:{id:true,username:true,displayName:true,points:true,status:true,role:true,createdAt:true},orderBy:{createdAt:'desc'},take:100}))));

/* Social gaming MVP: profile, follow, wallet history, referrals and moderation. */
app.get('/api/users/:username/profile', async (req, res) => {
  const username = String(req.params.username).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, displayName: true, bio: true, avatarUrl: true,
      points: true, role: true, status: true, createdAt: true,
      _count: { select: { followsIn: true, followsOut: true, posts: true } }
    }
  });
  if (!user || user.status !== 'ACTIVE') return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, followers: user._count.followsIn, following: user._count.followsOut, postCount: user._count.posts, _count: undefined });
});

app.post('/api/follows/:username', auth, async (req:any, res) => {
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!target || target.status !== 'ACTIVE') return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot follow yourself' });
  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.user.id, followingId: target.id } } });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return res.json({ following: false });
  }
  await prisma.$transaction(async (tx) => {
    await tx.follow.create({ data: { followerId: req.user.id, followingId: target.id } });
    await recordMissionProgress(tx, req.user.id, 'FOLLOW', 1);
    await tx.notification.create({ data: { userId: target.id, text: `@${req.user.username} started following you.` } });
  });
  res.json({ following: true });
});

app.get('/api/follows/me', auth, async (req:any, res) => {
  const follows = await prisma.follow.findMany({ where: { followerId: req.user.id }, include: { following: { select: { username: true } } } });
  res.json(follows.map((item:any) => item.following.username));
});

app.get('/api/admin/posts', auth, admin, async (_req, res) => {
  res.json(await prisma.post.findMany({
    include: { author: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: 'desc' }, take: 100
  }));
});

app.get('/api/points/transactions', auth, async (req:any, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const transactions = await prisma.pointTransaction.findMany({
    where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
    include: {
      sender: { select: { username: true, displayName: true } },
      receiver: { select: { username: true, displayName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  res.json(transactions.map((tx:any) => ({
    id: tx.id, amount: tx.amount, type: tx.type, note: tx.note, createdAt: tx.createdAt,
    direction: tx.receiverId === req.user.id ? 'in' : 'out',
    sender: tx.sender, receiver: tx.receiver
  })));
});

app.post('/api/notifications/:id/read', auth, async (req:any, res) => {
  const updated = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { readAt: new Date() }
  });
  if (!updated.count) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});

app.get('/api/referrals/me', auth, async (req:any, res) => {
  const [sent, user] = await Promise.all([
    prisma.referral.count({ where: { referrerId: req.user.id } }),
    prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true } })
  ]);
  const base = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
  res.json({ username: user?.username, referralCount: sent, referralUrl: `${base}/register?ref=${encodeURIComponent(user?.username || '')}` });
});

app.post('/api/referrals/share-reward', auth, async (req:any, res) => {
  const periodKey = new Date().toISOString().slice(0, 10);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.referralShareClaim.create({ data: { userId: req.user.id, periodKey } });
      await tx.user.update({ where: { id: req.user.id }, data: { points: { increment: 30 } } });
      await tx.pointTransaction.create({ data: { receiverId: req.user.id, amount: 30, type: 'REFERRAL_SHARE', note: 'Daily referral sharing reward' } });
    });
    res.json({ success: true, reward: 30, periodKey });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Daily referral share reward already claimed' });
    res.status(400).json({ error: 'Could not claim referral share reward' });
  }
});

app.post('/api/referrals/claim', auth, async (req:any, res) => {
  const parsed = z.object({ referrerUsername: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid referral username' });
  const username = parsed.data.referrerUsername.toLowerCase();
  const referrer = await prisma.user.findUnique({ where: { username } });
  if (!referrer || referrer.status !== 'ACTIVE') return res.status(404).json({ error: 'Referrer not found' });
  if (referrer.id === req.user.id) return res.status(400).json({ error: 'You cannot use your own referral link' });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.referral.create({ data: { referrerId: referrer.id, referredId: req.user.id } });
      await tx.user.update({ where: { id: referrer.id }, data: { points: { increment: 10000 } } });
      await tx.pointTransaction.create({ data: { senderId: null, receiverId: referrer.id, amount: 10000, type: 'REFERRAL', note: `Signup referral: @${req.user.username}` } });
      await tx.notification.create({ data: { userId: referrer.id, text: `@${req.user.username} joined using your referral link. +10,000 points.` } });
    });
    res.json({ success: true, reward: 10000 });
  } catch (error:any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A referral has already been claimed for this account' });
    res.status(400).json({ error: 'Referral could not be claimed' });
  }
});

app.get('/api/admin/transactions', auth, admin, async (_req, res) => {
  res.json(await prisma.pointTransaction.findMany({
    include: { sender: { select: { username: true } }, receiver: { select: { username: true } } },
    orderBy: { createdAt: 'desc' }, take: 200
  }));
});

app.patch('/api/admin/users/:username/status', auth, admin, async (req:any, res) => {
  const parsed = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Status must be ACTIVE, SUSPENDED or BANNED' });
  const target = await prisma.user.findUnique({ where: { username: String(req.params.username).toLowerCase() } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own account status' });
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: target.id }, data: { status: parsed.data.status } });
    await tx.adminAction.create({ data: { actorId: req.user.id, action: 'USER_STATUS_CHANGED', targetType: 'USER', targetId: target.id, details: `status=${parsed.data.status}` } });
    await tx.notification.create({ data: { userId: target.id, text: `Your account status was changed to ${parsed.data.status} by an administrator.` } });
    return user;
  });
  res.json(safeUser(updated));
});

app.patch('/api/admin/posts/:id/moderation', auth, admin, async (req:any, res) => {
  const parsed = z.object({ hidden: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'hidden must be true or false' });
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.post.update({ where: { id: post.id }, data: { hidden: parsed.data.hidden } });
    await tx.adminAction.create({ data: { actorId: req.user.id, action: parsed.data.hidden ? 'POST_HIDDEN' : 'POST_RESTORED', targetType: 'POST', targetId: post.id } });
    return result;
  });
  res.json({ id: updated.id, hidden: updated.hidden });
});

app.patch('/api/admin/reports/:id/status', auth, admin, async (req:any, res) => {
  const parsed = z.object({ status: z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid report status' });
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const updated = await prisma.report.update({ where: { id: report.id }, data: { status: parsed.data.status } });
  await prisma.adminAction.create({ data: { actorId: req.user.id, action: 'REPORT_STATUS_CHANGED', targetType: 'REPORT', targetId: report.id, details: `status=${parsed.data.status}` } });
  res.json(updated);
});

app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);res.status(500).json({error:'Internal server error'});});
app.listen(PORT,()=>console.log(`VibePulse API listening on ${PORT}`));
