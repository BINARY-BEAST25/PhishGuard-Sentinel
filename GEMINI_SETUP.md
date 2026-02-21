# Gemini Setup (PhishGuard Sentinel)

PhishGuard Sentinel uses Gemini only for moderation.

## 1) Get API Key
1. Open Google AI Studio.
2. Create an API key.
3. Put it in backend env:
```env
GEMINI_API_KEY=your_key_here
GEMINI_TEXT_MODEL=gemini-2.5-flash-lite
GEMINI_VISION_MODEL=gemini-2.5-flash
```

## 2) Optional Tuning
```env
GEMINI_TIMEOUT_MS=15000
MODERATION_CACHE_TTL=86400
```

## 3) Cache Behavior
- Primary cache: Firestore collection `moderationCache`
- Optional hot cache: Redis (`REDIS_URL`)
- If Redis is not configured, app still works.

## 4) Test
Run:
```bash
cd backend
node utils/test-gemini.js
```

## 5) Security
- Keep Gemini key in backend env only.
- Never store Gemini key in extension or frontend.

## 6) Zero-Billing Tips
- Stay on Gemini free tier quotas.
- Keep aggressive caching enabled (`MODERATION_CACHE_TTL`).
- Use `flash-lite` for text to reduce free-tier usage.
