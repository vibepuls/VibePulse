const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/post/:postId', optionalAuth, commentController.getComments);
router.post('/post/:postId', authenticate, commentController.createComment);
router.patch('/:id', authenticate, commentController.updateComment);
router.delete('/:id', authenticate, commentController.deleteComment);
router.get('/:commentId/replies', optionalAuth, commentController.getReplies);
router.post('/:commentId/like', authenticate, commentController.toggleLike);

module.exports = router;
