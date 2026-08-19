const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { upload, setUploadType } = require('../middleware/upload');
const { messageLimiter } = require('../middleware/rateLimiter');
const { getIO } = require('../websocket/socket');
const { query } = require('../config/database');
const PrivacySettings = require('../models/PrivacySettings');
const Block = require('../models/Block');

router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COALESCE(SUM(unread_count), 0) AS count
       FROM conversation_participants
       WHERE user_id = $1 AND (left_at IS NULL OR left_at > NOW())`,
      [req.user.id]
    );
    res.json({ count: Number(result.rows[0].count || 0) });
  } catch (err) { next(err); }
});

router.get('/conversations', authenticate, async (req, res, next) => {
  try { res.json(await Conversation.getByUser(req.user.id)); }
  catch (err) { next(err); }
});

router.post('/conversations', authenticate, async (req, res, next) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ error: 'participantId is required.' });
    if (String(participantId) === String(req.user.id)) return res.status(400).json({ error: 'You cannot message yourself.' });

    const target = await User.findById(participantId);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (await Block.exists(req.user.id, participantId) || await Block.exists(participantId, req.user.id)) {
      return res.status(403).json({ error: 'Messaging is unavailable between these users.' });
    }
    const privacy = await PrivacySettings.getByUserId(participantId);
    const follow = await require('../models/Follow').find(req.user.id, participantId);
    if (privacy.who_can_message === 'nobody' || (privacy.who_can_message === 'followers' && follow?.status !== 'accepted')) {
      return res.status(403).json({ error: 'This user does not accept messages from you.' });
    }

    let conversation = await Conversation.findByParticipants(req.user.id, participantId);
    if (!conversation) {
      conversation = await Conversation.create({ created_by: req.user.id });
      await Conversation.addParticipant(conversation.id, req.user.id, true);
      await Conversation.addParticipant(conversation.id, participantId);
    }

    const fullConv = await Conversation.getById(conversation.id, req.user.id);
    res.status(201).json(fullConv);
  } catch (err) { next(err); }
});

router.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    if (!(await Conversation.isParticipant(req.params.id, req.user.id))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }
    const messages = await Message.getByConversation(req.params.id);
    await Conversation.resetUnread(req.params.id, req.user.id);
    res.json(messages);
  } catch (err) { next(err); }
});

router.post('/conversations/:id', authenticate, messageLimiter, setUploadType('messages'), upload.single('media'), async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    if (!(await Conversation.isParticipant(conversationId, req.user.id))) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }

    const { content, message_type = 'text', reply_to_id } = req.body;
    const media_url = req.file ? `/uploads/messages/${req.file.filename}` : null;
    const cleanContent = content?.trim() || null;
    if (!cleanContent && !media_url) return res.status(400).json({ error: 'Message content or media is required.' });

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: req.user.id,
      content: cleanContent,
      message_type: req.file ? (req.file.mimetype.startsWith('video/') ? 'video' : 'image') : message_type,
      media_url,
      reply_to_id
    });

    await Conversation.incrementUnread(conversationId, req.user.id);

    const sender = await User.findById(req.user.id);
    const messageWithSender = {
      ...message,
      username: sender?.username,
      full_name: sender?.full_name,
      profile_picture: sender?.profile_picture
    };

    const participantIds = await Conversation.getParticipantIds(conversationId);
    for (const userId of participantIds) {
      if (String(userId) === String(req.user.id)) continue;
      try {
        getIO().to(`user_${userId}`).emit('new_message', messageWithSender);
        getIO().to(`user_${userId}`).emit('conversation_updated', { conversationId, message: messageWithSender });
      } catch (_) {}

      await Notification.create({
        recipient_id: userId,
        sender_id: req.user.id,
        type: 'message',
        reference_id: conversationId,
        reference_type: 'conversation',
        message: `${req.user.username} sent you a message`
      });
    }

    res.status(201).json(messageWithSender);
  } catch (err) { next(err); }
});



router.post('/messages/:messageId/read', authenticate, async (req, res, next) => {
  try {
    const message = await query('SELECT conversation_id, sender_id FROM messages WHERE id = $1 AND is_deleted = false', [req.params.messageId]);
    if (!message.rows.length) return res.status(404).json({ error: 'Message not found.' });
    if (!(await Conversation.isParticipant(message.rows[0].conversation_id, req.user.id))) return res.status(403).json({ error: 'Not allowed.' });
    await Message.markAsRead(req.params.messageId, req.user.id);
    res.json({ read: true });
  } catch (err) { next(err); }
});

router.post('/messages/:messageId/reaction', authenticate, async (req, res, next) => {
  try {
    const { reaction = 'like' } = req.body;
    const result = await query('SELECT conversation_id FROM messages WHERE id = $1 AND is_deleted = false', [req.params.messageId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Message not found.' });
    if (!(await Conversation.isParticipant(result.rows[0].conversation_id, req.user.id))) return res.status(403).json({ error: 'Not allowed.' });
    const changed = await Message.addReaction(req.params.messageId, req.user.id, reaction);
    res.json({ reaction, changed });
  } catch (err) { next(err); }
});

router.patch('/messages/:messageId', authenticate, async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message cannot be empty.' });
    const result = await query('UPDATE messages SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND sender_id = $3 AND is_deleted = false RETURNING *', [content, req.params.messageId, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Message not found or unauthorized.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/messages/:messageId', authenticate, async (req, res, next) => {
  try {
    await Message.delete(req.params.messageId, req.user.id);
    res.json({ message: 'Message deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
