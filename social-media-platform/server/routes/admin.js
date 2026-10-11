const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Report = require('../models/Report');
const { query } = require('../config/database');

router.use(authenticate);
router.use(authorize('admin', 'super_admin', 'moderator'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = {
      users: (await query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL')).rows[0].count,
      posts: (await query('SELECT COUNT(*) FROM posts WHERE is_deleted = false')).rows[0].count,
      reports: (await query("SELECT COUNT(*) FROM reports WHERE status = 'pending'")).rows[0].count,
      activeToday: (await query("SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_active > NOW() - INTERVAL '24 hours'")).rows[0].count
    };
    res.json(stats);
  } catch (err) { next(err); }
});

router.get('/users', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, search = '' } = req.query;
    const users = await User.getAll(parseInt(limit), parseInt(offset), search);
    const total = await User.count(search);
    res.json({ users, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.post('/users/:id/suspend', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'You cannot suspend your own account.' });
    }
    const target = await query('SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found.' });
    if (target.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'Super admin accounts are protected.' });
    }
    await User.suspend(req.params.id);
    res.json({ message: 'User suspended' });
  } catch (err) { next(err); }
});

router.post('/users/:id/unsuspend', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const target = await query('SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found.' });
    if (target.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'Super admin accounts are protected.' });
    }
    await User.unsuspend(req.params.id);
    res.json({ message: 'User unsuspended' });
  } catch (err) { next(err); }
});

router.delete('/users/:id', authorize('super_admin'), async (req, res, next) => {
  try { await User.delete(req.params.id); res.json({ message: 'User deleted' }); }
  catch (err) { next(err); }
});

router.get('/reports', async (req, res, next) => {
  try { const { status, limit = 50, offset = 0 } = req.query; const reports = await Report.getAll(status || null, parseInt(limit), parseInt(offset)); res.json(reports); }
  catch (err) { next(err); }
});

router.patch('/reports/:id', async (req, res, next) => {
  try {
    const { status, admin_notes = '' } = req.body;
    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status.' });
    }
    if (typeof admin_notes !== 'string' || admin_notes.length > 2000) {
      return res.status(400).json({ error: 'Admin notes must be text under 2000 characters.' });
    }
    const existing = await query('SELECT id FROM reports WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Report not found.' });
    await Report.updateStatus(req.params.id, status, admin_notes.trim(), req.user.id);
    res.json({ message: 'Report updated', status });
  } catch (err) { next(err); }
});

module.exports = router;
