'use strict';

const {
  removeLineNumbersFromText,
  renumberLinesFromText,
} = require('../src/commands/lineNumbers');
const {
  buildChrQuickPickItems,
  getAsciiEntry,
} = require('../src/extension/asciiChart');
const {
  analyzeQBasicText,
  findIdentifierMatchesInAnalysis,
  getDocumentAnalysis,
  invalidateDocumentAnalysis,
} = require('../src/shared/documentAnalysis');

let passed = 0;
let failed = 0;

function test(name, fn) {
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
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`,
    );
  }
}

console.log('\n📦 Editor Feature Tests');

test('removeLineNumbers strips numeric prefixes only', () => {
  const input = '10 PRINT "Hello"\n20    FOR I = 1 TO 3\nPRINT "Done"';
  const output = removeLineNumbersFromText(input).text;
  assertEqual(
    output,
    'PRINT "Hello"\nFOR I = 1 TO 3\nPRINT "Done"',
    'Unexpected removeLineNumbers output',
  );
});

test('renumberLines skips blank lines and replaces existing numbers', () => {
  const input = '100 CLS\n\n200 PRINT "Ready"\n300 END';
  const output = renumberLinesFromText(input).text;
  assertEqual(
    output,
    '1 CLS\n\n2 PRINT "Ready"\n3 END',
    'Unexpected renumbered output',
  );
});

test('renumberLines respects custom start and step values', () => {
  const input = 'PRINT "A"\nPRINT "B"\nPRINT "C"';
  const output = renumberLinesFromText(input, { start: 10, step: 10 }).text;
  assertEqual(
    output,
    '10 PRINT "A"\n20 PRINT "B"\n30 PRINT "C"',
    'Custom line numbering was not applied',
  );
});

test('ASCII chart maps CP437 box drawing characters correctly', () => {
  assertEqual(getAsciiEntry(218).character, '┌', 'Code 218 should be ┌');
  assertEqual(getAsciiEntry(191).character, '┐', 'Code 191 should be ┐');
  assertEqual(getAsciiEntry(196).character, '─', 'Code 196 should be ─');
});

test('ASCII chart keeps classic arrow glyphs for QBasic shortcuts', () => {
  assertEqual(getAsciiEntry(24).character, '↑', 'Code 24 should be ↑');
  assertEqual(getAsciiEntry(25).character, '↓', 'Code 25 should be ↓');
  assertEqual(getAsciiEntry(26).character, '→', 'Code 26 should be →');
  assertEqual(getAsciiEntry(27).character, '←', 'Code 27 should be ←');
});

test('CHR quick pick items expose CP437 symbols with CHR syntax', () => {
  const item = buildChrQuickPickItems([getAsciiEntry(218)])[0];
  assertEqual(item.label, '┌  CHR$(218)', 'Quick pick label should include glyph and CHR syntax');
  assertEqual(item.description, 'Dec 218 • Hex 0xDA', 'Quick pick description should expose code metadata');
});

test('document analysis computes stats, symbols, and variables in one pass', () => {
  const analysis = analyzeQBasicText(
    [
      "' comment",
      'CONST LIMIT = 10',
      'TYPE Point',
      'END TYPE',
      'SUB Demo',
      'DIM sharedValue',
      'counter = 1',
      'start:',
      'GOTO start',
      'END SUB',
      '',
    ].join('\n'),
  );

  assertEqual(analysis.commentLines, 1, 'Comment line count should match');
  assertEqual(analysis.blankLines, 1, 'Blank line count should match');
  assertEqual(analysis.subCount, 1, 'SUB count should match');
  assertEqual(analysis.typeCount, 1, 'TYPE count should match');
  assertEqual(analysis.constCount, 1, 'CONST count should match');
  assertEqual(analysis.dimCount, 1, 'DIM count should match');
  assertEqual(analysis.labelCount, 1, 'Label count should match');
  assertEqual(analysis.gotoCount, 1, 'GOTO count should match');
  assertEqual(
    analysis.variables.includes('sharedValue'),
    true,
    'DIM variable should be captured',
  );
  assertEqual(
    analysis.variables.includes('counter'),
    true,
    'Assigned variable should be captured',
  );
  assertEqual(analysis.symbols.length, 4, 'Expected CONST, TYPE, SUB, and label symbols');
});

test('document analysis cache reuses the same result for the same version', () => {
  const uri = { toString: () => 'test://analysis-cache' };
  const document = {
    uri,
    version: 1,
    getText: () => 'PRINT "A"',
  };

  const first = getDocumentAnalysis(document);
  const second = getDocumentAnalysis(document);

  assertEqual(first === second, true, 'Cache should reuse analysis for same version');

  const updated = {
    uri,
    version: 2,
    getText: () => 'PRINT "B"',
  };
  const third = getDocumentAnalysis(updated);

  assertEqual(first === third, false, 'New document version should refresh analysis');

  invalidateDocumentAnalysis(uri);
});

test('identifier matching skips declarations when requested', () => {
  const analysis = analyzeQBasicText(
    ['DIM total', 'PRINT total', 'total = total + 1', 'PRINT totalValue'].join(
      '\n',
    ),
  );

  const refsOnly = findIdentifierMatchesInAnalysis(analysis, 'total', {
    includeDeclaration: false,
  });
  const withDeclaration = findIdentifierMatchesInAnalysis(analysis, 'total');

  assertEqual(refsOnly.length, 3, 'Declaration should be excluded from references');
  assertEqual(withDeclaration.length, 4, 'Rename path should include declaration');
});

test('identifier matching respects QBasic suffix identifiers', () => {
  const analysis = analyzeQBasicText(
    ['DIM player$', 'player$ = "ok"', 'PRINT player$', 'PRINT player$Extra'].join(
      '\n',
    ),
  );

  const matches = findIdentifierMatchesInAnalysis(analysis, 'player$');
  assertEqual(matches.length, 3, 'Suffix identifier should match exact symbol only');
});

console.log('\n════════════════════════════════════════');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);

if (failed > 0) process.exit(1);
