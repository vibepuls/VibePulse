const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, username, password, full_name }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, username, password_hash, full_name) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, username, full_name, role, created_at`,
      [email, username, hashedPassword, full_name]
    );

    // Create default privacy settings
    await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [result.rows[0].id]);

    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await query(
      `SELECT id, email, username, full_name, bio, website, location, profile_picture, 
       cover_photo, is_private, is_verified, role, user_interests, created_at, updated_at,
       (SELECT COUNT(*) FROM follows WHERE following_id = users.id AND status = 'accepted') as followers_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = users.id AND status = 'accepted') as following_count,
       (SELECT COUNT(*) FROM posts WHERE user_id = users.id AND is_deleted = false) as posts_count
       FROM users WHERE username = $1 AND deleted_at IS NULL`,
      [username]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, email, username, full_name, bio, website, location, profile_picture, 
       cover_photo, is_private, is_verified, is_active, is_suspended, role, user_interests, created_at, updated_at,
       (SELECT COUNT(*) FROM follows WHERE following_id = users.id AND status = 'accepted') as followers_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = users.id AND status = 'accepted') as following_count,
       (SELECT COUNT(*) FROM posts WHERE user_id = users.id AND is_deleted = false) as posts_count
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedFields = ['full_name', 'bio', 'website', 'location', 'profile_picture', 'cover_photo', 'is_private'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }


  static async getInterests(id) {
    const result = await query(
      `SELECT COALESCE(user_interests, '{}'::jsonb) AS user_interests
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0]?.user_interests || {};
  }

  static async updateInterestScores(id, scores = {}) {
    const entries = Object.entries(scores)
      .map(([tag, delta]) => [String(tag).toLowerCase().trim(), Number(delta)])
      .filter(([tag, delta]) => /^#[^\\s#]{1,80}$/.test(tag) && Number.isFinite(delta) && delta !== 0);

    if (!entries.length) return this.getInterests(id);

    const current = await this.getInterests(id);
    const next = { ...current };

    for (const [tag, delta] of entries) {
      const value = Number(next[tag] || 0) + delta;
      next[tag] = Math.max(0, Math.min(20, Number(value.toFixed(2))));
    }

    const result = await query(
      `UPDATE users
       SET user_interests = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING user_interests`,
      [JSON.stringify(next), id]
    );
    return result.rows[0]?.user_interests || next;
  }

  static async recordShortInteraction({ userId, videoId, tags = [], eventType, watchDurationMs = 0, watchPercent = null }) {
    const allowed = new Set(['watch_70', 'loop', 'like', 'share', 'comment', 'skip']);
    if (!allowed.has(eventType)) throw new Error('Invalid Shorts interaction type');

    const cleanTags = [...new Set((Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag).toLowerCase().trim())
      .filter((tag) => /^#[^\\s#]{1,80}$/.test(tag)))].slice(0, 30);

    const weights = {
      watch_70: 2,
      loop: 2.5,
      like: 4,
      share: 5,
      comment: 3,
      skip: -1.5
    };
    const delta = weights[eventType];

    await query(
      `INSERT INTO shorts_interactions
       (user_id, video_id, tags, event_type, watch_duration_ms, watch_percent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, String(videoId).slice(0, 32), cleanTags, eventType, Math.max(0, Number(watchDurationMs) || 0), watchPercent == null ? null : Number(watchPercent)]
    );

    const scores = {};
    for (const tag of cleanTags) scores[tag] = delta;
    return this.updateInterestScores(userId, scores);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, id]);
  }

  static async comparePassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  static async search(query_text, limit = 20, offset = 0) {
    const result = await query(
      `SELECT id, username, full_name, profile_picture, is_verified 
       FROM users 
       WHERE (username ILIKE $1 OR full_name ILIKE $1) AND deleted_at IS NULL AND is_active = true
       ORDER BY 
         CASE WHEN username ILIKE $2 THEN 0 ELSE 1 END,
         followers_count DESC NULLS LAST
       LIMIT $3 OFFSET $4`,
      [`%${query_text}%`, `${query_text}%`, limit, offset]
    );
    return result.rows;
  }

  static async getFollowers(userId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture, u.is_verified, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1 AND f.status = 'accepted' AND u.deleted_at IS NULL
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getFollowing(userId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture, u.is_verified, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1 AND f.status = 'accepted' AND u.deleted_at IS NULL
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getAll(limit = 50, offset = 0, search = '') {
    let sql = `SELECT id, email, username, full_name, profile_picture, is_private, is_verified, 
               is_active, is_suspended, role, created_at, last_login,
               (SELECT COUNT(*) FROM follows WHERE following_id = users.id AND status = 'accepted') as followers_count
               FROM users WHERE deleted_at IS NULL`;
    const params = [];

    if (search) {
      sql += ` AND (username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  static async count(search = '') {
    let sql = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
    const params = [];

    if (search) {
      sql += ` AND (username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  }

  static async suspend(id) {
    await query('UPDATE users SET is_suspended = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }

  static async unsuspend(id) {
    await query('UPDATE users SET is_suspended = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }

  static async delete(id) {
    await query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1', [id]);
  }
}

module.exports = User;
