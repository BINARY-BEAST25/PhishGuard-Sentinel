/**
 * SafeGuard AI — Server Entry Point (v2.0, Gemini-Powered)
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const authRoutes      = require('./routes/auth.routes');
const childRoutes     = require('./routes/child.routes');
const moderateRoutes  = require('./routes/moderate.routes');
const activityRoutes  = require('./routes/activity.routes');

const app = express();

/* ✅ FIX FOR RATE LIMIT + PROXY ERROR */
app.set('trust proxy', 1);

// ─── Validate required env vars on startup ────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Auth-specific limiter
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 20 
});

// ─── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/child',    childRoutes);
app.use('/api/moderate', moderateRoutes);
app.use('/api/activity', activityRoutes);

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', version: '2.0', ai: 'Gemini', ts: new Date().toISOString() })
);

// ─── Error handlers ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI, { dbName: 'safeguard-ai' })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () =>
      console.log(`🚀 SafeGuard AI (Gemini) running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;