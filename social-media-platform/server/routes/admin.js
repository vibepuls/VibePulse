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
  try { await User.suspend(req.params.id); res.json({ message: 'User suspended' }); }
  catch (err) { next(err); }
});

router.post('/users/:id/unsuspend', authorize('admin', 'super_admin'), async (req, res, next) => {
  try { await User.unsuspend(req.params.id); res.json({ message: 'User unsuspended' }); }
  catch (err) { next(err); }
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
  try { const { status, admin_notes } = req.body; await Report.updateStatus(req.params.id, status, admin_notes, req.user.id); res.json({ message: 'Report updated' }); }
  catch (err) { next(err); }
});

module.exports = router;
