const { query } = require('../config/database');

class Comment {
  static async create({ post_id, user_id, parent_id = null, content }) {
    const result = await query(
      `INSERT INTO comments (post_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [post_id, user_id, parent_id, content.trim()]
    );
    await query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [post_id]);
    return result.rows[0];
  }

  static async findById(id, currentUserId = null) {
    const result = await query(
      `SELECT c.*, u.username, u.full_name, u.profile_picture, u.is_verified,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2) AS is_liked,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes_count
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.is_deleted = false`,
      [id, currentUserId]
    );
    return result.rows[0];
  }

  static async findByPostId(postId, currentUserId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT c.*, u.username, u.full_name, u.profile_picture, u.is_verified,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2) AS is_liked,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes_count,
        (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id AND r.is_deleted = false) AS replies_count
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.is_deleted = false
       ORDER BY c.created_at DESC LIMIT $3 OFFSET $4`,
      [postId, currentUserId, limit, offset]
    );
    return result.rows;
  }

  static async findReplies(parentId, currentUserId, limit = 10, offset = 0) {
    const result = await query(
      `SELECT c.*, u.username, u.full_name, u.profile_picture, u.is_verified,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2) AS is_liked,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes_count
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.parent_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at ASC LIMIT $3 OFFSET $4`,
      [parentId, currentUserId, limit, offset]
    );
    return result.rows;
  }

  static async update(id, userId, content) {
    if (!content?.trim()) return null;
    const result = await query(
      `UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 AND is_deleted = false RETURNING *`,
      [content.trim(), id, userId]
    );
    return result.rows[0];
  }

  static async delete(id, userId) {
    const result = await query(
      `UPDATE comments SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING post_id, parent_id`,
      [id, userId]
    );
    if (result.rows.length) {
      await query('UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [result.rows[0].post_id]);
      return true;
    }
    return false;
  }

  static async toggleLike(commentId, userId) {
    const existing = await query('SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
    if (existing.rows.length) {
      await query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
      return false;
    }
    await query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [commentId, userId]);
    return true;
  }
}

module.exports = Comment;
