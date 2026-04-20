'use strict';

const os = require('os');
const path = require('path');

const {
  formatInternalOutputDirLabel,
  getInternalBuildQuickActionItems,
  getInternalTargetPresetItems,
  normalizeOutputDirSettingValue,
  TARGET_PRESETS,
} = require('../src/extension/internalBuildSettings');

console.log('\n📦 Internal Build Settings Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('Target preset items expose the configured presets', () => {
  const items = getInternalTargetPresetItems('host');
  assert(items.length === TARGET_PRESETS.length, 'Expected one quick-pick item per preset');
  assert(items[0].description === 'Current', 'Expected the active preset to be marked');
});

test('Invalid current targets do not break target preset generation', () => {
  const items = getInternalTargetPresetItems('linux-quantum');
  assert(items.length === TARGET_PRESETS.length, 'Expected presets to still render');
  assert(items.every((item) => typeof item.label === 'string'), 'Expected valid quick-pick items');
});

test('Output directory values are stored relative to the workspace when possible', () => {
  const workspaceDir = path.join(os.tmpdir(), 'qbnx-workspace');
  const selectedDir = path.join(workspaceDir, 'build', 'artifacts');
  assert(
    normalizeOutputDirSettingValue(selectedDir, workspaceDir) === 'build/artifacts',
    'Expected workspace-relative output folder values',
  );
});

test('Workspace root output directory is represented as dot', () => {
  const workspaceDir = path.join(os.tmpdir(), 'qbnx-workspace');
  assert(
    normalizeOutputDirSettingValue(workspaceDir, workspaceDir) === '.',
    'Expected workspace root to be stored as "."',
  );
});

test('External output directories remain absolute', () => {
  const workspaceDir = path.join(os.tmpdir(), 'qbnx-workspace');
  const selectedDir = path.join(os.tmpdir(), 'qbnx-out');
  assert(
    normalizeOutputDirSettingValue(selectedDir, workspaceDir) === path.normalize(selectedDir),
    'Expected external output folders to remain absolute',
  );
});

test('Internal build quick actions describe current targets and output folder', () => {
  const workspaceDir = path.join(os.tmpdir(), 'qbnx-workspace');
  const items = getInternalBuildQuickActionItems(
    'host,linux-x64',
    'build/artifacts',
    workspaceDir,
    64,
    30000,
    96,
    15000,
  );
  assert(items.length === 4, 'Expected quick actions for targets, output, and worker resilience settings');
  assert(
    items[0].detail.includes('host, linux-x64'),
    'Expected targets quick action to summarize the normalized target list',
  );
  assert(
    items[1].detail.includes(path.join(workspaceDir, 'build', 'artifacts')),
    'Expected output quick action to resolve workspace-relative output folders',
  );
  assert(
    items[2].detail.includes('Queue 64') && items[2].detail.includes('Timeout 30000ms'),
    'Expected compile worker quick action to summarize queue and timeout settings',
  );
  assert(
    items[3].detail.includes('Queue 96') && items[3].detail.includes('Timeout 15000ms'),
    'Expected lint worker quick action to summarize queue and timeout settings',
  );
});

test('Output folder labels stay user-friendly for source-adjacent builds', () => {
  assert(
    formatInternalOutputDirLabel('', path.join(os.tmpdir(), 'qbnx-workspace')) === 'Beside source file',
    'Expected empty output directory setting to describe source-adjacent builds',
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
