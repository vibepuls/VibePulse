const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', authenticate, async (req, res, next) => {
  try { const { limit = 50, offset = 0 } = req.query; const notifications = await Notification.getByUser(req.user.id, parseInt(limit), parseInt(offset)); res.json(notifications); }
  catch (err) { next(err); }
});

router.get('/unread-count', authenticate, async (req, res, next) => {
  try { const count = await Notification.getUnreadCount(req.user.id); res.json({ count }); }
  catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try { await Notification.markAsRead(req.params.id, req.user.id); res.json({ message: 'Marked as read' }); }
  catch (err) { next(err); }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try { await Notification.markAllAsRead(req.user.id); res.json({ message: 'All marked as read' }); }
  catch (err) { next(err); }
});

module.exports = router;
