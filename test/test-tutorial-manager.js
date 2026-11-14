/**
 * QBasic Nexus - TutorialManager Tests
 */

'use strict';

const Module = require('module');

console.log('\n📦 TutorialManager Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function loadTutorialManager() {
  const statusBarMessages = [];
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') {
      return {
        window: {
          setStatusBarMessage(message) {
            statusBarMessages.push(message);
          },
          showErrorMessage() {},
          showQuickPick: async () => undefined,
          showTextDocument: async () => undefined,
        },
        workspace: {
          openTextDocument: async () => undefined,
          registerTextDocumentContentProvider() {},
        },
        commands: {
          executeCommand: async () => undefined,
        },
        Uri: {
          parse(value) {
            return { toString: () => value };
          },
        },
        ViewColumn: {
          One: 1,
          Two: 2,
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const modulePath = require.resolve('../src/managers/TutorialManager');
  delete require.cache[modulePath];

  try {
    return {
      TutorialManager: require(modulePath),
      statusBarMessages,
    };
  } finally {
    Module._load = originalLoad;
  }
}

test('TutorialManager matches output with CRLF line ends and trailing spaces', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.clearHistory();
  TutorialManager.currentLesson = {
    title: 'Screen Text',
    matchRegex: /BMI Calculator\nunderweight/i,
  };

  const passedNow = TutorialManager.checkResult('BMI Calculator    \r\nunderweight   \r\n');

  assert(passedNow === true, 'Expected screen text to match after normalization');
});

test('TutorialManager trims oversized output history for long sessions', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.clearHistory();
  TutorialManager.currentLesson = {
    title: 'Long Session',
    matchRegex: /NEVER_MATCH_THIS_PATTERN/,
  };

  TutorialManager.checkResult('x'.repeat(250000));

  assert(TutorialManager._outputHistory.length <= 200000, 'Expected output history to be capped');
});

test('TutorialManager resets regex state before repeated checks', () => {
  const { TutorialManager, statusBarMessages } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.clearHistory();
  TutorialManager.currentLesson = {
    title: 'Regex Reset',
    matchRegex: /READY/g,
  };

  const firstPass = TutorialManager.checkResult('READY');
  TutorialManager.currentLesson = {
    title: 'Regex Reset',
    matchRegex: /READY/g,
  };
  const secondPass = TutorialManager.checkResult('READY');

  assert(firstPass === true, 'Expected first global-regex pass to match');
  assert(secondPass === true, 'Expected second global-regex pass to match after lastIndex reset');
  assert(statusBarMessages.length >= 2, 'Expected completion status messages for both passes');
});

test('checkOutput judges each run on its own output', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.currentLesson = {
    title: 'One Run',
    matchRegex: /^HELLO$/m,
  };

  assert(TutorialManager.checkOutput('BYE') === false, 'Expected a wrong run to fail');
  assert(TutorialManager.checkOutput('HELLO') === true, 'Expected the next run to be judged alone');
});

test('checkOutput does nothing without an active lesson', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  assert(TutorialManager.checkOutput('anything') === false, 'Expected no lesson to mean no pass');
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
