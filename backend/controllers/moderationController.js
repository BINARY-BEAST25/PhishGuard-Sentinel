// Moderation Controller - Content filtering endpoints called by the extension
const { moderateText, moderateImage, moderateUrl, moderateImageBatch } = require('../utils/moderation');
const ChildProfile = require('../models/ChildProfile');

// Extract domain from URL
const extractDomain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
};

// Check if URL matches a site list (supports wildcards)
const matchesSiteList = (url, siteList) => {
  const domain = extractDomain(url);
  return siteList.some(site => domain === site || domain.endsWith(`.${site}`));
};

// POST /api/moderate/url
const moderateUrlHandler = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required.' });

  const child = req.child;

  // 1. Check explicit blocklist/allowlist first (fastest)
  if (matchesSiteList(url, child.blockedSites || [])) {
    return res.json({ blocked: true, reason: 'URL on blocklist', source: 'blocklist' });
  }
  if (matchesSiteList(url, child.allowedSites || [])) {
    return res.json({ blocked: false, reason: 'URL on allowlist' });
  }

  // 2. Check time restrictions
  if (child.timeRestrictions?.length > 0) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const restriction = child.timeRestrictions.find(r => r.dayOfWeek === dayOfWeek);
    if (restriction) {
      if (currentTime < restriction.startTime || currentTime > restriction.endTime) {
        return res.json({ blocked: true, reason: 'Outside allowed hours', source: 'time_restriction' });
      }
    }
  }

  // 3. Skip URL check if filtering is off
  if (child.filteringLevel === 'off') {
    return res.json({ blocked: false });
  }

  // 4. Google Safe Browsing check
  const result = await moderateUrl(url);
  res.json(result);
};

// POST /api/moderate/text
const moderateTextHandler = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required.' });

  const child = req.child;
  if (child.filteringLevel === 'off') return res.json({ blocked: false });

  const result = await moderateText(text);
  res.json(result);
};

// POST /api/moderate/image
const moderateImageHandler = async (req, res) => {
  const { imageUrl, imageUrls } = req.body;
  const child = req.child;

  if (child.filteringLevel === 'off') return res.json({ blocked: false });

  // Determine threshold based on filtering level
  const thresholdMap = {
    strict: 'POSSIBLE',
    moderate: 'LIKELY',
    custom: child.customSettings?.imageBlurThreshold || 'LIKELY'
  };
  const threshold = thresholdMap[child.filteringLevel] || 'LIKELY';

  try {
    if (imageUrls && Array.isArray(imageUrls)) {
      // Batch moderation
      const results = await moderateImageBatch(imageUrls, threshold);
      return res.json({ results });
    }

    const result = await moderateImage(imageUrl, threshold);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Image moderation failed.' });
  }
};

module.exports = { moderateUrlHandler, moderateTextHandler, moderateImageHandler };
