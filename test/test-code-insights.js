'use strict';

/**
 * Tests for the lightweight algorithms: edit-distance typo detection, unused
 * procedures, cyclomatic complexity, duplicate code, GOTO loop rewriting and
 * the on-device n-gram completion model.
 */

const assert = require('node:assert/strict');

const { editDistance, maxTypoDistance, suggestName } = require('../src/shared/fuzzyNames');
const {
  findTypos,
  findUnusedProcedures,
  cyclomaticComplexity,
  findDuplicateBlocks,
} = require('../src/shared/codeInsights');
const { findGotoLoops } = require('../src/shared/gotoLoops');
const { countLines, contextAt, predict } = require('../src/shared/ngramModel');

console.log('\n🧠 Code Insight Tests (typos, unused, complexity, clones, GOTO, n-gram)\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

// ── Edit distance ───────────────────────────────────────────────────────────

test('edit distance counts adjacent swaps as one edit', () => {
  assert.equal(editDistance('PIRNT', 'PRINT'), 1);
  assert.equal(editDistance('print', 'PRINT'), 0);
  assert.equal(editDistance('LOCATE', 'LOCAT'), 1);
  assert.equal(editDistance('abc', 'xyz'), 3);
  assert.equal(editDistance('abcdef', 'uvwxyz', 2), 3, 'stops early above max');
});

test('typo threshold grows with word length', () => {
  assert.equal(maxTypoDistance('X1'), 0);
  assert.equal(maxTypoDistance('PRNT'), 1);
  assert.equal(maxTypoDistance('DrawPlayer'), 2);
});

test('suggestName returns the closest candidate or nothing', () => {
  assert.equal(suggestName('PIRNT', ['PRINT', 'POINT', 'PAINT']), 'PRINT');
  assert.equal(suggestName('PRINT', ['PRINT']), null, 'exact match is not a typo');
  assert.equal(suggestName('Zebra', ['PRINT', 'LOCATE']), null);
});

// ── Typos ───────────────────────────────────────────────────────────────────

test('misspelled statements, functions and SUB calls are reported', () => {
  const typos = findTypos(
    [
      'PIRNT 1',
      'x = Lenn(a$)',
      'DrawPlyer 1',
      'CALL DrawPlyr(2)',
      'start: PRNIT "x"',
      '10 PIRNT 5',
    ],
    { procedures: ['DrawPlayer'] },
  );
  assert.deepEqual(
    typos.map((t) => `${t.line}:${t.word}->${t.suggestion}`),
    [
      '0:PIRNT->PRINT',
      '1:Lenn->LEN',
      '2:DrawPlyer->DrawPlayer',
      '3:DrawPlyr->DrawPlayer',
      '4:PRNIT->PRINT',
      '5:PIRNT->PRINT',
    ],
  );
  assert.equal(typos[0].start, 0);
  assert.equal(typos[0].end, 5);
});

test('valid code produces no typo warnings', () => {
  const typos = findTypos(
    [
      'SCREEN 12: CLS',
      'arr(1) = 2',
      'player.x = 5',
      'total = total + LEN(name$)',
      'PRINT "PIRNT is fine inside a string" \' PIRNT in a comment',
      'Lable:',
      'GOTO Lable',
      '_LIMIT 60',
      'Foo2 3',
    ],
    { procedures: ['Foo2'] },
  );
  assert.deepEqual(typos, []);
});

test('$NOPREFIX accepts keywords without the leading underscore', () => {
  assert.deepEqual(findTypos(['$NOPREFIX', 'LIMIT 60', 'DISPLAY']), []);
  assert.equal(findTypos(['_LIMT 60'])[0].suggestion, '_LIMIT');
});

// ── Unused procedures ───────────────────────────────────────────────────────

test('procedures nobody calls are reported, called ones are not', () => {
  const files = [
    { file: 'main.bas', analysis: { lines: ['Used 1', 'SUB Used (a)', 'END SUB', 'SUB Unused', 'END SUB'] } },
    { file: 'lib.bas', analysis: { lines: ['SUB Helper', 'END SUB'] } },
    { file: 'other.bas', analysis: { lines: ['Helper'] } },
  ];
  assert.deepEqual(findUnusedProcedures(files, 'main.bas').map((p) => p.name), ['Unused']);
  assert.deepEqual(findUnusedProcedures(files, 'lib.bas'), []);
});

// ── Complexity ──────────────────────────────────────────────────────────────

test('cyclomatic complexity counts decisions, not block ends', () => {
  const lines = [
    'SUB A',
    'IF x > 0 AND y > 0 THEN',
    '  FOR i = 1 TO 3',
    '    SELECT CASE i',
    '      CASE 1',
    '      CASE 2',
    '      CASE ELSE',
    '    END SELECT',
    '  NEXT',
    'END IF',
    'DO WHILE z',
    'LOOP',
    'END SUB',
  ];
  // 1 + IF + AND + FOR + CASE 1 + CASE 2 + WHILE
  assert.equal(cyclomaticComplexity(lines, { line: 0, endLine: 12 }), 7);
  assert.equal(cyclomaticComplexity(['SUB B', 'PRINT 1', 'END SUB'], { line: 0, endLine: 2 }), 1);
});

// ── Duplicate code ──────────────────────────────────────────────────────────

test('duplicated blocks are found within and across files', () => {
  const block = ['LOCATE 1, 1', 'PRINT score', 'x = x + dx', 'y = y + dy', 'PSET (x, y), 15', 'SOUND 440, 1'];
  const files = [
    { file: 'a.bas', analysis: { lines: [...block, 'z = 1', ...block] } },
    { file: 'b.bas', analysis: { lines: ['q = 1', "' copied", ...block] } },
  ];
  assert.deepEqual(
    findDuplicateBlocks(files, 'a.bas', 6).map((b) => [b.startLine, b.endLine, b.other.file, b.other.startLine]),
    [
      [0, 5, 'a.bas', 7],
      [7, 12, 'a.bas', 0],
    ],
  );
  assert.deepEqual(
    findDuplicateBlocks(files, 'b.bas', 6).map((b) => [b.startLine, b.endLine, b.other.file]),
    [[2, 7, 'a.bas']],
  );
  assert.deepEqual(findDuplicateBlocks(files, 'b.bas', 7), []);
});

test('comments, blank lines and spacing do not hide a clone', () => {
  const a = ['x = 1', 'y = 2', 'z = 3', 'PRINT x', 'PRINT y', 'PRINT z'];
  const b = ['x  =  1', '', "' note", 'y = 2', 'z = 3', 'print x', 'PRINT y', 'PRINT z'];
  const result = findDuplicateBlocks(
    [
      { file: 'a', analysis: { lines: a } },
      { file: 'b', analysis: { lines: b } },
    ],
    'b',
    6,
  );
  assert.deepEqual(result.map((r) => [r.startLine, r.endLine]), [[0, 7]]);
});

// ── GOTO loops ──────────────────────────────────────────────────────────────

test('backward GOTO loops become DO...LOOP', () => {
  const [conditional] = findGotoLoops(['top:', '  PRINT i', '  i = i + 1', 'IF i < 5 THEN GOTO top']);
  assert.deepEqual(conditional.edits, [
    { line: 0, text: 'DO' },
    { line: 3, text: 'LOOP WHILE i < 5' },
  ]);

  const [inline] = findGotoLoops(['again: INPUT a$', 'IF a$ = "" THEN GOTO again']);
  assert.deepEqual(inline.edits.map((e) => e.text), ['DO\nINPUT a$', 'LOOP WHILE a$ = ""']);

  // `THEN 30` (no GOTO) jumps to a line number; the jump keeps its own number.
  const [numbered] = findGotoLoops(['20 I = 1', '30 PRINT I', '40 I = I + 1', '50 IF I <= 3 THEN 30']);
  assert.deepEqual(numbered.edits.map((e) => e.text), ['DO\nPRINT I', '50 LOOP WHILE I <= 3']);

  const [forever] = findGotoLoops(['    top:', '    PRINT 1', '    GOTO top']);
  assert.deepEqual(forever.edits.map((e) => e.text), ['    DO', '    LOOP']);
});

test('unsafe GOTO loops are left alone', () => {
  const cases = {
    'label used twice': ['top:', 'PRINT 1', 'GOTO top', 'GOSUB top'],
    'THEN label without GOTO calls a SUB, it does not jump': ['again:', 'PRINT 1', 'IF x THEN again'],
    'the jump line is itself a jump target': ['10 PRINT 1', '20 GOTO 10', 'GOSUB 20'],
    'jump crosses a block': ['top:', 'FOR i = 1 TO 3', 'GOTO top', 'NEXT'],
    'IF with ELSE': ['top:', 'IF x THEN GOTO top ELSE PRINT 2'],
    'forward jump': ['GOTO done', 'PRINT 1', 'done:'],
    'across a SUB boundary': ['top:', 'END SUB', 'SUB B', 'GOTO top'],
  };
  for (const [name, lines] of Object.entries(cases)) {
    assert.deepEqual(findGotoLoops(lines), [], name);
  }

  // `inner` is jumped to from outside the `top` loop, so `top` must not be
  // rewritten. The `inner` loop itself is a valid rewrite.
  const loops = findGotoLoops(['top:', 'PRINT 1', 'inner:', 'PRINT 2', 'GOTO top', 'GOTO inner']);
  assert.deepEqual(loops.map((loop) => loop.label), ['inner']);
});

test('GOTO inside strings and comments is ignored', () => {
  const loops = findGotoLoops(['top:', 'PRINT "GOTO top"', "x = 1 ' GOTO top", 'GOTO top']);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].jumpLine, 3);
});

// ── n-gram model ────────────────────────────────────────────────────────────

const CORPUS = [
  'SCREEN 12',
  'CLS',
  'OPEN f$ FOR INPUT AS #1',
  'OPEN g$ FOR INPUT AS #2',
  'OPEN h$ FOR OUTPUT AS #3',
  'SCREEN 13',
  'CLS: PRINT 1',
  'PRINT "OPEN x FOR BINARY"',
];

test('bigrams are counted per statement and across statements', () => {
  const counts = countLines(CORPUS);
  assert.equal(counts.get('T:FOR').get('INPUT'), 2);
  assert.equal(counts.get('T:FOR').get('OUTPUT'), 1);
  assert.equal(counts.get('S:SCREEN').get('CLS'), 2);
  assert.ok(!counts.get('T:FOR').has('BINARY'), 'string contents are not learned');
});

test('context is the previous word, or the previous statement head', () => {
  assert.equal(contextAt(CORPUS, 3, 'OPEN a$ FOR '), 'T:FOR');
  assert.equal(contextAt(['SCREEN 12', ''], 1, ''), 'S:SCREEN');
  assert.equal(contextAt(['x'], 0, 'CLS: '), 'S:CLS');
  assert.equal(contextAt([], 0, ''), 'S:<BOS>');
});

test('predictions need repeated evidence and rank by frequency', () => {
  const files = [{ analysis: { lines: CORPUS } }];
  assert.deepEqual(predict(files, 'T:FOR').map((p) => p.word), ['INPUT']);
  assert.deepEqual(predict(files, 'S:SCREEN').map((p) => p.word), ['CLS']);
  assert.deepEqual(predict(files, 'T:NOPE'), []);
  // Counts from several files add up.
  const twoFiles = [{ analysis: { lines: ['OPEN a FOR OUTPUT AS #1'] } }, ...files];
  assert.deepEqual(predict(twoFiles, 'T:FOR').map((p) => p.word), ['INPUT', 'OUTPUT']);
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
