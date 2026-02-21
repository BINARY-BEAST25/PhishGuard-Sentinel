// Authentication middleware - verify JWT tokens
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Restrict to specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions.' });
  }
  next();
};

// Validate that deviceId header belongs to a real child profile
const validateDevice = async (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(401).json({ error: 'Device ID required.' });
  }

  const ChildProfile = require('../models/ChildProfile');
  const child = await ChildProfile.findOne({ deviceId, isActive: true });

  if (!child) {
    return res.status(401).json({ error: 'Unknown or inactive device.' });
  }

  req.child = child;
  next();
};

module.exports = { protect, authorize, validateDevice };
