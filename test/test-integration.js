'use strict';
/**
 * Final integration test - all Phase 1-3 components
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

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

// ─── Phase 2: Transpiler pipeline ────────────────────────────────────────────
console.log('\n📦 Phase 2: Transpiler Pipeline Tests');
const InternalTranspiler = require('../src/compiler/transpiler');
const { makeIdentifierRegex } = require('../src/providers/patterns');

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

test('Lint returns array', () => {
  const t = new InternalTranspiler();
  const errors = t.lint('PRINT "OK"');
  if (!Array.isArray(errors)) throw new Error('Lint did not return array');
});

test('Transpile throws when parser reports syntax errors', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('FOR = 1 TO 10', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected variable after FOR')) {
      throw new Error(`Unexpected transpile error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Transpile should fail when syntax errors exist');
  }
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

test('Lint reports unresolved $INCLUDE directives with syntax diagnostics', () => {
  const t = new InternalTranspiler();
  const errors = t.lint('$INCLUDE: "missing.bi"', {
    sourcePath: path.join(os.tmpdir(), 'missing-main.bas'),
  });

  if (errors.length === 0) {
    throw new Error('Expected lint to report a missing include');
  }

  if (!String(errors[0].message).includes('Could not resolve $INCLUDE')) {
    throw new Error(`Unexpected include error: ${errors[0].message}`);
  }

  if (errors[0].severity !== 'error') {
    throw new Error(`Expected error severity, got ${errors[0].severity}`);
  }
});

test('Web transpile binds CRT graphics helpers used by the AST-first compiler path', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    [
      'SCREEN 13',
      'PSET (10, 10), 4',
      'PAINT (10, 10), 4, 1',
      'DRAW "R10"',
      'VIEW (1, 1)-(10, 10), 2, 3',
      'WINDOW (0, 0)-(100, 100)',
      'PALETTE 1, 10',
      'PCOPY 0, 1',
    ].join('\n'),
    'web',
  );

  const expectedBindings = [
    'const _paint = _runtime.paint || (() => {});',
    'const _draw = _runtime.draw || (() => {});',
    'const _view = _runtime.view || (() => {});',
    'const _viewPrint = _runtime.viewPrint || (() => {});',
    'const _window = _runtime.window || (() => {});',
    'const _palette = _runtime.palette || (() => {});',
    'const _paletteUsing = _runtime.paletteUsing || (() => {});',
    'const _pcopy = _runtime.pcopy || (() => {});',
  ];

  for (const binding of expectedBindings) {
    if (!code.includes(binding)) {
      throw new Error(`Missing web runtime binding: ${binding}`);
    }
  }

  const expectedCalls = [
    '_paint(10, 10, 4, 1);',
    'await _draw("R10");',
    '_view(1, 1, 10, 10, 2, 3);',
    '_window(0, 0, 100, 100, false);',
    '_palette(1, 10);',
    '_pcopy(0, 1);',
  ];

  for (const call of expectedCalls) {
    if (!code.includes(call)) {
      throw new Error(`Missing generated graphics call: ${call}`);
    }
  }
});

test('Web transpile binds advanced CRT screen helpers emitted by QB64 graphics statements', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    [
      '_FULLSCREEN',
      '_DEST 1',
      '_SOURCE 2',
      '_FONT 3',
      '_SETALPHA 128, 1',
      '_CLEARCOLOR 4',
    ].join('\n'),
    'web',
  );

  const expectedBindings = [
    'const _fullscreen = _runtime.fullscreen || (() => {});',
    'const _dest = _runtime.dest || (() => {});',
    'const _source = _runtime.source || (() => {});',
    'const _font = _runtime.font || (() => {});',
    'const _setAlpha = _runtime.setAlpha || (() => {});',
    'const _clearColor = _runtime.clearColor || (() => {});',
  ];

  for (const binding of expectedBindings) {
    if (!code.includes(binding)) {
      throw new Error(`Missing advanced web binding: ${binding}`);
    }
  }

  const expectedCalls = [
    '_fullscreen(0);',
    '_dest(1);',
    '_source(2);',
    '_font(3, undefined);',
    '_setAlpha(128, 1, undefined, undefined, undefined);',
    '_clearColor(4, undefined);',
  ];

  for (const call of expectedCalls) {
    if (!code.includes(call)) {
      throw new Error(`Missing generated advanced graphics call: ${call}`);
    }
  }
});

test('Node transpile guards browser-only title updates', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('_TITLE "Hello"', 'node');

  if (!code.includes('if (typeof document !== "undefined") document.title = "Hello";')) {
    throw new Error('Expected _TITLE to be guarded for non-browser runtimes');
  }
});

test('Web transpile keeps clipboard-write syntax on the runtime path', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('_CLIPBOARD = "hi"', 'web');

  if (!code.includes('await _runtime.clipboard?.("hi");')) {
    throw new Error('Expected _CLIPBOARD assignment to target the runtime clipboard hook');
  }
});

test('Web transpile injects source-line tracking for CRT runtime errors', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT "Ready"\nERROR 5', 'web');

  if (!code.includes('_qbTrackSourceLine(0);')) {
    throw new Error('Expected generated code to track the first source line');
  }

  if (!code.includes('_qbTrackSourceLine(1);')) {
    throw new Error('Expected generated code to track later source lines');
  }

  if (!code.includes('const _runtimeError = _qbNormalizeRuntimeError(e, _currentSourceLine);')) {
    throw new Error('Expected CRT runtime errors to normalize QB metadata before reporting');
  }

  if (!code.includes('line: _runtimeLine')) {
    throw new Error('Expected CRT runtime errors to report the normalized source line');
  }

  if (!code.includes('throw _qbMakeRuntimeError(5, undefined, _currentSourceLine);')) {
    throw new Error('Expected ERROR n statements to emit QB-aware runtime errors');
  }
});

test('Builtin numeric conversions route through QB-aware runtime helpers', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT CINT(2.5)\nPRINT VAL("&HFF")', 'web');

  if (!code.includes('(_cint)(2.5)')) {
    throw new Error('Expected CINT to route through the runtime conversion helper');
  }

  if (!code.includes('(_val)("&HFF")')) {
    throw new Error('Expected VAL to route through the runtime parser helper');
  }
});

test('Typed assignments route through runtime coercion helpers', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DIM total AS INTEGER\ntotal = 3.5', 'web');

  if (!code.includes('_coerceTypedValue({ kind: "scalar", typeName: "INTEGER" }, 3.5)')) {
    throw new Error('Expected typed assignments to emit the shared coercion helper');
  }
});

test('DEFINT default types flow into implicit assignment coercion', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DEFINT A-Z\nanswer = 2.5', 'web');

  if (!code.includes('_coerceTypedValue({ kind: "scalar", typeName: "INTEGER" }, 2.5)')) {
    throw new Error('Expected DEFINT implicit variables to reuse integer assignment coercion');
  }
});

test('Suffix identifiers use safe storage names in generated code', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('a% = 2.5\nFUNCTION Add%(x)\nAdd% = x\nEND FUNCTION\nPRINT Add%(a%)', 'web');

  if (!code.includes('var __qb_a_pct = 0;')) {
    throw new Error('Expected suffix variables to compile through encoded JS storage names');
  }

  if (!code.includes('async function __qb_Add_pct(')) {
    throw new Error('Expected suffix function names to compile through encoded JS storage names');
  }
});

test('OPTION BASE and explicit bounds emit descriptor-aware array helpers', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    'OPTION BASE 1\nDIM values(3)\nDIM offsets(-2 TO 1)\nPRINT LBOUND(values)\nPRINT UBOUND(offsets)',
    'web',
  );

  if (!code.includes('_makeArray(0, { lower: 1, upper: 3 })')) {
    throw new Error('Expected OPTION BASE arrays to emit lower and upper bound descriptors');
  }

  if (!code.includes('_makeArray(0, { lower: (-2), upper: 1 })')) {
    throw new Error('Expected explicit array bounds to preserve custom lower indexes');
  }

  if (!code.includes('(_lbound)(values)') || !code.includes('(_ubound)(offsets)')) {
    throw new Error('Expected LBOUND and UBOUND to route through runtime bound helpers');
  }
});

test('REDIM PRESERVE emits the shared array-preserve runtime helper', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('OPTION BASE 1\nDIM items(3)\nREDIM PRESERVE items(5)', 'web');

  if (!code.includes('_redimArrayPreserve(items, 0, { lower: 1, upper: 5 })')) {
    throw new Error('Expected REDIM PRESERVE to route through the runtime preserve helper');
  }
});

test('Auto-declared arrays route through dynamic bound helpers and ERASE reset helper', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('OPTION BASE 1\nscores(3) = 9\nERASE scores\nscores(4) = 11', 'web');

  if (!code.includes('_autodimArray(0, 1, 3)')) {
    throw new Error('Expected undeclared array assignments to auto-dimension with the active OPTION BASE');
  }

  if (!code.includes('scores = _eraseArray(scores);')) {
    throw new Error('Expected ERASE to route through the shared array reset helper');
  }

  if (!code.includes('_ensureAutoArrayBounds(scores, 0, 1, 4)')) {
    throw new Error('Expected rebuilt auto-arrays to reuse the shared bound-expansion helper');
  }
});

test('Arithmetic operators route through QB-aware runtime helpers', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    'a = 1\nb = 2\nPRINT a + b\nPRINT a - b\nPRINT a * b\nPRINT a ^ b\nPRINT a AND b\nPRINT a XOR b\nPRINT NOT a\nPRINT a = b',
    'web',
  );

  if (!code.includes('_qbAdd(')) {
    throw new Error('Expected addition to route through the QB-aware addition helper');
  }

  if (!code.includes('_qbSub(')) {
    throw new Error('Expected subtraction to route through the QB-aware subtraction helper');
  }

  if (!code.includes('_qbMul(')) {
    throw new Error('Expected multiplication to route through the QB-aware multiplication helper');
  }

  if (!code.includes('_qbPow(')) {
    throw new Error('Expected exponentiation to route through the QB-aware power helper');
  }

  if (!code.includes('_qbAnd(') || !code.includes('_qbXor(') || !code.includes('_qbNot(')) {
    throw new Error('Expected logical operators to route through QB-aware bitwise helpers');
  }

  if (!code.includes('_qbEq(')) {
    throw new Error('Expected relational operators to route through QB-aware comparison helpers');
  }
});

test('SELECT CASE routes comparisons through QB-aware helper expressions', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    'SELECT CASE score\nCASE 1 TO 5\nPRINT "range"\nCASE IS >= 10\nPRINT "high"\nCASE 7\nPRINT "exact"\nEND SELECT',
    'web',
  );

  if (!code.includes('_qbAnd(_qbGe(_select_')) {
    throw new Error('Expected SELECT CASE ranges to use the shared QB comparison helpers');
  }

  if (!code.includes('_qbGe(_select_')) {
    throw new Error('Expected CASE IS comparisons to use the shared QB comparison helpers');
  }

  if (!code.includes('_qbEq(_select_')) {
    throw new Error('Expected exact CASE matches to use the shared QB comparison helpers');
  }
});

test('Control-flow conditions route through QB-aware condition checks', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    'IF flag THEN PRINT 1\nWHILE flag\nWEND\nDO UNTIL flag\nLOOP',
    'web',
  );

  if (!code.includes('_qbCond(flag)')) {
    throw new Error('Expected IF and WHILE conditions to route through QB-aware condition checks');
  }

  if (!code.includes('!(_qbCond(flag))')) {
    throw new Error('Expected UNTIL conditions to negate the shared QB-aware condition check');
  }
});

test('Invalid literal array bounds are rejected during transpilation', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('DIM bad(3 TO 1)', 'web');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('lower bound cannot exceed upper bound')) {
      throw new Error(`Unexpected invalid-bound error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected invalid literal array bounds to fail transpilation');
  }
});

test('Transpile expands $INCLUDE relative to sourcePath', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-preprocess-'));

  try {
    fs.writeFileSync(path.join(dir, 'shared.bi'), 'PRINT "From include"', 'utf8');

    const t = new InternalTranspiler();
    const code = t.transpile('$INCLUDE: "shared.bi"', 'node', {
      sourcePath: path.join(dir, 'main.bas'),
    });

    if (!code.includes('From include')) {
      throw new Error('Included source was not expanded into output');
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('AST semantic analysis rejects undefined GOTO labels', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('GOTO MissingLabel', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Label not defined')) {
      throw new Error(`Unexpected missing-label error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on undefined GOTO label');
  }
});

test('AST semantic analysis rejects undefined ON GOTO labels', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('x = 1\nON x GOTO MissingLabel', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Label not defined')) {
      throw new Error(`Unexpected missing-label error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on undefined ON GOTO label');
  }
});

test('AST semantic analysis rejects undefined nested GOTO labels', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('IF 1 THEN\n  GOTO MissingLabel\nEND IF', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Label not defined')) {
      throw new Error(`Unexpected nested missing-label error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on undefined nested GOTO label');
  }
});

test('AST semantic analysis rejects EXIT FOR outside loops', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('EXIT FOR', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('EXIT FOR used outside a FOR loop')) {
      throw new Error(`Unexpected EXIT FOR error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on EXIT FOR outside a loop');
  }
});

test('AST semantic analysis rejects CONTINUE outside loops', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('CONTINUE', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('CONTINUE used outside any active loop')) {
      throw new Error(`Unexpected CONTINUE error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on CONTINUE outside a loop');
  }
});

test('AST semantic analysis rejects mismatched NEXT variables', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('FOR i = 1 TO 2\nNEXT j', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('NEXT j does not match FOR i')) {
      throw new Error(`Unexpected NEXT mismatch error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on mismatched NEXT variable');
  }
});

test('AST semantic analysis rejects stray NEXT terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('NEXT i', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Unexpected NEXT without a matching FOR block')) {
      throw new Error(`Unexpected stray NEXT error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on stray NEXT');
  }
});

test('AST path keeps ON ERROR and RESUME as non-blocking compatibility nodes', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(
    'ON ERROR RESUME NEXT\nPRINT "ok"\nRESUME NEXT',
    'node',
  );

  if (!code.includes('ON ERROR RESUME NEXT') || !code.includes('RESUME NEXT')) {
    throw new Error('Expected compatibility comments for ON ERROR/RESUME');
  }
});

test('AST semantic analysis rejects undefined ON ERROR GOTO labels', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('ON ERROR GOTO MissingHandler', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('ON ERROR GOTO MissingHandler: Label not defined')) {
      throw new Error(`Unexpected ON ERROR label error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on undefined ON ERROR GOTO label');
  }
});

test('AST semantic analysis rejects undefined RESUME labels', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('RESUME MissingHandler', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('RESUME MissingHandler: Label not defined')) {
      throw new Error(`Unexpected RESUME label error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on undefined RESUME label');
  }
});

test('AST semantic analysis rejects RESUME without ON ERROR in the same body', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('RESUME NEXT', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('RESUME used without a corresponding ON ERROR')) {
      throw new Error(`Unexpected RESUME-without-ON-ERROR error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on RESUME without ON ERROR');
  }
});

test('AST semantic analysis rejects missing END IF terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('IF 1 THEN\n  PRINT "x"', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected END IF to close IF block')) {
      throw new Error(`Unexpected missing END IF error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing END IF');
  }
});

test('AST semantic analysis rejects missing END SELECT terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('SELECT CASE 1\nCASE 1\n  PRINT "x"', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected END SELECT to close SELECT CASE block')) {
      throw new Error(`Unexpected missing END SELECT error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing END SELECT');
  }
});

test('AST semantic analysis rejects missing WEND terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('WHILE 1\n  PRINT "x"', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected WEND to close WHILE block')) {
      throw new Error(`Unexpected missing WEND error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing WEND');
  }
});

test('AST semantic analysis rejects missing LOOP terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('DO\n  PRINT "x"', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected LOOP to close DO block')) {
      throw new Error(`Unexpected missing LOOP error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing LOOP');
  }
});

test('AST semantic analysis rejects missing NEXT terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('FOR i = 1 TO 2\n  PRINT i', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected NEXT to close FOR i')) {
      throw new Error(`Unexpected missing NEXT error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing NEXT');
  }
});

test('AST semantic analysis rejects missing END SUB terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('SUB Demo\n  PRINT "x"', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected END SUB to close SUB Demo')) {
      throw new Error(`Unexpected missing END SUB error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing END SUB');
  }
});

test('AST semantic analysis rejects missing END FUNCTION terminators', () => {
  const t = new InternalTranspiler();
  let threw = false;

  try {
    t.transpile('FUNCTION Demo\n  Demo = 1', 'node');
  } catch (error) {
    threw = true;
    if (!String(error.message).includes('Expected END FUNCTION to close FUNCTION Demo')) {
      throw new Error(`Unexpected missing END FUNCTION error: ${error.message}`, {
        cause: error,
      });
    }
  }

  if (!threw) {
    throw new Error('Expected transpile to fail on missing END FUNCTION');
  }
});

test('Lint reports unreachable code as a warning without blocking transpile', () => {
  const t = new InternalTranspiler();
  const source = 'GOTO Done\nPRINT "dead"\nDone:\nPRINT "live"';
  const diagnostics = t.lint(source);
  const warning = diagnostics.find((diag) =>
    String(diag.message).includes('Statement is unreachable'),
  );

  if (!warning) {
    throw new Error('Expected lint to report unreachable code');
  }

  if (warning.severity !== 'warning') {
    throw new Error(`Expected warning severity, got ${warning.severity}`);
  }

  const code = t.transpile(source, 'node');
  if (!code.includes('live')) {
    throw new Error('Transpile should still succeed when only warnings exist');
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

test('Compiler surfaces warnings without failing compilation', () => {
  const c = new Compiler({ target: 'web', cache: false });
  const result = c.compile('GOTO Done\nPRINT "dead"\nDone:\nPRINT "live"');

  if (!result.isSuccess()) {
    throw new Error('Warnings should not make compilation fail');
  }

  if (result.getWarnings().length === 0) {
    throw new Error('Expected compilation result to include warnings');
  }
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
