const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');
const Story = require('../models/Story');

router.get('/', authenticate, async (req, res, next) => {
  try { const stories = await Story.getActiveStories(req.user.id); res.json(stories); }
  catch (err) { next(err); }
});

router.get('/user/:userId', authenticate, async (req, res, next) => {
  try { const stories = await Story.getByUserId(req.params.userId, req.user.id); res.json(stories); }
  catch (err) { next(err); }
});

router.post('/', authenticate, setUploadType('stories'), upload.single('media'), async (req, res, next) => {
  try {
    const { media_type, text_content, background_color, text_color } = req.body;
    const media_url = req.file ? `/uploads/stories/${req.file.filename}` : null;
    const story = await Story.create({ user_id: req.user.id, media_url, media_type, text_content, background_color, text_color });
    res.status(201).json(story);
  } catch (err) { next(err); }
});

router.post('/:id/view', authenticate, async (req, res, next) => {
  try { await Story.addView(req.params.id, req.user.id); res.json({ message: 'View recorded' }); }
  catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try { await Story.delete(req.params.id, req.user.id); res.json({ message: 'Story deleted' }); }
  catch (err) { next(err); }
});

module.exports = router;
