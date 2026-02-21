// Moderation Service - AI-powered content filtering
// Uses: OpenAI Moderation API, Google Vision SafeSearch, Google Safe Browsing
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache moderation results to save API costs and improve performance
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 3600 });

// =============================================
// TEXT MODERATION - OpenAI Moderation API
// =============================================
const moderateText = async (text) => {
  if (!text || text.trim().length < 10) return { blocked: false };

  // Cache key based on text hash (limit key size)
  const cacheKey = `text:${Buffer.from(text.slice(0, 200)).toString('base64')}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/moderations',
      { input: text },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    const result = response.data.results[0];
    const flaggedCategories = [];

    // Check categories that warrant blocking
    const blockedCategories = [
      'sexual', 'sexual/minors', 'violence', 'violence/graphic',
      'hate', 'hate/threatening', 'harassment', 'harassment/threatening',
      'self-harm', 'self-harm/intent', 'self-harm/instructions'
    ];

    for (const category of blockedCategories) {
      if (result.categories[category]) {
        flaggedCategories.push(category);
      }
    }

    const modResult = {
      blocked: flaggedCategories.length > 0,
      categories: flaggedCategories,
      source: 'openai'
    };

    cache.set(cacheKey, modResult);
    return modResult;
  } catch (error) {
    console.error('OpenAI moderation error:', error.message);
    // Fail open - don't block content if API is down
    return { blocked: false, error: 'API unavailable' };
  }
};

// =============================================
// IMAGE MODERATION - Google Vision SafeSearch
// =============================================
const moderateImage = async (imageUrl, threshold = 'LIKELY') => {
  if (!imageUrl) return { blocked: false };

  const cacheKey = `img:${Buffer.from(imageUrl).toString('base64').slice(0, 100)}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Severity levels in order
  const severityLevels = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
  const thresholdIndex = severityLevels.indexOf(threshold);

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }]
        }]
      },
      { timeout: 8000 }
    );

    const safeSearch = response.data.responses[0]?.safeSearchAnnotation;
    if (!safeSearch) return { blocked: false };

    // Check if any category meets or exceeds threshold
    const checkCategories = ['adult', 'racy', 'violence'];
    const flaggedCategories = [];

    for (const category of checkCategories) {
      const levelIndex = severityLevels.indexOf(safeSearch[category]);
      if (levelIndex >= thresholdIndex) {
        flaggedCategories.push(`${category}:${safeSearch[category]}`);
      }
    }

    const modResult = {
      blocked: flaggedCategories.length > 0,
      categories: flaggedCategories,
      source: 'google_vision'
    };

    cache.set(cacheKey, modResult);
    return modResult;
  } catch (error) {
    console.error('Google Vision error:', error.message);
    return { blocked: false, error: 'API unavailable' };
  }
};

// =============================================
// URL MODERATION - Google Safe Browsing API
// =============================================
const moderateUrl = async (url) => {
  if (!url) return { blocked: false };

  const cacheKey = `url:${Buffer.from(url).toString('base64').slice(0, 100)}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const response = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_API_KEY}`,
      {
        client: { clientId: 'safeguard-ai', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      },
      { timeout: 5000 }
    );

    const matches = response.data.matches || [];
    const modResult = {
      blocked: matches.length > 0,
      categories: matches.map(m => m.threatType),
      source: 'safe_browsing'
    };

    cache.set(cacheKey, modResult);
    return modResult;
  } catch (error) {
    console.error('Safe Browsing error:', error.message);
    return { blocked: false, error: 'API unavailable' };
  }
};

// =============================================
// BATCH IMAGE MODERATION
// =============================================
const moderateImageBatch = async (imageUrls, threshold = 'LIKELY') => {
  // Process in batches of 16 (Vision API limit)
  const batchSize = 16;
  const results = [];

  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(url => moderateImage(url, threshold)));
    results.push(...batchResults);
  }

  return results;
};

module.exports = { moderateText, moderateImage, moderateUrl, moderateImageBatch };
