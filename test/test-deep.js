'use strict';

/**
 * QBasic Nexus - Deep System Test Suite
 * Editor features: line numbers, document analysis, identifier patterns
 * and the language catalog
 */

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
