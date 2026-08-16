const { query } = require('../config/database');

class Comment {
  static async create({ post_id, user_id, parent_id = null, content }) {
    const result = await query(
      `INSERT INTO comments (post_id, user_id, parent_id, content) VALUES ($1, $2, $3, $4) RETURNING *`,
      [post_id, user_id, parent_id, content]
    );
    await query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [post_id]);
    return result.rows[0];
  }

  static async findByPostId(postId, currentUserId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT c.*, 
        u.username, u.full_name, u.profile_picture, u.is_verified,
        (SELECT EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2)) as is_liked,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.is_deleted = false
       ORDER BY c.created_at DESC
       LIMIT $3 OFFSET $4`,
      [postId, currentUserId, limit, offset]
    );
    return result.rows;
  }

  static async findReplies(parentId, currentUserId, limit = 10, offset = 0) {
    const result = await query(
      `SELECT c.*, 
        u.username, u.full_name, u.profile_picture, u.is_verified,
        (SELECT EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2)) as is_liked,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.parent_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at ASC
       LIMIT $3 OFFSET $4`,
      [parentId, currentUserId, limit, offset]
    );
    return result.rows;
  }

  static async update(id, userId, content) {
    const result = await query(
      'UPDATE comments SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [content, id, userId]
    );
    return result.rows[0];
  }

  static async delete(id, userId) {
    const comment = await query('SELECT post_id FROM comments WHERE id = $1', [id]);
    if (comment.rows.length > 0) {
      await query('UPDATE posts SET comments_count = comments_count - 1 WHERE id = $1', [comment.rows[0].post_id]);
    }
    await query('UPDATE comments SET is_deleted = true WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  static async toggleLike(commentId, userId) {
    const existing = await query('SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
    if (existing.rows.length > 0) {
      await query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
      await query('UPDATE comments SET likes_count = likes_count - 1 WHERE id = $1', [commentId]);
      return false;
    } else {
      await query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [commentId, userId]);
      await query('UPDATE comments SET likes_count = likes_count + 1 WHERE id = $1', [commentId]);
      return true;
    }
  }
}

module.exports = Comment;
