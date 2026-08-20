const express = require('express');
const router = express.Router();
const shortsController = require('../controllers/shortsController');

router.get('/', shortsController.getShorts);

module.exports = router;
