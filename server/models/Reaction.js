const { query } = require('../config/database');

class Reaction {
  static async toggle(userId, postId, reactionType = 'like') {
    const existing = await query('SELECT * FROM reactions WHERE user_id = $1 AND post_id = $2', [userId, postId]);

    if (existing.rows.length > 0) {
      if (existing.rows[0].reaction_type === reactionType) {
        await query('DELETE FROM reactions WHERE user_id = $1 AND post_id = $2', [userId, postId]);
        await query('UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1', [postId]);
        return { action: 'removed', type: reactionType };
      } else {
        await query('UPDATE reactions SET reaction_type = $1 WHERE user_id = $2 AND post_id = $3', [reactionType, userId, postId]);
        return { action: 'updated', type: reactionType };
      }
    } else {
      await query('INSERT INTO reactions (user_id, post_id, reaction_type) VALUES ($1, $2, $3)', [userId, postId, reactionType]);
      await query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
      return { action: 'added', type: reactionType };
    }
  }

  static async getByPostId(postId) {
    const result = await query(
      `SELECT r.*, u.username, u.full_name, u.profile_picture
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.post_id = $1`,
      [postId]
    );
    return result.rows;
  }
}

module.exports = Reaction;
