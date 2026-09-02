const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Preference = require('../models/Preference');
const AIService = require('../services/aiService');
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../services/logger');

/**
 * @route   POST /api/chat/message
 * @desc    Send a message to the assistant and receive intelligent response
 * @access  Public / Guest / Authenticated
 */
router.post('/message', apiLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { message, conversationId, inputType = 'text', persona } = req.body;
    const userId = String(req.user.userId);

    // Validation (FR5, AC3)
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content cannot be empty or blank.'
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds maximum allowed length (4,000 characters).'
      });
    }

    const cleanMessage = message.trim();

    // Retrieve or create conversation session
    let convId = conversationId;
    let isNewConversation = false;

    if (!convId || convId === 'new') {
      // Auto-generate title from first 35 chars
      const autoTitle = cleanMessage.length > 35 
        ? cleanMessage.substring(0, 35) + '...' 
        : cleanMessage;

      const newConv = await Conversation.create({
        userId,
        title: autoTitle
      });
      convId = String(newConv._id || newConv.id);
      isNewConversation = true;
    } else {
      // Verify ownership if authenticated
      const existingConv = await Conversation.findById(convId);
      if (existingConv && existingConv.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to this conversation.'
        });
      }
    }

    // Save User message
    const userMsg = await Message.create({
      conversationId: convId,
      sender: 'user',
      content: cleanMessage,
      inputType: inputType === 'voice' ? 'voice' : 'text'
    });

    // Determine Persona
    let activePersona = persona;
    if (!activePersona) {
      const userPref = await Preference.findOne({ userId });
      activePersona = userPref ? userPref.aiPersona : 'helpful_assistant';
    }

    // Process via AI/NLP Layer (FR6, FR7, AC6, AC7)
    const startTime = Date.now();
    const aiResult = await AIService.generateResponse({
      prompt: cleanMessage,
      conversationId: convId,
      persona: activePersona
    });
    const processingTimeMs = Date.now() - startTime;

    // Save Assistant message
    const assistantMsg = await Message.create({
      conversationId: convId,
      sender: 'assistant',
      content: aiResult.text,
      metadata: {
        provider: aiResult.provider,
        processingTimeMs
      }
    });

    // Update conversation timestamp
    await Conversation.findByIdAndUpdate(convId, {
      lastMessageAt: new Date()
    });

    logger.info('Chat message processed', {
      userId,
      conversationId: convId,
      inputType,
      provider: aiResult.provider,
      processingTimeMs
    });

    res.json({
      success: true,
      conversationId: convId,
      isNewConversation,
      userMessage: {
        id: userMsg._id || userMsg.id,
        sender: 'user',
        content: userMsg.content,
        inputType: userMsg.inputType,
        timestamp: userMsg.timestamp
      },
      assistantMessage: {
        id: assistantMsg._id || assistantMsg.id,
        sender: 'assistant',
        content: assistantMsg.content,
        provider: aiResult.provider,
        processingTimeMs,
        timestamp: assistantMsg.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/chat/personas
 * @desc    List available AI assistant personas
 * @access  Public
 */
router.get('/personas', (req, res) => {
  res.json({
    success: true,
    personas: [
      { id: 'helpful_assistant', name: 'Intelligent Assistant', description: 'Polite, clear, and comprehensive general assistant.' },
      { id: 'code_helper', name: 'Code Expert', description: 'Concise, clean code implementations and technical debugging.' },
      { id: 'tutor', name: 'Academic Tutor', description: 'Step-by-step simple explanations with helpful analogies.' },
      { id: 'creative', name: 'Creative Writer', description: 'Engaging, imaginative storytelling and brainstorming.' },
      { id: 'concise', name: 'Concise & Direct', description: 'Brief 1-2 sentence direct answers without filler.' }
    ]
  });
});

module.exports = router;
