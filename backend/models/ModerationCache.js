/**
 * ModerationCache — MongoDB-backed result cache for Gemini API calls.
 *
 * Purpose:
 *   - Avoid re-calling Gemini for identical content (costs + rate limits)
 *   - Works without Redis — pure MongoDB
 *   - TTL enforced at application layer (not MongoDB TTL index) for flexibility
 *
 * Schema:
 *   hash       — SHA-256 fingerprint of (type + content + filteringLevel)
 *   result     — The full moderation result JSON
 *   createdAt  — Timestamp for TTL calculation
 */

const mongoose = require('mongoose');

const moderationCacheSchema = new mongoose.Schema(
  {
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed, // Stores arbitrary JSON
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // No automatic timestamps — we manage createdAt manually for TTL control
    timestamps: false,
  }
);

// Auto-expire documents after 30 days via MongoDB TTL index
// This is a safety net; app-layer TTL check runs first
moderationCacheSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

module.exports = mongoose.model('ModerationCache', moderationCacheSchema);
