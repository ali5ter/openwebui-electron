const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const configDir = path.join(require('os').homedir(), '.config', 'openwebui-electron');
  const envFile = path.join(configDir, 'env');

  if (!fs.existsSync(envFile)) {
    return { OPENWEBUI_URL: 'http://localhost:8080' };
  }

  const content = fs.readFileSync(envFile, 'utf8');
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
const OPENWEBUI_URL = process.env.OPENWEBUI_URL || config.OPENWEBUI_URL || 'http://localhost:8080';
const configDir = path.join(require('os').homedir(), '.config', 'openwebui-electron');
const configPath = path.join(configDir, 'env');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setTitle(`OpenWebUI → ${OPENWEBUI_URL}`);
  win.loadURL(OPENWEBUI_URL);

  // Inject a debug bar so the user can always see what URL the app is trying.
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      body::before {
        content: 'OPENWEBUI_URL: ${OPENWEBUI_URL} | Config path: ${configPath} | Config exists: ${require('fs').existsSync(configPath)}';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff4444;
        color: white;
        font-family: monospace;
        font-size: 13px;
        padding: 6px 10px;
        z-index: 999999;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `);
  });

  function showOffline() {
    win.loadURL(
      `data:text/html,` +
        `<html style="margin:0;padding:40px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;">` +
        `<div style="background:#ff4444;color:white;padding:6px 10px;font-family:monospace;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">` +
        `OPENWEBUI_URL: ${OPENWEBUI_URL} | Config path: ${configPath} | Config exists: ${require('fs').existsSync(configPath)}` +
        `</div>` +
        `<h2>Could not connect to OpenWebUI</h2>` +
        `<p>OpenWebUI Electron tried to load <code>${OPENWEBUI_URL}</code> but the connection failed.</p>` +
        `<p>Make sure OpenWebUI is running, then check <code>~/.config/openwebui-electron/env</code> for the correct URL.</p>` +
        `</html>`,
    );
  }
}

app.on('ready', createWindow);
