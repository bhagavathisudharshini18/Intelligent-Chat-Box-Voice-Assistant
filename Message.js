const mongoose = require('mongoose');
const { getStatus } = require('../config/db');
const { getCollection } = require('./store');

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  sender: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  inputType: { type: String, enum: ['text', 'voice'], default: 'text' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

let MongoMessageModel;
try {
  MongoMessageModel = mongoose.model('Message', messageSchema);
} catch (e) {
  MongoMessageModel = mongoose.models.Message;
}

const Message = {
  async create(data) {
    if (!getStatus().fallbackMode && MongoMessageModel) {
      try {
        return await MongoMessageModel.create(data);
      } catch (err) {}
    }
    return getCollection('messages').create(data);
  },

  async find(filter = {}) {
    if (!getStatus().fallbackMode && MongoMessageModel) {
      try {
        return await MongoMessageModel.find(filter).sort({ timestamp: 1 });
      } catch (err) {}
    }
    return getCollection('messages').find(filter);
  },

  async deleteMany(filter = {}) {
    if (!getStatus().fallbackMode && MongoMessageModel) {
      try {
        return await MongoMessageModel.deleteMany(filter);
      } catch (err) {}
    }
    return getCollection('messages').deleteMany(filter);
  }
};

module.exports = Message;
