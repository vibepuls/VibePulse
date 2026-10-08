const { query } = require('../config/database');

class Bookmark {
  static async create(userId, postId) {
    const result = await query(
      'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) RETURNING *',
      [userId, postId]
    );
    return result.rows[0];
  }

  static async delete(userId, postId) {
    await query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
  }

  static async find(userId, postId) {
    const result = await query('SELECT * FROM bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    return result.rows[0];
  }

  static async getByUser(userId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT b.*, p.content, p.type, p.privacy, p.likes_count, p.comments_count, p.shares_count, p.created_at as post_created_at,
        u.username, u.full_name, u.profile_picture, u.is_verified,
        json_agg(DISTINCT jsonb_build_object('id', pm.id, 'url', pm.media_url, 'type', pm.media_type)) FILTER (WHERE pm.id IS NOT NULL) as media
       FROM bookmarks b
       JOIN posts p ON b.post_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN post_media pm ON p.id = pm.post_id
       WHERE b.user_id = $1 AND p.is_deleted = false
       GROUP BY b.id, p.id, u.id
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
}

module.exports = Bookmark;
