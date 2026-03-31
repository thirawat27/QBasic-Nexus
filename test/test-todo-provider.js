/**
 * QBasic Nexus - TodoProvider Tests
 */

'use strict';

const Module = require('module');

console.log('\n📦 TodoProvider Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function createVscodeMock() {
  class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  class ThemeIcon {
    constructor(id, color) {
      this.id = id;
      this.color = color;
    }
  }

  class ThemeColor {
    constructor(id) {
      this.id = id;
    }
  }

  class EventEmitter {
    constructor() {
      this.event = () => {};
    }

    fire() {}
  }

  class Position {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  }

  class Range {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  }

  class RelativePattern {
    constructor(baseUri, pattern) {
      this.baseUri = baseUri;
      this.pattern = pattern;
    }
  }

  const filesByFolder = {
    folderA: [
      { fsPath: 'shared.bas', toString: () => 'shared.bas' },
      { fsPath: 'alpha.bas', toString: () => 'alpha.bas' },
    ],
    folderB: [
      { fsPath: 'shared.bas', toString: () => 'shared.bas' },
      { fsPath: 'beta.bas', toString: () => 'beta.bas' },
    ],
  };

  const fileContents = {
    'shared.bas': '\' HACK: refactor parser',
    'alpha.bas': 'REM TODO: write docs',
    'beta.bas': 'REM FIXME: broken path',
  };
  let readCount = 0;

  const vscodeMock = {
    TreeItem,
    ThemeIcon,
    ThemeColor,
    EventEmitter,
    Position,
    Range,
    RelativePattern,
    TreeItemCollapsibleState: {
      None: 0,
    },
    workspace: {
      workspaceFolders: [
        { name: 'folderA', uri: { toString: () => 'folderA' } },
        { name: 'folderB', uri: { toString: () => 'folderB' } },
      ],
      async findFiles(relativePattern) {
        return filesByFolder[relativePattern.baseUri.name] || [];
      },
      fs: {
        async readFile(file) {
          readCount++;
          return Buffer.from(fileContents[file.fsPath] || '', 'utf8');
        },
      },
      asRelativePath(uri) {
        return uri.fsPath;
      },
    },
  };

  vscodeMock.__fileContents = fileContents;
  vscodeMock.__stats = {
    get readCount() {
      return readCount;
    },
  };

  return vscodeMock;
}

function loadTodoProvider() {
  const vscodeMock = createVscodeMock();
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  const modulePath = require.resolve('../src/providers/todoProvider');
  delete require.cache[modulePath];

  try {
    return {
      exports: require(modulePath),
      vscodeMock,
    };
  } finally {
    Module._load = originalLoad;
  }
}

test('TodoProvider scans all workspace folders without duplicate files', async () => {
  const { exports: { QBasicTodoProvider } } = loadTodoProvider();
  const provider = new QBasicTodoProvider();

  await provider.scanWorkspace();

  assert(provider.todos.length === 3, 'Expected unique todos from shared, alpha, and beta files');
  const sharedTodos = provider.todos.filter((todo) => todo.uri.fsPath === 'shared.bas');
  assert(sharedTodos.length === 1, 'Shared file should only be scanned once');
});

test('TodoProvider includes HACK entries and keeps priority ordering', async () => {
  const { exports: { QBasicTodoProvider } } = loadTodoProvider();
  const provider = new QBasicTodoProvider();

  await provider.scanWorkspace();

  assert(provider.todos.some((todo) => todo.keyword === 'HACK'), 'HACK entries should be included');
  assert(provider.todos[0].keyword === 'FIXME' || provider.todos[0].keyword === 'HACK', 'Critical todo types should sort before TODO');
});

test('TodoProvider reuses cached todo results between tree expansions', async () => {
  const { exports: { QBasicTodoProvider }, vscodeMock } = loadTodoProvider();
  const provider = new QBasicTodoProvider();

  await provider.getChildren();
  const initialReads = vscodeMock.__stats.readCount;
  await provider.getChildren();

  assert(vscodeMock.__stats.readCount === initialReads, 'Expected cached getChildren() to avoid re-reading files');
});

test('TodoProvider refreshes only the changed file after initial scan', async () => {
  const { exports: { QBasicTodoProvider }, vscodeMock } = loadTodoProvider();
  const provider = new QBasicTodoProvider();

  await provider.getChildren();
  const initialReads = vscodeMock.__stats.readCount;

  vscodeMock.__fileContents['alpha.bas'] = 'REM TODO: rewritten docs';
  provider.refresh({ fsPath: 'alpha.bas', toString: () => 'alpha.bas' });
  await provider.getChildren();

  assert(vscodeMock.__stats.readCount === initialReads + 1, 'Expected refresh(target) to rescan only one file');
  assert(provider.todos.some((todo) => todo.label.includes('rewritten docs')), 'Updated file contents should be reflected in TODO items');
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
