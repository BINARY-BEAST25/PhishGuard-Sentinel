let redisClient = null;
let initialized = false;

const getRedisClient = async () => {
  if (initialized) return redisClient;
  initialized = true;

  if (!process.env.REDIS_URL) {
    console.log('[Redis] REDIS_URL not set. Running without Redis cache.');
    return null;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      console.warn('[Redis] Client error:', err.message);
    });
    await redisClient.connect();
    console.log('[Redis] Connected');
    return redisClient;
  } catch (err) {
    console.warn('[Redis] Disabled:', err.message);
    redisClient = null;
    return null;
  }
};

module.exports = {
  getRedisClient,
};

