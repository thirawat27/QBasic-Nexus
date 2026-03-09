'use strict';
/**
 * Final integration test - all Phase 1-3 components
 */
let passed = 0,
  failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ─── Phase 1: Lexer (moo-based) ──────────────────────────────────────────────
console.log('\n📦 Phase 1: Lexer (moo) Tests');
const Lexer = require('../src/compiler/lexer');

test('Lexer tokenizes PRINT', () => {
  const l = new Lexer('PRINT "Hello"');
  const t = l.tokenize();
  if (!t.some((tk) => tk.type === 'KEYWORD' && tk.value === 'PRINT'))
    throw new Error('Missing PRINT keyword token');
});

test('Lexer handles strings', () => {
  const l = new Lexer('PRINT "Hello, World!"');
  const t = l.tokenize();
  const strTok = t.find((tk) => tk.type === 'STRING');
  if (!strTok || strTok.value !== 'Hello, World!')
    throw new Error(`Bad string token: ${JSON.stringify(strTok)}`);
});

test('Lexer handles numbers', () => {
  const l = new Lexer('x = 3.14');
  const t = l.tokenize();
  if (!t.some((tk) => tk.type === 'NUMBER' && tk.value === '3.14'))
    throw new Error('Missing numeric token');
});

test('Lexer handles HEX (&HFF)', () => {
  const l = new Lexer('x = &HFF');
  const t = l.tokenize();
  if (!t.some((tk) => tk.type === 'NUMBER' && tk.value === '255'))
    throw new Error('HEX conversion failed');
});

test('Lexer strips comments', () => {
  const l = new Lexer("' comment\nPRINT 1");
  const t = l.tokenize();
  const hasComment = t.some((tk) => tk.value && tk.value.includes('comment'));
  if (hasComment) throw new Error('Comment was not stripped');
});

test('Lexer handles line tracking', () => {
  const l = new Lexer('PRINT 1\nPRINT 2');
  const t = l.tokenize();
  const line2Token = t.find((tk) => tk.line === 2 && tk.type === 'KEYWORD');
  if (!line2Token) throw new Error('Line tracking broken');
});

// ─── Phase 1.3: Cache (TieredCache + FNV-1a) ────────────────────────────────
console.log('\n📦 Phase 1.3: Cache (TieredCache + FNV-1a) Tests');
const {
  CompilationCache,
  TieredCache,
  fnv1a,
} = require('../src/compiler/cache');

test('FNV-1a deterministic', () => {
  if (fnv1a('test') !== fnv1a('test')) throw new Error('Non-deterministic');
});

test('FNV-1a differentiates inputs', () => {
  if (fnv1a('abc') === fnv1a('def'))
    throw new Error('Hash collision on simple strings');
});

test('TieredCache L1 stores and retrieves', () => {
  const c = new TieredCache(5);
  c.set('k', 'v');
  if (c.get('k') !== 'v') throw new Error('L1 retrieval failed');
});

test('TieredCache returns null for missing', () => {
  const c = new TieredCache(5);
  if (c.get('missing') !== null) throw new Error('Should return null for miss');
});

test('TieredCache L2 promotion on L2 hit', () => {
  const c = new TieredCache(10);
  // Fill L1 past capacity (10 slots)
  for (let i = 0; i < 12; i++) c.set(`k${i}`, `v${i}`);
  // k0 should have been evicted from L1 but still in L2
  const val = c.get('k0');
  if (val === null) throw new Error('L2 miss: key should survive in L2');
});

test('CompilationCache getCode/setCode round-trip', () => {
  const cc = new CompilationCache({ maxSize: 10 });
  cc.setCode('SRC', 'web', 'JS_CODE', []);
  const res = cc.getCode('SRC', 'web');
  if (!res || res.code !== 'JS_CODE')
    throw new Error('Code cache round-trip failed');
});

test('CompilationCache respects enabled=false', () => {
  const cc = new CompilationCache({ enabled: false });
  cc.setCode('SRC', 'web', 'JS', []);
  if (cc.getCode('SRC', 'web') !== null)
    throw new Error('Should return null when disabled');
});

// ─── Phase 1.4: Extension host helper utilities ────────────────────────────
console.log('\n📦 Phase 1.4: Extension Host Helper Tests');
const {
  splitCommandLineArgs,
  buildWebviewCsp,
  MAX_WEBVIEW_CODE_SIZE,
  validateWebviewCodePayload,
  resolvePkgTarget,
  parseQb64CompilerOutput,
} = require('../src/extension/processUtils');

test('splitCommandLineArgs preserves quoted compiler arguments', () => {
  const args = splitCommandLineArgs(
    '--define "NAME=QBasic Nexus" --lib "C:\\Program Files\\QB64\\lib"',
  );

  const expected = JSON.stringify([
    '--define',
    'NAME=QBasic Nexus',
    '--lib',
    'C:\\Program Files\\QB64\\lib',
  ]);
  const actual = JSON.stringify(args);
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
});

test('splitCommandLineArgs keeps escaped quotes inside quoted values', () => {
  const args = splitCommandLineArgs('--msg "He said \\"hi\\""');
  const expected = JSON.stringify(['--msg', 'He said "hi"']);
  const actual = JSON.stringify(args);
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
});

test('buildWebviewCsp hardens script-src without unsafe-inline', () => {
  const csp = buildWebviewCsp('vscode-webview-resource:');
  if (!csp.includes("script-src vscode-webview-resource: 'unsafe-eval'")) {
    throw new Error(`Unexpected script-src: ${csp}`);
  }
  if (/script-src[^;]*'unsafe-inline'/.test(csp)) {
    throw new Error(`script-src should not include unsafe-inline: ${csp}`);
  }
});

test('validateWebviewCodePayload rejects oversized programs', () => {
  const error = validateWebviewCodePayload('X'.repeat(MAX_WEBVIEW_CODE_SIZE + 1));
  if (!error || !error.includes('too large')) {
    throw new Error(`Expected oversize validation error, got: ${error}`);
  }
});

test('validateWebviewCodePayload accepts normal generated code', () => {
  const error = validateWebviewCodePayload('console.log("ok");');
  if (error !== null) {
    throw new Error(`Expected payload to be accepted, got: ${error}`);
  }
});

test('resolvePkgTarget supports arm64 packaging targets', () => {
  const cases = [
    ['win32', 'arm64', 'node18-win-arm64'],
    ['darwin', 'arm64', 'node18-macos-arm64'],
    ['linux', 'arm64', 'node18-linux-arm64'],
  ];

  for (const [platform, arch, expected] of cases) {
    const actual = resolvePkgTarget(platform, arch);
    if (actual !== expected) {
      throw new Error(
        `Expected ${platform}/${arch} -> ${expected}, got ${actual}`,
      );
    }
  }
});

test('parseQb64CompilerOutput preserves warning severity', () => {
  const diagnostics = parseQb64CompilerOutput(
    [
      'demo.bas:7: warning: implicit variable declaration',
      'demo.bas:8: error: syntax error',
      'other.bas:9: warning: ignored',
    ].join('\n'),
    'demo.bas',
  );

  const expected = JSON.stringify([
    {
      line: 6,
      severity: 'warning',
      message: 'implicit variable declaration',
    },
    {
      line: 7,
      severity: 'error',
      message: 'syntax error',
    },
  ]);
  const actual = JSON.stringify(diagnostics);
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
});

// ─── Phase 2: Transpiler pipeline ────────────────────────────────────────────
console.log('\n📦 Phase 2: Transpiler Pipeline Tests');
const InternalTranspiler = require('../src/compiler/transpiler');
const { makeIdentifierRegex } = require('../src/providers/patterns');
const lessons = require('../src/tutorials/data');

test('Transpile PRINT "Hello"', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT "Hello"', 'node');
  if (!code || code.length === 0) throw new Error('Empty output');
});

test('Transpile FOR loop', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('FOR i = 1 TO 3\nNEXT i', 'node');
  if (!code.includes('for')) throw new Error('No for loop in output');
});

test('Node target output stays parseable after transpile', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT "Hello"', 'node');
  new Function(code);
});

test('FILES statement uses dedicated list helper instead of file-handle map', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('FILES', 'web');

  if (!code.includes('async function _listFiles(spec)')) {
    throw new Error('Missing generated _listFiles helper');
  }

  if (!code.includes('await _listFiles("")')) {
    throw new Error('FILES should call _listFiles helper');
  }

  if (code.includes('await _files(')) {
    throw new Error('FILES should not call the file-handle map');
  }
});

test('Lint returns array', () => {
  const t = new InternalTranspiler();
  const errors = t.lint('PRINT "OK"');
  if (!Array.isArray(errors)) throw new Error('Lint did not return array');
});

test('Identifier regex matches QBasic suffix variables', () => {
  const pattern = makeIdentifierRegex('player$', 'gi');
  const matches = [];

  for (const line of ['PRINT player$', 'player$ = "ok"']) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      matches.push(match[0]);
    }
  }

  if (matches.length !== 2) {
    throw new Error(`Expected 2 matches, got ${matches.length}`);
  }

  pattern.lastIndex = 0;
  if (pattern.test('player$Extra = 1')) {
    throw new Error('Identifier regex should not match partial identifiers');
  }
});

test('Tutorial catalog includes expanded lesson coverage', () => {
  if (lessons.length < 120) {
    throw new Error(`Expected at least 120 lessons, got ${lessons.length}`);
  }
});

test('Tutorial lesson ids stay unique', () => {
  const ids = lessons.map((lesson) => lesson.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new Error('Tutorial lesson ids must be unique');
  }
});

test('Tutorial catalog keeps representative grammar coverage', () => {
  const requiredIds = [
    '19.1-let',
    '20.3-def-fn',
    '21.2-redim-preserve',
    '22.3-seek-loc',
    '23.4-view',
    '24.7-shell',
    '25.6-on-error',
    '26.4-call',
    '26.6-on-gosub',
    '27.4-line-input',
    '27.7-open-binary',
    '28.3-eqv-imp',
    '28.6-date-time-timer',
  ];
  const ids = new Set(lessons.map((lesson) => lesson.id));

  for (const id of requiredIds) {
    if (!ids.has(id)) {
      throw new Error(`Missing representative tutorial lesson: ${id}`);
    }
  }
});

test('Tutorial templates lint without parser errors', () => {
  for (const lesson of lessons) {
    const t = new InternalTranspiler();
    const errors = t.lint(lesson.template);
    if (errors.length > 0) {
      throw new Error(
        `Lesson ${lesson.id} has parser errors: ${JSON.stringify(errors)}`,
      );
    }
  }
});

// ─── Phase 1.2: Compiler wrapper ─────────────────────────────────────────────
console.log('\n📦 Phase 1.2: Compiler Wrapper Tests');
const { Compiler } = require('../src/compiler/compiler');

test('Compiler compiles successfully', () => {
  const c = new Compiler({ target: 'web', cache: true });
  const r = c.compile('PRINT "test"');
  if (!r.isSuccess()) throw new Error('Compilation failed');
});

test('Compiler cache hit on second call', () => {
  const c = new Compiler({ target: 'web', cache: true });
  c.compile('PRINT "cached"');
  const r2 = c.compile('PRINT "cached"');
  if (!r2.getMetadata().cached) throw new Error('Second call should be cached');
});

test('Compiler tracks stats', () => {
  const c = new Compiler({ target: 'web', cache: true });
  c.compile('PRINT "a"');
  c.compile('PRINT "a"');
  const stats = c.getStats();
  if (stats.compilations !== 2)
    throw new Error(`Expected 2 compilations, got ${stats.compilations}`);
  if (stats.cacheHits !== 1)
    throw new Error(`Expected 1 cache hit, got ${stats.cacheHits}`);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
if (failed === 0) {
  console.log('🎉 All tests PASSED! System is stable and ready.');
} else {
  console.log('⚠️  Some tests failed. Review above.');
  process.exit(1);
}
