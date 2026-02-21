const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { validateDevice } = require('../middleware/auth');
const { moderateUrlHandler, moderateTextHandler, moderateImageHandler } = require('../controllers/moderationController');

// Stricter rate limit for moderation - 300 requests per minute per device
const moderationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: (req) => req.headers['x-device-id'] || req.ip,
  message: { error: 'Moderation rate limit exceeded.' }
});

router.use(validateDevice, moderationLimiter);

router.post('/url', moderateUrlHandler);
router.post('/text', moderateTextHandler);
router.post('/image', moderateImageHandler);

module.exports = router;
