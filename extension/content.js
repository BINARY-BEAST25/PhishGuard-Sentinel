/**
 * SafeGuard AI — Content Script (v2.0, Gemini-Powered)
 *
 * Execution flow:
 *   1. Get config from background (is extension enabled? is device registered?)
 *   2. Blur all visible images immediately (optimistic safety)
 *   3. Check URL via background → if blocked → show block screen, stop
 *   4. Wait for page to settle (1.5s debounce)
 *   5. Extract text + visible image URLs
 *   6. Send to background → /api/moderate/page (single combined API call)
 *   7a. If blocked → replace page with block screen
 *   7b. If safe → unblur images
 *
 * Performance notes:
 *   - Only extracts text visible in the viewport + near-viewport
 *   - Skips images < 100x100 (icons, tracking pixels)
 *   - Max 5 images per scan to limit API tokens
 *   - Debounces re-scans on DOM changes (SPA navigation)
 *   - All heavy lifting is done server-side via Gemini
 */

let scanTimer = null;
let isBlocked = false;
let blurredImages = new Set();

// ─── Bootstrap ────────────────────────────────────────────────────────────────
(async () => {
  const config = await sendMessage({ type: 'GET_CONFIG' });
  if (!config?.enabled || !config?.deviceId) return; // Extension inactive or unconfigured

  // Phase 1: Blur images immediately for safety while we wait for Gemini
  blurVisibleImages();

  // Phase 2: Quick URL pre-check (fast — cached in MongoDB)
  const urlResult = await sendMessage({ type: 'MODERATE_URL', url: location.href });
  if (urlResult?.blocked) {
    showBlockScreen(urlResult.reason || 'unsafe_url');
    return;
  }

  // Phase 3: Full content scan after page settles
  scanTimer = setTimeout(() => scanPage(), 1500);
})();

// ─── DOM Change Observer (SPA support) ────────────────────────────────────────
const observer = new MutationObserver(() => {
  if (isBlocked) return;
  // Re-blur any newly loaded images
  blurVisibleImages();
  // Debounce re-scan
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanPage, 3000);
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// ─── Page Scanner ─────────────────────────────────────────────────────────────
async function scanPage() {
  if (isBlocked) return;

  const text = extractText();
  const imageUrls = extractImageUrls();

  // Nothing meaningful to scan
  if (text.length < 30 && imageUrls.length === 0) {
    unblurImages();
    return;
  }

  // Send combined payload to /api/moderate/page via background
  const result = await sendMessage({
    type: 'MODERATE_PAGE',
    payload: {
      url: location.href,
      text,
      imageUrls,
    },
  });

  if (result?.blocked) {
    showBlockScreen(result.reason || 'content_violation');
  } else {
    unblurImages(); // Safe — reveal images
  }
}

// ─── Text Extraction ──────────────────────────────────────────────────────────
function extractText() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const tag = node.parentElement?.tagName?.toUpperCase();
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Only include nodes in or near viewport
        const rect = node.parentElement?.getBoundingClientRect?.();
        if (rect && (rect.bottom < -300 || rect.top > window.innerHeight + 300)) {
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const chunks = [];
  let totalLength = 0;
  let node;

  while ((node = walker.nextNode()) && totalLength < 3000) {
    const chunk = node.textContent.trim();
    if (chunk.length > 15) {
      chunks.push(chunk);
      totalLength += chunk.length;
    }
  }

  return chunks.join(' ').slice(0, 3000);
}

// ─── Image URL Extraction ─────────────────────────────────────────────────────
function extractImageUrls() {
  const urls = new Set();
  const imgs = document.querySelectorAll('img[src], img[data-src], img[data-lazy]');

  for (const img of imgs) {
    if (urls.size >= 5) break; // Max 5 images for combined scan

    // Skip tiny images (icons, favicons, tracking pixels)
    if (img.naturalWidth > 0 && img.naturalWidth < 100) continue;
    if (img.naturalHeight > 0 && img.naturalHeight < 100) continue;

    // Skip images far outside viewport
    const rect = img.getBoundingClientRect();
    if (rect.bottom < -600 || rect.top > window.innerHeight + 600) continue;

    const src = img.src || img.dataset.src || img.dataset.lazy || '';
    if (src.startsWith('http') && !src.startsWith('data:')) {
      urls.add(src);
    }
  }

  return [...urls];
}

// ─── Image Blurring ───────────────────────────────────────────────────────────
function blurVisibleImages() {
  document.querySelectorAll('img[src]').forEach((img) => {
    // Skip tiny images
    if (img.naturalWidth > 0 && img.naturalWidth < 80) return;

    if (!blurredImages.has(img)) {
      // Store original filter so we can restore it
      img.dataset.sgOrigFilter = img.style.filter || '';
      img.style.filter = 'blur(24px)';
      img.style.transition = 'filter 0.4s ease';
      blurredImages.add(img);
    }
  });
}

function unblurImages() {
  blurredImages.forEach((img) => {
    img.style.filter = img.dataset.sgOrigFilter || '';
    delete img.dataset.sgOrigFilter;
  });
  blurredImages.clear();
}

// ─── Block Screen ─────────────────────────────────────────────────────────────
function showBlockScreen(reason) {
  isBlocked = true;
  observer.disconnect();
  clearTimeout(scanTimer);

  // Map raw reason codes to friendly messages
  const REASON_LABELS = {
    'Sexual Content':     '🔞 Sexual Content Detected',
    'Nudity':             '🔞 Nudity Detected',
    'Explicit Language':  '🤬 Explicit Language',
    'Violence':           '⚠️ Violent Content Detected',
    'Drugs':              '💊 Drug-Related Content',
    'Hate Speech':        '⚠️ Hate Speech Detected',
    'Other Harmful Content': '⚠️ Harmful Content Detected',
    'unsafe_url':         '🔗 Unsafe URL Detected',
    'manual_blocklist':   '🚫 Site Blocked by Parent',
    'allowlisted':        '✅ Site Allowed',
    'content_violation':  '⚠️ Content Policy Violation',
  };

  const label = REASON_LABELS[reason] || '⚠️ Inappropriate Content';

  // Replace the entire page document with block screen
  document.open();
  document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blocked by SafeGuard AI</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  body {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #f1f5f9;
  }
  .card {
    animation: fadeIn 0.4s ease;
    text-align: center; padding: 48px 40px;
    max-width: 480px; width: 90%;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 20px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5);
  }
  .shield {
    font-size: 72px;
    animation: pulse 2s ease-in-out infinite;
    display: block; margin-bottom: 20px;
  }
  .blocked-label {
    font-size: 13px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: #ef4444;
    background: rgba(239,68,68,0.1);
    padding: 4px 12px; border-radius: 20px;
    display: inline-block; margin-bottom: 16px;
  }
  h1 { font-size: 26px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }
  .reason { font-size: 16px; color: #94a3b8; margin-bottom: 20px; }
  .url-box {
    background: #0f172a; border: 1px solid #334155;
    border-radius: 8px; padding: 10px 14px;
    font-size: 12px; color: #475569;
    word-break: break-all; margin-bottom: 24px;
    font-family: monospace;
  }
  .msg { font-size: 14px; color: #64748b; line-height: 1.6; }
  .footer {
    margin-top: 28px; padding-top: 20px;
    border-top: 1px solid #334155;
    font-size: 12px; color: #334155;
  }
  .footer span { color: #6366f1; }
</style>
</head>
<body>
<div class="card">
  <span class="shield">🛡️</span>
  <span class="blocked-label">Blocked</span>
  <h1>Page Blocked</h1>
  <div class="reason">${label}</div>
  <div class="url-box">${location.href.slice(0, 90)}${location.href.length > 90 ? '...' : ''}</div>
  <p class="msg">This page has been blocked by <strong>SafeGuard AI</strong> parental controls to keep you safe.<br><br>If you think this is a mistake, please contact your parent or guardian.</p>
  <div class="footer">Protected by <span>SafeGuard AI</span> · Powered by Gemini</div>
</div>
</body>
</html>`);
  document.close();
}

// ─── Message Helper ───────────────────────────────────────────────────────────
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Extension context invalidated (page refresh during scan) — fail safe
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}
