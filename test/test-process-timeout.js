/**
 * QBasic Nexus - External Build Process Timeout Guard Tests
 *
 * attachProcessTimeout() keeps a hung external build (QB64 compiler / native
 * packager) from wedging the extension: without it the wrapping Promise never
 * settles and state.isCompiling stays true until the window is reloaded.
 *
 * These tests prove the guard SIGTERMs (then SIGKILLs) a slow process, calls
 * the timeout reporter once, and — critically — never touches a process that
 * finishes in time or whose guard was canceled.
 */

'use strict';

const Module = require('module');

console.log('\n⏱  External Build Timeout Guard Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Load src/extension/utils behind a minimal vscode mock. */
function loadUtils() {
  const vscodeMock = {
    workspace: { getConfiguration: () => ({ get: () => undefined }) },
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
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

/** Minimal fake child process that records kill signals. */
function makeFakeProc() {
  return {
    signals: [],
    kill(signal) {
      this.signals.push(signal);
      return true;
    },
  };
}

const { attachProcessTimeout } = loadUtils();

test('Fires SIGTERM and the reporter once after the deadline', async () => {
  const proc = makeFakeProc();
  let reported = 0;
  const cancel = attachProcessTimeout(proc, 20, () => {
    reported++;
  });

  await delay(60);
  cancel(); // clear the pending SIGKILL grace timer

  assert(reported === 1, `Expected reporter to fire once, got ${reported}`);
  assert(
    proc.signals[0] === 'SIGTERM',
    `Expected first signal SIGTERM, got ${proc.signals[0]}`,
  );
});

test('Escalates to SIGKILL after the grace period', async () => {
  const proc = makeFakeProc();
  attachProcessTimeout(proc, 20);

  // 20ms deadline + 3000ms grace. Wait past the grace window.
  await delay(20 + 3000 + 120);

  assert(
    proc.signals.includes('SIGKILL'),
    `Expected SIGKILL after grace, got [${proc.signals.join(', ')}]`,
  );
});

test('Canceling before the deadline never kills the process', async () => {
  const proc = makeFakeProc();
  let reported = 0;
  const cancel = attachProcessTimeout(proc, 40, () => {
    reported++;
  });

  await delay(10);
  cancel();
  await delay(80);

  assert(reported === 0, 'Reporter must not fire after cancel');
  assert(
    proc.signals.length === 0,
    `Canceled guard must not kill; got [${proc.signals.join(', ')}]`,
  );
});

test('A non-positive timeout disables the guard entirely', async () => {
  const proc = makeFakeProc();
  const cancel = attachProcessTimeout(proc, 0, () => {
    throw new Error('reporter must never run when disabled');
  });

  assert(typeof cancel === 'function', 'Must return a no-op canceller');
  await delay(40);
  assert(proc.signals.length === 0, 'Disabled guard must never kill');
  cancel(); // must be safe to call
});

test('A missing process is handled without throwing', () => {
  const cancel = attachProcessTimeout(null, 20);
  assert(typeof cancel === 'function', 'Must return a callable canceller');
  cancel();
});

(async () => {
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
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
})();
