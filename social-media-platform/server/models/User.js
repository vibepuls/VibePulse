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
       cover_photo, is_private, is_verified, role, created_at, updated_at,
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
       cover_photo, is_private, is_verified, is_active, is_suspended, role, created_at, updated_at,
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
