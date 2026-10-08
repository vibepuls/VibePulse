const { query } = require('../config/database');

class PrivacySettings {
  static async getByUserId(userId) {
    const result = await query('SELECT * FROM privacy_settings WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [userId]);
      const newResult = await query('SELECT * FROM privacy_settings WHERE user_id = $1', [userId]);
      return newResult.rows[0];
    }
    return result.rows[0];
  }

  static async update(userId, settings) {
    const allowedFields = ['who_can_follow', 'who_can_message', 'who_can_comment', 'who_can_mention', 'who_can_see_posts', 'show_activity_status', 'show_last_seen', 'allow_story_replies'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(settings)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;
    values.push(userId);

    const result = await query(
      `UPDATE privacy_settings SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

module.exports = PrivacySettings;
