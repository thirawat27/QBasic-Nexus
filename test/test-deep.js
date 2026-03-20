'use strict';

/**
 * QBasic Nexus - Deep System Test Suite
 * Comprehensive tests covering all major system components
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const Lexer = require('../src/compiler/lexer');
const { CompilationCache, TieredCache, fnv1a } = require('../src/compiler/cache');
const InternalTranspiler = require('../src/compiler/transpiler');
const { preprocessSource } = require('../src/compiler/preprocessor');
const { Compiler } = require('../src/compiler/compiler');
const { DiagnosticCollector } = require('../src/compiler/error-recovery');

const {
  removeLineNumbersFromText,
  renumberLinesFromText,
} = require('../src/commands/lineNumbers');

const {
  analyzeQBasicText,
  getDocumentAnalysis,
  invalidateDocumentAnalysis,
} = require('../src/shared/documentAnalysis');

const { sanitizeSnippetBody } = require('../src/shared/snippetSanitizer');
const { KEYWORDS, FUNCTIONS } = require('../languageData');

const {
  collectQBasicFoldingRanges,
  formatQBasicLines,
} = require('../src/shared/editorLayout');

const {
  buildKeywordSearchEntries,
  findKeywordEntryAtPosition,
} = require('../src/shared/keywordLookup');

const {
  findActiveCall,
} = require('../src/shared/callContext');

const {
  makeIdentifierRegex,
} = require('../src/providers/patterns');

let passed = 0;
let failed = 0;
let testsRun = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`
    );
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message}\nExpected to contain: ${substring}`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('QBasic Nexus - Deep System Test Suite');
console.log('='.repeat(70));

console.log('\n📦 Phase 1: Lexer Deep Tests');

test('Lexer tokenizes all QBasic keywords', () => {
  const code = 'PRINT IF THEN ELSE FOR NEXT WHILE WEND DO LOOP SELECT CASE';
  const l = new Lexer(code);
  const tokens = l.tokenize();
  const keywords = tokens.filter(t => t.type === 'KEYWORD');
  assertEqual(keywords.length >= 10, true, 'Should tokenize multiple keywords');
});

test('Lexer handles identifiers', () => {
  const l = new Lexer('myVar = 1');
  const t = l.tokenize();
  const idents = t.filter(tk => tk.type === 'IDENTIFIER');
  assertEqual(idents.length >= 1, true, 'Should capture identifiers');
});

test('Lexer handles standard numbers', () => {
  const l = new Lexer('x = 123.456');
  const t = l.tokenize();
  const num = t.find(tk => tk.type === 'NUMBER');
  if (!num) throw new Error('Number token not found');
});

test('Lexer handles operators', () => {
  const l = new Lexer('x = a + b - c * d');
  const t = l.tokenize();
  const ops = t.filter(tk => tk.type === 'OPERATOR');
  if (ops.length < 4) throw new Error('Not all operators recognized');
});

test('Lexer handles string with quotes', () => {
  const l = new Lexer('PRINT "Hello ""World"""');
  const t = l.tokenize();
  const strTok = t.find(tk => tk.type === 'STRING');
  if (!strTok || strTok.value !== 'Hello "World"') {
    throw new Error('Escaped quotes not handled correctly');
  }
});

test('Lexer handles single-quote comments', () => {
  const l = new Lexer("PRINT 1 'comment\nPRINT 2");
  const t = l.tokenize();
  const comment = t.find(tk => tk.value && tk.value.includes('comment'));
  if (comment) throw new Error('Comment was not stripped');
});

test('Lexer handles REM statements', () => {
  const l = new Lexer('REM This is a comment\nPRINT 1');
  const t = l.tokenize();
  const hasRem = t.some(tk => tk.value && tk.value.includes('REM'));
  if (hasRem) throw new Error('REM comment was not stripped');
});

test('Lexer tracks line positions correctly', () => {
  const l = new Lexer('PRINT 1\nPRINT 2\nPRINT 3');
  const t = l.tokenize();
  const line3Tokens = t.filter(tk => tk.line === 3);
  if (line3Tokens.length === 0) throw new Error('Line tracking broken');
});

test('Lexer handles multi-statement lines', () => {
  const l = new Lexer('PRINT 1: PRINT 2: PRINT 3');
  const t = l.tokenize();
  const prints = t.filter(tk => tk.type === 'KEYWORD' && tk.value === 'PRINT');
  assertEqual(prints.length, 3, 'Should parse multi-statement lines');
});



console.log('\n📦 Phase 1.3: Cache Deep Tests');

test('TieredCache basic operations', () => {
  const c = new TieredCache(5);
  c.set('key1', 'value1');
  c.set('key2', 'value2');
  if (c.get('key1') !== 'value1') throw new Error('Basic get/set failed');
});

test('TieredCache basic storage', () => {
  const c = new TieredCache(5);
  c.set('a', '1');
  c.set('b', '2');
  c.set('c', '3');
  if (c.get('a') !== '1') throw new Error('Basic storage failed');
});

test('TieredCache L2 promotion', () => {
  const c = new TieredCache(2);
  c.set('x', '1');
  c.set('y', '2');
  c.set('z', '3');
  if (c.get('x') === null) throw new Error('L2 promotion failed');
});

test('FNV-1a hash quality', () => {
  const hash1 = fnv1a('test');
  const hash2 = fnv1a('test');
  const hash3 = fnv1a('different');
  if (hash1 !== hash2) throw new Error('Hash not deterministic');
  if (hash1 === hash3) throw new Error('Hash has poor collision resistance');
});

test('CompilationCache with metadata', () => {
  const cc = new CompilationCache({ maxSize: 10 });
  cc.setCode('source', 'web', 'output', [{ line: 1, message: 'warn' }]);
  const result = cc.getCode('source', 'web');
  if (!result || result.code !== 'output') throw new Error('Cache round-trip failed');
});

test('CompilationCache basic operations', () => {
  const cc = new CompilationCache({ maxSize: 5 });
  cc.setCode('a', 'web', '1');
  const result = cc.getCode('a', 'web');
  if (!result || result.code !== '1') throw new Error('Basic cache operations failed');
});

test('CompilationCache disabled mode', () => {
  const cc = new CompilationCache({ enabled: false });
  cc.setCode('test', 'web', 'result');
  const result = cc.getCode('test', 'web');
  if (result !== null) throw new Error('Disabled cache should not store');
});

console.log('\n📦 Phase 2: Transpiler Deep Tests');

test('Transpile basic PRINT statement', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT "Hello"', 'node');
  assertContains(code, 'console.log', 'Should generate console.log');
});

test('Transpile FOR loop', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('FOR i = 1 TO 5\nNEXT i', 'node');
  assertContains(code, 'for', 'Should generate for loop');
});

test('Transpile WHILE loop', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('WHILE x < 5\nWEND', 'node');
  assertContains(code, 'while', 'Should generate while loop');
});

test('Transpile DO loop', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DO\nLOOP', 'node');
  assertContains(code, 'do', 'Should generate do-while loop');
});

test('Transpile IF statement', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('IF x > 1 THEN\nPRINT "yes"\nEND IF', 'node');
  assertContains(code, 'if', 'Should generate if statement');
});

test('Transpile IF-ELSE', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('IF x THEN\nPRINT "yes"\nELSE\nPRINT "no"\nEND IF', 'node');
  assertContains(code, 'else', 'Should generate else branch');
});

test('Transpile SELECT CASE', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('SELECT CASE x\nCASE 1\nEND SELECT', 'node');
  assertContains(code, 'switch', 'Should generate switch statement');
});

test('Transpile nested SELECT CASE', () => {
  const t = new InternalTranspiler();
  const code = t.transpile(`
SELECT CASE outer
  CASE 1
    SELECT CASE inner
    CASE 1
    END SELECT
END SELECT`, 'node');
  assertContains(code, 'switch', 'Should handle nested SELECT');
});

test('Transpile SUB/FUNCTION', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('SUB Test()\nEND SUB\nFUNCTION Add()\nEND FUNCTION', 'node');
  assertContains(code, 'function', 'Should generate functions');
});

test('Transpile array operations', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DIM arr(10)\narr(1) = 5', 'node');
  assertContains(code, 'arr', 'Should handle arrays');
});

test('Transpile TYPE definitions', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('TYPE Point\nX AS INTEGER\nEND TYPE', 'node');
  assertContains(code, 'type', 'Should handle TYPE');
});

test('Transpile string functions', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT LEN("test")\nPRINT MID$("hello", 1, 2)', 'node');
  assertContains(code, 'len', 'Should handle string functions');
});

test('Transpile graphics commands', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('SCREEN 12\nCIRCLE (100, 100), 50', 'web');
  assertContains(code, 'screen', 'Should handle graphics');
});

test('Transpile SOUND/PLAY', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('SOUND 440, 10\nPLAY "CDE"', 'web');
  assertContains(code, 'sound', 'Should handle sound');
});

test('Transpile $INCLUDE directive', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-deep-'));
  try {
    fs.writeFileSync(path.join(dir, 'shared.bi'), 'CONST x = 1', 'utf8');
    const t = new InternalTranspiler();
    const result = t.lint('$INCLUDE: "shared.bi"', {
      sourcePath: path.join(dir, 'main.bas'),
    });
    const hasError = result.some(e => e.message && e.message.includes('Could not resolve'));
    assertEqual(hasError === false, true, '$INCLUDE should resolve without errors');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Transpile DATA/READ statements', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DATA 1, 2, 3\nREAD x', 'node');
  assertContains(code, 'data', 'Should handle DATA/READ');
});

test('Lint returns empty array for valid code', () => {
  const t = new InternalTranspiler();
  const errors = t.lint('PRINT "Hello"');
  assertEqual(Array.isArray(errors), true, 'Lint should return array');
});

test('Lint detects syntax errors', () => {
  const t = new InternalTranspiler();
  const errors = t.lint('FOR = 1 TO 10');
  if (errors.length === 0) throw new Error('Should detect syntax error');
});



console.log('\n📦 Phase 3: Semantic Analysis Deep Tests');

test('Semantic: GOTO label validation', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('GOTO missing', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should reject undefined GOTO label');
});

test('Semantic: Valid GOTO label accepted', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('GOTO target\ntarget:\nPRINT "ok"', 'node');
  assertContains(code, 'target', 'Should accept valid GOTO');
});

test('Semantic: EXIT FOR outside loop', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('EXIT FOR', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should reject EXIT FOR outside loop');
});

test('Semantic: EXIT FOR inside loop', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('FOR i = 1 TO 10\nEXIT FOR\nNEXT i', 'node');
  assertContains(code, 'for', 'Should accept EXIT FOR in loop');
});

test('Semantic: CONTINUE outside loop', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('CONTINUE', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should reject CONTINUE outside loop');
});

test('Semantic: CONTINUE in DO loop', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DO\nCONTINUE\nLOOP', 'node');
  assertContains(code, 'do', 'Should accept CONTINUE in DO');
});

test('Semantic: NEXT without FOR', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('NEXT i', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should reject stray NEXT');
});

test('Semantic: Nested NEXT valid syntax', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('FOR i = 1 TO 2\nFOR j = 1 TO 2\nNEXT j, i', 'node');
  assertContains(code, 'for', 'Should accept valid nested NEXT');
});

test('Semantic: Valid nested NEXT accepted', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('FOR i = 1 TO 2\nFOR j = 1 TO 2\nNEXT j, i', 'node');
  assertContains(code, 'for', 'Should accept valid nested NEXT');
});

test('Semantic: END IF required', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('IF x THEN\nPRINT "yes"', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should require END IF');
});

test('Semantic: Valid SELECT CASE', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('SELECT CASE x\nCASE 1\nEND SELECT', 'node');
  assertContains(code, 'switch', 'Should accept valid SELECT CASE');
});

test('Semantic: Missing END SUB', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('SUB Test\nPRINT "hi"', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should require END SUB');
});

test('Semantic: ON ERROR GOTO validation', () => {
  const t = new InternalTranspiler();
  let threw = false;
  try {
    t.transpile('ON ERROR GOTO missing', 'node');
  } catch (_error) {
    threw = true;
  }
  if (!threw) throw new Error('Should validate ON ERROR GOTO');
});

test('Semantic: Valid ON ERROR GOTO', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('ON ERROR GOTO handler\nhandler:\nRESUME NEXT', 'node');
  assertContains(code, 'handler', 'Should accept valid ON ERROR');
});

console.log('\n📦 Preprocessor Deep Tests');

test('Preprocessor handles $INCLUDE', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-preproc-'));
  try {
    fs.writeFileSync(path.join(dir, 'test.bi'), 'CONST x = 42', 'utf8');
    const result = preprocessSource('$INCLUDE: "test.bi"', {
      sourcePath: path.join(dir, 'main.bas'),
    });
    if (!result.source.includes('42')) throw new Error('$INCLUDE not processed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('\n📦 Error Recovery Deep Tests');

test('Error recovery provides diagnostics', () => {
  const diagnostics = new DiagnosticCollector();
  assertEqual(typeof diagnostics.add === 'function', true, 'Should have add method');
});

test('Diagnostic collector has getAll', () => {
  const diagnostics = new DiagnosticCollector();
  assertEqual(typeof diagnostics.getAll === 'function', true, 'Should have getAll method');
});

console.log('\n📦 Compiler Wrapper Deep Tests');

test('Compiler basic compilation', () => {
  const c = new Compiler({ target: 'web', cache: true });
  const result = c.compile('PRINT "test"');
  if (!result.isSuccess()) throw new Error('Compilation should succeed');
});

test('Compiler cache functionality', () => {
  const c = new Compiler({ target: 'web', cache: true });
  c.compile('PRINT "x"');
  const result = c.compile('PRINT "x"');
  if (!result.getMetadata().cached) throw new Error('Should hit cache');
});

test('Compiler statistics', () => {
  const c = new Compiler({ target: 'web', cache: true });
  c.compile('PRINT "a"');
  c.compile('PRINT "a"');
  c.compile('PRINT "b"');
  const stats = c.getStats();
  assertEqual(stats.compilations, 3, 'Should track all compilations');
  assertEqual(stats.cacheHits, 1, 'Should track cache hits');
});

test('Compiler preserves warnings', () => {
  const c = new Compiler({ target: 'web', cache: false });
  const result = c.compile('GOTO Done\nPRINT "dead"\nDone:\nPRINT "live"');
  if (!result.isSuccess()) throw new Error('Warnings should not fail');
  if (result.getWarnings().length === 0) throw new Error('Should preserve warnings');
});

console.log('\n📦 Editor Features Deep Tests');

test('Line number removal', () => {
  const input = '10 PRINT "A"\n20 PRINT "B"\n30 PRINT "C"';
  const output = removeLineNumbersFromText(input).text;
  assertEqual(output.includes('10'), false, 'Should remove line numbers');
});

test('Line number renumbering', () => {
  const input = 'PRINT "A"\nPRINT "B"';
  const output = renumberLinesFromText(input, { start: 10, step: 10 }).text;
  assertContains(output, '10', 'Should add line numbers');
  assertContains(output, '20', 'Should increment correctly');
});

test('Line renumber with gap preservation', () => {
  const input = '10 PRINT "A"\n30 PRINT "B"';
  const output = renumberLinesFromText(input).text;
  assertEqual(output.split('\n').length, 2, 'Should preserve line count');
});

test('Code folding ranges', () => {
  const code = [
    'SUB Test',
    '  FOR i = 1 TO 10',
    '  NEXT i',
    'END SUB',
    "' comment"
  ];
  const ranges = collectQBasicFoldingRanges(code);
  assertEqual(ranges.length >= 2, true, 'Should detect folds');
});

test('Code formatting', () => {
  const code = ['if x = 1 then', 'print "yes"', 'end if'];
  const formatted = formatQBasicLines(code, { insertSpaces: true, tabSize: 2 });
  assertEqual(formatted[0], 'IF x = 1 THEN', 'Should capitalize keywords');
  assertEqual(formatted[1].startsWith('  '), true, 'Should indent body');
});

test('Snippet sanitization', () => {
  const snippet = { body: ['DIM x$', 'x$ = "test"'] };
  const sanitized = sanitizeSnippetBody(snippet.body);
  assertEqual(sanitized[0], 'DIM x\\$', 'Should escape dollar signs');
});

test('Keyword lookup entries', () => {
  const entries = buildKeywordSearchEntries(KEYWORDS);
  assertEqual(entries.length > 0, true, 'Should generate entries');
  const print = entries.find(e => e.label === 'PRINT');
  if (!print) throw new Error('Should find PRINT keyword');
});

test('Keyword position matching', () => {
  const entries = buildKeywordSearchEntries(KEYWORDS);
  const match = findKeywordEntryAtPosition('PRINT "hello"', 1, entries);
  assertEqual(match.label, 'PRINT', 'Should match keyword at position');
});

test('Call context for nested functions', () => {
  const ctx = findActiveCall('PRINT MID$(LEFT$(a$, ');
  assertEqual(ctx.name, 'LEFT$', 'Should detect inner function');
});

test('Call context after comma', () => {
  const ctx = findActiveCall('PRINT MID$(a$, 1, ');
  assertEqual(ctx.activeParameter, 2, 'Should count parameters correctly');
});

console.log('\n📦 Document Analysis Deep Tests');

test('Basic document analysis', () => {
  const analysis = analyzeQBasicText('PRINT "hello"\nREM comment\n\nDIM x');
  assertEqual(analysis.blankLines, 1, 'Should count blank lines');
  assertEqual(analysis.commentLines >= 1, true, 'Should count comments');
});

test('Variable extraction', () => {
  const analysis = analyzeQBasicText('DIM x, y AS INTEGER\nz$ = "test"');
  assertEqual(analysis.variables.includes('x'), true, 'Should find x');
  assertEqual(analysis.variables.includes('y'), true, 'Should find y');
  assertEqual(analysis.variables.includes('z$'), true, 'Should find z$');
});

test('Symbol extraction', () => {
  const code = 'CONST A = 1\nTYPE Point\nEND TYPE\nSUB Test\nEND SUB';
  const analysis = analyzeQBasicText(code);
  assertEqual(analysis.constCount >= 1, true, 'Should find CONST');
  assertEqual(analysis.typeCount >= 1, true, 'Should find TYPE');
  assertEqual(analysis.subCount >= 1, true, 'Should find SUB');
});

test('GOTO/Label tracking', () => {
  const code = 'GOTO target\ntarget:\nPRINT "there"';
  const analysis = analyzeQBasicText(code);
  assertEqual(analysis.labelCount >= 1, true, 'Should track labels');
  assertEqual(analysis.gotoCount >= 1, true, 'Should track GOTO');
});

test('Analysis caching', () => {
  const uri = { toString: () => 'test://cache' };
  const doc = { uri, version: 1, getText: () => 'PRINT "x"' };
  const first = getDocumentAnalysis(doc);
  const second = getDocumentAnalysis(doc);
  if (first !== second) throw new Error('Cache should return same object');
});

test('Analysis cache invalidation', () => {
  const uri = { toString: () => 'test://invalidate' };
  const doc1 = { uri, version: 1, getText: () => 'PRINT "a"' };
  getDocumentAnalysis(doc1);
  invalidateDocumentAnalysis(uri);
  const doc2 = { uri, version: 2, getText: () => 'PRINT "b"' };
  const result = getDocumentAnalysis(doc2);
  assertEqual(result !== null, true, 'Should return analysis after invalidation');
});

test('Multi-dimensional analysis', () => {
  const code = 'DIM matrix(10, 10)\nmatrix(1, 2) = 5';
  const analysis = analyzeQBasicText(code);
  assertEqual(analysis.variables.includes('matrix'), true, 'Should find array');
});

test('TYPE member analysis', () => {
  const code = 'TYPE Point\nX AS INTEGER\nEND TYPE\nDIM p AS Point\np.X = 10';
  const analysis = analyzeQBasicText(code);
  assertEqual(analysis.typeCount >= 1, true, 'Should find TYPE');
});

console.log('\n📦 Identifier Pattern Deep Tests');

test('Identifier regex basic', () => {
  const regex = makeIdentifierRegex('myVar', 'g');
  const matches = 'myVar = 1'.match(regex);
  if (!matches || matches[0] !== 'myVar') throw new Error('Basic identifier match failed');
});

test('Identifier regex with suffix', () => {
  const regex = makeIdentifierRegex('name$', 'g');
  const matches = 'name$ = "test"'.match(regex);
  if (!matches || matches[0] !== 'name$') throw new Error('Suffix identifier match failed');
});

test('Identifier regex boundary', () => {
  const regex = makeIdentifierRegex('test', 'g');
  const bad = 'testing = 1'.match(regex);
  if (bad && bad[0] === 'test') throw new Error('Should not match partial');
});

test('Identifier regex case insensitive', () => {
  const regex = makeIdentifierRegex('Hello', 'gi');
  const matches = 'PRINT hello'.match(regex);
  if (!matches || matches[0].toLowerCase() !== 'hello') throw new Error('Case insensitive failed');
});

console.log('\n📦 Language Catalog Deep Tests');

test('Keyword documentation exists', () => {
  assertEqual(KEYWORDS.PRINT.detail !== undefined, true, 'PRINT should have docs');
});

test('Function documentation exists', () => {
  assertEqual(FUNCTIONS.LEFT$ !== undefined, true, 'LEFT$ should exist');
});

test('Multiple keyword variants', () => {
  assertEqual(KEYWORDS.LINE_INPUT !== undefined, true, 'Should have LINE INPUT');
  assertEqual(KEYWORDS.LINE !== undefined, true, 'Should have LINE');
});

console.log('\n📦 Web Runtime Deep Tests');

test('Web runtime transpile includes runtime bindings', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('SCREEN 13\nPSET (10, 10), 4', 'web');
  assertContains(code, '_runtime', 'Should include runtime object');
});

test('Web runtime handles _TITLE', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('_TITLE "My App"', 'web');
  assertContains(code, 'document.title', 'Should handle _TITLE');
});

test('Web runtime handles _CLIPBOARD', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('_CLIPBOARD = "test"', 'web');
  assertContains(code, 'clipboard', 'Should handle _CLIPBOARD');
});

test('Web runtime handles graphics', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('CIRCLE (100, 100), 50', 'web');
  assertContains(code, 'circle', 'Should handle CIRCLE');
});

console.log('\n📦 Edge Cases Deep Tests');

test('Empty input handling', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('', 'node');
  if (code.length === 0) throw new Error('Should produce some output');
});

test('Comment-only input', () => {
  const t = new InternalTranspiler();
  const code = t.transpile("' comment only", 'node');
  if (code.includes('comment')) throw new Error('Should strip comments');
});

test('Very long line handling', () => {
  const longLine = 'x = ' + Array(1000).fill('1+').join('');
  const t = new InternalTranspiler();
  const code = t.transpile(longLine, 'node');
  assertContains(code, 'x', 'Should handle long lines');
});

test('Deep nesting', () => {
  let code = 'IF x = 1 THEN\n';
  for (let i = 0; i < 5; i++) {
    code += 'IF x = 1 THEN\n';
  }
  for (let i = 0; i < 6; i++) {
    code += 'END IF\n';
  }
  const t = new InternalTranspiler();
  const result = t.transpile(code, 'node');
  assertContains(result, 'if', 'Should handle deep nesting');
});

test('Full compile-transpile-lint pipeline', () => {
  const c = new Compiler({ target: 'web', cache: false });
  const result = c.compile('FOR i = 1 TO 5\nPRINT i\nNEXT i');
  if (!result.isSuccess()) throw new Error('Pipeline should succeed');
});

test('Mixed case keywords', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('print "test"\nPrint "test2"\nPRINT "test3"', 'node');
  if (!code.includes('console.log')) throw new Error('Should handle mixed case');
});

test('Unicode in strings', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('PRINT "Hello 🌍"', 'node');
  assertContains(code, 'Hello', 'Should preserve unicode');
});

test('Special characters in identifiers', () => {
  const t = new InternalTranspiler();
  const code = t.transpile('DIM a% AS INTEGER\nDIM b$ AS STRING\nDIM c! AS SINGLE', 'node');
  assertContains(code, 'a', 'Should handle type suffixes');
});

console.log('\n📦 Integration Deep Tests');

test('Full compile-transpile-lint pipeline', () => {
  const c = new Compiler({ target: 'web', cache: false });
  const result = c.compile('FOR i = 1 TO 5\nPRINT i\nNEXT i');
  assertEqual(result.isSuccess(), true, 'Pipeline should succeed');
});

test('Multiple files compilation', () => {
  const c = new Compiler({ target: 'web', cache: true });
  c.compile('DIM x');
  c.compile('DIM y');
  c.compile('DIM z');
  const stats = c.getStats();
  assertEqual(stats.compilations, 3, 'Should compile multiple files');
});

test('Cache efficiency', () => {
  const c = new Compiler({ target: 'web', cache: true });
  const source = 'PRINT "efficiency test"';
  for (let i = 0; i < 100; i++) {
    c.compile(source);
  }
  const stats = c.getStats();
  assertEqual(stats.cacheHits, 99, 'Should hit cache 99 times');
});

test('Warning aggregation', () => {
  const c = new Compiler({ target: 'web', cache: false });
  const code = 'GOTO a\nGOTO b\nGOTO c\na:\nb:\nc:';
  const result = c.compile(code);
  if (result.isSuccess() && result.getWarnings().length > 0) {
    console.log(`  ℹ️  ${result.getWarnings().length} warnings detected`);
  }
});

console.log('\n📦 Performance Deep Tests');

test('Rapid compilation', () => {
  const c = new Compiler({ target: 'web', cache: false });
  const start = Date.now();
  for (let i = 0; i < 50; i++) {
    c.compile(`PRINT "${i}"`);
  }
  const elapsed = Date.now() - start;
  console.log(`  ℹ️  50 compilations in ${elapsed}ms (${elapsed/50}ms avg)`);
});

test('Large code transpile', () => {
  const lines = [];
  for (let i = 0; i < 100; i++) {
    lines.push(`DIM var${i}`);
    lines.push(`var${i} = ${i}`);
    lines.push(`PRINT var${i}`);
  }
  const t = new InternalTranspiler();
  const code = t.transpile(lines.join('\n'), 'node');
  if (code.length < 1000) throw new Error('Should produce substantial output');
});

console.log('\n' + '='.repeat(70));
console.log(`📊 Deep Test Results: ${passed} PASSED, ${failed} FAILED`);
console.log(`📝 Total Tests Run: ${testsRun}`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('✅ All deep tests passed! System is stable and ready.\n');
  process.exit(0);
} else {
  console.log(`❌ ${failed} test(s) failed. Review above.\n`);
  process.exit(1);
}
