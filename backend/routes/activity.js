const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateDevice } = require('../middleware/auth');
const { logActivity, getHistory, getStats } = require('../controllers/activityController');

// Extension logs activity using device auth
router.post('/log', validateDevice, logActivity);

// Parent views history using JWT auth
router.get('/history', protect, getHistory);
router.get('/stats', protect, getStats);

module.exports = router;
