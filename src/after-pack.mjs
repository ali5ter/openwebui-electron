/**
 * electron-builder afterPack hook.
 *
 * Without an Apple-issued identity, electron-builder leaves Electron's stock
 * signature on the packaged app. That signature carries the identifier
 * "Electron" (not the app's bundle ID) and no longer matches the modified
 * bundle, so macOS Local Network privacy cannot attribute the app's traffic to
 * it: any connection to a LAN address (for example an OpenWebUI server on
 * another machine) is dropped when the app is launched from Spotlight, Finder
 * or the Dock, even after the user allows it in System Settings.
 *
 * Ad-hoc signing the whole bundle after packing gives every executable a
 * signature whose identifier is its own bundle ID, which is what macOS keys
 * the Local Network decision on. See Apple TN3179 "Build-time considerations".
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Ad-hoc sign the packed macOS app bundle so its code-signing identifier
 * matches its bundle ID. No-op on other platforms.
 *
 * @param {object} context - electron-builder afterPack context.
 * @param {string} context.appOutDir - Directory containing the packed app.
 * @param {string} context.electronPlatformName - "darwin", "linux" or "win32".
 * @param {object} context.packager - Packager with appInfo.productFilename.
 * @returns {Promise<void>}
 */
export async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  console.log(`  • ad-hoc signing ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });
}
