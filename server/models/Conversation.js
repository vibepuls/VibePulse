const { query } = require('../config/database');

class Conversation {
  static async create({ type = 'direct', title = null, created_by }) {
    const result = await query(
      'INSERT INTO conversations (type, title, created_by) VALUES ($1, $2, $3) RETURNING *',
      [type, title, created_by]
    );
    return result.rows[0];
  }

  static async addParticipant(conversationId, userId, isAdmin = false) {
    const result = await query(
      'INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES ($1, $2, $3) RETURNING *',
      [conversationId, userId, isAdmin]
    );
    return result.rows[0];
  }

  static async findByParticipants(userId1, userId2) {
    const result = await query(
      `SELECT c.* FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
       WHERE c.type = 'direct'
         AND cp1.user_id = $1 AND cp2.user_id = $2
         AND (cp1.left_at IS NULL OR cp1.left_at > NOW())
         AND (cp2.left_at IS NULL OR cp2.left_at > NOW())`,
      [userId1, userId2]
    );
    return result.rows[0];
  }

  static async isParticipant(conversationId, userId) {
    const result = await query(
      `SELECT 1 FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2
         AND (left_at IS NULL OR left_at > NOW())
       LIMIT 1`,
      [conversationId, userId]
    );
    return result.rows.length > 0;
  }

  static async getParticipantIds(conversationId) {
    const result = await query(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = $1 AND (left_at IS NULL OR left_at > NOW())`,
      [conversationId]
    );
    return result.rows.map(row => row.user_id);
  }

  static async getByUser(userId) {
    const result = await query(
      `SELECT c.*, 
        json_agg(DISTINCT jsonb_build_object(
          'id', u.id, 'username', u.username, 'full_name', u.full_name, 
          'profile_picture', u.profile_picture, 'is_admin', cp2.is_admin
        )) FILTER (WHERE u.id IS NOT NULL) as participants,
        (SELECT content FROM messages WHERE conversation_id = c.id AND is_deleted = false ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id AND is_deleted = false ORDER BY created_at DESC LIMIT 1) as last_message_at,
        cp.unread_count
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
       LEFT JOIN users u ON cp2.user_id = u.id
       WHERE cp.user_id = $1 AND (cp.left_at IS NULL OR cp.left_at > NOW())
       GROUP BY c.id, cp.unread_count
       ORDER BY c.last_message_at DESC NULLS LAST`,
      [userId]
    );
    return result.rows;
  }

  static async getById(id, userId = null) {
    const params = [id];
    const userFilter = userId ? ' AND cp.user_id = $2' : '';
    if (userId) params.push(userId);

    const result = await query(
      `SELECT c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', u.id, 'username', u.username, 'full_name', u.full_name, 
          'profile_picture', u.profile_picture, 'is_admin', cp2.is_admin
        )) FILTER (WHERE u.id IS NOT NULL) as participants
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
       LEFT JOIN users u ON cp2.user_id = u.id
       WHERE c.id = $1${userFilter}
       GROUP BY c.id`,
      params
    );
    return result.rows[0];
  }

  static async incrementUnread(conversationId, userId) {
    await query(
      'UPDATE conversation_participants SET unread_count = unread_count + 1 WHERE conversation_id = $1 AND user_id != $2',
      [conversationId, userId]
    );
  }

  static async resetUnread(conversationId, userId) {
    await query(
      'UPDATE conversation_participants SET unread_count = 0 WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
  }
}

module.exports = Conversation;
