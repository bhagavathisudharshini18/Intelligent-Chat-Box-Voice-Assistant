const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const logger = require('../services/logger');

/**
 * @route   GET /api/conversations
 * @desc    List all conversations for active user
 * @access  Public / Guest / Authenticated
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = String(req.user.userId);
    const conversations = await Conversation.find({ userId });
    
    // Sort descending by updatedAt
    const list = (conversations || []).sort((a, b) => new Date(b.updatedAt || b.lastMessageAt) - new Date(a.updatedAt || a.lastMessageAt));

    res.json({
      success: true,
      count: list.length,
      conversations: list.map(c => ({
        id: c._id || c.id,
        title: c.title,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/conversations/:id
 * @desc    Get full message history for a specific conversation
 * @access  Public / Guest / Authenticated
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = String(req.user.userId);

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found.'
      });
    }

    // Authorization check (FR10, AC10)
    if (conversation.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to view this conversation.'
      });
    }

    const messages = await Message.find({ conversationId: id });
    const sortedMessages = (messages || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      conversation: {
        id: conversation._id || conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      messages: sortedMessages.map(m => ({
        id: m._id || m.id,
        sender: m.sender,
        content: m.content,
        inputType: m.inputType,
        metadata: m.metadata,
        timestamp: m.timestamp
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/conversations
 * @desc    Create a new conversation session
 * @access  Public / Authenticated
 */
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { title } = req.body;
    const userId = String(req.user.userId);

    const newConv = await Conversation.create({
      userId,
      title: (title && title.trim()) || 'New Conversation'
    });

    res.status(201).json({
      success: true,
      conversation: {
        id: newConv._id || newConv.id,
        title: newConv.title,
        createdAt: newConv.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Delete a conversation and its messages
 * @access  Public / Authenticated
 */
router.delete('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = String(req.user.userId);

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found.'
      });
    }

    if (conversation.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You cannot delete this conversation.'
      });
    }

    await Conversation.deleteOne({ _id: id });
    await Message.deleteMany({ conversationId: id });

    logger.info('Conversation deleted', { userId, conversationId: id });

    res.json({
      success: true,
      message: 'Conversation deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
