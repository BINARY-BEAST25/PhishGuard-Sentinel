# 🛡️ SafeGuard AI — Smart Parental Control Platform

A production-ready, AI-powered parental control system built with the MERN stack and a Chrome Extension (Manifest V3). Uses OpenAI, Google Vision, and Google Safe Browsing to moderate web content in real-time.

---

## 📁 Project Structure

```
safeguard-ai/
├── backend/                  # Node.js + Express API
│   ├── config/
│   │   ├── db.js             # MongoDB connection
│   │   └── redis.js          # Redis cache (optional)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── child.controller.js
│   │   ├── moderate.controller.js
│   │   └── activity.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── validate.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── ChildProfile.js
│   │   └── ActivityLog.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── child.routes.js
│   │   ├── moderate.routes.js
│   │   └── activity.routes.js
│   ├── services/
│   │   ├── moderation.service.js   # OpenAI + Google Vision + Safe Browsing
│   │   └── email.service.js        # Nodemailer
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/                 # React.js Dashboard
│   ├── public/index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/Layout.js
│   │   ├── context/AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── ChildrenPage.js
│   │   │   ├── ActivityPage.js
│   │   │   └── AnalyticsPage.js
│   │   ├── services/api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
└── extension/                # Chrome Extension (Manifest V3)
    ├── manifest.json
    ├── background.js         # Service worker
    ├── content.js            # Page scanner
    ├── popup.html            # Extension popup
    ├── popup.js              # Popup logic
    └── icons/                # Add icon files here
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
cp .env.example .env          # Fill in your API keys
npm install
npm run dev                   # Starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start                     # Starts on http://localhost:3000
```

### 3. Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Extension icon appears in toolbar

---

## 🔑 Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_API_KEY=AIza...
GOOGLE_SAFE_BROWSING_API_KEY=AIza...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password

# Optional Redis cache
REDIS_URL=redis://localhost:6379

FRONTEND_URL=http://localhost:3000
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create parent account |
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/verify` | Verify email |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Set new password |
| GET | `/api/auth/me` | Get current user |

### Child Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/child/add` | Add child profile |
| GET | `/api/child/list` | List all children |
| GET | `/api/child/:id` | Get child details |
| PUT | `/api/child/:id` | Update child settings |
| DELETE | `/api/child/remove/:id` | Remove child profile |
| GET | `/api/child/settings/:deviceId` | Get settings by device (extension) |

### Moderation
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/moderate/text` | `{ text, deviceId, url }` |
| POST | `/api/moderate/image` | `{ imageUrls[], deviceId, url }` |
| POST | `/api/moderate/url` | `{ url, deviceId }` |

### Activity
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/activity/log` | Log from extension |
| GET | `/api/activity/history` | View activity (parents) |
| GET | `/api/activity/analytics` | Charts data |

---

## 🧩 Chrome Extension Setup

1. Register as parent on the dashboard
2. Add a child profile → copy the **Device ID**
3. Install the extension on the child's Chrome
4. Click extension icon → enter Device ID
5. Optionally set a parent lock password

The extension will:
- Blur images until verified safe
- Block the page if content is flagged
- Log all blocked attempts to the dashboard
- Sync filtering settings from the parent account

---

## ☁️ Deployment

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Add environment variables in Render dashboard

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend && vercel --prod
```

Set `REACT_APP_API_URL` to your Render backend URL.

### Database → MongoDB Atlas

1. Create cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user
3. Whitelist `0.0.0.0/0` for Atlas IP access
4. Copy connection string to `MONGODB_URI`

---

## 🔒 Security Features

- **Helmet.js** — Sets secure HTTP headers
- **Rate Limiting** — 100 req/15min globally, 20 req/15min for auth
- **bcrypt (rounds=12)** — Password hashing
- **JWT** — Stateless auth with configurable expiry
- **Input Validation** — express-validator on all endpoints
- **CORS** — Restricted to frontend origin only
- **No Key Exposure** — All API keys server-side only
- **Role-Based Access** — Parent/child separation enforced

---

## 🤖 AI Moderation Logic

### Text (OpenAI Moderation API)
- Blocks on: `sexual`, `sexual/minors`, `violence`, `hate`, `self-harm`
- Strict mode: score threshold 0.3
- Moderate mode: score threshold 0.7

### Images (Google Cloud Vision SafeSearch)
- Checks: Adult, Violence, Racy content
- Strict mode: blocks at `POSSIBLE` likelihood
- Moderate mode: blocks at `LIKELY` likelihood

### URLs (Google Safe Browsing)
- Threat types: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE
- Manual allow/block lists checked first (fastest path)
- Results cached in Redis for 24 hours

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Cache | Redis |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| AI (Text) | OpenAI Moderation API |
| AI (Image) | Google Cloud Vision SafeSearch |
| URL Safety | Google Safe Browsing API |
| Frontend | React 18 + React Router 6 |
| Charts | Chart.js + react-chartjs-2 |
| Extension | Chrome MV3 |
| Deployment | Render / Vercel / MongoDB Atlas |

---

## 🎯 Optional Advanced Features

To extend this platform:
- **Stripe Billing** — Add `stripe` package, create subscription plans
- **DNS Filtering** — Configure Pi-hole or Cloudflare Gateway rules via API
- **OCR for Memes** — Use Google Vision `TEXT_DETECTION` feature
- **AI Behavior Analysis** — Track patterns and alert on unusual activity
- **Mobile App** — React Native app consuming the same REST API
- **Multi-device Sync** — Each child can have multiple deviceIds
