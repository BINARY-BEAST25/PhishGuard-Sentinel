# SafeGuard AI v2.0 — Gemini API Setup Guide

## Overview

SafeGuard AI v2.0 uses **Google AI Studio (Gemini)** exclusively for all AI moderation.
No OpenAI, no Google Vision, no Safe Browsing — just one API key.

---

## Getting Your Gemini API Key (Free)

1. Go to **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key — it starts with `AIzaSy...`
5. Add it to your `.env` file:
   ```
   GEMINI_API_KEY=AIzaSy-your-key-here
   ```

### Free Tier Limits (as of 2024)

| Limit | Value |
|-------|-------|
| Requests per minute | 15 RPM |
| Requests per day | 1,500 |
| Tokens per minute | 1,000,000 |
| Cost | **Free** |

For a family with 1-3 children, the free tier is more than sufficient.
Results are cached in MongoDB — the same image/URL/text is never sent to Gemini twice.

---

## What Gemini Does

### 1. Text Moderation — `gemini-1.5-flash`
Analyzes webpage text and returns:
```json
{ "status": "SAFE", "category": null, "confidence": 95 }
```
or
```json
{ "status": "UNSAFE", "category": "Sexual Content", "confidence": 87 }
```

### 2. Image Moderation + Meme OCR — `gemini-1.5-flash` (multimodal)
- Sends base64-encoded image + text prompt
- Checks: nudity, violence, drugs, suggestive poses
- Also extracts and evaluates text visible in memes
- Returns same JSON format

### 3. URL Safety Analysis — `gemini-1.5-flash`
- Analyzes domain + path patterns
- Identifies adult, piracy, gambling, hate-speech sites
- No external API needed — Gemini reasons from URL structure

---

## Caching Architecture

```
Extension → Backend → ModerationCache (MongoDB) → Gemini API
                              ↑
                     Hit: return cached
                     Miss: call Gemini, then cache
```

Cache TTL: 24 hours (configurable via `MODERATION_CACHE_TTL` env var)
MongoDB TTL index auto-expires records after 30 days.

---

## Installation

```bash
cd backend
npm install          # Installs @google/generative-ai
cp .env.example .env # Add your GEMINI_API_KEY
npm run dev
```

---

## Testing Gemini Integration

```bash
cd backend
node utils/test-gemini.js
```

Expected output:
```
Test 1: Safe text
Result: { "blocked": false, "status": "SAFE", ... }
✅ PASS

Test 3: Safe URL (example.com)
Result: { "blocked": false, "status": "SAFE", ... }
✅ PASS

Test 4: Suspicious URL pattern
Result: { "blocked": true, "status": "UNSAFE", ... }
✅ PASS (blocked as expected)
```

---

## Filtering Levels & Gemini Prompting

| Level | Gemini Instruction | Use Case |
|-------|-------------------|----------|
| `strict` | "Apply STRICT standards. Flag even suggestive content." | Ages 6-12 |
| `moderate` | "Apply MODERATE standards. Flag clearly inappropriate content." | Ages 13-17 |
| `custom` | Uses `moderate` threshold + manual allow/block lists | Flexible |
| `off` | Gemini not called — all content allowed | Disabled |

---

## Error Handling

The service **fails open** (returns `SAFE`) when Gemini is:
- Slow (> 15 second timeout)
- Unavailable (network error)
- Returning malformed JSON (fallback regex parser kicks in)

This means filtering reliability depends on Gemini availability.
For production, consider upgrading to a paid Gemini tier with higher SLAs.

---

## Security Notes

- `GEMINI_API_KEY` is **never** sent to the frontend or Chrome extension
- All Gemini calls originate from the Node.js backend only
- Extension communicates with YOUR backend, not Google directly
- Rate limiting (60 req/min) prevents quota exhaustion attacks
