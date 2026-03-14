'use strict';

const Module = require('module');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function createVscodeMock() {
  const tracker = {
    registrations: [],
    disposals: [],
    findFilesCalls: [],
    lastDiagnosticSet: null,
    readFileCalls: [],
    configuration: {
      compilerMode: 'QB64 (Recommended)',
      compilerPath: null,
      compilerArgs: '',
      enableLinting: true,
      lintDelay: 500,
      autoFormatOnSave: true,
      workspaceIndexMaxFiles: 5000,
    },
    findFilesImpl: async () => [],
    readFileImpl: async () => new Uint8Array(),
  };

  function createDisposable(label) {
    return {
      dispose() {
        tracker.disposals.push(label);
      },
    };
  }

  class Position {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  }

  class Range {
    constructor(startLineOrPosition, startCharacterOrPosition, endLine, endCharacter) {
      if (
        typeof startLineOrPosition === 'object' &&
        typeof startCharacterOrPosition === 'object'
      ) {
        this.start = startLineOrPosition;
        this.end = startCharacterOrPosition;
        return;
      }

      this.start = new Position(startLineOrPosition, startCharacterOrPosition);
      this.end = new Position(endLine, endCharacter);
    }

    isEqual(other) {
      return (
        this.start.line === other.start.line &&
        this.start.character === other.start.character &&
        this.end.line === other.end.line &&
        this.end.character === other.end.character
      );
    }
  }

  class Diagnostic {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
      this.source = null;
    }
  }

  class CompletionItem {
    constructor(label, kind) {
      this.label = label;
      this.kind = kind;
    }
  }

  class MarkdownString {
    constructor(value = '') {
      this.value = value;
    }
  }

  class SnippetString {
    constructor(value = '') {
      this.value = value;
    }
  }

  class Color {
    constructor(red, green, blue, alpha) {
      this.red = red;
      this.green = green;
      this.blue = blue;
      this.alpha = alpha;
    }
  }

  class ColorInformation {
    constructor(range, color) {
      this.range = range;
      this.color = color;
    }
  }

  class ColorPresentation {
    constructor(label) {
      this.label = label;
    }
  }

  class ThemeColor {
    constructor(id) {
      this.id = id;
    }
  }

  class ThemeIcon {
    constructor(id, color) {
      this.id = id;
      this.color = color;
    }
  }

  class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  class EventEmitter {
    constructor() {
      this.listeners = new Set();
      this.event = (listener) => {
        this.listeners.add(listener);
        return createDisposable('event-listener');
      };
    }

    fire(value) {
      for (const listener of this.listeners) {
        listener(value);
      }
    }

    dispose() {
      this.listeners.clear();
      tracker.disposals.push('event-emitter');
    }
  }

  class RelativePattern {
    constructor(base, pattern) {
      this.base = base;
      this.pattern = pattern;
    }
  }

  class Uri {
    constructor(fsPath) {
      this.fsPath = fsPath;
      this.path = fsPath;
    }

    toString() {
      return this.fsPath;
    }

    static parse(value) {
      return new Uri(value);
    }

    static file(value) {
      return new Uri(value);
    }
  }

  function register(type, name) {
    tracker.registrations.push(`${type}:${name}`);
    return createDisposable(`${type}:${name}`);
  }

  function registerEvent(name) {
    return () => register('event', name);
  }

  const languages = new Proxy(
    {
      createDiagnosticCollection(name) {
        tracker.registrations.push(`diagnostics:${name}`);
        return {
          clear() {},
          set(uri, diagnostics) {
            tracker.lastDiagnosticSet = { uri, diagnostics };
          },
          dispose() {
            tracker.disposals.push(`diagnostics:${name}`);
          },
        };
      },
    },
    {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }

        if (String(prop).startsWith('register')) {
          return () => register('language', String(prop));
        }

        return undefined;
      },
    },
  );

  const window = {
    activeTextEditor: null,
    visibleTextEditors: [],
    createTextEditorDecorationType() {
      return createDisposable('decoration');
    },
    createStatusBarItem(alignment, priority) {
      return {
        alignment,
        priority,
        command: null,
        text: '',
        tooltip: '',
        backgroundColor: undefined,
        show() {},
        hide() {},
        dispose() {
          tracker.disposals.push(`statusbar:${alignment}:${priority}`);
        },
      };
    },
    registerTreeDataProvider(viewId) {
      return register('tree', viewId);
    },
    onDidChangeActiveTextEditor: registerEvent('window.onDidChangeActiveTextEditor'),
    onDidCloseTerminal: registerEvent('window.onDidCloseTerminal'),
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    setStatusBarMessage() {
      return createDisposable('status-message');
    },
    createOutputChannel(name) {
      return {
        append() {},
        appendLine() {},
        clear() {},
        show() {},
        dispose() {
          tracker.disposals.push(`output:${name}`);
        },
      };
    },
    createTerminal(options = {}) {
      return {
        options,
        exitStatus: undefined,
        dispose() {
          tracker.disposals.push(`terminal:${options.name || 'anonymous'}`);
        },
      };
    },
    createWebviewPanel() {
      return {
        webview: {
          html: '',
          postMessage() {},
          onDidReceiveMessage() {
            return createDisposable('webview-message');
          },
          asWebviewUri(uri) {
            return uri;
          },
        },
        onDidDispose() {
          return createDisposable('webview-dispose');
        },
        reveal() {},
        dispose() {
          tracker.disposals.push('webview-panel');
        },
      };
    },
    withProgress: async (_options, task) => task({ report() {} }),
    showTextDocument: async () => ({}),
    showQuickPick: async () => undefined,
  };

  const workspace = {
    workspaceFolders: [{ uri: Uri.file(path.join(process.cwd(), 'workspace')) }],
    textDocuments: [],
    fs: {
      readFile: async (uri) => {
        tracker.readFileCalls.push(uri.fsPath);
        return tracker.readFileImpl(uri);
      },
    },
    getConfiguration() {
      return {
        get(key, fallback) {
          return Object.prototype.hasOwnProperty.call(tracker.configuration, key)
            ? tracker.configuration[key]
            : fallback;
        },
        async update(key, value) {
          tracker.configuration[key] = value;
        },
      };
    },
    onDidChangeTextDocument: registerEvent('workspace.onDidChangeTextDocument'),
    onWillSaveTextDocument: registerEvent('workspace.onWillSaveTextDocument'),
    onDidSaveTextDocument: registerEvent('workspace.onDidSaveTextDocument'),
    onDidChangeConfiguration: registerEvent('workspace.onDidChangeConfiguration'),
    onDidCreateFiles: registerEvent('workspace.onDidCreateFiles'),
    onDidDeleteFiles: registerEvent('workspace.onDidDeleteFiles'),
    onDidRenameFiles: registerEvent('workspace.onDidRenameFiles'),
    onDidChangeWorkspaceFolders: registerEvent('workspace.onDidChangeWorkspaceFolders'),
    onDidCloseTextDocument: registerEvent('workspace.onDidCloseTextDocument'),
    registerTextDocumentContentProvider() {
      return register('workspace', 'registerTextDocumentContentProvider');
    },
    async findFiles(pattern, exclude, maxResults) {
      tracker.findFilesCalls.push({
        pattern,
        exclude,
        maxResults,
      });
      return tracker.findFilesImpl(pattern, exclude, maxResults);
    },
    getWorkspaceFolder() {
      return null;
    },
    asRelativePath(uri) {
      return typeof uri === 'string' ? uri : uri.fsPath;
    },
    async openTextDocument(options) {
      return {
        ...options,
        uri: Uri.file(path.join(process.cwd(), 'untitled.bas')),
        getText() {
          return options.content || '';
        },
      };
    },
    async applyEdit() {
      return true;
    },
  };

  const commands = {
    registerCommand(id) {
      return register('command', id);
    },
    async executeCommand() {
      return undefined;
    },
  };

  return {
    tracker,
    mock: {
      Position,
      Range,
      Diagnostic,
      CompletionItem,
      MarkdownString,
      SnippetString,
      Color,
      ColorInformation,
      ColorPresentation,
      ThemeColor,
      ThemeIcon,
      TreeItem,
      EventEmitter,
      RelativePattern,
      Uri,
      languages,
      window,
      workspace,
      commands,
      StatusBarAlignment: {
        Left: 1,
        Right: 2,
      },
      CodeActionKind: {
        QuickFix: 'quickfix',
        RefactorExtract: 'refactor.extract',
      },
      CompletionItemKind: {
        Keyword: 1,
        Function: 2,
        Method: 3,
        Struct: 4,
        Constant: 5,
        Variable: 6,
      },
      SymbolKind: {
        Function: 1,
        Method: 2,
        Struct: 3,
        Constant: 4,
        Event: 5,
        Variable: 6,
      },
      DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3,
      },
      TreeItemCollapsibleState: {
        None: 0,
      },
      ViewColumn: {
        One: 1,
        Two: 2,
      },
      ConfigurationTarget: {
        Global: 1,
      },
    },
  };
}

async function withMockedVscode(run) {
  const originalLoad = Module._load;
  const { tracker, mock } = createVscodeMock();

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') {
      return mock;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return await run({ tracker, vscode: mock });
  } finally {
    Module._load = originalLoad;
  }
}

async function main() {
  console.log('\n📦 Extension Smoke Tests');

  await withMockedVscode(async ({ tracker, vscode }) => {
    const extension = require('../extension');
    const { state } = require('../src/extension/state');
    const { parseCompilerErrors } = require('../src/extension/qb64Compiler');
    const { QBasicTodoProvider } = require('../src/providers/todoProvider');

    await test('activate registers extension services and prewarms workspace indexing', async () => {
      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file(process.cwd()),
      };

      await extension.activate(context);
      await new Promise((resolve) => setImmediate(resolve));

      assert(
        context.subscriptions.length >= 35,
        `Expected extension activation to register disposables, got ${context.subscriptions.length}`,
      );
      assert(
        tracker.findFilesCalls.length > 0,
        'Expected activation to queue a workspace indexing pass',
      );
      assert(
        state.extensionContext === context,
        'Extension context should be stored in shared state after activation',
      );
    });

    await test('deactivate releases status bars and diagnostics cleanly', async () => {
      state.terminal = vscode.window.createTerminal({ name: 'QBasic Nexus Test' });
      extension.deactivate();

      assert(state.extensionContext === null, 'Extension context should be cleared on deactivate');
      assert(state.statusBarItem === null, 'Status bar item should be cleared on deactivate');
      assert(state.statsBarItem === null, 'Stats bar item should be cleared on deactivate');
      assert(
        tracker.disposals.includes('diagnostics:qbasic-nexus'),
        'Diagnostic collection should be disposed on deactivate',
      );
      assert(
        tracker.disposals.includes('terminal:QBasic Nexus Test'),
        'Open terminals should be disposed on deactivate',
      );
    });

    await test('QB64 diagnostics parser accepts .inc file errors', async () => {
      const uri = vscode.Uri.file(path.join(process.cwd(), 'shared.inc'));
      state.diagnosticCollection = vscode.languages.createDiagnosticCollection('qbasic-nexus');
      vscode.workspace.textDocuments = [
        {
          uri,
          getText() {
            return ['PRINT 1', 'PRINT 2', 'PRINT 3', 'PRINT 4', 'BROKEN'].join('\n');
          },
        },
      ];

      parseCompilerErrors('shared.inc:5: error: Syntax error', uri);

      assert(tracker.lastDiagnosticSet !== null, 'Expected compiler diagnostics to be published');
      assert(
        tracker.lastDiagnosticSet.diagnostics.length === 1,
        `Expected one diagnostic for .inc errors, got ${tracker.lastDiagnosticSet.diagnostics.length}`,
      );
      assert(
        String(tracker.lastDiagnosticSet.diagnostics[0].message).includes('Syntax error'),
        'Expected the .inc diagnostic message to be preserved',
      );
    });

    await test('TODO provider scans every workspace folder and includes HACK comments', async () => {
      const folderA = { uri: vscode.Uri.file(path.join(process.cwd(), 'workspace-a')) };
      const folderB = { uri: vscode.Uri.file(path.join(process.cwd(), 'workspace-b')) };
      const fileA = vscode.Uri.file(path.join(folderA.uri.fsPath, 'main.bas'));
      const fileB = vscode.Uri.file(path.join(folderB.uri.fsPath, 'notes.inc'));
      vscode.workspace.workspaceFolders = [folderA, folderB];

      tracker.findFilesCalls.length = 0;
      tracker.readFileCalls.length = 0;
      tracker.findFilesImpl = async (pattern) => {
        if (pattern.base === folderA) {
          return [fileA];
        }

        if (pattern.base === folderB) {
          return [fileB];
        }

        return [];
      };
      tracker.readFileImpl = async (uri) => {
        if (uri.fsPath === fileA.fsPath) {
          return new TextEncoder().encode('\' TODO tidy first folder\nPRINT 1\n');
        }

        if (uri.fsPath === fileB.fsPath) {
          return new TextEncoder().encode('REM HACK second folder issue\n');
        }

        return new Uint8Array();
      };

      const provider = new QBasicTodoProvider();

      try {
        const todos = await provider.getChildren();
        assert(todos.length === 2, `Expected TODO scan to find two items across workspace folders, got ${todos.length}`);
        assert(
          tracker.findFilesCalls.length === 2,
          `Expected one findFiles call per workspace folder, got ${tracker.findFilesCalls.length}`,
        );
        assert(
          tracker.readFileCalls.includes(fileA.fsPath) && tracker.readFileCalls.includes(fileB.fsPath),
          'Expected TODO scan to read files from both workspace folders',
        );
        assert(todos[0].keyword === 'HACK', `Expected HACK entries to sort before TODO entries, got ${todos[0].keyword}`);
        assert(
          todos.some((item) => item.keyword === 'TODO'),
          'Expected TODO entries to remain present after multi-root scan',
        );
      } finally {
        provider.dispose();
      }
    });
  });

  console.log('\n════════════════════════════════════════');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n❌ Extension smoke suite crashed: ${error.message}`);
  process.exit(1);
});
