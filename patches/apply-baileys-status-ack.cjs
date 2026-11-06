/* 
 * Backport of WhiskeySockets/Baileys#2883 to the JavaScript shipped by
 * baileys@7.0.0-rc.9. Refuse to patch an unexpected dependency.
 * Keep this source-level patch in the Evolution Docker build, not in the
 * running container or the WhatsApp session volume.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VERSION = '7.0.0-rc.9';
const MODULE = 'baileys';
const FILE = 'lib/Socket/messages-recv.js';

function replaceOnce(source, regex, replacement, label) {
  const matches = [...source.matchAll(regex)];
  if (matches.length !== 1) {
    throw new Error('Cannot apply Baileys status ACK patch: expected one ' + label + ', got ' + matches.length);
  }
  return source.replace(regex, replacement);
}

function patchSource(input) {
  if (input.includes("ws.on('CB:status'")) {
    if (
      input.includes('const handleStatus = async') &&
      /\[['"]status['"],\s*handleStatus\]/.test(input)
    ) {
      return input;
    }
    throw new Error('Baileys has a different partial status handler; refusing to modify it');
  }

  let source = replaceOnce(
    input,
    /(\bconst makeOfflineNodeProcessor\s*=\s*\(\)\s*=>\s*\{)/g,
    [
      '// Backport of Baileys PR #2883: ACK all top-level WhatsApp status stanzas.',
      'const handleStatus = async (node) => {',
      '  try {',
      '    await sendMessageAck(node);',
      '  } catch (error) {',
      "    onUnexpectedError(error, 'acking status stanza');",
      '  }',
      '};',
      '$1'
    ].join('\n'),
    'offline processor declaration'
  );

  source = replaceOnce(
    source,
    /(\[['"]notification['"],\s*handleNotification\])(\s*)(\]\))/g,
    "$1,$2['status', handleStatus]$2$3",
    'offline notification map entry'
  );

  source = replaceOnce(
    source,
    /(\bws\.on\(['"]CB:ack,class:message['"])/g,
    [
      "ws.on('CB:status', async (node) => {",
      "  await processNode('status', node, 'acking status stanza', handleStatus).catch((error) =>",
      "    onUnexpectedError(error, 'acking status stanza')",
      '  );',
      '});',
      '$1'
    ].join('\n'),
    'ACK listener anchor'
  );

  return source;
}

function patchInstalledPackage(root = path.resolve(__dirname, '..', 'node_modules', MODULE)) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (manifest.version !== VERSION) {
    throw new Error('Baileys status ACK patch expects ' + VERSION + ', found ' + manifest.version);
  }
  const target = path.join(root, FILE);
  const input = fs.readFileSync(target, 'utf8');
  const output = patchSource(input);
  if (output !== input) {
    fs.writeFileSync(target, output, 'utf8');
  }
  console.log('Baileys status ACK patch verified: ' + manifest.version);
}

if (require.main === module) {
  patchInstalledPackage();
}

module.exports = { patchSource, patchInstalledPackage };
