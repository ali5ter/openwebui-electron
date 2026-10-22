# OpenWebUI Desktop

A native desktop app for [OpenWebUI](https://github.com/open-webui/open-webui) — wraps your local
OpenWebUI instance in a standalone macOS or Linux app with its own window, icon, and process.

## Prerequisites

- **OpenWebUI installed and running locally** — this app is just a wrapper; it does not install
  OpenWebUI or Ollama for you
- [Node.js 18+](https://nodejs.org/) (for building from source)

## Quick install

### From a pre-built release

1. Download the latest `.dmg` (macOS) or `.AppImage` (Linux) from [Releases](https://github.com/ali5ter/openwebui-electron/releases)
2. **macOS:** Drag `OpenWebUI.app` to `/Applications`
3. **Linux:** `chmod +x OpenWebUI*.AppImage && ./OpenWebUI*.AppImage`

### Build from source

```bash
git clone https://github.com/ali5ter/openwebui-electron.git
cd openwebui-electron

# macOS (Apple Silicon)
./scripts/build.sh --mac
./scripts/install.sh

# Linux
./scripts/build.sh --linux
```

## Configuration

The app loads OpenWebUI from `http://localhost:8080` by default. Override with:

```bash
OPENWEBUI_URL=http://192.168.1.63:8080 /Applications/OpenWebUI.app/Contents/MacOS/OpenWebUI
```

### OpenWebUI settings you must configure

The Electron app is a blank window — all real configuration happens in OpenWebUI itself.

1. **Ollama connection** — OpenWebUI must know where your Ollama server is. Set this in
   OpenWebUI's `.env` file before starting the service:

   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   ```

   If Ollama is on a different host, use that host's IP.

2. **Embedding model** — by default OpenWebUI tries to download `nomic-embed-text` from
   HuggingFace. To keep everything local, set the embedding model in OpenWebUI **Settings → RAG**
   to a model available on your local Ollama instance.

3. **Authentication** — OpenWebUI has no built-in sign-in by default. To require a password, set
   `OPENWEBUI_SECRET_KEY` in your OpenWebUI `.env` file.

## macOS Gatekeeper note

This app is unsigned. On first launch macOS may show:

> "OpenWebUI is damaged and can't be opened."

Workaround: right-click `/Applications/OpenWebUI.app` → **Open** → click **Open** in the dialog.
This only happens once per app install.

## License

MIT — see [LICENSE](LICENSE)
