const { query } = require('../config/database');

class Follow {
  static async create(followerId, followingId) {
    const targetUser = await query('SELECT is_private FROM users WHERE id = $1', [followingId]);
    const status = targetUser.rows[0]?.is_private ? 'pending' : 'accepted';

    const result = await query(
      `INSERT INTO follows (follower_id, following_id, status) VALUES ($1, $2, $3) RETURNING *`,
      [followerId, followingId, status]
    );
    return result.rows[0];
  }

  static async find(followerId, followingId) {
    const result = await query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return result.rows[0];
  }

  static async updateStatus(followerId, followingId, status) {
    await query(
      'UPDATE follows SET status = $1 WHERE follower_id = $2 AND following_id = $3',
      [status, followerId, followingId]
    );
  }

  static async delete(followerId, followingId) {
    await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
  }

  static async getFollowRequests(userId) {
    const result = await query(
      `SELECT f.*, u.username, u.full_name, u.profile_picture
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1 AND f.status = 'pending'`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = Follow;
