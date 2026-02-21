const ChildProfile = require('../models/ChildProfile');
const { v4: uuidv4 } = require('uuid');

// POST /api/child/add
exports.addChild = async (req, res) => {
  try {
    const { name, filteringLevel } = req.body;
    const deviceId = uuidv4();
    const child = await ChildProfile.create({
      parentId: req.user._id,
      name,
      filteringLevel: filteringLevel || 'moderate',
      deviceId,
    });
    res.status(201).json({ child, deviceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/child/list
exports.listChildren = async (req, res) => {
  try {
    const children = await ChildProfile.find({ parentId: req.user._id }).sort({ createdAt: -1 });
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/child/:id
exports.getChild = async (req, res) => {
  try {
    const child = await ChildProfile.findOne({ _id: req.params.id, parentId: req.user._id });
    if (!child) return res.status(404).json({ error: 'Child profile not found' });
    res.json({ child });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/child/:id
exports.updateChild = async (req, res) => {
  try {
    const { name, filteringLevel, customSettings, allowedSites, blockedSites, timeRestrictions, isActive } = req.body;
    const child = await ChildProfile.findOneAndUpdate(
      { _id: req.params.id, parentId: req.user._id },
      { name, filteringLevel, customSettings, allowedSites, blockedSites, timeRestrictions, isActive },
      { new: true, runValidators: true }
    );
    if (!child) return res.status(404).json({ error: 'Child profile not found' });
    res.json({ child });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/child/remove/:id
exports.removeChild = async (req, res) => {
  try {
    const child = await ChildProfile.findOneAndDelete({ _id: req.params.id, parentId: req.user._id });
    if (!child) return res.status(404).json({ error: 'Child profile not found' });
    res.json({ message: 'Child profile removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/child/settings/:deviceId — used by the extension to fetch settings
exports.getChildSettingsByDevice = async (req, res) => {
  try {
    const child = await ChildProfile.findOne({ deviceId: req.params.deviceId, isActive: true });
    if (!child) return res.status(404).json({ error: 'Device not registered' });
    res.json({
      filteringLevel: child.filteringLevel,
      customSettings: child.customSettings,
      allowedSites: child.allowedSites,
      blockedSites: child.blockedSites,
      timeRestrictions: child.timeRestrictions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
