const { query } = require('../config/database');

class Story {
  static async create({ user_id, media_url, media_type, text_content, background_color, text_color }) {
    const result = await query(
      `INSERT INTO stories (user_id, media_url, media_type, text_content, background_color, text_color) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, media_url, media_type, text_content, background_color, text_color]
    );
    return result.rows[0];
  }

  static async getActiveStories(userId) {
    const result = await query(
      `SELECT s.*, u.username, u.full_name, u.profile_picture, u.is_verified,
        (SELECT EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND user_id = $1)) as is_viewed
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > NOW() AND u.deleted_at IS NULL AND u.is_active = true
       AND NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id = s.user_id AND blocked_id = $1)
       AND NOT EXISTS(SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = s.user_id)
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getByUserId(userId, currentUserId) {
    const result = await query(
      `SELECT s.*, u.username, u.full_name, u.profile_picture,
        (SELECT EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND user_id = $2)) as is_viewed
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1 AND s.expires_at > NOW() AND u.deleted_at IS NULL
       ORDER BY s.created_at DESC`,
      [userId, currentUserId]
    );
    return result.rows;
  }

  static async addView(storyId, userId) {
    try {
      await query('INSERT INTO story_views (story_id, user_id) VALUES ($1, $2)', [storyId, userId]);
      await query('UPDATE stories SET views_count = views_count + 1 WHERE id = $1', [storyId]);
    } catch (e) {
      // Already viewed
    }
  }

  static async getViews(storyId) {
    const result = await query(
      `SELECT sv.*, u.username, u.full_name, u.profile_picture
       FROM story_views sv
       JOIN users u ON sv.user_id = u.id
       WHERE sv.story_id = $1`,
      [storyId]
    );
    return result.rows;
  }

  static async delete(id, userId) {
    await query('DELETE FROM stories WHERE id = $1 AND user_id = $2', [id, userId]);
  }
}

module.exports = Story;
