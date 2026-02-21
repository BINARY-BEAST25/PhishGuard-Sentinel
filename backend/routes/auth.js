const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/(?=.*[A-Z])(?=.*[0-9])/)
    .withMessage('Password must be 8+ chars with at least one uppercase letter and number')
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], login);

router.post('/verify', verifyEmail);
router.post('/forgot-password', [body('email').isEmail()], forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], resetPassword);

module.exports = router;
