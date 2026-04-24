'use strict';

const path = require('path');

const { CONFIG, COMMANDS } = require('../src/extension/constants');
const {
  formatCompilerArgsLabel,
  formatCompilerPathLabel,
  formatInternalTargetsLabel,
  formatLineNumberSettingsLabel,
  getSystemQuickActionItems,
} = require('../src/extension/systemSettingsShared');

console.log('\n⚙️  System Settings Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('Compiler path label prefers configured paths', () => {
  const label = formatCompilerPathLabel('C:\\QB64\\qb64.exe', 'D:\\QB64\\qb64.exe');
  assert(label === 'C:\\QB64\\qb64.exe', 'Expected configured path to override auto-detected path');
});

test('Compiler path label falls back to auto-detected paths', () => {
  const label = formatCompilerPathLabel('', 'D:\\QB64\\qb64.exe');
  assert(
    label === 'Auto-detected: D:\\QB64\\qb64.exe',
    'Expected auto-detected path label when no saved path exists',
  );
});

test('Compiler args label reports None when empty', () => {
  assert(formatCompilerArgsLabel('') === 'None', 'Expected empty compiler args to render as None');
});

test('Internal target labels normalize valid target lists', () => {
  assert(
    formatInternalTargetsLabel('host,linux-x64') === 'host, linux-x64',
    'Expected normalized target labels',
  );
});

test('Line number labels summarize start and step', () => {
  assert(
    formatLineNumberSettingsLabel(10, 10) === 'Start 10 | Step 10',
    'Expected line number summary label',
  );
});

test('System quick actions cover all top-level configurable settings', () => {
  const items = getSystemQuickActionItems({
    compilerMode: CONFIG.MODE_INTERNAL,
    compilerPath: '',
    autoDetectedCompilerPath: 'C:\\QB64\\qb64.exe',
    compilerArgs: '-w',
    internalTargets: 'host,linux-x64',
    internalOutputDir: 'dist',
    workspacePath: 'C:\\Workspace\\QBasic-Nexus',
    compileWorkerMaxQueueSize: 64,
    compileWorkerRequestTimeoutMs: 30000,
    lintWorkerMaxQueueSize: 96,
    lintWorkerRequestTimeoutMs: 15000,
    enableLinting: true,
    lintDelay: 500,
    autoFormatOnSave: true,
    lineNumberStart: 10,
    lineNumberStep: 10,
  });

  assert(items.length === 11, 'Expected one quick action per top-level configurable setting');
  assert(
    items.some((item) => item.command === COMMANDS.SELECT_COMPILER_MODE),
    'Expected compiler mode quick action',
  );
  assert(
    items.some((item) => item.command === COMMANDS.SELECT_COMPILER_PATH),
    'Expected compiler path quick action',
  );
  assert(
    items.some((item) => item.command === COMMANDS.SELECT_INTERNAL_TARGETS),
    'Expected internal target quick action',
  );
  assert(
    items.some((item) => item.command === COMMANDS.SELECT_LINE_NUMBER_SETTINGS),
    'Expected line number quick action',
  );
  const outputItem = items.find((item) => item.command === COMMANDS.SELECT_INTERNAL_OUTPUT_DIR);
  assert(
    outputItem && outputItem.detail.includes(path.join('C:\\Workspace\\QBasic-Nexus', 'dist')),
    'Expected workspace-relative output folders to resolve in details',
  );
});

test('WASM internal compiler mode keeps internal build settings active', () => {
  const items = getSystemQuickActionItems({
    compilerMode: CONFIG.MODE_INTERNAL_WASM,
    internalTargets: 'host',
    internalOutputDir: '',
    compileWorkerMaxQueueSize: 64,
    compileWorkerRequestTimeoutMs: 30000,
    lintWorkerMaxQueueSize: 96,
    lintWorkerRequestTimeoutMs: 15000,
    enableLinting: true,
    lintDelay: 500,
    autoFormatOnSave: true,
    lineNumberStart: 1,
    lineNumberStep: 1,
  });

  const targetItem = items.find((item) => item.command === COMMANDS.SELECT_INTERNAL_TARGETS);
  const outputItem = items.find((item) => item.command === COMMANDS.SELECT_INTERNAL_OUTPUT_DIR);
  assert(targetItem?.description === 'Active in internal mode', 'Expected targets to be active for WASM mode');
  assert(outputItem?.description === 'Active in internal mode', 'Expected output folder to be active for WASM mode');
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${err.message}`);
      failed++;
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED\n`);

  process.exit(failed > 0 ? 1 : 0);
}

void run();
