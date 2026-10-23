/**
 * electron-builder afterPack hook for macOS.
 *
 * Two things macOS Local Network privacy needs that an unsigned Electron build
 * does not provide (Apple TN3179, "Build-time considerations"):
 *
 * 1. A code signature whose identifier is the app's own bundle ID. Without an
 *    Apple-issued identity, electron-builder leaves Electron's stock signature
 *    in place. Its identifier is "Electron", so the kernel can never match the
 *    user's "Allow" decision (recorded against com.openwebui.desktop) to the
 *    running process, and every connection to a LAN address is dropped when
 *    the app is launched from Spotlight, Finder or the Dock.
 *
 * 2. A unique main-executable UUID. Every app built on the same Electron
 *    release ships the same prebuilt launcher, so they all share one LC_UUID.
 *    macOS uses that UUID to identify the app, and Apple warns that a shared
 *    UUID makes local network privacy "behave weirdly": one app can silently
 *    inherit another's deny decision (electron/electron#55101).
 *
 * The hook rewrites the launcher's LC_UUID with a UUID derived from the app ID,
 * then ad-hoc signs the whole bundle. Patching happens first so the signature
 * covers it. Only the main executable is patched: the responsible process is
 * what macOS keys on, and helpers keep Electron's UUIDs.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const MH_MAGIC_64 = 0xfeedfacf;
const FAT_MAGIC = 0xcafebabe;
const MH_HEADER_64_SIZE = 32;
const LC_UUID = 0x1b;
const LC_UUID_SIZE = 24;

/** RFC 4122 DNS namespace; any fixed namespace works, it only has to be stable. */
const UUID_NAMESPACE = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');

/**
 * Derive a stable RFC 4122 version 5 UUID from a name.
 *
 * The same name always yields the same UUID, so rebuilding or updating the
 * app keeps its identity and any Local Network decision already recorded.
 *
 * @param {string} name - Identity to hash, for example the app ID.
 * @returns {Buffer} 16 UUID bytes.
 */
export function deterministicUuid(name) {
  const hash = createHash('sha1')
    .update(UUID_NAMESPACE)
    .update(name, 'utf8')
    .digest();
  const uuid = Buffer.from(hash.subarray(0, 16));
  uuid[6] = (uuid[6] & 0x0f) | 0x50; // version 5
  uuid[8] = (uuid[8] & 0x3f) | 0x80; // RFC 4122 variant
  return uuid;
}

/**
 * Format 16 UUID bytes the way dwarfdump and macOS print them.
 *
 * @param {Buffer} uuid - 16 UUID bytes.
 * @returns {string} Upper-case hyphenated UUID.
 */
export function formatUuid(uuid) {
  const hex = uuid.toString('hex').toUpperCase();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Find the byte offsets of every LC_UUID payload in a Mach-O image.
 *
 * Handles thin 64-bit images and fat (universal) images containing them.
 * Anything else is rejected rather than guessed at.
 *
 * @param {Buffer} image - The whole executable file.
 * @returns {number[]} Offset of each 16-byte UUID payload.
 * @throws {Error} When the image is not a Mach-O format this hook understands.
 */
export function findUuidOffsets(image) {
  const magic = image.readUInt32BE(0);
  if (magic === FAT_MAGIC) {
    const count = image.readUInt32BE(4);
    const offsets = [];
    for (let i = 0; i < count; i += 1) {
      const archOffset = image.readUInt32BE(8 + i * 20 + 8);
      offsets.push(...findThinUuidOffsets(image, archOffset));
    }
    return offsets;
  }
  if (image.readUInt32LE(0) === MH_MAGIC_64) {
    return findThinUuidOffsets(image, 0);
  }
  throw new Error(
    `not a little-endian 64-bit Mach-O or fat image (magic 0x${magic.toString(16)})`,
  );
}

/**
 * Walk the load commands of one thin 64-bit Mach-O image.
 *
 * @param {Buffer} image - File contents.
 * @param {number} base - Offset of the Mach-O header within the file.
 * @returns {number[]} Offset of each LC_UUID payload found in this image.
 * @throws {Error} When the slice is not a little-endian 64-bit Mach-O.
 */
function findThinUuidOffsets(image, base) {
  if (image.readUInt32LE(base) !== MH_MAGIC_64) {
    throw new Error(`slice at ${base} is not a little-endian 64-bit Mach-O`);
  }
  const ncmds = image.readUInt32LE(base + 16);
  const offsets = [];
  let cursor = base + MH_HEADER_64_SIZE;
  for (let i = 0; i < ncmds; i += 1) {
    const cmd = image.readUInt32LE(cursor);
    const cmdsize = image.readUInt32LE(cursor + 4);
    if (cmd === LC_UUID) {
      if (cmdsize !== LC_UUID_SIZE) {
        throw new Error(`LC_UUID at ${cursor} has size ${cmdsize}, expected ${LC_UUID_SIZE}`);
      }
      offsets.push(cursor + 8);
    }
    cursor += cmdsize;
  }
  return offsets;
}

/**
 * Replace the LC_UUID of a Mach-O executable on disk.
 *
 * @param {string} executablePath - Path to the Mach-O file.
 * @param {Buffer} uuid - 16 UUID bytes to write.
 * @returns {Promise<number>} Number of UUID load commands rewritten.
 * @throws {Error} When the file has no LC_UUID or an unsupported format.
 */
export async function patchExecutableUuid(executablePath, uuid) {
  const image = await readFile(executablePath);
  const offsets = findUuidOffsets(image);
  if (offsets.length === 0) {
    throw new Error(`${executablePath} has no LC_UUID load command`);
  }
  for (const offset of offsets) {
    uuid.copy(image, offset);
  }
  await writeFile(executablePath, image);
  return offsets.length;
}

/**
 * Give the packed macOS app a unique launcher UUID and an ad-hoc signature
 * whose identifier matches its bundle ID. No-op on other platforms.
 *
 * @param {object} context - electron-builder afterPack context.
 * @param {string} context.appOutDir - Directory containing the packed app.
 * @param {string} context.electronPlatformName - "darwin", "linux" or "win32".
 * @param {object} context.packager - Packager exposing appInfo.
 * @returns {Promise<void>}
 */
export async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const { productFilename, id: appId } = context.packager.appInfo;
  const appPath = join(context.appOutDir, `${productFilename}.app`);
  const launcher = join(appPath, 'Contents', 'MacOS', productFilename);

  const uuid = deterministicUuid(`${appId}:${productFilename}`);
  const patched = await patchExecutableUuid(launcher, uuid);
  console.log(`  • launcher UUID set to ${formatUuid(uuid)} (${patched} load command(s))`);

  console.log(`  • ad-hoc signing ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });
}
