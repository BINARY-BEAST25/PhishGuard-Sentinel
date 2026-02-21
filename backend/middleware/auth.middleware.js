/**
 * JWT Authentication middleware.
 * Verifies token from Authorization header and attaches user to request.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Restrict to parent role only
const parentOnly = (req, res, next) => {
  if (req.user?.role !== 'parent') {
    return res.status(403).json({ error: 'Access restricted to parents only' });
  }
  next();
};

module.exports = { protect, parentOnly };
