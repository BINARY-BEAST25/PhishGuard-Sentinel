/**
 * Moderation Routes
 *
 * These endpoints are called by the Chrome extension (content.js / background.js).
 * Authentication is via deviceId embedded in the request body — no JWT required
 * here since the extension identifies devices, not users.
 *
 * Rate limiting: stricter than default to protect Gemini API quota.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const ctrl = require('../controllers/moderate.controller');

// 60 moderation requests per minute per IP (generous for family use)
const moderationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many moderation requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(moderationLimiter);

// POST /api/moderate/text
router.post(
  '/text',
  [body('text').isString().notEmpty().withMessage('text is required'), validate],
  ctrl.moderateTextHandler
);

// POST /api/moderate/image
router.post(
  '/image',
  [body('imageUrls').isArray({ min: 1 }).withMessage('imageUrls array is required'), validate],
  ctrl.moderateImageHandler
);

// POST /api/moderate/url
router.post(
  '/url',
  [body('url').isURL().withMessage('valid url is required'), validate],
  ctrl.moderateUrlHandler
);

// POST /api/moderate/page  (combined: preferred by extension to minimize round-trips)
router.post(
  '/page',
  [body('url').isURL().withMessage('valid url is required'), validate],
  ctrl.moderatePageHandler
);

module.exports = router;
