require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const childRoutes = require('./routes/child.routes');
const moderateRoutes = require('./routes/moderate.routes');
const activityRoutes = require('./routes/activity.routes');
const { getDb } = require('./config/firebase');

const app = express();

app.set('trust proxy', 1);

const REQUIRED_ENV = [
  'GEMINI_API_KEY',
  'FIREBASE_WEB_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

try {
  getDb();
  console.log('[Firebase] Initialized');
} catch (err) {
  console.error('[Firebase] Initialization failed:', err.message);
  process.exit(1);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/child', childRoutes);
app.use('/api/moderate', moderateRoutes);
app.use('/api/activity', activityRoutes);

app.get('/api/health', (_, res) =>
  res.json({
    status: 'ok',
    version: '3.0',
    ai: 'Gemini',
    data: 'Firestore',
    auth: 'Firebase Auth',
    ts: new Date().toISOString(),
  })
);

app.use((_, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PhishGuard Sentinel backend running on port ${PORT}`);
});

module.exports = app;

