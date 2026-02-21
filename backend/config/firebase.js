const admin = require('firebase-admin');

let initialized = false;

const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

const ensureInitialized = () => {
  if (initialized) return;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing Firebase credentials: ${missing.join(', ')}`);
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  initialized = true;
};

const getDb = () => {
  ensureInitialized();
  return admin.firestore();
};

const getAuth = () => {
  ensureInitialized();
  return admin.auth();
};

module.exports = {
  getDb,
  getAuth,
};

