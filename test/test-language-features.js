// @ts-nocheck -- tests mock vscode and poke at internals.
'use strict';

/**
 * Tests for the 2.0.0 editor features: $INCLUDE links, workspace symbol
 * search, QB64-PE-only warnings, range formatting, CodeLens / call hierarchy
 * call graph and inlay hints.
 */

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const { maskCode, normalizeName, splitArguments } = require('../src/shared/sourceText');
const {
  parseIncludeDirective,
  findIncludeDirectives,
  resolveIncludePath,
} = require('../src/shared/includeDirectives');
const { fuzzyMatch, searchSymbols } = require('../src/shared/symbolSearch');
const {
  findQB64PEOnlyUsages,
  isQB64PEIdentity,
} = require('../src/shared/qb64peCompat');
const {
  collectProcedures,
  findCallSites,
  indexProcedures,
  findIncomingCalls,
  findOutgoingCalls,
} = require('../src/shared/procedureIndex');
const { computeInlayHints, typeFromSuffix } = require('../src/shared/inlayHints');
const { analyzeQBasicText } = require('../src/shared/documentAnalysis');
const { FUNCTIONS } = require('../languageData');

console.log('\n🧭 Language Feature Tests (links, symbols, call graph, hints)\n');

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

const PROGRAM = [
  "'$INCLUDE: 'lib.bi'",
  'DECLARE SUB Greet (name$)',
  'x = Twice(5) : Greet "bob" \' Greet in a comment',
  'CALL Greet("amy")',
  'PRINT "Twice(1)", LEFT$("abc", 2)',
  'IF x > 1 THEN Greet n$ ELSE PRINT _IIF(x, 1, 2)',
  'SUB Greet (name$)',
  '  PRINT name$; Twice(2)',
  'END SUB',
  'FUNCTION Twice% (BYVAL n AS INTEGER)',
  '  Twice = n * 2',
  'END FUNCTION',
];
const files = [{ file: 'main.bas', analysis: { lines: PROGRAM } }];

// ── Source text helpers ─────────────────────────────────────────────────────

test('maskCode blanks strings and comments but keeps columns', () => {
  const line = 'PRINT "a:b" \' note';
  const masked = maskCode(line);
  assert.equal(masked.length, line.length);
  assert.equal(masked.trimEnd(), 'PRINT "   "');
  assert.equal(maskCode('x = 1: REM comment').trimEnd(), 'x = 1:');
  assert.equal(maskCode('REMARK = 1'), 'REMARK = 1');
});

test('normalizeName drops type suffixes', () => {
  assert.equal(normalizeName('Pad$'), 'PAD');
  assert.equal(normalizeName('count~&&'), 'COUNT');
  assert.equal(normalizeName('Total'), 'TOTAL');
});

test('splitArguments ignores commas inside parentheses', () => {
  const args = splitArguments(' a, f(b, c) , d', 10);
  assert.deepEqual(args.map((arg) => arg.text), ['a', 'f(b, c)', 'd']);
  assert.equal(args[0].start, 11);
});

// ── $INCLUDE links ──────────────────────────────────────────────────────────

test('$INCLUDE is found in comment, REM and bare forms', () => {
  assert.deepEqual(parseIncludeDirective("'$INCLUDE: 'lib.bi'"), {
    path: 'lib.bi',
    start: 12,
    end: 18,
  });
  assert.equal(parseIncludeDirective("REM $INCLUDE:'a/b.bm'").path, 'a/b.bm');
  assert.equal(parseIncludeDirective('$INCLUDE: "x.inc"').path, 'x.inc');
  assert.equal(parseIncludeDirective('PRINT "$INCLUDE: \'no.bi\'"'), null);
  assert.equal(findIncludeDirectives(PROGRAM).length, 1);
});

test('include paths resolve next to the file first, then the workspace', () => {
  const docDir = path.join('/proj', 'src');
  const wsDir = path.join('/proj');
  const existing = new Set([path.resolve(wsDir, 'shared.bi')]);
  const exists = (p) => existing.has(p);
  assert.equal(
    resolveIncludePath('shared.bi', { documentDir: docDir, workspaceDir: wsDir, exists }),
    path.resolve(wsDir, 'shared.bi'),
  );
  existing.add(path.resolve(docDir, 'shared.bi'));
  assert.equal(
    resolveIncludePath('shared.bi', { documentDir: docDir, workspaceDir: wsDir, exists }),
    path.resolve(docDir, 'shared.bi'),
  );
  assert.equal(
    resolveIncludePath('missing.bi', { documentDir: docDir, workspaceDir: wsDir, exists }),
    null,
  );
});

// ── Workspace symbols ───────────────────────────────────────────────────────

test('fuzzyMatch matches characters in order, ignoring case', () => {
  assert.ok(fuzzyMatch('DrawPlayer', 'drpl'));
  assert.ok(fuzzyMatch('DrawPlayer', ''));
  assert.ok(!fuzzyMatch('DrawPlayer', 'pd'));
});

test('searchSymbols returns definitions from every file with name ranges', () => {
  const a = analyzeQBasicText('SUB DrawPlayer\nEND SUB\nCONST MAX_HP = 10');
  const b = analyzeQBasicText('FUNCTION Damage (x)\nEND FUNCTION');
  const results = searchSymbols(
    [
      { file: 'a.bas', analysis: a },
      { file: 'b.bas', analysis: b },
    ],
    'd',
  );
  assert.deepEqual(
    results.map((r) => `${r.file}:${r.name}`).sort(),
    ['a.bas:DrawPlayer', 'b.bas:Damage'],
  );
  const damage = results.find((r) => r.name === 'Damage');
  assert.equal(b.lines[damage.line].slice(damage.start, damage.end), 'Damage');
});

// ── QB64-PE-only warnings ───────────────────────────────────────────────────

test('compiler banners are classified as QB64-PE or not', () => {
  assert.ok(isQB64PEIdentity('QB64-PE Compiler V3.14.1'));
  assert.ok(isQB64PEIdentity('QB64 Phoenix Edition Compiler v4.0'));
  assert.ok(!isQB64PEIdentity('QB64 Compiler V2.1'));
  assert.ok(!isQB64PEIdentity(null));
});

test('QB64-PE-only keywords are found outside strings and comments', () => {
  const usages = findQB64PEOnlyUsages([
    '$EMBED:\'a.txt\',\'h\'',
    'PRINT _IIF(a, 1, 2), "_IIF in text" \' _MIN in comment',
    'x = _MAX(a, b): _RESIZE ON: $RESIZE:ON',
    'myvar_IIF = 1',
  ]);
  assert.deepEqual(
    usages.map((u) => `${u.line}:${u.keyword}`),
    ['0:$EMBED', '1:_IIF', '2:_MAX'],
  );
});

// ── Range formatting ────────────────────────────────────────────────────────

test('range formatting only edits lines inside the range, indented by context', () => {
  const vscodeMock = {
    Range: class {
      constructor(sl, sc, el, ec) {
        this.start = { line: sl, character: sc };
        this.end = { line: el, character: ec };
      }
    },
    TextEdit: { replace: (range, text) => ({ range, text }) },
  };
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const { QBasicDocumentFormattingEditProvider } = require('../src/providers/formattingProvider');
    const text = ['for i = 1 to 3', 'print i', 'if i then', 'print 2', 'end if', 'next'].join('\n');
    const document = { getText: () => text };
    const provider = new QBasicDocumentFormattingEditProvider();
    const edits = provider.provideDocumentRangeFormattingEdits(
      document,
      { start: { line: 2, character: 0 }, end: { line: 4, character: 6 } },
      { tabSize: 2, insertSpaces: true },
    );
    assert.deepEqual(
      edits.map((edit) => [edit.range.start.line, edit.text]),
      [
        [2, '  IF i THEN'],
        [3, '    PRINT 2'],
        [4, '  END IF'],
      ],
    );
    const selectionToNextLine = provider.provideDocumentRangeFormattingEdits(
      document,
      { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
      { tabSize: 2, insertSpaces: true },
    );
    assert.deepEqual(selectionToNextLine.map((edit) => edit.range.start.line), [1]);
  } finally {
    Module._load = originalLoad;
  }
});

// ── Call graph (CodeLens + call hierarchy) ──────────────────────────────────

test('procedures are collected with parameters and block ranges', () => {
  const procs = collectProcedures(PROGRAM);
  assert.deepEqual(
    procs.map((p) => [p.name, p.kind, p.line, p.endLine, p.params]),
    [
      ['Greet', 'SUB', 6, 8, ['name$']],
      ['Twice%', 'FUNCTION', 9, 11, ['n']],
    ],
  );
  assert.equal(PROGRAM[6].slice(procs[0].nameStart, procs[0].nameEnd), 'Greet');
});

test('call sites skip DECLARE, strings, comments and FUNCTION return assignment', () => {
  const sites = findCallSites(PROGRAM, new Set(['GREET', 'TWICE']));
  assert.deepEqual(
    sites.map((s) => `${s.line}:${s.name}`),
    ['2:Twice', '2:Greet', '3:Greet', '5:Greet', '7:Twice'],
  );
});

test('incoming calls are grouped by caller, module code as null', () => {
  const groups = findIncomingCalls(files, 'TWICE');
  assert.deepEqual(
    groups.map((g) => [g.caller ? g.caller.name : null, g.sites.map((s) => s.line)]),
    [
      [null, [2]],
      ['Greet', [7]],
    ],
  );
  const total = findIncomingCalls(files, 'GREET').reduce((n, g) => n + g.sites.length, 0);
  assert.equal(total, 3);
});

test('outgoing calls of a procedure and of module code', () => {
  const index = indexProcedures(files);
  const greet = collectProcedures(PROGRAM)[0];
  assert.deepEqual([...findOutgoingCalls(files[0].analysis, greet, index).keys()], ['TWICE']);
  assert.deepEqual(
    [...findOutgoingCalls(files[0].analysis, null, index).keys()].sort(),
    ['GREET', 'TWICE'],
  );
});

test('procedures in other files are indexed, the first file wins', () => {
  const other = { file: 'lib.bas', analysis: { lines: ['SUB Greet (who$, times%)', 'END SUB', 'SUB Extra', 'END SUB'] } };
  const index = indexProcedures([...files, other]);
  assert.equal(index.get('GREET').file, 'main.bas');
  assert.equal(index.get('EXTRA').file, 'lib.bas');
});

// ── Inlay hints ─────────────────────────────────────────────────────────────

test('typeFromSuffix maps QB64 suffixes', () => {
  assert.equal(typeFromSuffix('a%'), 'INTEGER');
  assert.equal(typeFromSuffix('a~&'), '_UNSIGNED LONG');
  assert.equal(typeFromSuffix('a&&'), '_INTEGER64');
  assert.equal(typeFromSuffix('name$'), 'STRING');
  assert.equal(typeFromSuffix('plain'), null);
});

test('parameter hints for user procedures and multi-parameter built-ins', () => {
  const hints = computeInlayHints(PROGRAM, {
    procedures: indexProcedures(files),
    builtins: FUNCTIONS,
    parameterNames: true,
  });
  const at = (line) =>
    hints.filter((h) => h.line === line).map((h) => h.label);
  assert.deepEqual(at(2), ['n:', 'name$:']);
  assert.deepEqual(at(3), ['name$:']);
  assert.deepEqual(at(4), ['string:', 'n:']);
  assert.deepEqual(at(5), ['name$:', 'condition:', 'truePart:', 'falsePart:']);
  // `Greet name$` would repeat the parameter name, so no hint.
  const same = computeInlayHints(['Greet name$', 'SUB Greet (name$)', 'END SUB'], {
    procedures: indexProcedures([{ file: 'x', analysis: { lines: ['SUB Greet (name$)', 'END SUB'] } }]),
    parameterNames: true,
  });
  assert.equal(same.length, 0);
});

test('type hints mark only the first use of a suffixed variable', () => {
  const hints = computeInlayHints(['count% = 1', 'count% = count% + 1', 'PRINT LEFT$("a", 1)'], {
    procedures: new Map(),
    reserved: new Set(Object.keys(FUNCTIONS)),
    parameterNames: false,
    variableTypes: true,
  });
  assert.deepEqual(hints, [{ line: 0, character: 6, label: ': INTEGER', kind: 'type' }]);
});

test('hints respect the requested line range', () => {
  const hints = computeInlayHints(PROGRAM, {
    fromLine: 3,
    toLine: 3,
    procedures: indexProcedures(files),
    parameterNames: true,
  });
  assert.ok(hints.length > 0 && hints.every((h) => h.line === 3));
});

// ── Build task ──────────────────────────────────────────────────────────────

test('build task resolves ${file}, relative and absolute paths', () => {
  const active = path.resolve('/proj/game.bas');
  const vscodeMock = {
    window: {
      activeTextEditor: { document: { uri: { scheme: 'file', fsPath: active } } },
    },
  };
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const { resolveTaskFile, toTerminalText } = require('../src/extension/buildTask');
    const folder = { uri: { fsPath: path.resolve('/proj') } };
    assert.equal(resolveTaskFile('${file}', folder), active);
    assert.equal(resolveTaskFile(undefined, folder), active);
    assert.equal(resolveTaskFile('src/a.bas', folder), path.join(path.resolve('/proj'), 'src/a.bas'));
    assert.equal(
      resolveTaskFile('${workspaceFolder}/b.bas', folder),
      path.resolve('/proj') + '/b.bas',
    );
    vscodeMock.window.activeTextEditor.document.uri.fsPath = path.resolve('/proj/readme.md');
    assert.equal(resolveTaskFile('${file}', folder), null);
    assert.equal(toTerminalText('a\nb\r\nc'), 'a\r\nb\r\nc');
  } finally {
    Module._load = originalLoad;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
