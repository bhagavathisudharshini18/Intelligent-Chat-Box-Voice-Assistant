const express = require('express');
const router = express.Router();
const Preference = require('../models/Preference');
const { optionalAuth } = require('../middleware/auth');
const logger = require('../services/logger');

/**
 * @route   GET /api/preferences
 * @desc    Get preferences for active user
 * @access  Public / Authenticated
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = String(req.user.userId);
    const preferences = await Preference.findOne({ userId });

    res.json({
      success: true,
      preferences: preferences || {
        userId,
        language: 'en-US',
        voiceEnabled: true,
        ttsEnabled: true,
        autoSpeak: false,
        voiceName: 'default',
        speechRate: 1.0,
        speechPitch: 1.0,
        theme: 'dark',
        aiPersona: 'helpful_assistant'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/preferences
 * @desc    Update preferences
 * @access  Public / Authenticated
 */
router.put('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = String(req.user.userId);
    const {
      language,
      voiceEnabled,
      ttsEnabled,
      autoSpeak,
      voiceName,
      speechRate,
      speechPitch,
      theme,
      aiPersona
    } = req.body;

    const updateData = {};
    if (language !== undefined) updateData.language = String(language);
    if (voiceEnabled !== undefined) updateData.voiceEnabled = Boolean(voiceEnabled);
    if (ttsEnabled !== undefined) updateData.ttsEnabled = Boolean(ttsEnabled);
    if (autoSpeak !== undefined) updateData.autoSpeak = Boolean(autoSpeak);
    if (voiceName !== undefined) updateData.voiceName = String(voiceName);
    if (speechRate !== undefined) updateData.speechRate = Math.max(0.5, Math.min(2.0, Number(speechRate)));
    if (speechPitch !== undefined) updateData.speechPitch = Math.max(0.5, Math.min(2.0, Number(speechPitch)));
    if (theme !== undefined && ['dark', 'light'].includes(theme)) updateData.theme = theme;
    if (aiPersona !== undefined) updateData.aiPersona = String(aiPersona);

    const updated = await Preference.upsert(userId, updateData);

    logger.info('Preferences updated', { userId, updatedKeys: Object.keys(updateData) });

    res.json({
      success: true,
      message: 'Preferences updated successfully.',
      preferences: updated
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
