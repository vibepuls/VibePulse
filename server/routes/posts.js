
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rateLimiter');

router.get('/feed', authenticate, postController.getFeed);
router.get('/trending', postController.getTrending);
router.get('/user/:username', optionalAuth, postController.getUserPosts);
router.get('/:id', optionalAuth, postController.getPost);
router.post('/', authenticate, postLimiter, postController.createPost);
router.patch('/:id', authenticate, postController.updatePost);
router.delete('/:id', authenticate, postController.deletePost);
router.post('/:id/share', authenticate, postController.sharePost);

module.exports = router;
