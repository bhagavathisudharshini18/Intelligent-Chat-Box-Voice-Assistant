const AuditLog = require('../models/AuditLog');

const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'apiKey', 'authorization', 'secret'];
  
  for (const key in copy) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      copy[key] = '[REDACTED]';
    } else if (typeof copy[key] === 'object') {
      copy[key] = sanitize(copy[key]);
    }
  }
  return copy;
};

const logger = {
  info(event, data = {}) {
    const safeData = sanitize(data);
    console.log(`[INFO] [${new Date().toISOString()}] ${event}`, safeData && Object.keys(safeData).length ? safeData : '');
    AuditLog.log(event, { status: 'info', ...safeData }).catch(() => {});
  },

  warn(event, data = {}) {
    const safeData = sanitize(data);
    console.warn(`[WARN] [${new Date().toISOString()}] ${event}`, safeData);
    AuditLog.log(event, { status: 'warning', ...safeData }).catch(() => {});
  },

  error(event, data = {}) {
    const safeData = sanitize(data);
    console.error(`[ERROR] [${new Date().toISOString()}] ${event}`, safeData);
    AuditLog.log(event, { status: 'error', ...safeData }).catch(() => {});
  }
};

module.exports = logger;
