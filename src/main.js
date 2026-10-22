const { app, BrowserWindow } = require('electron');

const OPENWEBUI_URL = process.env.OPENWEBUI_URL || 'http://localhost:8080';

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
