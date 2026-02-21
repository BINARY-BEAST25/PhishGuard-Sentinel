const axios = require('axios');
const { getDb } = require('../config/firebase');

const FIREBASE_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts:';

const mapFirebaseError = (code) => {
  const table = {
    EMAIL_EXISTS: { status: 409, message: 'Email already registered' },
    INVALID_LOGIN_CREDENTIALS: { status: 401, message: 'Invalid credentials' },
    INVALID_PASSWORD: { status: 401, message: 'Invalid credentials' },
    EMAIL_NOT_FOUND: { status: 401, message: 'Invalid credentials' },
    USER_DISABLED: { status: 403, message: 'Account disabled' },
    INVALID_OOB_CODE: { status: 400, message: 'Invalid token' },
    EXPIRED_OOB_CODE: { status: 400, message: 'Expired token' },
    TOO_MANY_ATTEMPTS_TRY_LATER: { status: 429, message: 'Too many attempts. Try again later.' },
    OPERATION_NOT_ALLOWED: { status: 400, message: 'Email/password auth is not enabled in Firebase.' },
  };

  return table[code] || { status: 400, message: code || 'Authentication error' };
};

const firebaseAuthRequest = async (endpoint, payload) => {
  if (!process.env.FIREBASE_WEB_API_KEY) {
    throw new Error('Missing FIREBASE_WEB_API_KEY');
  }

  const url = `${FIREBASE_BASE}${endpoint}?key=${process.env.FIREBASE_WEB_API_KEY}`;
  try {
    const { data } = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    return data;
  } catch (error) {
    const code = error?.response?.data?.error?.message || 'FIREBASE_AUTH_ERROR';
    const err = new Error(code);
    err.code = code;
    throw err;
  }
};

const getUserProfile = async (uid) => {
  const ref = getDb().collection('users').doc(uid);
  const snap = await ref.get();
  return snap.exists ? snap.data() || {} : null;
};

const saveUserProfile = async (uid, profile) => {
  await getDb().collection('users').doc(uid).set(profile, { merge: true });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const signup = await firebaseAuthRequest('signUp', {
      email,
      password,
      returnSecureToken: true,
    });

    const now = Date.now();
    await saveUserProfile(signup.localId, {
      name: (name || '').trim() || 'Parent',
      email: (email || '').trim().toLowerCase(),
      role: 'parent',
      isVerified: false,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
    });

    await firebaseAuthRequest('sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken: signup.idToken,
      continueUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    });

    return res.status(201).json({
      message: 'Account created. Please verify your email.',
    });
  } catch (err) {
    const mapped = mapFirebaseError(err.code || err.message);
    return res.status(mapped.status).json({ error: mapped.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const signIn = await firebaseAuthRequest('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });

    const lookup = await firebaseAuthRequest('lookup', { idToken: signIn.idToken });
    const firebaseUser = lookup.users?.[0];

    if (!firebaseUser?.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    const now = Date.now();
    const existingProfile = (await getUserProfile(signIn.localId)) || {};
    const profile = {
      name: existingProfile.name || firebaseUser.displayName || 'Parent',
      email: (firebaseUser.email || email).toLowerCase(),
      role: existingProfile.role || 'parent',
      isVerified: true,
      updatedAt: now,
      lastLogin: now,
    };

    if (!existingProfile.createdAt) profile.createdAt = now;
    await saveUserProfile(signIn.localId, profile);

    return res.json({
      token: signIn.idToken,
      user: {
        _id: signIn.localId,
        id: signIn.localId,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        isVerified: true,
      },
    });
  } catch (err) {
    const mapped = mapFirebaseError(err.code || err.message);
    return res.status(mapped.status).json({ error: mapped.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    await firebaseAuthRequest('update', { oobCode: token });
    return res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    const mapped = mapFirebaseError(err.code || err.message);
    return res.status(mapped.status).json({ error: mapped.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await firebaseAuthRequest('sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
      continueUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    });
    return res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch {
    return res.json({ message: 'If that email exists, a reset link was sent.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    await firebaseAuthRequest('resetPassword', {
      oobCode: token,
      newPassword: password,
    });
    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    const mapped = mapFirebaseError(err.code || err.message);
    return res.status(mapped.status).json({ error: mapped.message });
  }
};

exports.getMe = async (req, res) => {
  return res.json({ user: req.user });
};
