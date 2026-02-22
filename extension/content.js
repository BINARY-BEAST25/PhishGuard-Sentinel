/**
 * PhishGuard Sentinel - Content Script
 *
 * Flow:
 * 1) Read extension config from background
 * 2) Blur images quickly as a safety-first default
 * 3) Run a fast URL pre-check
 * 4) Scan page text/images after debounce
 * 5) If unsafe: replace page with block screen
 */

let scanTimer = null;
let isBlocked = false;
let blurredImages = new Set();

(async () => {
  const config = await sendMessage({ type: 'GET_CONFIG' });
  if (!config?.enabled || !config?.deviceId) return;

  blurVisibleImages();

  const urlResult = await sendMessage({ type: 'MODERATE_URL', url: location.href });
  if (urlResult?.blocked) {
    showBlockScreen(urlResult.reason || 'unsafe_url');
    return;
  }

  scanTimer = setTimeout(() => scanPage(), 1500);
})();

const observer = new MutationObserver(() => {
  if (isBlocked) return;
  blurVisibleImages();
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanPage, 3000);
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}

async function scanPage() {
  if (isBlocked) return;

  const text = extractText();
  const imageUrls = extractImageUrls();

  if (text.length < 30 && imageUrls.length === 0) {
    unblurImages();
    return;
  }

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
    unblurImages();
  }
}

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

function extractImageUrls() {
  const urls = new Set();
  const imgs = document.querySelectorAll('img[src], img[data-src], img[data-lazy]');

  for (const img of imgs) {
    if (urls.size >= 5) break;
    if (img.naturalWidth > 0 && img.naturalWidth < 100) continue;
    if (img.naturalHeight > 0 && img.naturalHeight < 100) continue;

    const rect = img.getBoundingClientRect();
    if (rect.bottom < -600 || rect.top > window.innerHeight + 600) continue;

    const src = img.src || img.dataset.src || img.dataset.lazy || '';
    if (src.startsWith('http') && !src.startsWith('data:')) {
      urls.add(src);
    }
  }

  return [...urls];
}

function blurVisibleImages() {
  document.querySelectorAll('img[src]').forEach((img) => {
    if (img.naturalWidth > 0 && img.naturalWidth < 80) return;

    if (!blurredImages.has(img)) {
      img.dataset.pgOrigFilter = img.style.filter || '';
      img.style.filter = 'blur(24px)';
      img.style.transition = 'filter 0.35s ease';
      blurredImages.add(img);
    }
  });
}

function unblurImages() {
  blurredImages.forEach((img) => {
    img.style.filter = img.dataset.pgOrigFilter || '';
    delete img.dataset.pgOrigFilter;
  });
  blurredImages.clear();
}

function showBlockScreen(reason) {
  isBlocked = true;
  observer.disconnect();
  clearTimeout(scanTimer);

  const reasonLabels = {
    'Sexual Content': 'Sexual Content Detected',
    'Nudity': 'Nudity Detected',
    'Explicit Language': 'Explicit Language Detected',
    'Violence': 'Violent Content Detected',
    'Drugs': 'Drug-Related Content Detected',
    'Hate Speech': 'Hate Speech Detected',
    'Other Harmful Content': 'Harmful Content Detected',
    'unsafe_url': 'Unsafe URL Detected',
    'manual_blocklist': 'Site Blocked by Guardian Rules',
    'allowlisted': 'Allowlisted Site',
    'content_violation': 'Content Policy Violation',
  };

  const label = reasonLabels[reason] || 'Suspicious Content Detected';
  const safeUrl = `${location.href.slice(0, 90)}${location.href.length > 90 ? '...' : ''}`;

  document.open();
  document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blocked by PhishGuard Sentinel</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg-0: #04080f;
    --line: #22384b;
    --text-0: #e6f4ff;
    --text-1: #9cb6cb;
    --accent: #1ec8a5;
    --danger: #ef6a63;
  }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 88% -12%, #17463f 0%, transparent 40%),
      radial-gradient(circle at 10% -20%, #1a344f 0%, transparent 45%), var(--bg-0);
    color: var(--text-0);
    font-family: "Manrope", "Segoe UI", sans-serif;
    padding: 16px;
  }
  .card {
    width: min(520px, 92vw);
    border: 1px solid var(--line);
    border-radius: 18px;
    background: linear-gradient(160deg, rgba(20, 36, 54, 0.9), rgba(10, 19, 31, 0.95));
    padding: 32px 26px;
    text-align: center;
  }
  .icon {
    width: 62px;
    height: 62px;
    border-radius: 16px;
    margin: 0 auto 14px;
    display: grid;
    place-items: center;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #03233f;
    background: linear-gradient(140deg, #51edca 0%, #2f9fdd 100%);
  }
  .tag {
    font-size: 11px;
    color: var(--danger);
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    text-transform: uppercase;
    font-weight: 700;
  }
  h1 { font-size: 26px; margin-bottom: 8px; }
  .reason { color: var(--text-1); margin-bottom: 16px; font-size: 15px; }
  .url {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    color: #8bb7d6;
    word-break: break-all;
    margin-bottom: 16px;
    font-family: Consolas, monospace;
    background: #0c1825;
  }
  .msg { color: var(--text-1); font-size: 14px; line-height: 1.5; }
  .footer {
    margin-top: 20px;
    border-top: 1px solid var(--line);
    padding-top: 12px;
    color: var(--accent);
    font-size: 12px;
    letter-spacing: 0.25px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">PG</div>
    <div class="tag">Blocked</div>
    <h1>Page Blocked</h1>
    <div class="reason">${label}</div>
    <div class="url">${safeUrl}</div>
    <p class="msg">
      PhishGuard Sentinel stopped this page to protect against phishing, spoofed domains,
      and unsafe content.
    </p>
    <div class="footer">PhishGuard Sentinel | Powered by Gemini</div>
  </div>
</body>
</html>`);
  document.close();
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

