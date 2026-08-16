const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { upload, setUploadType } = require('../middleware/upload');
const { messageLimiter } = require('../middleware/rateLimiter');

router.get('/conversations', authenticate, async (req, res, next) => {
  try { const conversations = await Conversation.getByUser(req.user.id); res.json(conversations); }
  catch (err) { next(err); }
});

router.post('/conversations', authenticate, async (req, res, next) => {
  try {
    const { participantId } = req.body;
    let conversation = await Conversation.findByParticipants(req.user.id, participantId);
    if (!conversation) {
      conversation = await Conversation.create({ created_by: req.user.id });
      await Conversation.addParticipant(conversation.id, req.user.id, true);
      await Conversation.addParticipant(conversation.id, participantId);
    }
    const fullConv = await Conversation.getById(conversation.id, req.user.id);
    res.json(fullConv);
  } catch (err) { next(err); }
});

router.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const messages = await Message.getByConversation(req.params.id);
    await Conversation.resetUnread(req.params.id, req.user.id);
    res.json(messages);
  } catch (err) { next(err); }
});

router.post('/conversations/:id', authenticate, messageLimiter, setUploadType('messages'), upload.single('media'), async (req, res, next) => {
  try {
    const { content, message_type = 'text', reply_to_id } = req.body;
    const media_url = req.file ? `/uploads/messages/${req.file.filename}` : null;
    const message = await Message.create({
      conversation_id: req.params.id, sender_id: req.user.id, content,
      message_type: req.file ? (req.file.mimetype.startsWith('video/') ? 'video' : 'image') : message_type,
      media_url, reply_to_id
    });
    await Conversation.incrementUnread(req.params.id, req.user.id);
    res.status(201).json(message);
  } catch (err) { next(err); }
});

module.exports = router;
