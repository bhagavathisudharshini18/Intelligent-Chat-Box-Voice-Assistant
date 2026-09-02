const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_chatbox_2026_dev_secure';

/**
 * Middleware requiring valid JWT token
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }
};

/**
 * Middleware allowing optional JWT auth, falling back to guest userId header or generating anonymous session
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Continue as guest if token expired
    }
  }

  // Fallback to guest user ID passed in header or create temporary ID
  const guestId = req.headers['x-guest-id'] || 'guest_' + req.ip.replace(/[^a-zA-Z0-9]/g, '_');
  req.user = {
    userId: guestId,
    name: 'Guest User',
    role: 'guest'
  };
  next();
};

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
