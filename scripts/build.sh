#!/usr/bin/env bash
#
# build.sh - Build the OpenWebUI Electron app for macOS or Linux
#
# Usage:
#   ./scripts/build.sh              # Build for current platform
#   ./scripts/build.sh --mac        # Build for macOS (ARM64)
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

# Default to current platform
case "${1:-}" in
  --mac)
    echo "Building for macOS (ARM64)..."
    npx electron-builder --mac --arm64
    ;;
  --linux)
    echo "Building for Linux (x64)..."
    npx electron-builder --linux --x64
    ;;
  *)
    if [[ "$(uname)" == "Darwin" ]]; then
      echo "Building for macOS (ARM64)..."
      npx electron-builder --mac --arm64
    elif [[ "$(uname)" == "Linux" ]]; then
      echo "Building for Linux (x64)..."
      npx electron-builder --linux --x64
    else
      echo "error: unsupported platform $(uname)" >&2
      echo "Use --mac or --linux to specify target platform" >&2
      exit 1
    fi
    ;;
esac

echo ""
echo "Build complete. Output in ${SRC_DIR}/dist/"
ls -lh "${SRC_DIR}/dist/"
