# PhishGuard Sentinel

PhishGuard Sentinel is a Chrome extension + web dashboard for phishing and unsafe-content defense.

## Stack
- `Frontend`: React dashboard
- `Extension`: Chrome MV3
- `Backend`: Node + Express
- `Auth`: Firebase Authentication
- `Database`: Firestore (Firebase)
- `Hosting`: Firebase Hosting (recommended)
- `AI`: Google AI Studio Gemini API only
- `Cache`: Firestore cache + optional Redis free tier (`REDIS_URL`)
- `Email`: Firebase Auth built-in verification/reset email flows (free tier)

## No-Billing Mode
- Keep Firebase project on `Spark` plan.
- Use Firestore + Firebase Auth + Firebase Hosting only.
- Do not enable billing-only Firebase products.
- Keep Node backend outside Firebase billing products.
- Use Gemini free tier models:
  - `gemini-2.5-flash-lite` (text)
  - `gemini-2.5-flash` (vision)

## What It Scans
- Typosquats and suspicious URLs
- Homograph-style deceptive domains
- Unsafe text and images via Gemini moderation
- Activity and block events with logs in dashboard

## Extension Capabilities
- Device-linked protection using a unique `Device ID`
- Fast URL pre-check before full page scan
- Full page moderation using URL + visible text + image URLs
- Parent allowlist and blocklist enforcement (`allowedSites` / `blockedSites`)
- Filtering levels (`strict`, `moderate`, `custom`, `off`) from child settings
- Auto block page replacement when unsafe content is detected
- Parent lock password for disable/reset actions in popup
- Firestore activity logging for blocked events and dashboard analytics

## How Blocking Works
1. Extension reads local config (`deviceId`, `enabled`) from storage.
2. On page load, URL is checked first via backend endpoint `/api/moderate/url`.
3. If URL is unsafe, page is blocked immediately.
4. If URL passes, extension scans page text/images and sends them to `/api/moderate/page`.
5. Backend combines allowlist/blocklist rules and Gemini moderation result.
6. If blocked, extension replaces the page with a warning block screen.

## Current Security Notes
- No API key is stored in the extension. Keys stay on backend.
- If backend is unreachable/timeouts occur, extension currently fails open (`blocked: false`).
- For production, set `extension/background.js` `API_BASE` to deployed backend URL (not localhost).

## Quick Start

### 1) Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2) Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

### 3) Extension
1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `extension/` folder

Direct download link:
- `https://github.com/BINARY-BEAST25/PhishGuard-Sentinel/raw/main/PhishGuard-Sentinel-Extension.zip` (extension only)

Parent setup flow after login:
1. Login to dashboard
2. Create/select child profile and copy Device ID
3. Download and extract the extension-only ZIP
4. Load `extension/` in Chrome from `chrome://extensions`
5. Paste Device ID in extension popup and activate protection

## Required Backend Env
See `backend/.env.example`.

Minimum required:
- `GEMINI_API_KEY`
- `FIREBASE_WEB_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Important:
- The browser extension itself does not need any API key input.
- The backend must have the keys above.
- `extension/background.js` must point `API_BASE` to your deployed backend URL.

Optional:
- `REDIS_URL` (Upstash/Redis Cloud free tier)

## API Summary
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/child/add`
- `GET /api/child/list`
- `GET /api/child/:id`
- `PUT /api/child/:id`
- `DELETE /api/child/remove/:id`
- `GET /api/child/settings/:deviceId` (extension)
- `POST /api/moderate/url`
- `POST /api/moderate/text`
- `POST /api/moderate/image`
- `POST /api/moderate/page`
- `POST /api/activity/log`
- `GET /api/activity/history`
- `GET /api/activity/analytics`

## Notes
- Extension backend URL is set in `extension/background.js` (`API_BASE`).
- Frontend API base is set with `REACT_APP_API_URL` in `frontend/.env`.
- Do not commit `.env` files.
