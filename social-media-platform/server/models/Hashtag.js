const { query } = require('../config/database');

class Hashtag {
  static async findOrCreate(tag) {
    const existing = await query('SELECT * FROM hashtags WHERE tag = $1', [tag.toLowerCase()]);
    if (existing.rows.length > 0) {
      await query('UPDATE hashtags SET usage_count = usage_count + 1 WHERE id = $1', [existing.rows[0].id]);
      return existing.rows[0];
    }
    const result = await query('INSERT INTO hashtags (tag) VALUES ($1) RETURNING *', [tag.toLowerCase()]);
    return result.rows[0];
  }

  static async linkToPost(postId, hashtagId) {
    try {
      await query('INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2)', [postId, hashtagId]);
    } catch (e) {
      // Already linked
    }
  }

  static async getTrending(limit = 10) {
    const result = await query(
      `SELECT h.*, COUNT(ph.post_id) as recent_posts
       FROM hashtags h
       LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
       LEFT JOIN posts p ON ph.post_id = p.id
       WHERE p.created_at > NOW() - INTERVAL '7 days' OR p.created_at IS NULL
       GROUP BY h.id
       ORDER BY recent_posts DESC, h.usage_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getPostsByTag(tag, limit = 20, offset = 0) {
    const result = await query(
      `SELECT p.*, u.username, u.full_name, u.profile_picture, u.is_verified,
        json_agg(DISTINCT jsonb_build_object('id', pm.id, 'url', pm.media_url, 'type', pm.media_type)) FILTER (WHERE pm.id IS NOT NULL) as media
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN post_media pm ON p.id = pm.post_id
       JOIN post_hashtags ph ON p.id = ph.post_id
       JOIN hashtags h ON ph.hashtag_id = h.id
       WHERE h.tag = $1 AND p.is_deleted = false AND p.privacy = 'public'
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tag.toLowerCase(), limit, offset]
    );
    return result.rows;
  }
}

module.exports = Hashtag;
