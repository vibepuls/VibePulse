const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, bookmarkController.getBookmarks);
router.post('/:postId', authenticate, bookmarkController.toggleBookmark);

module.exports = router;
