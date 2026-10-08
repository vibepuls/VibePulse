const { query } = require('../config/database');

class Block {
  static async create(blockerId, blockedId) {
    const result = await query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) RETURNING *',
      [blockerId, blockedId]
    );
    // Remove follow relationships
    await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [blockerId, blockedId]);
    await query('DELETE FROM follows WHERE follower_id = $2 AND following_id = $1', [blockerId, blockedId]);
    return result.rows[0];
  }

  static async delete(blockerId, blockedId) {
    await query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, blockedId]);
  }

  static async exists(blockerId, blockedId) {
    const result = await query('SELECT * FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, blockedId]);
    return result.rows.length > 0;
  }

  static async getBlockedUsers(userId) {
    const result = await query(
      `SELECT b.*, u.username, u.full_name, u.profile_picture
       FROM blocks b
       JOIN users u ON b.blocked_id = u.id
       WHERE b.blocker_id = $1`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Block;
