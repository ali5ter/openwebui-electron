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

# Find the .app bundle
APP_PATH=$(find "${DIST_DIR}" -name "OpenWebUI.app" -type d 2>/dev/null | head -1)

if [[ -z "${APP_PATH}" ]]; then
  echo "error: no OpenWebUI.app found in ${DIST_DIR}" >&2
  exit 1
fi

# Copy to /Applications
echo "Installing ${APP_PATH} to /Applications/OpenWebUI.app..."
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
