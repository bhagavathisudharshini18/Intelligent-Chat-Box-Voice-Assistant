const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Preference = require('../models/Preference');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../services/logger');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'user'
    });

    const token = jwt.sign(
      { userId: user._id || user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Initialize default preferences
    await Preference.upsert(String(user._id || user.id), {});

    logger.info('User registered successfully', { userId: user._id, email: user.email });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await User.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { userId: user._id || user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('User logged in successfully', { userId: user._id, email: user.email });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    End user session
 * @access  Public / Authenticated
 */
router.post('/logout', (req, res) => {
  logger.info('User logged out');
  res.json({
    success: true,
    message: 'Session closed successfully.'
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const preferences = await Preference.findOne({ userId: String(user._id || user.id) });

    res.json({
      success: true,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        preferences
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
