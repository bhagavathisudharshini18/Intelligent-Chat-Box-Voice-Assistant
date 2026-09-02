const mongoose = require('mongoose');
const { getStatus } = require('../config/db');
const { getCollection } = require('./store');

const voiceSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  transcript: { type: String, default: '' },
  status: { type: String, enum: ['started', 'listening', 'transcribed', 'speaking', 'completed', 'failed'], default: 'started' },
  durationMs: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

let MongoVoiceSessionModel;
try {
  MongoVoiceSessionModel = mongoose.model('VoiceSession', voiceSessionSchema);
} catch (e) {
  MongoVoiceSessionModel = mongoose.models.VoiceSession;
}

const VoiceSession = {
  async create(data) {
    if (!getStatus().fallbackMode && MongoVoiceSessionModel) {
      try {
        return await MongoVoiceSessionModel.create(data);
      } catch (err) {}
    }
    return getCollection('voice_sessions').create(data);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (!getStatus().fallbackMode && MongoVoiceSessionModel) {
      try {
        return await MongoVoiceSessionModel.findByIdAndUpdate(id, update, options);
      } catch (err) {}
    }
    return getCollection('voice_sessions').findByIdAndUpdate(id, update, options);
  },

  async findOne(filter) {
    if (!getStatus().fallbackMode && MongoVoiceSessionModel) {
      try {
        return await MongoVoiceSessionModel.findOne(filter);
      } catch (err) {}
    }
    return getCollection('voice_sessions').findOne(filter);
  }
};

module.exports = VoiceSession;
