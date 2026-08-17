const { query } = require('../config/database');

class Notification {
  static async create({ recipient_id, sender_id, type, reference_id = null, reference_type = null, message }) {
    const result = await query(
      `INSERT INTO notifications (recipient_id, sender_id, type, reference_id, reference_type, message) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [recipient_id, sender_id, type, reference_id, reference_type, message]
    );
    const notification = result.rows[0];
    try {
      const sender = sender_id ? (await query('SELECT username, full_name, profile_picture FROM users WHERE id = $1', [sender_id])).rows[0] : null;
      const payload = { ...notification, sender_username: sender?.username, sender_name: sender?.full_name, sender_picture: sender?.profile_picture };
      const { getIO } = require('../websocket/socket');
      getIO().to(`user_${recipient_id}`).emit('new_notification', payload);
    } catch (err) {
      // Socket is optional for persistence; do not fail notification creation if it is unavailable.
    }
    return notification;
  }

  static async getByUser(userId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT n.*, 
        u.username as sender_username, u.full_name as sender_name, u.profile_picture as sender_picture
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(id, userId) {
    await query('UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2', [id, userId]);
  }

  static async markAllAsRead(userId) {
    await query('UPDATE notifications SET is_read = true WHERE recipient_id = $1', [userId]);
  }
}

module.exports = Notification;
