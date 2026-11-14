#!/usr/bin/env node
/**
 * Copies qb-web (the QBNex VM for the browser) from a QBNex checkout into
 * vendor/qb-web, where the Retro CRT panel loads it.
 *
 *   node scripts/sync-qb-web.js <QBNex checkout> [qb_web.wasm]
 *
 * The wasm path defaults to the checkout's own release build
 * (target/wasm32-unknown-unknown/release/qb_web.wasm, or target/wasm/... as
 * crates/web/README.md suggests).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const checkout = process.argv[2];
if (!checkout) {
  console.error('usage: node scripts/sync-qb-web.js <QBNex checkout> [qb_web.wasm]');
  process.exit(2);
}

const wasmCandidates = process.argv[3]
  ? [process.argv[3]]
  : [
      path.join(checkout, 'target', 'wasm', 'wasm32-unknown-unknown', 'release', 'qb_web.wasm'),
      path.join(checkout, 'target', 'wasm32-unknown-unknown', 'release', 'qb_web.wasm'),
    ];
const wasm = wasmCandidates.find((candidate) => fs.existsSync(candidate));
if (!wasm) {
  console.error(`qb_web.wasm not found; looked at:\n  ${wasmCandidates.join('\n  ')}`);
  console.error('Build it with: cargo build -p qb-web --release --target wasm32-unknown-unknown');
  process.exit(1);
}

const out = path.join(__dirname, '..', 'vendor', 'qb-web');
fs.mkdirSync(out, { recursive: true });

const copies = [
  [wasm, 'qb_web.wasm'],
  [path.join(checkout, 'crates', 'web', 'www', 'qbnex.js'), 'qbnex.js'],
  [path.join(checkout, 'LICENSE'), 'LICENSE'],
];
for (const [from, name] of copies) {
  fs.copyFileSync(from, path.join(out, name));
  console.log(`copied ${from} -> vendor/qb-web/${name}`);
}
console.log('Update the commit named in vendor/qb-web/README.md.');
