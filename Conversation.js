const mongoose = require('mongoose');
const { getStatus } = require('../config/db');
const { getCollection } = require('./store');

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'New Conversation' },
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let MongoConversationModel;
try {
  MongoConversationModel = mongoose.model('Conversation', conversationSchema);
} catch (e) {
  MongoConversationModel = mongoose.models.Conversation;
}

const Conversation = {
  async create(data) {
    if (!getStatus().fallbackMode && MongoConversationModel) {
      try {
        return await MongoConversationModel.create(data);
      } catch (err) {}
    }
    return getCollection('conversations').create(data);
  },

  async find(filter = {}) {
    if (!getStatus().fallbackMode && MongoConversationModel) {
      try {
        return await MongoConversationModel.find(filter).sort({ updatedAt: -1 });
      } catch (err) {}
    }
    return getCollection('conversations').find(filter);
  },

  async findById(id) {
    if (!getStatus().fallbackMode && MongoConversationModel) {
      try {
        return await MongoConversationModel.findById(id);
      } catch (err) {}
    }
    return getCollection('conversations').findById(id);
  },

  async findOne(filter) {
    if (!getStatus().fallbackMode && MongoConversationModel) {
      try {
        return await MongoConversationModel.findOne(filter);
      } catch (err) {}
    }
    return getCollection('conversations').findOne(filter);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (!getStatus().fallbackMode && MongoConversationModel) {
      try {
        return await MongoConversationModel.findByIdAndUpdate(id, update, options);
      } catch (err) {}
    }
    return getCollection('conversations').findByIdAndUpdate(id, update, options);
  },

  async deleteOne(filter) {
    if (!getStatus().fallbackMode && MongoConversationModel) {
      try {
        return await MongoConversationModel.deleteOne(filter);
      } catch (err) {}
    }
    return getCollection('conversations').deleteOne(filter);
  }
};

module.exports = Conversation;
