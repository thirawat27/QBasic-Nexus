'use strict';

const {
  COMPILE_WORKER_PRESETS,
  LINT_WORKER_PRESETS,
  formatWorkerResilienceLabel,
  getWorkerResiliencePresetItems,
} = require('../src/extension/workerSettings');

console.log('\n🧵 Worker Settings Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('Worker resilience label summarizes queue and timeout', () => {
  assert(
    formatWorkerResilienceLabel(64, 30000) === 'Queue 64 | Timeout 30000ms',
    'Expected queue and timeout summary',
  );
  assert(
    formatWorkerResilienceLabel(32, 0) === 'Queue 32 | Timeout Off',
    'Expected a zero timeout to read as Off',
  );
});

test('Compile worker preset items mark the active preset', () => {
  const items = getWorkerResiliencePresetItems(COMPILE_WORKER_PRESETS, 64, 30000);
  assert(items.length === COMPILE_WORKER_PRESETS.length, 'Expected one item per preset');
  assert(items[0].description === 'Current', 'Expected the default preset to be marked');
  assert(items.slice(1).every((item) => item.description === ''), 'Expected only one current preset');
});

test('Lint worker preset items carry their queue and timeout values', () => {
  const items = getWorkerResiliencePresetItems(LINT_WORKER_PRESETS, 1, 1);
  assert(items.every((item) => item.description === ''), 'Expected no preset to match custom values');
  assert(
    items.every((item) => item.value === '__preset__' && item.maxQueueSize > 0),
    'Expected preset items to carry their settings',
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
