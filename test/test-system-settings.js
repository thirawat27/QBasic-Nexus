'use strict';

const { COMMANDS } = require('../src/extension/constants');
const {
  formatCompilerArgsLabel,
  formatCompilerPathLabel,
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

test('Line number labels summarize start and step', () => {
  assert(
    formatLineNumberSettingsLabel(10, 10) === 'Start 10 | Step 10',
    'Expected line number summary label',
  );
});

test('System quick actions cover all top-level configurable settings', () => {
  const items = getSystemQuickActionItems({
    compilerPath: '',
    autoDetectedCompilerPath: 'C:\\QB64\\qb64.exe',
    compilerArgs: '-w',
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

  assert(items.length === 8, 'Expected one quick action per top-level configurable setting');
  assert(
    items.some((item) => item.command === COMMANDS.SELECT_COMPILER_PATH),
    'Expected compiler path quick action',
  );
  assert(
    items.some((item) => item.command === COMMANDS.SELECT_LINE_NUMBER_SETTINGS),
    'Expected line number quick action',
  );
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
