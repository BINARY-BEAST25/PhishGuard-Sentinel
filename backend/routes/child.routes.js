const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, parentOnly } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const ctrl = require('../controllers/child.controller');

router.use(protect, parentOnly);

router.post('/add', [body('name').trim().notEmpty(), validate], ctrl.addChild);
router.get('/list', ctrl.listChildren);
router.get('/:id', ctrl.getChild);
router.put('/:id', ctrl.updateChild);
router.delete('/remove/:id', ctrl.removeChild);

// Public route used by extension
router.get('/settings/:deviceId', ctrl.getChildSettingsByDevice);

module.exports = router;
