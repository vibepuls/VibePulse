const { query } = require('../config/database');

class Mute {
  static async create(userId, mutedUserId) {
    const result = await query(
      'INSERT INTO mutes (user_id, muted_user_id) VALUES ($1, $2) ON CONFLICT (user_id, muted_user_id) DO NOTHING RETURNING *',
      [userId, mutedUserId]
    );
    return result.rows[0] || null;
  }

  static async delete(userId, mutedUserId) {
    await query('DELETE FROM mutes WHERE user_id = $1 AND muted_user_id = $2', [userId, mutedUserId]);
  }

  static async exists(userId, mutedUserId) {
    const result = await query('SELECT 1 FROM mutes WHERE user_id = $1 AND muted_user_id = $2', [userId, mutedUserId]);
    return result.rows.length > 0;
  }
}

module.exports = Mute;
