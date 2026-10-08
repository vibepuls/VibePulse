const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Report = require('../models/Report');

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { reported_id, reference_id, reference_type, reason, description } = req.body;
    const report = await Report.create({ reporter_id: req.user.id, reported_id, reference_id, reference_type, reason, description });
    res.status(201).json(report);
  } catch (err) { next(err); }
});

module.exports = router;
