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

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(OPENWEBUI_URL);
}

app.on('ready', createWindow);
