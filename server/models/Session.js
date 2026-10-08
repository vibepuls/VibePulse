const { query } = require('../config/database');

class Session {
  static async create({ user_id, token, refresh_token, ip_address, user_agent, expires_at }) {
    const result = await query(
      `INSERT INTO sessions (user_id, token, refresh_token, ip_address, user_agent, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, token, refresh_token, ip_address, user_agent, expires_at]
    );
    return result.rows[0];
  }

  static async getByToken(token) {
    const result = await query('SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    return result.rows[0];
  }

  static async getByRefreshToken(refreshToken) {
    const result = await query('SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()', [refreshToken]);
    return result.rows[0];
  }

  static async getByUser(userId) {
    const result = await query(
      `SELECT id, ip_address, user_agent, created_at, last_active, expires_at
       FROM sessions WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_active DESC`,
      [userId]
    );
    return result.rows;
  }

  static async updateLastActive(token) {
    await query('UPDATE sessions SET last_active = CURRENT_TIMESTAMP WHERE token = $1', [token]);
  }

  static async delete(token) {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
  }

  static async deleteByUser(userId, exceptToken = null) {
    if (exceptToken) {
      await query('DELETE FROM sessions WHERE user_id = $1 AND token != $2', [userId, exceptToken]);
    } else {
      await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    }
  }
}

module.exports = Session;
