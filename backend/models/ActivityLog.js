const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  childId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChildProfile', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  domain: String,
  title: String,
  type: { type: String, enum: ['url', 'text', 'image', 'page'], default: 'page' },
  status: { type: String, enum: ['allowed', 'blocked'], required: true },
  blockReason: String, // e.g., 'adult_content', 'violence', 'malware'
  moderationScore: Number, // 0-1 confidence
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

// Index for fast queries by child/parent
activityLogSchema.index({ childId: 1, timestamp: -1 });
activityLogSchema.index({ parentId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
