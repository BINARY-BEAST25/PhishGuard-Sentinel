const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validateDevice } = require('../middleware/auth');
const { addChild, listChildren, getChild, updateChild, removeChild, getChildConfig } = require('../controllers/childController');

// Parent-authenticated routes
router.post('/add', protect, [
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('filteringLevel').optional().isIn(['strict', 'moderate', 'custom', 'off'])
], addChild);

router.get('/list', protect, listChildren);
router.get('/:id', protect, getChild);
router.put('/:id', protect, updateChild);
router.delete('/remove/:id', protect, (req, res, next) => {
  req.params.id = req.params.id;
  next();
}, require('../controllers/childController').removeChild);

// Device-authenticated route (used by extension)
router.get('/config/me', validateDevice, getChildConfig);

module.exports = router;
