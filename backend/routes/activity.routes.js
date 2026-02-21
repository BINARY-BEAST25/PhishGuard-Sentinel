const express = require('express');
const router = express.Router();
const { protect, parentOnly } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/activity.controller');

// Extension can log activities without parent auth token (uses deviceId)
router.post('/log', ctrl.logActivity);

// Parent dashboard routes require auth
router.get('/history', protect, parentOnly, ctrl.getHistory);
router.get('/analytics', protect, parentOnly, ctrl.getAnalytics);

module.exports = router;
