const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');
const { authenticate } = require('../middleware/auth');

router.post('/:postId', authenticate, reactionController.toggleReaction);
router.get('/:postId', reactionController.getReactions);

module.exports = router;
