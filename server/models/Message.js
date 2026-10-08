const { query } = require('../config/database');

class Message {
  static async create({ conversation_id, sender_id, content, message_type = 'text', media_url = null, file_name = null, file_size = null, reply_to_id = null }) {
    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, media_url, file_name, file_size, reply_to_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [conversation_id, sender_id, content, message_type, media_url, file_name, file_size, reply_to_id]
    );
    await query('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1', [conversation_id]);
    return result.rows[0];
  }

  static async getByConversation(conversationId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT m.*, 
        u.username, u.full_name, u.profile_picture,
        json_agg(DISTINCT jsonb_build_object('user_id', mr.user_id, 'read_at', mr.read_at)) FILTER (WHERE mr.id IS NOT NULL) as read_by,
        json_agg(DISTINCT jsonb_build_object('user_id', mre.user_id, 'reaction', mre.reaction)) FILTER (WHERE mre.id IS NOT NULL) as reactions
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN message_reads mr ON m.id = mr.message_id
       LEFT JOIN message_reactions mre ON m.id = mre.message_id
       WHERE m.conversation_id = $1 AND m.is_deleted = false
       GROUP BY m.id, u.id
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return result.rows.reverse();
  }

  static async markAsRead(messageId, userId) {
    try {
      await query('INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2)', [messageId, userId]);
    } catch (e) {
      // Already read
    }
  }

  static async addReaction(messageId, userId, reaction) {
    try {
      await query('INSERT INTO message_reactions (message_id, user_id, reaction) VALUES ($1, $2, $3)', [messageId, userId, reaction]);
      return true;
    } catch (e) {
      await query('DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2', [messageId, userId]);
      return false;
    }
  }

  static async delete(id, userId) {
    await query('UPDATE messages SET is_deleted = true WHERE id = $1 AND sender_id = $2', [id, userId]);
  }
}

module.exports = Message;
