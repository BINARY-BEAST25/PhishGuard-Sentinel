const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { validate } = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/auth.controller');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  validate,
], ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], ctrl.login);

router.post('/verify', [body('token').notEmpty(), validate], ctrl.verifyEmail);
router.post('/forgot-password', [body('email').isEmail(), validate], ctrl.forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
  validate,
], ctrl.resetPassword);

router.get('/me', protect, ctrl.getMe);

module.exports = router;
