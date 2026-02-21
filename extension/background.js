/**
 * PhishGuard Sentinel - Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *   - Store deviceId and auth state in chrome.storage.local
 *   - Relay moderation API calls from content.js (which can't call external APIs directly)
 *   - All Gemini API calls go through our backend - API key never in extension
 *
 * Communication:
 *   content.js  ->  chrome.runtime.sendMessage()  ->  background.js  ->  backend API
 */

// Set this to your deployed backend URL before publishing.
const API_BASE = 'http://localhost:5000/api';

// ─── Startup ──────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[PhishGuard Sentinel] Extension installed');
  // Default: enabled when deviceId is set
  chrome.storage.local.get(['deviceId', 'enabled'], (cfg) => {
    if (!cfg.deviceId) {
      console.log('[PhishGuard Sentinel] Not configured - open popup to enter Device ID');
    }
  });
});

// ─── Message Router ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    // content.js sends all page data in one shot for efficiency
    case 'MODERATE_PAGE':
      moderatePage(message.payload)
        .then(sendResponse)
        .catch((err) => {
          console.error('[PhishGuard Sentinel] MODERATE_PAGE error:', err.message);
          sendResponse({ blocked: false });
        });
      return true; // Keep message channel open for async

    // Quick URL pre-check before full page scan
    case 'MODERATE_URL':
      moderateUrl(message.url)
        .then(sendResponse)
        .catch(() => sendResponse({ blocked: false }));
      return true;

    // content.js reads config without storage access
    case 'GET_CONFIG':
      chrome.storage.local.get(['deviceId', 'enabled', 'lockPassword'], sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// ─── API Callers ──────────────────────────────────────────────────────────────

/**
 * Combined page moderation - single backend call for URL + text + images.
 * Uses /api/moderate/page to minimize latency.
 */
async function moderatePage({ url, text, imageUrls }) {
  const { deviceId, enabled } = await getConfig();
  if (!enabled || !deviceId) return { blocked: false };

  const response = await fetchWithTimeout(`${API_BASE}/moderate/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      text: text?.slice(0, 3000) || '',
      imageUrls: imageUrls?.slice(0, 5) || [],
      deviceId,
    }),
  });

  return response.json();
}

/**
 * URL-only pre-check - runs before page content loads.
 * If the URL is blocked, we stop immediately without fetching images.
 */
async function moderateUrl(url) {
  const { deviceId, enabled } = await getConfig();
  if (!enabled || !deviceId) return { blocked: false };

  const response = await fetchWithTimeout(`${API_BASE}/moderate/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, deviceId }),
  });

  if (!response.ok) {
  const text = await response.text();
  console.error("Backend returned non-JSON:", text);
  throw new Error("Backend error");
}

return response.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * fetch() with a configurable timeout (default 12s).
 * Prevents extension hanging on slow or unreachable backend.
 */
async function fetchWithTimeout(url, options, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function getConfig() {
  return new Promise((resolve) =>
    chrome.storage.local.get(['deviceId', 'enabled'], (r) => resolve(r || {}))
  );
}
