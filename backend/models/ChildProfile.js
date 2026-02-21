const mongoose = require('mongoose');

const childProfileSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  deviceId: { type: String, unique: true, sparse: true }, // Linked extension device
  filteringLevel: { type: String, enum: ['strict', 'moderate', 'custom', 'off'], default: 'moderate' },
  isActive: { type: Boolean, default: true },
  
  // Custom filter settings (used when filteringLevel = 'custom')
  customSettings: {
    blockAdult: { type: Boolean, default: true },
    blockViolence: { type: Boolean, default: true },
    blockGambling: { type: Boolean, default: false },
    blockSocialMedia: { type: Boolean, default: false },
    safeSearchLevel: { type: String, enum: ['strict', 'moderate'], default: 'moderate' },
  },

  // Website access control
  allowedSites: [{ type: String, lowercase: true }],
  blockedSites: [{ type: String, lowercase: true }],

  // Time restrictions
  timeRestrictions: {
    enabled: { type: Boolean, default: false },
    schedule: [{
      day: { type: Number, min: 0, max: 6 }, // 0=Sun, 6=Sat
      startTime: String, // "08:00"
      endTime: String,   // "22:00"
    }],
    dailyLimitMinutes: { type: Number, default: 0 }, // 0 = no limit
  },
}, { timestamps: true });

module.exports = mongoose.model('ChildProfile', childProfileSchema);
