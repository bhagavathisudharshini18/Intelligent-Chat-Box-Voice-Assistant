const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getStatus } = require('../config/db');
const { getCollection } = require('./store');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['guest', 'user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

let MongoUserModel;
try {
  MongoUserModel = mongoose.model('User', userSchema);
} catch (e) {
  MongoUserModel = mongoose.models.User;
}

// Resilient Model Wrapper
const User = {
  async create(data) {
    if (!getStatus().fallbackMode && MongoUserModel) {
      try {
        return await MongoUserModel.create(data);
      } catch (err) {
        if (!getStatus().connected) {
          // fallback
        } else {
          throw err;
        }
      }
    }
    return getCollection('users').create(data);
  },

  async findOne(filter) {
    if (!getStatus().fallbackMode && MongoUserModel) {
      try {
        return await MongoUserModel.findOne(filter);
      } catch (err) {}
    }
    return getCollection('users').findOne(filter);
  },

  async findById(id) {
    if (!getStatus().fallbackMode && MongoUserModel) {
      try {
        return await MongoUserModel.findById(id);
      } catch (err) {}
    }
    return getCollection('users').findById(id);
  },

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  },

  async comparePassword(candidatePassword, hash) {
    return bcrypt.compare(candidatePassword, hash);
  }
};

module.exports = User;
