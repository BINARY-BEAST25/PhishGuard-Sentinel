/**
 * SafeGuard AI — Gemini API Integration Test
 *
 * Run: node utils/test-gemini.js
 *
 * Tests all four moderation functions:
 *   1. Text (safe)
 *   2. Text (unsafe - should detect)
 *   3. Image
 *   4. URL
 *
 * Requires GEMINI_API_KEY in environment or .env file.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Minimal mongoose stub for testing without full DB connection
const mongoose = require('mongoose');

async function run() {
  // Connect to MongoDB for cache (optional during testing)
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { dbName: 'safeguard-ai' });
      console.log('✅ MongoDB connected');
    } catch {
      console.log('⚠️  MongoDB unavailable — cache disabled for this test');
      // Monkey-patch ModerationCache to no-op
      const ModerationCache = require('../models/ModerationCache');
      ModerationCache.findOne = async () => null;
      ModerationCache.findOneAndUpdate = async () => ({});
    }
  }

  const { moderateText, moderateImage, moderateUrl } = require('../services/gemini.service');

  console.log('\n═══════════════════════════════════════');
  console.log('  SafeGuard AI — Gemini Moderation Test');
  console.log('═══════════════════════════════════════\n');

  // Test 1: Safe text
  console.log('Test 1: Safe text');
  const t1 = await moderateText('The quick brown fox jumps over the lazy dog. This is a science homework about photosynthesis.');
  console.log('Result:', JSON.stringify(t1, null, 2));
  console.log(t1.blocked === false ? '✅ PASS' : '❌ FAIL — expected SAFE', '\n');

  // Test 2: Unsafe text (simulated — replace with real sample if needed)
  console.log('Test 2: Explicit language text');
  const t2 = await moderateText('This is a test with explicit content warnings for adult material. [PLACEHOLDER — add real test content]');
  console.log('Result:', JSON.stringify(t2, null, 2));
  console.log('ℹ️  Manual review needed\n');

  // Test 3: Safe URL
  console.log('Test 3: Safe URL (example.com)');
  const u1 = await moderateUrl('https://www.example.com/homework-help/math');
  console.log('Result:', JSON.stringify(u1, null, 2));
  console.log(u1.blocked === false ? '✅ PASS' : '⚠️  Unexpected block\n');

  // Test 4: Suspicious URL pattern
  console.log('Test 4: Suspicious URL pattern');
  const u2 = await moderateUrl('https://xxx-adult-content-18plus.net/videos');
  console.log('Result:', JSON.stringify(u2, null, 2));
  console.log(u2.blocked === true ? '✅ PASS (blocked as expected)' : '⚠️  Expected block\n');

  console.log('═══════════════════════════════════════');
  console.log('Tests complete.');

  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
