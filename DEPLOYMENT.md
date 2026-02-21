# PhishGuard Sentinel Deployment

## Strict No-Billing Setup
- `Hosting`: Firebase Hosting
- `Auth`: Firebase Authentication (Email/Password)
- `Database`: Firestore
- `Backend runtime`: local/self-hosted Node process (not Firebase Functions/App Hosting)
- `AI`: Gemini API key from Google AI Studio
- `Cache`: Firestore by default, optional Redis free tier

## 1) Firebase Project
1. Create a Firebase project on `Spark` plan (free).
2. Enable Authentication -> Email/Password.
3. Enable Firestore.
4. Create a Web App and copy the Web API key.
5. Create a Service Account key for backend admin access.
6. Do not enable paid products (Cloud Functions, App Hosting, Cloud Storage, Identity Platform upgrade).

Backend env values needed:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY`

## 2) Gemini
1. Open Google AI Studio.
2. Generate API key from free tier.
3. Set these in backend env:
   - `GEMINI_API_KEY`
   - `GEMINI_TEXT_MODEL=gemini-2.5-flash-lite`
   - `GEMINI_VISION_MODEL=gemini-2.5-flash`

## 3) Optional Free Redis
- Upstash Redis free tier or Redis Cloud free tier.
- Add `REDIS_URL` in backend env.
- If missing, app works with Firestore cache only.

## 4) Frontend
Set `REACT_APP_API_URL` in frontend env:
```env
REACT_APP_API_URL=https://your-api-domain/api
```

## 5) Extension
Set backend API base in `extension/background.js`:
```js
const API_BASE = 'https://your-api-domain/api';
```
Then reload extension in `chrome://extensions`.

## 6) Verify
- `GET /api/health` returns `status: ok`
- Register/login from dashboard
- Add child profile and copy device ID
- Install extension and paste device ID
- Visit test URLs and confirm logs appear in dashboard

## 7) Important Constraint
- A fully serverless Firebase-only backend usually needs billing-enabled products.
- To stay zero-billing and keep Gemini key secret, run the Node backend yourself (local VM/always-free host if available) and keep Firebase for auth/database/hosting only.
