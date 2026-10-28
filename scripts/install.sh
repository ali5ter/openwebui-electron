#!/usr/bin/env bash
#
# install.sh - Install the OpenWebUI Electron app to /Applications (macOS)
#
# Usage:
#   ./scripts/install.sh              # Install from src/dist/
#   ./scripts/install.sh /path/to/dist  # Install from a specific dist directory
#
# Author: Alister Lewis-Bowen <alister@lewis-bowen.org>
# License: MIT
#

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SCRIPT_DIR}/../src"

# Find the dist directory
if [[ $# -gt 0 ]]; then
  DIST_DIR="$1"
else
  DIST_DIR="${SRC_DIR}/dist"
fi

if [[ ! -d "${DIST_DIR}" ]]; then
  echo "error: dist directory not found at ${DIST_DIR}" >&2
  echo "Run ./scripts/build.sh first" >&2
  exit 1
fi

# Find the .app bundle. A build may produce one bundle per architecture
# (dist/mac-arm64 and dist/mac), so prefer the one whose launcher is native to
# this Mac and fall back to any bundle, which Rosetta can still run.
HOST_ARCH="$(uname -m)"
APP_PATH=""
FALLBACK_PATH=""

while IFS= read -r candidate; do
  [[ -n "${candidate}" ]] || continue
  [[ -n "${FALLBACK_PATH}" ]] || FALLBACK_PATH="${candidate}"
  if lipo -archs "${candidate}/Contents/MacOS/OpenWebUI" 2>/dev/null |
    grep -qw "${HOST_ARCH}"; then
    APP_PATH="${candidate}"
    break
  fi
done < <(find "${DIST_DIR}" -name "OpenWebUI.app" -type d 2>/dev/null)

if [[ -z "${APP_PATH}" ]]; then
  APP_PATH="${FALLBACK_PATH}"
  [[ -z "${APP_PATH}" ]] || echo "warning: no ${HOST_ARCH} build found, installing ${APP_PATH}" >&2
fi

if [[ -z "${APP_PATH}" ]]; then
  echo "error: no OpenWebUI.app found in ${DIST_DIR}" >&2
  echo "Run ./scripts/build.sh first" >&2
  exit 1
fi

# Replace any existing install. Removing first matters: `cp -R` onto an existing
# directory would nest the new bundle inside the old one, and macOS Local
# Network privacy keys its decision on the bundle ID, so a clean replacement
# keeps the existing "Allow" setting.
echo "Installing ${APP_PATH} to /Applications/OpenWebUI.app..."
if [[ -d /Applications/OpenWebUI.app ]]; then
  rm -rf /Applications/OpenWebUI.app
fi
cp -R "${APP_PATH}" /Applications/OpenWebUI.app

echo "Installed to /Applications/OpenWebUI.app"
echo ""
echo "Launch with:"
echo "  open /Applications/OpenWebUI.app"
echo ""
echo "Or via Spotlight: Cmd+Space, type 'OpenWebUI'"
echo ""
echo "If you see 'OpenWebUI is damaged' in System Preferences:"
echo "  Right-click /Applications/OpenWebUI.app > Open"
echo "  Click 'Open' in the dialog"
echo ""
echo "If OpenWebUI runs on another machine, allow the app under"
echo "  System Settings > Privacy & Security > Local Network"
echo "when macOS asks on first launch."
