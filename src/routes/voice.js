const express = require('express');
const router = express.Router();
const VoiceSession = require('../models/VoiceSession');
const Preference = require('../models/Preference');
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../services/logger');

/**
 * @route   POST /api/voice/transcribe
 * @desc    Accepts recognized voice transcripts or STT requests, records voice session telemetry
 * @access  Public / Authenticated
 */
router.post('/transcribe', apiLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { transcript, sessionId, durationMs = 0, confidence = 1.0 } = req.body;
    const userId = String(req.user.userId);

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No transcript provided or transcript was empty.'
      });
    }

    const cleanTranscript = transcript.trim();
    const activeSessionId = sessionId || 'v_sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

    const session = await VoiceSession.create({
      sessionId: activeSessionId,
      userId,
      transcript: cleanTranscript,
      status: 'transcribed',
      durationMs,
      metadata: { confidence, clientEngine: 'WebSpeechAPI' }
    });

    logger.info('Voice session transcribed', { userId, sessionId: activeSessionId, length: cleanTranscript.length });

    res.json({
      success: true,
      sessionId: activeSessionId,
      transcript: cleanTranscript,
      status: 'transcribed',
      timestamp: session.timestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/voice/speak
 * @desc    Prepares TTS synthesis parameters, validates text, and returns speech configuration
 * @access  Public / Authenticated
 */
router.post('/speak', apiLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { text, language, voiceName, rate, pitch } = req.body;
    const userId = String(req.user.userId);

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text to synthesize cannot be empty.'
      });
    }

    // Clean text of markdown formatting (backticks, asterisks, headers, code fences) for smooth speech
    const cleanSpeechText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted for voice playback.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    const userPref = await Preference.findOne({ userId });

    const speechConfig = {
      text: cleanSpeechText,
      language: language || (userPref ? userPref.language : 'en-US'),
      voiceName: voiceName || (userPref ? userPref.voiceName : 'default'),
      rate: rate || (userPref ? userPref.speechRate : 1.0),
      pitch: pitch || (userPref ? userPref.speechPitch : 1.0)
    };

    res.json({
      success: true,
      speechConfig,
      characterCount: cleanSpeechText.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
