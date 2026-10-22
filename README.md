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

See [docs/BUILDING.md](docs/BUILDING.md) for full build and install instructions.

### Need help setting up?

See [docs/setup.md](docs/setup.md) for a step-by-step guide to installing Ollama, OpenWebUI, and
the desktop app.

### From Homebrew

```bash
brew tap ali5ter/tap
brew install --cask openwebui-electron
```

Or in one step:

```bash
brew install ali5ter/tap/openwebui-electron
```

## Configuration

### App config

The app loads OpenWebUI from `http://localhost:8080` by default. Override the URL by creating
`~/.config/openwebui-electron/env`:

```bash
mkdir -p ~/.config/openwebui-electron
cat > ~/.config/openwebui-electron/env << 'EOF'
# URL where OpenWebUI is running
OPENWEBUI_URL=http://192.168.1.63:8080
EOF
```

Copy the template from [docs/env.template](docs/env.template) for the full reference.

## macOS Gatekeeper note

This app is unsigned. On first launch macOS may show:

> "OpenWebUI.app" is damaged and can't be opened. You should move it to the Trash.

This is because macOS adds a quarantine flag to downloaded apps. Fix it with one command:

```bash
xattr -d com.apple.quarantine /Applications/OpenWebUI.app
```

Or use the GUI: right-click `/Applications/OpenWebUI.app` → **Open** → click **Open** in the
dialog. This only happens once per app install.

## iOS / iPhone

OpenWebUI works as a PWA on iOS — no app needed. Open `http://192.168.1.63:8080` in Safari on
your iPhone, tap the **Share** button → **Add to Home Screen**. It launches in its own window with
its own icon, just like a native app.

Note: the URL must be `http://` on your LAN. HTTPS is not required for the PWA to work on iOS.

## License

MIT — see [LICENSE](LICENSE)
