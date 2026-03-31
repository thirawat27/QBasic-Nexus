/**
 * QBasic Nexus - TutorialManager Tests
 */

'use strict';

const Module = require('module');
const { createTranscriptEvent } = require('../src/webview/crtTranscript');

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

test('TutorialManager normalizes escaped CRT output before matching', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.clearHistory();
  TutorialManager.currentLesson = {
    title: 'Escaped Output',
    matchRegex: /BMI Calculator\s*underweight/i,
  };

  const passedNow = TutorialManager.checkResult('BMI Calculator\\n\\nunderweight\\n');

  assert(passedNow === true, 'Expected escaped newline output to match after normalization');
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

test('TutorialManager consumes structured transcript snapshots', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.clearHistory();
  TutorialManager.currentLesson = {
    title: 'Structured Transcript',
    matchRegex: /BMI Calculator\s*underweight/i,
  };

  const passedNow = TutorialManager.checkRuntimeEvent(
    createTranscriptEvent('output', {
      text: 'underweight',
    }),
    {
      text: 'BMI Calculator\nunderweight',
    },
  );

  assert(passedNow === true, 'Expected transcript-aware runtime events to match the active lesson');
});

test('TutorialManager ignores non-renderable structured events', () => {
  const { TutorialManager } = loadTutorialManager();
  TutorialManager.reset();
  TutorialManager.clearHistory();
  TutorialManager.currentLesson = {
    title: 'Structured Prompt',
    matchRegex: /never-match/i,
  };

  const passedNow = TutorialManager.checkRuntimeEvent(
    createTranscriptEvent('prompt_open', {
      prompt: 'Enter weight: ',
      promptId: 1,
    }),
    {
      text: 'Enter weight: ',
    },
  );

  assert(passedNow === false, 'Expected prompt lifecycle events to stay out of result matching');
  assert(TutorialManager._outputHistory === '', 'Expected ignored events to leave history unchanged');
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
