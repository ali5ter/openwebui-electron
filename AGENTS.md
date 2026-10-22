# AGENTS.md

This project wraps OpenWebUI in an Electron app for macOS and Linux.

## Structure

```
.github/workflows/  — release.yml: builds DMG/zip on tag push
resources/          — logo.png (OpenWebUI logo, 512x512)
scripts/            — build.sh (auto-detects platform), install.sh (macOS only)
src/                — main.js (Electron entry), package.json (electron-builder config)
docs/               — setup.md (Ollama → OpenWebUI → Electron guide)
```

## Build

```bash
./scripts/build.sh          # auto-detect platform
./scripts/build.sh --mac    # macOS ARM64
./scripts/build.sh --linux  # Linux x64
```

Output: `src/dist/`

## Install (macOS)

```bash
./scripts/install.sh        # from src/dist/
./scripts/install.sh /path  # from specific dist directory
```

## Key config

- `OPENWEBUI_URL` env var overrides the default `http://localhost:8080`
- Electron app loads the URL in a standalone BrowserWindow
- ATS allows HTTP to localhost via `NSAllowsLocalNetworking`

## Release

Tag `v*` triggers GitHub Actions to build DMG + zip and publish to Releases.

## Notes

- No code signing (requires Apple Developer Program)
- macOS Gate workaround: right-click → Open → Open
- Electron works on macOS ARM64 and Linux x64 only (no universal/universal2)
