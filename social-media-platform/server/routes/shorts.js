const express = require('express');
const router = express.Router();
const shortsController = require('../controllers/shortsController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, shortsController.getShorts);
router.post('/track', authenticate, shortsController.trackInteraction);
router.get('/interests', authenticate, shortsController.getMyInterests);

module.exports = router;
