const { query } = require('../config/database');

class Report {
  static async create({ reporter_id, reported_id, reference_id, reference_type, reason, description }) {
    const result = await query(
      `INSERT INTO reports (reporter_id, reported_id, reference_id, reference_type, reason, description) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [reporter_id, reported_id, reference_id, reference_type, reason, description]
    );
    return result.rows[0];
  }

  static async getAll(status = null, limit = 50, offset = 0) {
    let sql = `SELECT r.*, 
      rep.username as reporter_username, rep.full_name as reporter_name,
      red.username as reported_username, red.full_name as reported_name
      FROM reports r
      JOIN users rep ON r.reporter_id = rep.id
      JOIN users red ON r.reported_id = red.id`;
    const params = [];

    if (status) {
      sql += ' WHERE r.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  static async updateStatus(id, status, adminNotes, resolvedBy) {
    await query(
      'UPDATE reports SET status = $1, admin_notes = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP WHERE id = $4',
      [status, adminNotes, resolvedBy, id]
    );
  }

  static async getStats() {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed
       FROM reports`
    );
    return result.rows[0];
  }
}

module.exports = Report;
