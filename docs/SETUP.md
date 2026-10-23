# Setup Guide

This guide walks through installing OpenWebUI and Ollama on macOS, then wrapping it with the
Electron app.

## 1. Install Ollama

```bash
brew install ollama
ollama serve &
ollama pull llama3.2
```

Ollama listens on `http://localhost:11434` by default.

## 2. Install OpenWebUI

```bash
# Create a virtualenv with Python 3.11+
python3 -m venv ~/.openwebui/venv
source ~/.openwebui/venv/bin/activate
pip install open-webui
```

### Configure OpenWebUI

Create `~/.openwebui/.env`:

```env
# Ollama connection
OLLAMA_BASE_URL=http://localhost:11434

# Bind address and port
OPENWEBUI_HOST=0.0.0.0
OPENWEBUI_PORT=8080

# Data directory
OPENWEBUI_DATA_DIR=~/.openwebui/data

# Optional: require sign-in
# OPENWEBUI_SECRET_KEY=your-secret-key
```

### Run OpenWebUI

```bash
source ~/.openwebui/venv/bin/activate
open-webui serve
```

OpenWebUI will prompt you to create an admin account on first visit. Go to
`http://localhost:8080` in your browser.

## 3. Configure OpenWebUI for local-only use

After logging in, configure these settings in **Settings**:

### Settings → Ollama

- **Base URL:** `http://localhost:11434` (if you set it in `.env`, this auto-populates)
- **Enable:** ensure Ollama is enabled

### Settings → RAG

- **Embedding model:** set to a model available on your local Ollama (e.g. `nomic-embed-text`)
- This prevents OpenWebUI from downloading models from HuggingFace

## 4. Install the Electron app

### From a release

Download the latest `.dmg` from [Releases](https://github.com/ali5ter/openwebui-electron/releases),
drag `OpenWebUI.app` to `/Applications`, and launch.

### From source

```bash
cd openwebui-electron
./scripts/build.sh --mac
./scripts/install.sh
```

### First launch

macOS may show "OpenWebUI is damaged and can't be opened." Workaround:

1. Right-click `/Applications/OpenWebUI.app` → **Open**
2. Click **Open** in the dialog

This only happens once.

## Troubleshooting

### OpenWebUI can't connect to Ollama

Check that Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

If it returns a list of models, Ollama is fine. Check that `OLLAMA_BASE_URL` in OpenWebUI's
`.env` matches your Ollama address.

### Embedding model downloads from HuggingFace

In OpenWebUI **Settings → RAG**, set the embedding model to a local model. The default is
`nomic-embed-text` — pull it with `ollama pull nomic-embed-text` if needed.

### Electron app won't launch

Check the logs:

```bash
tail -f ~/Library/Logs/OpenWebUI/*.log
```

### Blank window when OpenWebUI runs on another machine

If `OPENWEBUI_URL` points at a LAN address and the app works from a terminal but not from
Spotlight, macOS Local Network privacy is blocking it. Allow the app under
**System Settings → Privacy & Security → Local Network**. If the toggle has no effect, the
build predates the signing fix: see
[Code signing](BUILDING.md#code-signing) in the build guide.
