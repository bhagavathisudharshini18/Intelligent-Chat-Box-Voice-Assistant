const logger = require('../services/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled request error', {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : message,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
