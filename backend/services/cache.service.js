const { getDb } = require('../config/firebase');
const { getRedisClient } = require('../config/redis');

const COLLECTION = 'moderationCache';
const PREFIX = 'moderation:';

const getCached = async (key) => {
  const redis = await getRedisClient();

  if (redis) {
    try {
      const raw = await redis.get(`${PREFIX}${key}`);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('[Cache] Redis read failed:', err.message);
    }
  }

  try {
    const doc = await getDb().collection(COLLECTION).doc(key).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    const now = Date.now();
    if (typeof data.expiresAt === 'number' && data.expiresAt <= now) {
      doc.ref.delete().catch(() => {});
      return null;
    }

    if (redis && data.value && typeof data.expiresAt === 'number') {
      const ttl = Math.max(1, Math.floor((data.expiresAt - now) / 1000));
      redis.setEx(`${PREFIX}${key}`, ttl, JSON.stringify(data.value)).catch(() => {});
    }

    return data.value || null;
  } catch (err) {
    console.warn('[Cache] Firestore read failed:', err.message);
    return null;
  }
};

const setCached = async (key, value, ttlSeconds) => {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const redis = await getRedisClient();

  if (redis) {
    try {
      await redis.setEx(`${PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.warn('[Cache] Redis write failed:', err.message);
    }
  }

  try {
    await getDb()
      .collection(COLLECTION)
      .doc(key)
      .set({
        value,
        expiresAt,
        updatedAt: Date.now(),
      });
  } catch (err) {
    console.warn('[Cache] Firestore write failed:', err.message);
  }
};

module.exports = {
  getCached,
  setCached,
};

