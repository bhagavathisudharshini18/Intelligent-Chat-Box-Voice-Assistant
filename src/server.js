require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB, getStatus } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./services/logger');

// Route imports
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const voiceRoutes = require('./routes/voice');
const conversationRoutes = require('./routes/conversations');
const preferenceRoutes = require('./routes/preferences');
const feedbackRoutes = require('./routes/feedback');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    aiProvider: process.env.DEFAULT_AI_PROVIDER || 'built-in',
    version: '1.0.0'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/feedback', feedbackRoutes);

// Catch-all route for SPA HTML fallback
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handler
app.use(errorHandler);

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Intelligent Chat Box & Voice Assistant Server`);
      console.log(`📡 Server running at: http://localhost:${PORT}`);
      console.log(`🛠️  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Storage: ${getStatus().driver}`);
      console.log(`======================================================\n`);
    });
  });
}

module.exports = app;
