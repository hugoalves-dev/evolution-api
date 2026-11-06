'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { patchSource } = require('./apply-baileys-status-ack.cjs');

// Minimal copy of the rc.9 compiled JavaScript anchors. The Docker build
// separately applies this to the actual installed package and runs node --check.
const sample = [
  'const makeOfflineNodeProcessor = () => {',
  '  const nodeProcessorMap = new Map([',
  "    ['message', handleMessage],",
  "    ['notification', handleNotification]",
  '  ]);',
  '};',
  "ws.on('CB:ack,class:message', (node) => { handleBadAck(node); });"
].join('\n');

test('ACK handler is registered and queued offline', () => {
  const patched = patchSource(sample);
  assert.match(patched, /const handleStatus = async/);
  assert.match(patched, /await sendMessageAck\(node\)/);
  assert.match(patched, /\['status', handleStatus\]/);
  assert.match(patched, /ws\.on\('CB:status'/);
  assert.match(patched, /processNode\('status'/);
});

test('patch is idempotent', () => {
  const patched = patchSource(sample);
  assert.equal(patchSource(patched), patched);
});

test('fails closed when compiled JavaScript structure changes', () => {
  assert.throws(() => patchSource("ws.on('CB:ack,class:message', () => {});"), /expected one offline processor/);
});

test('rejects a partial or unexpected existing handler', () => {
  assert.throws(() => patchSource("ws.on('CB:status', () => {});"), /partial status handler/);
});
