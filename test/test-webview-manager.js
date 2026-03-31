/**
 * QBasic Nexus - WebviewManager Tests
 */

'use strict';

const Module = require('module');
const {
  CRT_NEWLINE,
  appendCrtNewline,
  normalizeCrtText,
  splitRenderedLines,
  splitPromptText,
} = require('../src/webview/crtText');
const {
  appendTranscriptState,
  createTranscriptEvent,
  eventHasRenderableText,
  eventToText,
} = require('../src/webview/crtTranscript');

console.log('\n📦 WebviewManager Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function createMittMock() {
  return function mitt() {
    const handlers = new Map();
    return {
      on(event, handler) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event).add(handler);
      },
      off(event, handler) {
        handlers.get(event)?.delete(handler);
      },
      emit(event, payload) {
        for (const handler of handlers.get(event) || []) {
          handler(payload);
        }
      },
    };
  };
}

function createMockPanel() {
  const disposeHandlers = [];
  const postedMessages = [];
  const panel = {
    disposed: false,
    revealed: false,
    messageHandler: null,
    postedMessages,
    reveal() {
      this.revealed = true;
    },
    onDidDispose(handler) {
      disposeHandlers.push(handler);
      return {
        dispose() {},
      };
    },
    dispose() {
      this.disposed = true;
      for (const handler of disposeHandlers) {
        handler();
      }
    },
    webview: {
      async postMessage(message) {
        postedMessages.push(message);
        return true;
      },
      onDidReceiveMessage(handler) {
        panel.messageHandler = handler;
        return {
          dispose() {},
        };
      },
    },
  };

  return panel;
}

function createVscodeMock(templateHtml, options = {}) {
  const errorMessages = [];

  return {
    errorMessages,
    mock: {
      window: {
        activeTextEditor: null,
        createWebviewPanel:
          options.createWebviewPanel ||
          (() => createMockPanel()),
        showErrorMessage(message) {
          errorMessages.push(message);
        },
      },
      workspace: {
        fs: {
          async readFile() {
            if (options.readFileError) {
              throw options.readFileError;
            }
            return Buffer.from(templateHtml, 'utf8');
          },
        },
      },
      Uri: {
        joinPath(base, ...segments) {
          const basePath = base?.path || String(base || '');
          return {
            path: [basePath, ...segments].join('/'),
            toString() {
              return this.path;
            },
          };
        },
      },
      ViewColumn: {
        Two: 2,
      },
    },
  };
}

function loadWebviewManager(options = {}) {
  const templateHtml = [
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\';">',
    '<link rel="stylesheet" href="{{cssUri}}">',
    '<script src="{{crtTextUri}}"></script>',
    '<script src="{{crtTranscriptUri}}"></script>',
    '<script src="{{jsUri}}"></script>',
  ].join('\n');

  const vscodeMock = createVscodeMock(templateHtml, options);
  const originalLoad = Module._load;
  const tutorialPath = require.resolve('../src/managers/TutorialManager');
  const tutorialStub =
    options.tutorialManagerMock ||
    {
      clearHistory() {},
      checkRuntimeEvent() {
        return false;
      },
      checkResult() {
        return false;
      },
    };

  require.cache[tutorialPath] = {
    id: tutorialPath,
    filename: tutorialPath,
    loaded: true,
    exports: tutorialStub,
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock.mock;
    if (request === 'mitt') return createMittMock();
    return originalLoad.call(this, request, parent, isMain);
  };

  const modulePath = require.resolve('../src/managers/WebviewManager');
  delete require.cache[modulePath];

  try {
    return {
      WebviewManager: require(modulePath),
      errorMessages: vscodeMock.errorMessages,
    };
  } finally {
    Module._load = originalLoad;
  }
}

test('WebviewManager module exports event helpers', () => {
  const { WebviewManager } = loadWebviewManager();
  assert(typeof WebviewManager.onWebviewEvent === 'function', 'Missing onWebviewEvent export');
  assert(typeof WebviewManager.offWebviewEvent === 'function', 'Missing offWebviewEvent export');
});

test('Chunked transfer sends ordered messages', async () => {
  const { WebviewManager } = loadWebviewManager();
  const messages = [];

  WebviewManager.currentPanel = {
    webview: {
      async postMessage(message) {
        messages.push(message);
        return true;
      },
    },
  };

  await WebviewManager._sendChunked('x'.repeat((64 * 1024 * 2) + 10), 'demo.bas');

  assert(messages.length === 3, 'Expected start, middle, and end messages');
  assert(messages[0].type === 'execute_start', 'First message should start execution');
  assert(messages[1].type === 'execute_chunk', 'Second message should be a middle chunk');
  assert(messages[2].type === 'execute_end', 'Last message should end execution');
  assert(messages[0].filename === 'demo.bas', 'Filename should only be sent in the first chunk');
});

test('runCode fails when the panel rejects a message', async () => {
  const { WebviewManager } = loadWebviewManager();

  WebviewManager.currentPanel = {
    reveal() {},
    webview: {
      async postMessage() {
        return false;
      },
    },
  };
  WebviewManager._isReady = true;

  let error = null;
  try {
    await WebviewManager.runCode('PRINT', 'demo.bas', { path: '/extension' });
  } catch (err) {
    error = err;
  }

  assert(error instanceof Error, 'Expected runCode to reject');
  assert(error.message.includes('rejected'), 'Expected a rejected message error');
});

test('HTML template injects CSP and resource URIs', async () => {
  const { WebviewManager } = loadWebviewManager();

  const webview = {
    cspSource: 'vscode-webview://test',
    asWebviewUri(uri) {
      return {
        toString() {
          return `webview:${uri.path}`;
        },
      };
    },
  };

  const html = await WebviewManager._getHtmlForWebview(webview, { path: '/extension' });

  assert(html.includes('vscode-webview://test'), 'CSP source should be injected');
  assert(html.includes('webview:/extension/src/webview/crt.css'), 'CSS URI should be injected');
  assert(html.includes('webview:/extension/src/webview/crtText.js'), 'CRT text URI should be injected');
  assert(
    html.includes('webview:/extension/src/webview/crtTranscript.js'),
    'CRT transcript URI should be injected',
  );
  assert(html.includes('webview:/extension/src/webview/runtime.js'), 'JS URI should be injected');
});

test('CRT transcript helpers preserve rendered text and reset cleanly', () => {
  const outputEvent = createTranscriptEvent('output', {
    text: 'BMI Calculator\\nunderweight',
  });
  const promptEvent = createTranscriptEvent('prompt_open', {
    prompt: 'Enter value: ',
    promptId: 1,
  });
  const clearedState = appendTranscriptState(
    appendTranscriptState(
      appendTranscriptState(undefined, outputEvent),
      promptEvent,
    ),
    createTranscriptEvent('clear', { reason: 'cls' }),
  );

  assert(eventHasRenderableText(outputEvent) === true, 'Output events should be renderable');
  assert(
    eventHasRenderableText(promptEvent) === false,
    'Prompt lifecycle events should stay structured only',
  );
  assert(
    eventToText(outputEvent) === `BMI Calculator${CRT_NEWLINE}underweight`,
    'Rendered transcript text should use real newlines',
  );
  assert(clearedState.text === '', 'Clear events should reset transcript text');
  assert(clearedState.entries.length === 0, 'Clear events should reset transcript entries');
  assert(clearedState.lastEvent.kind === 'clear', 'Clear should remain visible as the last event');
});

test('CRT text normalization decodes multi-line escaped blocks', () => {
  const input = 'Gorillas - Demo!\\n== Player 1 ==\\nAngle (0-90): ';
  const output = normalizeCrtText(input);
  assert(output.includes('\n== Player 1 ==\n'), 'Expected escaped newlines to become real newlines');
});

test('CRT text normalization decodes single escaped newlines in dense output', () => {
  const input = 'BMI Calculator\\nunderweight';
  const output = normalizeCrtText(input);
  assert(
    output === `BMI Calculator${CRT_NEWLINE}underweight`,
    'Expected single escaped newlines to render as actual line breaks',
  );
});

test('CRT text normalization does not mangle path-like output', () => {
  const input = 'Save to C:\\temp\\notes.bas';
  const output = normalizeCrtText(input);
  assert(output === input, 'Expected Windows-style paths to remain unchanged');
});

test('CRT prompt splitting keeps the input cursor on the final line', () => {
  const parts = splitPromptText('Intro\\nAngle: ');
  assert(parts.leadingText === 'Intro\n', 'Expected leading prompt text to include completed lines');
  assert(parts.inlineText === 'Angle: ', 'Expected inline prompt text to stay on the active input line');
});

test('CRT newline helpers use actual newline characters', () => {
  const appended = appendCrtNewline('BMI Calculator');
  assert(appended === `BMI Calculator${CRT_NEWLINE}`, 'Expected helper to append a real newline');
  assert(!appended.includes('\\n'), 'Expected helper output to avoid literal backslash-n sequences');
});

test('CRT rendered line splitting uses real line breaks', () => {
  const parts = splitRenderedLines(`A${CRT_NEWLINE}${CRT_NEWLINE}B`);
  assert(parts.length === 3, 'Expected blank lines to be preserved when splitting rendered text');
  assert(parts[1] === '', 'Expected an empty middle line for double newlines');
});

test('Structured CRT events update transcript text and complete lessons', async () => {
  let panel = null;
  const tutorialStub = {
    clearHistoryCalled: 0,
    clearHistory() {
      this.clearHistoryCalled++;
    },
    checkRuntimeEvent(event, transcript) {
      return (
        event.kind === 'output' &&
        transcript.text === `BMI Calculator${CRT_NEWLINE}underweight`
      );
    },
  };
  const { WebviewManager } = loadWebviewManager({
    createWebviewPanel() {
      panel = createMockPanel();
      return panel;
    },
    tutorialManagerMock: tutorialStub,
  });
  const transcriptResetEvents = [];
  const runtimeEvents = [];
  const resetHandler = (payload) => transcriptResetEvents.push(payload);
  const runtimeHandler = (payload) => runtimeEvents.push(payload);

  WebviewManager.onWebviewEvent('transcriptReset', resetHandler);
  WebviewManager.onWebviewEvent('runtimeEvent', runtimeHandler);
  try {
    WebviewManager._tutorialManagerCache = tutorialStub;

    await WebviewManager.createOrShow({ path: '/extension' });
    assert(typeof panel.messageHandler === 'function', 'Expected webview message handler to be wired');

    panel.messageHandler({
      type: 'crt_event',
      event: { kind: 'clear', reason: 'cls' },
    });
    assert(
      transcriptResetEvents.some((payload) => payload.reason === 'runtime_clear' || payload.reason === 'cls'),
      'Clear events should emit transcript reset notifications',
    );
    assert(
      tutorialStub.clearHistoryCalled === 1,
      'Clear events should reset tutorial output history',
    );

    panel.messageHandler({
      type: 'crt_event',
      event: { kind: 'output', text: 'BMI Calculator\nunderweight' },
    });

    assert(
      WebviewManager.getTranscriptText() === `BMI Calculator${CRT_NEWLINE}underweight`,
      'Transcript text should mirror rendered output',
    );
    assert(
      runtimeEvents.some((payload) => payload.event.kind === 'output'),
      'Runtime output should be broadcast through the event bus',
    );
    assert(
      panel.postedMessages.some((message) => message.type === 'quest_complete'),
      'Completed lessons should post a quest completion event back to the CRT',
    );
  } finally {
    WebviewManager.offWebviewEvent('transcriptReset', resetHandler);
    WebviewManager.offWebviewEvent('runtimeEvent', runtimeHandler);
    WebviewManager.dispose();
  }
});

test('Legacy check_output messages still feed the structured transcript', async () => {
  let panel = null;
  const { WebviewManager } = loadWebviewManager({
    createWebviewPanel() {
      panel = createMockPanel();
      return panel;
    },
  });

  WebviewManager._tutorialManagerCache = {
    clearHistory() {},
    checkRuntimeEvent() {
      return false;
    },
  };

  await WebviewManager.createOrShow({ path: '/extension' });
  panel.messageHandler({
    type: 'check_output',
    content: 'Legacy\\nOutput',
  });

  assert(
    WebviewManager.getTranscriptText() === `Legacy${CRT_NEWLINE}Output`,
    'Legacy output chunks should normalize into the structured transcript',
  );
  WebviewManager.dispose();
});

test('createOrShow cleans up if HTML loading fails', async () => {
  let panel = null;
  const { WebviewManager, errorMessages } = loadWebviewManager({
    readFileError: new Error('missing template'),
    createWebviewPanel() {
      panel = createMockPanel();
      return panel;
    },
  });

  await WebviewManager.createOrShow({ path: '/extension' });

  assert(panel && panel.disposed, 'Panel should be disposed on load failure');
  assert(WebviewManager.currentPanel === undefined, 'Current panel should be cleared');
  assert(WebviewManager._disposables.length === 0, 'Disposables should be cleared');
  assert(WebviewManager._readyPromise === null, 'Ready promise should be cleared');
  assert(
    errorMessages.some((message) => message.includes('Failed to load CRT')),
    'Should surface a load error',
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
