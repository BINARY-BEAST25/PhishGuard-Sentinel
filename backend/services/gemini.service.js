const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const axios = require('axios');
const { getCached, setCached } = require('./cache.service');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use free-tier friendly defaults to reduce quota pressure.
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
const CACHE_TTL_SEC = parseInt(process.env.MODERATION_CACHE_TTL, 10) || 86400;
const TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 15000;

const makeHash = (type, content) =>
  `${type}:${crypto.createHash('sha256').update(String(content)).digest('hex').slice(0, 24)}`;

const withTimeout = (promise, ms = TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms)
    ),
  ]);

const parseGeminiJSON = (raw) => {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    const statusMatch = raw.match(/"status"\s*:\s*"(SAFE|UNSAFE)"/i);
    const categoryMatch = raw.match(/"category"\s*:\s*"([^"]+)"/i);
    const reasonMatch = raw.match(/"reason"\s*:\s*"([^"]+)"/i);
    const confidenceMatch = raw.match(/"confidence"\s*:\s*(\d+)/i);
    if (statusMatch) {
      return {
        status: statusMatch[1].toUpperCase(),
        category: categoryMatch?.[1] || null,
        reason: reasonMatch?.[1] || null,
        confidence: confidenceMatch ? parseInt(confidenceMatch[1], 10) : 50,
      };
    }
    throw new Error(`Cannot parse Gemini response: ${raw.slice(0, 100)}`);
  }
};

const readCache = async (hash) => getCached(hash);

const writeCache = async (hash, result) => {
  await setCached(hash, result, CACHE_TTL_SEC);
};

const moderateText = async (text, filteringLevel = 'moderate') => {
  if (!text || text.trim().length < 20) {
    return { blocked: false, status: 'SAFE', category: null, confidence: 0 };
  }

  const truncated = text.trim().slice(0, 4000);
  const hash = makeHash('text', truncated + filteringLevel);
  const cached = await readCache(hash);
  if (cached) return cached;

  const strictNote =
    filteringLevel === 'strict'
      ? '\nApply STRICT standards. Flag even suggestive, mildly violent, or age-questionable content.'
      : filteringLevel === 'moderate'
      ? '\nApply MODERATE standards. Flag clearly inappropriate content for under-18 audiences.'
      : '';

  const prompt = `You are a strict parental control AI system.
Analyze the following content and classify it as SAFE or UNSAFE for children under 18.
If unsafe, specify the reason category from this list:
- Sexual Content
- Nudity
- Explicit Language
- Violence
- Drugs
- Hate Speech
- Other Harmful Content
${strictNote}
Return ONLY a raw JSON object:
{
  "status": "SAFE" or "UNSAFE",
  "category": "reason category or null if SAFE",
  "confidence": number between 0 and 100
}
Content to analyze:
${truncated}`;

  try {
    const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
    const response = await withTimeout(model.generateContent(prompt));
    const raw = response.response.text();
    const parsed = parseGeminiJSON(raw);
    const result = {
      blocked: parsed.status === 'UNSAFE',
      status: parsed.status,
      category: parsed.category || null,
      confidence: parsed.confidence ?? 50,
    };
    await writeCache(hash, result);
    return result;
  } catch (err) {
    console.error('[Gemini] Text moderation error:', err.message);
    return { blocked: false, status: 'SAFE', category: null, confidence: 0, error: err.message };
  }
};

const moderateImage = async (imageUrl, filteringLevel = 'moderate') => {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return { blocked: false, status: 'SAFE', category: null, confidence: 0 };
  }

  const hash = makeHash('image', imageUrl + filteringLevel);
  const cached = await readCache(hash);
  if (cached) return cached;

  let imageData;
  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 8000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { 'User-Agent': 'PhishGuard-Sentinel/1.0' },
    });
    const mimeType = imageResponse.headers['content-type']?.split(';')[0] || 'image/jpeg';
    const base64 = Buffer.from(imageResponse.data).toString('base64');
    imageData = { inlineData: { data: base64, mimeType } };
  } catch (fetchErr) {
    console.warn('[Gemini] Image fetch failed:', imageUrl, fetchErr.message);
    return { blocked: false, status: 'SAFE', category: null, confidence: 0, error: 'fetch_failed' };
  }

  const strictNote =
    filteringLevel === 'strict'
      ? '\nApply STRICT standards. Flag suggestive poses, partial nudity, or any age-questionable content.'
      : '';

  const prompt = `You are an AI content moderation system for parental control.
Analyze this image and determine if it contains any of:
- Nudity (full or partial)
- Sexual content or suggestive poses
- Violence or gore
- Drugs or drug paraphernalia
- Inappropriate meme text
- Any other harmful content for children under 18
${strictNote}
Also, if the image contains visible text (e.g. meme), extract and evaluate that text.

Return ONLY a raw JSON object:
{
  "status": "SAFE" or "UNSAFE",
  "category": "reason category or null if SAFE",
  "confidence": number between 0 and 100,
  "detectedText": "any visible text found in the image, or null"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    const response = await withTimeout(model.generateContent([prompt, imageData]));
    const raw = response.response.text();
    const parsed = parseGeminiJSON(raw);
    const result = {
      blocked: parsed.status === 'UNSAFE',
      status: parsed.status,
      category: parsed.category || null,
      confidence: parsed.confidence ?? 50,
      detectedText: parsed.detectedText || null,
    };
    await writeCache(hash, result);
    return result;
  } catch (err) {
    console.error('[Gemini] Image moderation error:', err.message);
    return { blocked: false, status: 'SAFE', category: null, confidence: 0, error: err.message };
  }
};

const moderateUrl = async (url) => {
  if (!url) return { blocked: false, status: 'SAFE', reason: null };

  const hash = makeHash('url', url);
  const cached = await readCache(hash);
  if (cached) return cached;

  const prompt = `Analyze the following URL for adult, harmful, or inappropriate content for children under 18.
URL: ${url}
Return ONLY a raw JSON object:
{
  "status": "SAFE" or "UNSAFE",
  "reason": "brief explanation",
  "confidence": number between 0 and 100
}`;

  try {
    const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
    const response = await withTimeout(model.generateContent(prompt));
    const raw = response.response.text();
    const parsed = parseGeminiJSON(raw);
    const result = {
      blocked: parsed.status === 'UNSAFE',
      status: parsed.status,
      reason: parsed.reason || parsed.category || null,
      confidence: parsed.confidence ?? 50,
    };
    await writeCache(hash, result);
    return result;
  } catch (err) {
    console.error('[Gemini] URL moderation error:', err.message);
    return { blocked: false, status: 'SAFE', reason: null, confidence: 0, error: err.message };
  }
};

const moderateTextBatch = async (textArray, filteringLevel = 'moderate') => {
  if (!textArray?.length) return [];

  const items = textArray
    .map((t, i) => ({ index: i, text: String(t).trim().slice(0, 500) }))
    .filter((item) => item.text.length > 10);

  if (!items.length) {
    return textArray.map((_, i) => ({ index: i, blocked: false, status: 'SAFE' }));
  }

  const results = new Array(textArray.length).fill(null);
  const uncachedItems = [];

  for (const item of items) {
    const hash = makeHash('text', item.text + filteringLevel);
    const cached = await readCache(hash);
    if (cached) {
      results[item.index] = { ...cached, index: item.index };
    } else {
      uncachedItems.push({ ...item, hash });
    }
  }

  if (!uncachedItems.length) return results;

  const numberedTexts = uncachedItems.map((item, i) => `[${i + 1}] ${item.text}`).join('\n---\n');
  const prompt = `You are a strict parental control AI system.
Analyze each numbered text snippet below and classify each as SAFE or UNSAFE.
Return ONLY a raw JSON array:
[
  { "index": 1, "status": "SAFE" or "UNSAFE", "category": "reason or null", "confidence": 0-100 },
  ...
]
Snippets:
${numberedTexts}`;

  try {
    const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
    const response = await withTimeout(model.generateContent(prompt));
    const raw = response.response.text();
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    } catch {
      for (const item of uncachedItems) {
        const result = await moderateText(item.text, filteringLevel);
        results[item.index] = { ...result, index: item.index };
        await writeCache(item.hash, result);
      }
      return results;
    }

    for (const entry of parsed) {
      const original = uncachedItems[entry.index - 1];
      if (!original) continue;
      const result = {
        blocked: entry.status === 'UNSAFE',
        status: entry.status,
        category: entry.category || null,
        confidence: entry.confidence ?? 50,
        index: original.index,
      };
      results[original.index] = result;
      writeCache(original.hash, result);
    }
  } catch (err) {
    console.error('[Gemini] Batch moderation error:', err.message);
    for (const item of uncachedItems) {
      if (!results[item.index]) {
        results[item.index] = {
          blocked: false,
          status: 'SAFE',
          category: null,
          confidence: 0,
          index: item.index,
        };
      }
    }
  }

  return results;
};

module.exports = {
  moderateText,
  moderateImage,
  moderateUrl,
  moderateTextBatch,
};
