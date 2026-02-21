const { getAuth, getDb } = require('../config/firebase');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userRef = getDb().collection('users').doc(uid);
    const snap = await userRef.get();

    let userData;
    if (!snap.exists) {
      userData = {
        name: decoded.name || 'Parent',
        email: decoded.email || null,
        role: 'parent',
        isVerified: !!decoded.email_verified,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await userRef.set(userData);
    } else {
      userData = snap.data() || {};
    }

    req.user = {
      _id: uid,
      id: uid,
      uid,
      name: userData.name || decoded.name || 'Parent',
      email: userData.email || decoded.email || null,
      role: userData.role || 'parent',
      isVerified: userData.isVerified ?? !!decoded.email_verified,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const parentOnly = (req, res, next) => {
  if (req.user?.role !== 'parent') {
    return res.status(403).json({ error: 'Access restricted to parents only' });
  }
  return next();
};

module.exports = { protect, parentOnly };

