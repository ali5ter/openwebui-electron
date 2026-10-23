import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deterministicUuid, findUuidOffsets, formatUuid } from './after-pack.mjs';

/**
 * Build a minimal thin 64-bit Mach-O header with the given load commands.
 *
 * @param {Buffer[]} commands - Encoded load commands.
 * @returns {Buffer} Header plus load commands.
 */
function thinImage(commands) {
  const header = Buffer.alloc(32);
  header.writeUInt32LE(0xfeedfacf, 0);
  header.writeUInt32LE(commands.length, 16);
  header.writeUInt32LE(commands.reduce((n, c) => n + c.length, 0), 20);
  return Buffer.concat([header, ...commands]);
}

function command(cmd, size) {
  const buf = Buffer.alloc(size);
  buf.writeUInt32LE(cmd, 0);
  buf.writeUInt32LE(size, 4);
  return buf;
}

test('deterministicUuid is stable and well-formed', () => {
  const a = deterministicUuid('com.example.app:Example');
  const b = deterministicUuid('com.example.app:Example');
  assert.deepEqual(a, b);
  assert.equal(a.length, 16);
  assert.equal(a[6] >> 4, 5, 'version nibble is 5');
  assert.equal(a[8] & 0xc0, 0x80, 'RFC 4122 variant');
  assert.notDeepEqual(a, deterministicUuid('com.example.app:Other'));
});

test('formatUuid matches the dwarfdump layout', () => {
  const uuid = Buffer.from('4c4c44c155553144a1adcd6e51ca04e1', 'hex');
  assert.equal(formatUuid(uuid), '4C4C44C1-5555-3144-A1AD-CD6E51CA04E1');
});

test('findUuidOffsets locates LC_UUID after other load commands', () => {
  const image = thinImage([command(0x19, 72), command(0x1b, 24), command(0x22, 16)]);
  assert.deepEqual(findUuidOffsets(image), [32 + 72 + 8]);
});

test('findUuidOffsets walks every slice of a fat image', () => {
  const slice = thinImage([command(0x1b, 24)]);
  const fatHeader = Buffer.alloc(8 + 2 * 20);
  fatHeader.writeUInt32BE(0xcafebabe, 0);
  fatHeader.writeUInt32BE(2, 4);
  const first = fatHeader.length;
  const second = first + slice.length;
  fatHeader.writeUInt32BE(first, 8 + 8);
  fatHeader.writeUInt32BE(second, 8 + 20 + 8);
  const image = Buffer.concat([fatHeader, slice, slice]);
  assert.deepEqual(findUuidOffsets(image), [first + 40, second + 40]);
});

test('findUuidOffsets rejects non-Mach-O input', () => {
  assert.throws(() => findUuidOffsets(Buffer.from('#!/bin/sh\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')), /not a little-endian/);
});
