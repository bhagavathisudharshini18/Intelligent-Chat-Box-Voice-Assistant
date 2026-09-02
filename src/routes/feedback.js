const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { optionalAuth } = require('../middleware/auth');
const logger = require('../services/logger');

/**
 * @route   POST /api/feedback
 * @desc    Submit user feedback or error report
 * @access  Public / Authenticated
 */
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { category = 'feedback', message, rating, conversationId } = req.body;
    const userId = String(req.user.userId);

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Feedback message cannot be empty.'
      });
    }

    const cleanMessage = message.trim();

    await AuditLog.log('user_feedback', {
      userId,
      status: 'info',
      details: {
        category,
        message: cleanMessage,
        rating: rating || null,
        conversationId: conversationId || null
      }
    });

    logger.info('Feedback submitted', { userId, category });

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
