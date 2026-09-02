const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

const apiLimiter = rateLimit({
  windowMs,
  trustProxy: 1,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  trustProxy: 1,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login/registration attempts. Please try again after 15 minutes.'
  }
});

module.exports = { apiLimiter, authLimiter };
