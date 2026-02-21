# SafeGuard AI — Deployment Guide

## Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Render account (backend)
- Vercel account (frontend)

## Step 1: MongoDB Atlas
1. Go to mongodb.com/atlas and create a free cluster
2. Database Access → Add User (username + auto-generated password)
3. Network Access → Add IP Address → 0.0.0.0/0 (allow all)
4. Connect → Drivers → Copy connection string
5. Replace <password> in the string

## Step 2: Get API Keys

### OpenAI
- platform.openai.com → API Keys → Create new key
- Needs billing enabled for moderation API

### Google Cloud Vision (SafeSearch)
- console.cloud.google.com
- Create project → Enable "Cloud Vision API"
- APIs & Services → Credentials → Create API Key

### Google Safe Browsing
- console.cloud.google.com → Same project
- Enable "Safe Browsing API"
- Create API Key (can reuse same key)

## Step 3: Deploy Backend to Render

1. Push your code to GitHub
2. render.com → New → Web Service
3. Connect repository
4. Settings:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
   - Environment: Node
5. Add environment variables (all from .env.example)
6. Deploy → Copy your URL (e.g. https://safeguard-api.onrender.com)

## Step 4: Deploy Frontend to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In frontend/package.json, change proxy to your Render URL
3. Run: `cd frontend && vercel --prod`
4. Follow prompts → copy deployment URL

## Step 5: Configure CORS

In backend .env, set:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Redeploy backend.

## Step 6: Load Chrome Extension

1. Update extension/background.js line 7:
   `const API_BASE = 'https://your-render-url.onrender.com/api';`
2. chrome://extensions → Developer mode on
3. Load unpacked → select extension/ folder

## SSL/HTTPS
Both Render and Vercel include free SSL. Never use HTTP in production.

## Redis (Optional)
- Redis Cloud: redis.com → free 30MB tier
- Add REDIS_URL to Render environment variables
- Reduces API costs significantly with caching

## Monitoring
- Add Sentry for error tracking: sentry.io
- UptimeRobot for uptime monitoring
- MongoDB Atlas has built-in monitoring

## Cost Estimate (Monthly)
| Service | Free Tier |
|---------|-----------|
| Render | 750 hrs/month free |
| Vercel | Unlimited static |
| MongoDB Atlas | 512MB free |
| Redis Cloud | 30MB free |
| OpenAI Moderation | ~$0.002 per 1K tokens |
| Google Vision | 1,000 units/month free |
| Google Safe Browsing | Free up to 10K/day |
