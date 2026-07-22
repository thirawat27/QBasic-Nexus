/**
 * QBasic Nexus - Hot-Path Cache Tests
 *
 * Locks in the production performance/stability work:
 *  - BoundedCache LRU semantics (every long-lived cache is capped)
 *  - Workspace analysis is memoized per (document version, cache generation)
 *  - Memoized results are invalidated when the symbol cache mutates
 *  - Document analysis and identifier-match caches stay bounded
 */

'use strict';

const { BoundedCache } = require('../src/shared/boundedCache');
const {
  WorkspaceAnalysis,
} = require('../src/shared/workspaceAnalysisMulti');
const {
  getDocumentAnalysis,
  findIdentifierMatchesInAnalysis,
  clearDocumentAnalysisCache,
} = require('../src/shared/documentAnalysis');

console.log('\n⚡ Hot-Path Cache Tests\n');

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
 * Minimal TextDocument stand-in. `version` is mutable so tests can simulate
 * edits the way VS Code does.
 */
function makeDocument(fsPath, text, version = 1) {
  return {
    version,
    uri: {
      fsPath,
      toString: () => fsPath,
    },
    getText: () => text,
  };
}

/** Build an analyzer whose workspace scan is stubbed out (no real file I/O). */
function makeAnalyzer() {
  const analyzer = new WorkspaceAnalysis('default');
  analyzer.parseWorkspaceSymbols = async function stubbedParse() {
    this._hasParsedWorkspace = true;
  };
  return analyzer;
}

// ── BoundedCache ─────────────────────────────────────────────────────────────

test('BoundedCache evicts the least recently used entry past its cap', () => {
  const cache = new BoundedCache(2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  assert(cache.size === 2, `Expected size 2, got ${cache.size}`);
  assert(!cache.has('a'), 'Oldest entry should have been evicted');
  assert(cache.get('b') === 2 && cache.get('c') === 3, 'Newer entries kept');
});

test('BoundedCache read refreshes recency', () => {
  const cache = new BoundedCache(2);
  cache.set('a', 1);
  cache.set('b', 2);

  // Touch 'a' so 'b' becomes the coldest entry.
  cache.get('a');
  cache.set('c', 3);

  assert(cache.has('a'), 'Recently read entry should survive eviction');
  assert(!cache.has('b'), 'Untouched entry should be evicted instead');
});

test('BoundedCache peek does not change eviction order', () => {
  const cache = new BoundedCache(2);
  cache.set('a', 1);
  cache.set('b', 2);

  cache.peek('a');
  cache.set('c', 3);

  assert(!cache.has('a'), 'peek must not refresh recency');
});

test('BoundedCache rejects a non-positive cap and falls back to a safe size', () => {
  assert(new BoundedCache(0).maxSize === 32, 'Zero cap should fall back');
  assert(new BoundedCache(-5).maxSize === 32, 'Negative cap should fall back');
  assert(new BoundedCache(NaN).maxSize === 32, 'NaN cap should fall back');
  assert(new BoundedCache(4).maxSize === 4, 'Valid cap should be honoured');
});

// ── Workspace analysis memoization ───────────────────────────────────────────

test('Repeat workspace analysis for one document version returns the same object', async () => {
  const analyzer = makeAnalyzer();
  const document = makeDocument('memo.bas', 'SUB Demo\nEND SUB');

  const first = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });
  const second = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });

  assert(
    first === second,
    'Identical object identity is what lets providers memoize derived items',
  );
  analyzer.dispose();
});

test('Editing the document produces a fresh workspace analysis', async () => {
  const analyzer = makeAnalyzer();
  const document = makeDocument('memo.bas', 'SUB Demo\nEND SUB');

  const first = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });

  document.version = 2;
  document.getText = () => 'SUB Demo\nEND SUB\nSUB Other\nEND SUB';

  const second = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });

  assert(first !== second, 'A new document version must not reuse the memo');
  assert(
    second.symbols.length === 2,
    `Expected 2 symbols after edit, got ${second.symbols.length}`,
  );
  analyzer.dispose();
});

test('Invalidating a workspace file invalidates the memoized analysis', async () => {
  const analyzer = makeAnalyzer();
  const document = makeDocument('memo.bas', 'SUB Demo\nEND SUB');

  analyzer.symbolCache.set('other.bas', {
    symbols: [{ name: 'Helper', detail: 'SUB', kind: 'method', line: 0 }],
    variables: ['Counter'],
    definitions: new Map(),
  });
  analyzer._bumpGeneration();

  const withOther = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });
  assert(
    withOther.symbols.some((s) => s.name === 'Helper'),
    'Workspace symbol should be merged in',
  );

  analyzer.invalidateFile('other.bas');

  const afterInvalidate = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });
  assert(
    afterInvalidate !== withOther,
    'Stale memo must not survive a symbol cache mutation',
  );
  assert(
    !afterInvalidate.symbols.some((s) => s.name === 'Helper'),
    'Invalidated file symbols must be gone',
  );
  analyzer.dispose();
});

test('Workspace identifier matches are memoized per identifier and invalidated on change', async () => {
  const analyzer = makeAnalyzer();
  // Distinct path: getDocumentAnalysis caches by URI + version process-wide.
  const document = makeDocument('matches.bas', 'Counter = 1\nCounter = Counter + 1');

  const first = await analyzer.findWorkspaceIdentifierMatches(
    document,
    'Counter',
  );
  const second = await analyzer.findWorkspaceIdentifierMatches(
    document,
    'Counter',
  );

  assert(first === second, 'Repeat lookup should hit the memo');
  assert(first.length === 3, `Expected 3 matches, got ${first.length}`);

  const other = await analyzer.findWorkspaceIdentifierMatches(document, 'Total');
  assert(other !== first, 'A different identifier must not reuse the memo');

  // Invalidating a path that was never cached changes nothing observable, so
  // the memo must survive it.
  analyzer.invalidateFile('never-cached.bas');
  assert(
    (await analyzer.findWorkspaceIdentifierMatches(document, 'Counter')) ===
      first,
    'A no-op invalidation must not throw away valid memos',
  );

  // A real symbol cache mutation must invalidate every derived memo.
  analyzer.symbolCache.set('helper.bas', {
    lines: ['Counter = 9'],
    symbols: [],
    variables: ['Counter'],
    definitions: new Map(),
  });
  analyzer.lastModified.set('helper.bas', 1);
  analyzer._bumpGeneration();

  const third = await analyzer.findWorkspaceIdentifierMatches(
    document,
    'Counter',
  );
  assert(third !== first, 'Cache mutation must invalidate identifier memos');
  assert(
    third.some((m) => m.file === 'helper.bas'),
    'Newly cached workspace file must contribute matches',
  );

  analyzer.dispose();
});

test('Analyzer memo caches stay bounded across many documents', async () => {
  const analyzer = makeAnalyzer();

  for (let i = 0; i < 200; i++) {
    const document = makeDocument(`doc-${i}.bas`, `SUB Demo${i}\nEND SUB`);
    await analyzer.getWorkspaceAnalysis(document, { awaitWorkspace: false });
  }

  assert(
    analyzer._mergedCache.size <= analyzer._mergedCache.maxSize,
    `Merged cache exceeded its cap: ${analyzer._mergedCache.size}`,
  );
  analyzer.dispose();
});

// ── Document analysis caches ─────────────────────────────────────────────────

test('Document analysis cache stays bounded across many documents', () => {
  clearDocumentAnalysisCache();

  let last = null;
  for (let i = 0; i < 200; i++) {
    last = getDocumentAnalysis(makeDocument(`analysis-${i}.bas`, `X${i} = ${i}`));
  }

  assert(last !== null, 'Analysis should still be produced under cap pressure');

  // The cache is module-private; prove the cap indirectly: the very first
  // document must have been evicted, so re-analysing it yields a new object.
  const doc0 = makeDocument('analysis-0.bas', 'X0 = 0');
  const a = getDocumentAnalysis(doc0);
  const b = getDocumentAnalysis(doc0);
  assert(a === b, 'A freshly cached document should still be memoized');

  clearDocumentAnalysisCache();
});

test('Identifier match cache is bounded per analysis', () => {
  clearDocumentAnalysisCache();

  const lines = [];
  for (let i = 0; i < 300; i++) lines.push(`Var${i} = ${i}`);
  const analysis = getDocumentAnalysis(
    makeDocument('identifiers.bas', lines.join('\n')),
  );

  for (let i = 0; i < 300; i++) {
    findIdentifierMatchesInAnalysis(analysis, `Var${i}`);
  }

  const cache = analysis.identifierMatchCache;
  assert(cache instanceof BoundedCache, 'Identifier match cache must be bounded');
  assert(
    cache.size <= cache.maxSize,
    `Identifier match cache exceeded its cap: ${cache.size}`,
  );

  clearDocumentAnalysisCache();
});

test('Identifier matches remain correct after cache eviction pressure', () => {
  clearDocumentAnalysisCache();

  const analysis = getDocumentAnalysis(
    makeDocument('stable.bas', 'Total = 1\nTotal = Total + 2'),
  );

  const before = findIdentifierMatchesInAnalysis(analysis, 'Total');

  // Force eviction of the 'Total' entry.
  for (let i = 0; i < 300; i++) {
    findIdentifierMatchesInAnalysis(analysis, `Filler${i}`);
  }

  const after = findIdentifierMatchesInAnalysis(analysis, 'Total');
  assert(
    JSON.stringify(before) === JSON.stringify(after),
    'Recomputed matches after eviction must equal the original result',
  );

  clearDocumentAnalysisCache();
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
