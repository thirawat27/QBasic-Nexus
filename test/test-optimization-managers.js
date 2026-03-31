'use strict';

const Module = require('module');

console.log('\n📦 Optimization Manager Tests\n');

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
  let buildCount = 0;

  class SemanticTokensLegend {
    constructor(tokenTypes, tokenModifiers) {
      this.tokenTypes = tokenTypes;
      this.tokenModifiers = tokenModifiers;
    }
  }

  class SemanticTokensBuilder {
    constructor(legend) {
      this.legend = legend;
      this.entries = [];
    }

    push(line, start, length, tokenType, modifierMask) {
      this.entries.push({ line, start, length, tokenType, modifierMask });
    }

    build() {
      buildCount++;
      return {
        buildId: buildCount,
        entries: this.entries.slice(),
      };
    }
  }

  return {
    SemanticTokensLegend,
    SemanticTokensBuilder,
  };
}

function loadSemanticTokenProvider() {
  const vscodeMock = createVscodeMock();
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  const modulePath = require.resolve('../src/providers/semanticTokenProvider');
  delete require.cache[modulePath];

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

test('Semantic token provider reuses cached tokens for the same document version', () => {
  const {
    QBasicDocumentSemanticTokenProvider,
    invalidateSemanticTokenCache,
  } = loadSemanticTokenProvider();
  const provider = new QBasicDocumentSemanticTokenProvider();
  const document = {
    uri: { toString: () => 'test://demo.bas' },
    version: 1,
    getText: () => 'DIM sharedValue\nsharedValue = 1',
  };

  const first = provider.provideDocumentSemanticTokens(document);
  const second = provider.provideDocumentSemanticTokens(document);

  assert(first === second, 'Expected semantic token result to be cached for the same version');

  document.version = 2;
  const third = provider.provideDocumentSemanticTokens(document);
  assert(third !== first, 'Expected cache miss after document version changes');

  invalidateSemanticTokenCache(document.uri);
  const fourth = provider.provideDocumentSemanticTokens(document);
  assert(fourth !== third, 'Expected explicit invalidation to drop semantic token cache');
});

test('LintWorkerClient returns diagnostics for invalid source', async () => {
  const { LintWorkerClient } = require('../src/managers/LintWorkerClient');
  const client = new LintWorkerClient();

  try {
    const okErrors = await client.lint('PRINT "Hello"', {});
    const badErrors = await client.lint('FOR = 1 TO 10', {});

    assert(Array.isArray(okErrors) && okErrors.length === 0, 'Valid source should not produce lint errors');
    assert(Array.isArray(badErrors) && badErrors.length > 0, 'Invalid source should produce lint diagnostics');
  } finally {
    client.dispose();
  }
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
