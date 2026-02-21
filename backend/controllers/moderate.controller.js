/**
 * Moderation Controller
 */

const { moderateText, moderateImage, moderateUrl } = require('../services/gemini.service');
const ChildProfile = require('../models/ChildProfile');
const ActivityLog = require('../models/ActivityLog');

// ─── Helpers ───────────────────────────────────────────────────────────────

const resolveChild = async (deviceId) => {
  if (!deviceId) return null;
  return ChildProfile.findOne({ deviceId, isActive: true }).lean();
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

const logActivity = (childId, parentId, data) => {
  ActivityLog.create({ childId, parentId, ...data }).catch((err) =>
    console.warn('[Activity] Log write failed:', err.message)
  );
};

// ─── TEXT MODERATION ──────────────────────────────────────────────────────

exports.moderateTextHandler = async (req, res) => {
  try {
    const { text, deviceId, url } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) is required' });
    }

    const child = await resolveChild(deviceId);
    const filteringLevel = child?.filteringLevel || 'moderate';

    const result = await moderateText(text, filteringLevel);

    if (child && result.blocked && url) {
      logActivity(child._id, child.parentId, {
        url,
        domain: getDomain(url),
        type: 'text',
        status: 'blocked',
        blockReason: result.category,
        moderationScore: result.confidence / 100,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[moderate/text]', err);
    res.status(500).json({ error: 'Moderation service error', blocked: false });
  }
};

// ─── IMAGE MODERATION ─────────────────────────────────────────────────────

exports.moderateImageHandler = async (req, res) => {
  try {
    const { imageUrls, deviceId, url } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'imageUrls (array) is required' });
    }

    const child = await resolveChild(deviceId);
    const filteringLevel = child?.filteringLevel || 'moderate';

    const urlsToCheck = imageUrls
      .filter((u) => typeof u === 'string' && u.startsWith('http'))
      .slice(0, 10);

    const results = await Promise.all(
      urlsToCheck.map((imgUrl) => moderateImage(imgUrl, filteringLevel))
    );

    const enriched = results.map((r, i) => ({ ...r, url: urlsToCheck[i] }));
    const blockedImages = enriched.filter((r) => r.blocked);
    const anyBlocked = blockedImages.length > 0;

    if (child && anyBlocked && url) {
      logActivity(child._id, child.parentId, {
        url,
        domain: getDomain(url),
        type: 'image',
        status: 'blocked',
        blockReason: blockedImages[0]?.category,
        moderationScore: blockedImages[0]?.confidence / 100,
      });
    }

    return res.json({
      blocked: anyBlocked,
      blockedImages,
      results: enriched,
    });
  } catch (err) {
    console.error('[moderate/image]', err);
    res.status(500).json({ error: 'Image moderation service error', blocked: false });
  }
};

// ─── URL MODERATION ───────────────────────────────────────────────────────

exports.moderateUrlHandler = async (req, res) => {
  try {
    const { url, deviceId } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url (string) is required' });
    }

    const child = await resolveChild(deviceId);
    const domain = getDomain(url);

    if (child && domain) {
      if (child.allowedSites?.includes(domain)) {
        return res.json({
          blocked: false,
          status: 'SAFE',
          reason: 'allowlisted',
          confidence: 100,
        });
      }

      if (child.blockedSites?.includes(domain)) {
        logActivity(child._id, child.parentId, {
          url,
          domain,
          type: 'url',
          status: 'blocked',
          blockReason: 'manual_blocklist',
        });

        return res.json({
          blocked: true,
          status: 'UNSAFE',
          reason: 'manual_blocklist',
          confidence: 100,
        });
      }
    }

    const result = await moderateUrl(url);

    if (child && result.blocked) {
      logActivity(child._id, child.parentId, {
        url,
        domain,
        type: 'url',
        status: 'blocked',
        blockReason: result.reason,
        moderationScore: result.confidence / 100,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[moderate/url]', err);
    res.status(500).json({ error: 'URL moderation service error', blocked: false });
  }
};

// ─── PAGE MODERATION (COMBINED) ───────────────────────────────────────────

exports.moderatePageHandler = async (req, res) => {
  try {
    const { url, text, imageUrls, deviceId } = req.body;

    if (!url) return res.status(400).json({ error: 'url is required' });

    const child = await resolveChild(deviceId);
    const filteringLevel = child?.filteringLevel || 'moderate';
    const domain = getDomain(url);

    if (child && domain) {
      if (child.allowedSites?.includes(domain)) {
        return res.json({ blocked: false, reason: 'allowlisted' });
      }

      if (child.blockedSites?.includes(domain)) {
        logActivity(child._id, child.parentId, {
          url,
          domain,
          type: 'url',
          status: 'blocked',
          blockReason: 'manual_blocklist',
        });

        return res.json({ blocked: true, reason: 'manual_blocklist' });
      }
    }

    const [urlResult, textResult, imageResults] = await Promise.all([
      moderateUrl(url),

      text && text.trim().length > 50
        ? moderateText(text, filteringLevel)
        : Promise.resolve({ blocked: false, status: 'SAFE' }),

      imageUrls?.length > 0
        ? Promise.all(
            imageUrls
              .filter((u) => typeof u === 'string' && u.startsWith('http'))
              .slice(0, 5)
              .map((u) => moderateImage(u, filteringLevel))
          )
        : Promise.resolve([]),
    ]);

    const blockedImage = imageResults.find((r) => r.blocked);

    const isBlocked =
      urlResult.blocked || textResult.blocked || !!blockedImage;

    // ✅ CLEAN FIXED LOGIC (NO BROKEN TERNARY)
    let reason = null;

    if (urlResult.blocked) {
      reason = urlResult.reason;
    } else if (textResult.blocked) {
      reason = textResult.category;
    } else if (blockedImage) {
      reason = blockedImage.category;
    }

    if (child && isBlocked) {
      logActivity(child._id, child.parentId, {
        url,
        domain,
        type: 'page',
        status: 'blocked',
        blockReason: reason,
      });
    }

    return res.json({
      blocked: isBlocked,
      reason: reason,
      details: {
        url: { blocked: urlResult.blocked, reason: urlResult.reason },
        text: { blocked: textResult.blocked, category: textResult.category },
        images: imageResults.map((r, i) => ({
          url: imageUrls?.[i],
          blocked: r.blocked,
          category: r.category,
        })),
      },
    });
  } catch (err) {
    console.error('[moderate/page]', err);
    res.status(500).json({ error: 'Page moderation error', blocked: false });
  }
};