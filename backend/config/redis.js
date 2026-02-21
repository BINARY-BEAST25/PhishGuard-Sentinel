/**
 * Redis is NOT used in SafeGuard AI v2.0.
 *
 * Moderation results are cached directly in MongoDB (ModerationCache collection).
 * This gives us:
 *   - No extra infrastructure needed
 *   - Cache persistence across server restarts
 *   - TTL managed at app layer with MongoDB TTL index as safety net
 *   - Works on free-tier hosting (Render, Railway) without Redis addon
 *
 * If you want Redis for additional caching, you can add it back — but
 * the gemini.service.js caching is already production-ready without it.
 */

module.exports = {
  // No-op stubs for any legacy code that might call these
  getCache: async () => null,
  setCache: async () => {},
};
