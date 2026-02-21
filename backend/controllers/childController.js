// Child Controller - Manage child profiles
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const ChildProfile = require('../models/ChildProfile');

// POST /api/child/add
const addChild = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, filteringLevel, pin } = req.body;

  try {
    // Check parent hasn't exceeded child limit (soft limit: 10 per account)
    const count = await ChildProfile.countDocuments({ parentId: req.user._id });
    if (count >= 10) return res.status(400).json({ error: 'Maximum 10 child profiles allowed.' });

    const childData = {
      parentId: req.user._id,
      name,
      deviceId: uuidv4(), // Generate unique device ID for extension
      filteringLevel: filteringLevel || 'moderate'
    };

    if (pin) {
      childData.pin = await bcrypt.hash(pin, 10);
    }

    const child = await ChildProfile.create(childData);

    res.status(201).json({
      message: 'Child profile created.',
      child: {
        id: child._id,
        name: child.name,
        deviceId: child.deviceId,
        filteringLevel: child.filteringLevel,
        isActive: child.isActive
      }
    });
  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({ error: 'Failed to create child profile.' });
  }
};

// GET /api/child/list
const listChildren = async (req, res) => {
  try {
    const children = await ChildProfile.find(
      { parentId: req.user._id },
      '-pin'
    ).lean();

    res.json({ children });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch children.' });
  }
};

// GET /api/child/:id
const getChild = async (req, res) => {
  try {
    const child = await ChildProfile.findOne(
      { _id: req.params.id, parentId: req.user._id },
      '-pin'
    );
    if (!child) return res.status(404).json({ error: 'Child not found.' });
    res.json({ child });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch child.' });
  }
};

// PUT /api/child/:id - Update child profile settings
const updateChild = async (req, res) => {
  const { filteringLevel, allowedSites, blockedSites, timeRestrictions, customSettings, isActive } = req.body;

  try {
    const child = await ChildProfile.findOne({ _id: req.params.id, parentId: req.user._id });
    if (!child) return res.status(404).json({ error: 'Child not found.' });

    if (filteringLevel !== undefined) child.filteringLevel = filteringLevel;
    if (allowedSites !== undefined) child.allowedSites = allowedSites;
    if (blockedSites !== undefined) child.blockedSites = blockedSites;
    if (timeRestrictions !== undefined) child.timeRestrictions = timeRestrictions;
    if (customSettings !== undefined) child.customSettings = { ...child.customSettings, ...customSettings };
    if (isActive !== undefined) child.isActive = isActive;

    await child.save();
    res.json({ message: 'Child profile updated.', child });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update child.' });
  }
};

// DELETE /api/child/:id
const removeChild = async (req, res) => {
  try {
    const result = await ChildProfile.findOneAndDelete({
      _id: req.params.id,
      parentId: req.user._id
    });
    if (!result) return res.status(404).json({ error: 'Child not found.' });
    res.json({ message: 'Child profile removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove child.' });
  }
};

// GET /api/child/:id/config - Extension fetches child config (authenticated via deviceId)
const getChildConfig = async (req, res) => {
  // req.child set by validateDevice middleware
  const child = req.child;
  res.json({
    filteringLevel: child.filteringLevel,
    allowedSites: child.allowedSites,
    blockedSites: child.blockedSites,
    timeRestrictions: child.timeRestrictions,
    customSettings: child.customSettings,
    isActive: child.isActive
  });
};

module.exports = { addChild, listChildren, getChild, updateChild, removeChild, getChildConfig };
