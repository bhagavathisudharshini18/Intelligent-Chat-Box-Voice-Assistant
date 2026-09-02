const mongoose = require('mongoose');

let isConnected = false;
let isFallbackMode = false;

const connectDB = async () => {
  if (isConnected) return;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intelligent_chatbox';
  
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    isConnected = true;
    isFallbackMode = false;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database] MongoDB connection failed (${error.message}). Activating In-Memory/Local Storage Fallback Mode.`);
    isFallbackMode = true;
    isConnected = true;
  }
};

const getStatus = () => ({
  connected: isConnected,
  fallbackMode: isFallbackMode,
  driver: isFallbackMode ? 'In-Memory Fallback Store' : 'MongoDB / Mongoose'
});

module.exports = { connectDB, getStatus, mongoose };
