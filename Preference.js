const mongoose = require('mongoose');
const { getStatus } = require('../config/db');
const { getCollection } = require('./store');

const preferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  language: { type: String, default: 'en-US' },
  voiceEnabled: { type: Boolean, default: true },
  ttsEnabled: { type: Boolean, default: true },
  autoSpeak: { type: Boolean, default: false },
  voiceName: { type: String, default: 'default' },
  speechRate: { type: Number, default: 1.0 },
  speechPitch: { type: Number, default: 1.0 },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  aiPersona: { type: String, default: 'helpful_assistant' },
  updatedAt: { type: Date, default: Date.now }
});

let MongoPreferenceModel;
try {
  MongoPreferenceModel = mongoose.model('Preference', preferenceSchema);
} catch (e) {
  MongoPreferenceModel = mongoose.models.Preference;
}

const defaultPreferences = {
  language: 'en-US',
  voiceEnabled: true,
  ttsEnabled: true,
  autoSpeak: false,
  voiceName: 'default',
  speechRate: 1.0,
  speechPitch: 1.0,
  theme: 'dark',
  aiPersona: 'helpful_assistant'
};

const Preference = {
  async findOne(filter) {
    if (!getStatus().fallbackMode && MongoPreferenceModel) {
      try {
        const found = await MongoPreferenceModel.findOne(filter);
        if (found) return found;
      } catch (err) {}
    }
    const res = await getCollection('preferences').findOne(filter);
    if (!res && filter.userId) {
      return { userId: filter.userId, ...defaultPreferences };
    }
    return res;
  },

  async upsert(userId, updateData) {
    const data = { ...updateData, updatedAt: new Date() };
    if (!getStatus().fallbackMode && MongoPreferenceModel) {
      try {
        return await MongoPreferenceModel.findOneAndUpdate(
          { userId },
          { $set: data },
          { new: true, upsert: true }
        );
      } catch (err) {}
    }
    return getCollection('preferences').findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true }
    );
  }
};

module.exports = Preference;
