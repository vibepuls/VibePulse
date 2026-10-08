const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q, type = 'all' } = req.query;
    if (!q || q.length < 2) return res.json({ users: [], posts: [], hashtags: [] });
    const result = { users: [], posts: [], hashtags: [] };
    if (type === 'all' || type === 'users') result.users = await User.search(q, 10);
    if (type === 'all' || type === 'posts') result.posts = await Post.search(q, 10);
    if (type === 'all' || type === 'hashtags') {
      const { query } = require('../config/database');
      result.hashtags = (await query('SELECT * FROM hashtags WHERE tag ILIKE $1 ORDER BY usage_count DESC LIMIT 10', [`%${q}%`])).rows;
    }
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
