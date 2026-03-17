/**
 * QBasic Nexus - WebviewManager Tests
 */

'use strict';

const Module = require('module');

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
  return {
    disposed: false,
    reveal() {},
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
      async postMessage() {
        return true;
      },
      onDidReceiveMessage() {
        return {
          dispose() {},
        };
      },
    },
  };
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
    '<script src="{{jsUri}}"></script>',
  ].join('\n');

  const vscodeMock = createVscodeMock(templateHtml, options);
  const originalLoad = Module._load;

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
  assert(html.includes('webview:/extension/src/webview/runtime.js'), 'JS URI should be injected');
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
