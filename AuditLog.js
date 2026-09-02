const mongoose = require('mongoose');
const { getStatus } = require('../config/db');
const { getCollection } = require('./store');

const auditLogSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
  event: { type: String, required: true },
  status: { type: String, enum: ['success', 'warning', 'error', 'info'], default: 'info' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

let MongoAuditLogModel;
try {
  MongoAuditLogModel = mongoose.model('AuditLog', auditLogSchema);
} catch (e) {
  MongoAuditLogModel = mongoose.models.AuditLog;
}

const AuditLog = {
  async log(event, data = {}) {
    const entry = {
      userId: data.userId || 'anonymous',
      event,
      status: data.status || 'info',
      details: data.details || {},
      ip: data.ip || '',
      timestamp: new Date()
    };
    if (!getStatus().fallbackMode && MongoAuditLogModel) {
      try {
        return await MongoAuditLogModel.create(entry);
      } catch (err) {}
    }
    return getCollection('audit_logs').create(entry);
  }
};

module.exports = AuditLog;
