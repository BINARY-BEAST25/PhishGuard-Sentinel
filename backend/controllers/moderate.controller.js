const { moderateText, moderateImage, moderateUrl } = require('../services/gemini.service');
const { getDb } = require('../config/firebase');

const CHILD_COLLECTION = 'childProfiles';
const ACTIVITY_COLLECTION = 'activityLogs';

const withId = (doc) => ({
  _id: doc.id,
  id: doc.id,
  ...doc.data(),
});

const normalizeDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

const resolveChild = async (deviceId) => {
  if (!deviceId) return null;

  const snapshot = await getDb()
    .collection(CHILD_COLLECTION)
    .where('deviceId', '==', deviceId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const child = withId(snapshot.docs[0]);
  if (child.isActive === false) return null;
  return child;
};

const logActivity = async (child, data) => {
  if (!child) return;

  try {
    await getDb().collection(ACTIVITY_COLLECTION).add({
      childId: child._id,
      parentId: child.parentId,
      url: data.url || null,
      domain: data.domain || null,
      type: data.type || 'page',
      status: data.status || 'blocked',
      blockReason: data.blockReason || null,
      moderationScore: data.moderationScore ?? null,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[Activity] Log write failed:', err.message);
  }
};

const isDomainInList = (domain, list) => {
  if (!domain || !Array.isArray(list)) return false;
  return list.map((item) => String(item).toLowerCase()).includes(domain);
};

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
      await logActivity(child, {
        url,
        domain: normalizeDomain(url),
        type: 'text',
        status: 'blocked',
        blockReason: result.category,
        moderationScore: result.confidence / 100,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[moderate/text]', err);
    return res.status(500).json({ error: 'Moderation service error', blocked: false });
  }
};

exports.moderateImageHandler = async (req, res) => {
  try {
    const { imageUrls, deviceId, url } = req.body;
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'imageUrls (array) is required' });
    }

    const child = await resolveChild(deviceId);
    const filteringLevel = child?.filteringLevel || 'moderate';

    const urlsToCheck = imageUrls
      .filter((candidate) => typeof candidate === 'string' && candidate.startsWith('http'))
      .slice(0, 10);

    const results = await Promise.all(urlsToCheck.map((imgUrl) => moderateImage(imgUrl, filteringLevel)));
    const enriched = results.map((result, index) => ({ ...result, url: urlsToCheck[index] }));
    const blockedImages = enriched.filter((result) => result.blocked);
    const anyBlocked = blockedImages.length > 0;

    if (child && anyBlocked && url) {
      await logActivity(child, {
        url,
        domain: normalizeDomain(url),
        type: 'image',
        status: 'blocked',
        blockReason: blockedImages[0]?.category,
        moderationScore: blockedImages[0]?.confidence / 100,
      });
    }

    return res.json({ blocked: anyBlocked, blockedImages, results: enriched });
  } catch (err) {
    console.error('[moderate/image]', err);
    return res.status(500).json({ error: 'Image moderation service error', blocked: false });
  }
};

exports.moderateUrlHandler = async (req, res) => {
  try {
    const { url, deviceId } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url (string) is required' });
    }

    const child = await resolveChild(deviceId);
    const domain = normalizeDomain(url);

    if (child && domain) {
      if (isDomainInList(domain, child.allowedSites)) {
        return res.json({
          blocked: false,
          status: 'SAFE',
          reason: 'allowlisted',
          confidence: 100,
        });
      }

      if (isDomainInList(domain, child.blockedSites)) {
        await logActivity(child, {
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
      await logActivity(child, {
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
    return res.status(500).json({ error: 'URL moderation service error', blocked: false });
  }
};

exports.moderatePageHandler = async (req, res) => {
  try {
    const { url, text, imageUrls, deviceId } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const child = await resolveChild(deviceId);
    const filteringLevel = child?.filteringLevel || 'moderate';
    const domain = normalizeDomain(url);

    if (child && domain) {
      if (isDomainInList(domain, child.allowedSites)) {
        return res.json({ blocked: false, reason: 'allowlisted' });
      }

      if (isDomainInList(domain, child.blockedSites)) {
        await logActivity(child, {
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
      imageUrls?.length
        ? Promise.all(
            imageUrls
              .filter((candidate) => typeof candidate === 'string' && candidate.startsWith('http'))
              .slice(0, 5)
              .map((candidate) => moderateImage(candidate, filteringLevel))
          )
        : Promise.resolve([]),
    ]);

    const blockedImage = imageResults.find((result) => result.blocked);
    const blocked = urlResult.blocked || textResult.blocked || !!blockedImage;

    let reason = null;
    if (urlResult.blocked) reason = urlResult.reason;
    else if (textResult.blocked) reason = textResult.category;
    else if (blockedImage) reason = blockedImage.category;

    if (child && blocked) {
      await logActivity(child, {
        url,
        domain,
        type: 'page',
        status: 'blocked',
        blockReason: reason,
      });
    }

    return res.json({
      blocked,
      reason,
      details: {
        url: { blocked: urlResult.blocked, reason: urlResult.reason },
        text: { blocked: textResult.blocked, category: textResult.category },
        images: imageResults.map((result, index) => ({
          url: imageUrls?.[index],
          blocked: result.blocked,
          category: result.category,
        })),
      },
    });
  } catch (err) {
    console.error('[moderate/page]', err);
    return res.status(500).json({ error: 'Page moderation error', blocked: false });
  }
};

