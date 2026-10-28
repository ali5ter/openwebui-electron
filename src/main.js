const { app, BrowserWindow, net } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_URL = 'http://localhost:8080';

/**
 * How long to wait for the server to answer before showing the offline page.
 * Generous on purpose: a VPN tunnel (Twingate, Tailscale) often accepts the TCP
 * connection instantly and then stalls for ten seconds or more while it brings
 * the route up, which a short timeout reports as a failure the user cannot act on.
 */
const DEFAULT_TIMEOUT_MS = 15000;

/** How long the offline page waits before retrying on its own. */
const AUTO_RETRY_MS = 15000;

const CONFIG_PATH = path.join(os.homedir(), '.config', 'openwebui-electron', 'env');

/**
 * Read key=value pairs from the user's config file.
 *
 * @returns {Record<string, string>} Parsed settings, empty when no file exists.
 */
function loadEnvFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }

  const content = fs.readFileSync(CONFIG_PATH, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

const config = loadEnvFile();
const OPENWEBUI_URL = process.env.OPENWEBUI_URL || config.OPENWEBUI_URL || DEFAULT_URL;
const TIMEOUT_MS =
  Number(process.env.OPENWEBUI_TIMEOUT_MS || config.OPENWEBUI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

/**
 * Classify the target so the offline page can offer advice that applies.
 *
 * @param {string} rawUrl - The configured OpenWebUI URL.
 * @returns {{host: string, kind: 'localhost'|'lan'|'remote'}} Host and its category.
 */
function describeTarget(rawUrl) {
  let host = '';
  try {
    host = new URL(rawUrl).hostname;
  } catch {
    return { host: rawUrl, kind: 'remote' };
  }

  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) {
    return { host, kind: 'localhost' };
  }
  // RFC 1918 ranges and .local names: reachable only over the LAN or a VPN,
  // and subject to macOS Local Network privacy.
  const isPrivate =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith('.local');
  return { host, kind: isPrivate ? 'lan' : 'remote' };
}

/**
 * Escape text for safe interpolation into HTML.
 *
 * @param {string} value - Untrusted text.
 * @returns {string} HTML-safe text.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Turn a Chromium network error into a sentence the user can act on.
 *
 * @param {string} code - Message from net.fetch, usually "net::ERR_...".
 * @returns {string} Plain-English explanation.
 */
function explainError(code) {
  if (code === 'timeout') {
    return `No response within ${Math.round(TIMEOUT_MS / 1000)} seconds. The server accepted the
      connection but sent nothing back, which usually means a VPN tunnel is still coming up.`;
  }
  if (code.includes('ERR_CONNECTION_REFUSED')) {
    return 'The machine answered but nothing is listening on that port, so OpenWebUI is not running.';
  }
  if (code.includes('ERR_ADDRESS_UNREACHABLE') || code.includes('ERR_NETWORK_ACCESS_DENIED')) {
    return 'The address could not be reached. macOS blocks local network access until the app is allowed.';
  }
  if (code.includes('ERR_NAME_NOT_RESOLVED')) {
    return 'That hostname could not be resolved by DNS.';
  }
  if (code.includes('ERR_CONNECTION_TIMED_OUT')) {
    return 'The connection timed out, so the machine is switched off or not on this network.';
  }
  return code;
}

/**
 * Build the list of checks worth trying, tailored to the kind of target.
 *
 * @param {'localhost'|'lan'|'remote'} kind - Target category.
 * @returns {string[]} HTML list items.
 */
function troubleshootingSteps(kind) {
  if (kind === 'localhost') {
    return [
      'Start OpenWebUI on this Mac, then press Retry.',
      'Confirm it is up with <code>curl -I ' + escapeHtml(OPENWEBUI_URL) + '</code> in Terminal.',
      'If it listens on a different port, update the URL below.',
    ];
  }

  const steps = [
    'Check the machine running OpenWebUI is switched on and awake.',
    'If it is on another network, connect your VPN and press Retry.',
  ];
  if (kind === 'lan') {
    steps.push(
      'Allow this app under <strong>System Settings → Privacy &amp; Security → Local Network</strong>.',
    );
  }
  steps.push('Confirm it is up with <code>curl -I ' + escapeHtml(OPENWEBUI_URL) + '</code> in Terminal.');
  return steps;
}

/**
 * Wrap body content in the shared page chrome and return it as a data URL.
 *
 * @param {string} title - Document title, also used as the window title.
 * @param {string} body - HTML for the page body.
 * @returns {string} A data: URL ready for loadURL.
 */
function renderPage(title, body) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; --fg: #1a1a1a; --muted: #5a5a5a; --bg: #ffffff;
          --card: #f4f4f5; --accent: #2563eb; --border: #e2e2e5; }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #ececee; --muted: #a0a0a8; --bg: #1c1c1e;
            --card: #2a2a2d; --accent: #60a5fa; --border: #3a3a3d; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px 32px; background: var(--bg); color: var(--fg);
         font: 16px/1.6 -apple-system, BlinkMacSystemFont, sans-serif;
         display: flex; justify-content: center; }
  main { max-width: 560px; width: 100%; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p { margin: 0 0 16px; color: var(--muted); }
  ol { margin: 0 0 20px; padding-left: 22px; color: var(--muted); }
  li { margin-bottom: 8px; }
  code { font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
         background: var(--card); padding: 2px 6px; border-radius: 4px; color: var(--fg); }
  .detail { background: var(--card); border: 1px solid var(--border); border-radius: 8px;
            padding: 14px 16px; margin-bottom: 24px; }
  .detail div { margin-bottom: 6px; font-size: 14px; }
  .detail div:last-child { margin-bottom: 0; }
  .label { color: var(--muted); display: inline-block; min-width: 68px; }
  button { font: 500 15px -apple-system, BlinkMacSystemFont, sans-serif; cursor: pointer;
           background: var(--accent); color: #fff; border: 0; border-radius: 8px;
           padding: 10px 20px; }
  button:hover { filter: brightness(1.08); }
  .countdown { color: var(--muted); font-size: 14px; margin-left: 12px; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border);
             border-top-color: var(--accent); border-radius: 50%; display: inline-block;
             vertical-align: -3px; margin-right: 10px; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Page shown while the first connection attempt is in flight.
 *
 * @returns {string} A data: URL.
 */
function connectingPage() {
  return renderPage(
    'Connecting to OpenWebUI',
    `<h1><span class="spinner"></span>Connecting…</h1>
     <p>Loading <code>${escapeHtml(OPENWEBUI_URL)}</code></p>`,
  );
}

/**
 * Page shown when the server could not be reached.
 *
 * @param {string} reason - Raw error code or "timeout".
 * @returns {string} A data: URL.
 */
function offlinePage(reason) {
  const { host, kind } = describeTarget(OPENWEBUI_URL);
  const steps = troubleshootingSteps(kind).map((step) => `<li>${step}</li>`).join('');

  return renderPage(
    'Cannot reach OpenWebUI',
    `<h1>Cannot reach OpenWebUI</h1>
     <p>${escapeHtml(explainError(reason))}</p>
     <div class="detail">
       <div><span class="label">Address</span> <code>${escapeHtml(OPENWEBUI_URL)}</code></div>
       <div><span class="label">Host</span> <code>${escapeHtml(host)}</code></div>
       <div><span class="label">Error</span> <code>${escapeHtml(reason)}</code></div>
       <div><span class="label">Config</span> <code>${escapeHtml(CONFIG_PATH)}</code></div>
     </div>
     <h1 style="font-size:17px">Things to check</h1>
     <ol>${steps}</ol>
     <button id="retry">Retry now</button>
     <span class="countdown" id="countdown"></span>
     <script>
       const target = ${JSON.stringify(OPENWEBUI_URL)};
       const retry = () => { location.href = target; };
       document.getElementById('retry').addEventListener('click', retry);
       let left = ${Math.round(AUTO_RETRY_MS / 1000)};
       const countdown = document.getElementById('countdown');
       const tick = () => {
         countdown.textContent = 'Retrying automatically in ' + left + 's';
         if (left-- <= 0) { clearInterval(timer); retry(); }
       };
       const timer = setInterval(tick, 1000);
       tick();
     </script>`,
  );
}

/**
 * Ask the server for a response, using Chromium's network stack so the result
 * matches what the window itself would see.
 *
 * @returns {Promise<{ok: true}|{ok: false, reason: string}>} Outcome of the attempt.
 */
async function probe() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await net.fetch(OPENWEBUI_URL, { signal: controller.signal });
    return { ok: true };
  } catch (error) {
    const aborted = controller.signal.aborted;
    return { ok: false, reason: aborted ? 'timeout' : String(error.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 'connecting' while probing, 'online' once OpenWebUI is loaded, 'offline' on
  // the error page. The offline page retries by navigating to the target URL,
  // which is intercepted below and turned back into a probe.
  let state = 'connecting';

  async function connect() {
    state = 'connecting';
    win.loadURL(connectingPage());

    const result = await probe();
    if (result.ok) {
      state = 'online';
      win.loadURL(OPENWEBUI_URL);
    } else {
      state = 'offline';
      win.loadURL(offlinePage(result.reason));
    }
  }

  win.webContents.on('will-navigate', (event, url) => {
    if (state === 'offline' && url.startsWith(OPENWEBUI_URL)) {
      event.preventDefault();
      connect();
    }
  });

  // Covers the tunnel dropping after a successful load. Sub-frames and
  // ERR_ABORTED (-3, a navigation the user or the page replaced) are ignored:
  // neither means the server became unreachable.
  win.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3) {
        return;
      }
      if (state === 'online' && validatedURL.startsWith(OPENWEBUI_URL)) {
        state = 'offline';
        win.loadURL(offlinePage(errorDescription || `net::ERR_${errorCode}`));
      }
    },
  );

  connect();
}

app.on('ready', createWindow);
