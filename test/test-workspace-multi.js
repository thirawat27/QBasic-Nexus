/**
 * QBasic Nexus - Multi-Workspace Analysis Tests
 */

'use strict';

const {
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
} = require('../src/shared/workspaceAnalysisMulti');

console.log('\n📦 Multi-Workspace Analysis Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// Test 1: Manager creates separate analyzers
test('Manager creates separate analyzers per workspace', () => {
  const manager = new WorkspaceAnalysisManager();
  
  const mockUri1 = { toString: () => 'workspace1' };
  const mockUri2 = { toString: () => 'workspace2' };
  
  // In non-VS Code environment, should use default analyzer
  const analyzer1 = manager.getAnalyzer(mockUri1);
  const analyzer2 = manager.getAnalyzer(mockUri2);
  
  // Both should return the same default analyzer in test environment
  assert(analyzer1 === analyzer2, 'Should use default analyzer in test environment');
  assert(analyzer1.workspaceId === 'default', 'Should use default workspace ID');
  
  manager.dispose();
});

// Test 2: Manager reuses analyzers
test('Manager reuses existing analyzers', () => {
  const manager = new WorkspaceAnalysisManager();
  
  const mockUri = { toString: () => 'workspace1' };
  
  const analyzer1 = manager.getAnalyzer(mockUri);
  const analyzer2 = manager.getAnalyzer(mockUri);
  
  assert(analyzer1 === analyzer2, 'Should reuse same analyzer');
  
  manager.dispose();
});

// Test 3: Manager clears all analyzers
test('Manager clears all analyzers on dispose', () => {
  const manager = new WorkspaceAnalysisManager();
  
  const mockUri1 = { toString: () => 'workspace1' };
  const mockUri2 = { toString: () => 'workspace2' };
  
  manager.getAnalyzer(mockUri1);
  manager.getAnalyzer(mockUri2);
  
  assert(manager.analyzers.size >= 1, 'Should have at least 1 analyzer');
  
  manager.dispose();
  
  assert(manager.analyzers.size === 0, 'Should clear all analyzers');
});

// Test 4: Analyzer invalidates a cached file
test('Analyzer invalidates a single cached file', () => {
  const manager = new WorkspaceAnalysisManager();
  const analyzer = manager.getAnalyzer({ toString: () => 'workspace1' });

  analyzer.symbolCache.set('demo.bas', { symbols: [] });
  analyzer.lastModified.set('demo.bas', 123);
  analyzer.symbolCache.set('keep.bas', { symbols: [] });

  analyzer.invalidateFile('demo.bas');

  assert(!analyzer.symbolCache.has('demo.bas'), 'Invalidated file should be removed');
  assert(!analyzer.lastModified.has('demo.bas'), 'Timestamp cache should be removed');
  assert(analyzer.symbolCache.has('keep.bas'), 'Other files should remain cached');

  manager.dispose();
});

// Test 5: Manager invalidates a cached file through the facade route
test('Manager invalidates cached file by path', () => {
  const manager = new WorkspaceAnalysisManager();
  const mockUri = { toString: () => 'workspace1' };
  const analyzer = manager.getAnalyzer(mockUri);

  analyzer.symbolCache.set('demo.bas', { symbols: [] });
  analyzer.lastModified.set('demo.bas', 123);

  manager.invalidateFile('demo.bas', mockUri);

  assert(!analyzer.symbolCache.has('demo.bas'), 'Manager should invalidate cached file');

  manager.dispose();
});

// Test 6: Clearing analyzer resets initial parse state
test('Analyzer clear resets parsed-workspace state', () => {
  const manager = new WorkspaceAnalysisManager();
  const analyzer = manager.getAnalyzer({ toString: () => 'workspace1' });

  analyzer._hasParsedWorkspace = true;
  analyzer.clear();

  assert(analyzer._hasParsedWorkspace === false, 'Clear should reset parse state');

  manager.dispose();
});

// Test 7: Non-blocking workspace warmup returns local analysis immediately
test('Analyzer can warm workspace in background without blocking local analysis', async () => {
  const analyzer = new WorkspaceAnalysis('default');
  let warmupCalls = 0;

  analyzer.parseWorkspaceSymbols = async function patchedParseWorkspaceSymbols() {
    warmupCalls++;
    this._hasParsedWorkspace = true;
  };

  const document = {
    uri: {
      fsPath: 'demo.bas',
      toString: () => 'demo.bas',
    },
    getText: () => 'SUB Demo\nEND SUB',
  };

  const analysis = await analyzer.getWorkspaceAnalysis(document, {
    awaitWorkspace: false,
  });

  assert(warmupCalls === 1, 'Expected background warmup to be started');
  assert(analysis.symbols.length === 1, 'Expected local analysis to be returned immediately');
  analyzer.dispose();
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
