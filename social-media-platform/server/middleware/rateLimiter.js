const rateLimit = require('express-rate-limit');

const authLimiter = (req, res, next) => {
  next();
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.MAX_SAFE_INTEGER,
  message: {
    error: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.MAX_SAFE_INTEGER,
  message: {
    error: 'Too many posts. Please slow down.'
  }
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.MAX_SAFE_INTEGER,
  message: {
    error: 'Too many messages. Please slow down.'
  }
});

const followLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.MAX_SAFE_INTEGER,
  message: {
    error: 'Too many follow actions. Please slow down.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  postLimiter,
  messageLimiter,
  followLimiter
};
