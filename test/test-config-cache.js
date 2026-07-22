/**
 * QBasic Nexus - Configuration Snapshot Cache Tests
 *
 * getConfig() sits on the keystroke path (lintDocument reads it per edit), so
 * the merged settings snapshot is cached. These tests prove the cache is both
 * fast (no repeated getConfiguration calls) and correct (invalidation works).
 */

'use strict';

const Module = require('module');

console.log('\n⚙️  Configuration Cache Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Load src/extension/utils with a minimal vscode mock that counts how often
 * the workspace configuration is queried.
 */
function loadUtils(initialSettings = {}) {
  const stats = { getConfigurationCalls: 0, getCalls: 0 };
  const settings = { ...initialSettings };

  const vscodeMock = {
    workspace: {
      getConfiguration() {
        stats.getConfigurationCalls++;
        return {
          get(key) {
            stats.getCalls++;
            return settings[key];
          },
        };
      },
    },
    window: {
      createOutputChannel: () => ({ appendLine() {} }),
      createTerminal: () => ({}),
    },
    ThemeIcon: class {},
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  const modulePath = require.resolve('../src/extension/utils');
  delete require.cache[modulePath];

  try {
    return { utils: require(modulePath), stats, settings };
  } finally {
    Module._load = originalLoad;
  }
}

const { CONFIG } = require('../src/extension/constants');

test('Repeated reads query VS Code configuration only once', () => {
  const { utils, stats } = loadUtils({ [CONFIG.LINT_DELAY]: 250 });

  for (let i = 0; i < 50; i++) {
    assert(
      utils.getConfig(CONFIG.LINT_DELAY, 500) === 250,
      'Configured value should be returned',
    );
  }

  assert(
    stats.getConfigurationCalls === 1,
    `Expected 1 getConfiguration call, got ${stats.getConfigurationCalls}`,
  );
});

test('Defaults still apply for keys the user has not set', () => {
  const { utils } = loadUtils({});

  assert(
    utils.getConfig(CONFIG.LINT_DELAY) === 500,
    'Unset key should fall back to its declared default',
  );
  assert(
    utils.getConfig(CONFIG.ENABLE_LINT) === true,
    'Boolean default should survive the snapshot merge',
  );
});

test('An explicit fallback wins when the resolved value is null', () => {
  const { utils } = loadUtils({});

  assert(
    utils.getConfig(CONFIG.COMPILER_PATH, 'C:/qb64/qb64.exe') ===
      'C:/qb64/qb64.exe',
    'Null-defaulted key should use the caller fallback',
  );
});

test('invalidateConfigCache makes the next read see updated settings', () => {
  const { utils, stats, settings } = loadUtils({ [CONFIG.LINT_DELAY]: 250 });

  assert(utils.getConfig(CONFIG.LINT_DELAY) === 250, 'Initial read');

  settings[CONFIG.LINT_DELAY] = 900;
  assert(
    utils.getConfig(CONFIG.LINT_DELAY) === 250,
    'Cached snapshot should still serve the old value before invalidation',
  );

  utils.invalidateConfigCache();
  assert(
    utils.getConfig(CONFIG.LINT_DELAY) === 900,
    'Post-invalidation read must see the new value',
  );
  assert(
    stats.getConfigurationCalls === 2,
    `Expected exactly one re-query, got ${stats.getConfigurationCalls}`,
  );
});

test('Unknown keys bypass the snapshot and read through', () => {
  const { utils, settings, stats } = loadUtils({});
  settings['qbasic-nexus.unknownKey'] = 'a';

  utils.getConfig(CONFIG.LINT_DELAY); // populate the snapshot
  const before = stats.getConfigurationCalls;

  utils.getConfig('unknownKey');
  assert(
    stats.getConfigurationCalls === before + 1,
    'A key with no declared default must not be served from the snapshot',
  );
});

test('The shared snapshot is frozen against accidental mutation', () => {
  const { utils } = loadUtils({});
  const snapshot = utils.getAllConfig();

  assert(Object.isFrozen(snapshot), 'Snapshot must be frozen');
  assert(
    utils.getAllConfig() === snapshot,
    'getAllConfig should reuse the cached snapshot',
  );
});

for (const { name, fn } of tests) {
  try {
    fn();
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
