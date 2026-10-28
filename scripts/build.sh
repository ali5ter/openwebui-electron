#!/usr/bin/env bash
#
# build.sh - Build the OpenWebUI Electron app for macOS or Linux
#
# Usage:
#   ./scripts/build.sh              # Build for current platform and architecture
#   ./scripts/build.sh --mac        # Build for macOS (both arm64 and x64)
#   ./scripts/build.sh --mac-arm64  # Build for macOS (Apple silicon)
#   ./scripts/build.sh --mac-x64    # Build for macOS (Intel)
#   ./scripts/build.sh --linux      # Build for Linux (x64)
#
# Output goes to src/dist/
#
# Author: Alister Lewis-Bowen <alister@lewis-bowen.org>
# License: MIT
#

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SCRIPT_DIR}/../src"

cd "${SRC_DIR}"

# Install dependencies (skip if already installed)
if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

# Map the host CPU to the electron-builder architecture flag. Apple silicon
# reports arm64; Intel reports x86_64, which electron-builder calls x64.
host_mac_arch() {
  if [[ "$(uname -m)" == "arm64" ]]; then
    echo "arm64"
  else
    echo "x64"
  fi
}

case "${1:-}" in
  --mac)
    echo "Building for macOS (arm64 and x64)..."
    npx electron-builder --mac --arm64 --x64
    ;;
  --mac-arm64)
    echo "Building for macOS (arm64)..."
    npx electron-builder --mac --arm64
    ;;
  --mac-x64)
    echo "Building for macOS (x64)..."
    npx electron-builder --mac --x64
    ;;
  --linux)
    echo "Building for Linux (x64)..."
    npx electron-builder --linux --x64
    ;;
  "")
    if [[ "$(uname)" == "Darwin" ]]; then
      arch="$(host_mac_arch)"
      echo "Building for macOS (${arch})..."
      npx electron-builder --mac "--${arch}"
    elif [[ "$(uname)" == "Linux" ]]; then
      echo "Building for Linux (x64)..."
      npx electron-builder --linux --x64
    else
      echo "error: unsupported platform $(uname)" >&2
      echo "Use --mac, --mac-arm64, --mac-x64 or --linux to specify a target" >&2
      exit 1
    fi
    ;;
  *)
    echo "error: unknown option '$1'" >&2
    echo "Use --mac, --mac-arm64, --mac-x64 or --linux" >&2
    exit 1
    ;;
esac

# Info.plist additions (ATS, Local Network usage description) are applied by
# electron-builder via "extendInfo" in src/package.json, and the bundle is
# ad-hoc signed by src/after-pack.mjs. Both run before this point, so nothing
# may modify the .app from here on or the signature breaks.
if [[ "$(uname)" == "Darwin" ]]; then
  for app_path in "${SRC_DIR}"/dist/mac*/OpenWebUI.app; do
    [[ -d "${app_path}" ]] || continue
    echo "Signature (${app_path#"${SRC_DIR}/dist/"}): \
$(codesign -dv "${app_path}" 2>&1 | grep -E '^(Identifier|Signature)=' | tr '\n' ' ')"
  done
fi

echo ""
echo "Build complete. Output in ${SRC_DIR}/dist/"
ls -lh "${SRC_DIR}/dist/"
