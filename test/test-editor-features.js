'use strict';

const { KEYWORDS, FUNCTIONS } = require('../languageData');
const SNIPPETS = require('../snippets/qbasic.json');
const {
  removeLineNumbersFromText,
  renumberLinesFromText,
} = require('../src/commands/lineNumbers');
const {
  buildChrQuickPickItems,
  buildAsciiCopyPayload,
  getAsciiEntry,
} = require('../src/extension/asciiChart');
const { findActiveCall } = require('../src/shared/callContext');
const {
  collectQBasicFoldingRanges,
  formatQBasicLines,
  getOnTypeIndentText,
} = require('../src/shared/editorLayout');
const {
  buildKeywordSearchEntries,
  findKeywordEntryAtPosition,
} = require('../src/shared/keywordLookup');
const {
  analyzeQBasicText,
  findDefinitionInAnalysis,
  findIdentifierMatchesInAnalysis,
  getDocumentAnalysis,
  invalidateDocumentAnalysis,
} = require('../src/shared/documentAnalysis');
const { sanitizeSnippetBody } = require('../src/shared/snippetSanitizer');
const { findActiveSignature } = require('../src/shared/signatureCatalog');
const { buildSemanticTokenSpans } = require('../src/shared/semanticTokens');

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

test('ASCII copy payload describes copied glyphs for clipboard feedback', () => {
  const payload = buildAsciiCopyPayload(getAsciiEntry(218), 'copy-character');

  assertEqual(payload.text, '┌', 'Glyph copy should place the selected character on the clipboard');
  assertEqual(payload.statusMessage, 'Copied ┌', 'Glyph copy status should stay compact');
});

test('ASCII copy payload describes copied CHR syntax separately', () => {
  const payload = buildAsciiCopyPayload(getAsciiEntry(218), 'copy-chr');

  assertEqual(payload.text, 'CHR$(218)', 'CHR copy should place QBasic syntax on the clipboard');
  assertEqual(payload.statusMessage, 'Copied CHR$(218)', 'CHR copy status should name the copied syntax');
});

test('call context resolves suffix function names', () => {
  const context = findActiveCall('PRINT LEFT$("HELLO", ');

  assertEqual(context.name, 'LEFT$', 'Should detect the active suffix function name');
  assertEqual(context.activeParameter, 1, 'Comma count should map to the second parameter');
});

test('call context tracks nested calls without counting inner commas', () => {
  const inner = findActiveCall('PRINT MID$(LEFT$("ABC", ');
  const outer = findActiveCall('PRINT MID$(LEFT$("ABC", 2), 1, ');

  assertEqual(inner.name, 'LEFT$', 'Inner unfinished call should stay active');
  assertEqual(inner.activeParameter, 1, 'Inner call should count its own commas');
  assertEqual(outer.name, 'MID$', 'After closing the inner call, the outer call should become active');
  assertEqual(outer.activeParameter, 2, 'Outer call should ignore commas consumed inside nested calls');
});

test('signature catalog resolves paren-based graphics statements after coordinate pairs', () => {
  const context = findActiveSignature('CIRCLE (160, 100), 50, ');

  assertEqual(context.name, 'CIRCLE', 'Should resolve CIRCLE statement signature');
  assertEqual(
    context.activeParameter,
    2,
    'Statement signature should count only commas outside the coordinate pair',
  );
});

test('signature catalog resolves inline statement signatures', () => {
  const context = findActiveSignature('PLAY "T120 O4 ');

  assertEqual(context.name, 'PLAY', 'Should resolve PLAY statement signature');
  assertEqual(context.activeParameter, 0, 'PLAY should expose a single macro-string parameter');
});

test('formatter preserves suffix identifiers and escaped quotes while capitalizing keywords', () => {
  const formatted = formatQBasicLines(
    ['if flag% = 1 then', 'print "and ""or"" stay lower", flag%'],
    { insertSpaces: true, tabSize: 2 },
  );

  assertEqual(formatted[0], 'IF flag% = 1 THEN', 'Formatter should capitalize IF and THEN');
  assertEqual(
    formatted[1],
    '  PRINT "and ""or"" stay lower", flag%',
    'Formatter should preserve escaped quotes and suffix variables',
  );
});

test('folding helper keeps trailing comment blocks at EOF', () => {
  const ranges = collectQBasicFoldingRanges([
    'SUB Demo',
    'PRINT 1',
    'END SUB',
    "' comment one",
    'REM comment two',
  ]);

  assertEqual(ranges.length, 2, 'Should create one code fold and one trailing comment fold');
  assertEqual(ranges[1].start, 3, 'Trailing comment fold should start at the first comment');
  assertEqual(ranges[1].end, 4, 'Trailing comment fold should extend to EOF');
});

test('on-type indent helper handles block middles and enders', () => {
  assertEqual(
    getOnTypeIndentText('    ELSE'),
    '        ',
    'ELSE should indent the next line one level deeper',
  );
  assertEqual(
    getOnTypeIndentText('    END IF'),
    '    ',
    'END IF should keep the current indent level',
  );
});

test('language catalog generates rich documentation for fallback keywords and functions', () => {
  assertEqual(
    KEYWORDS['$INCLUDE'].detail,
    'Compile-time directive that inserts another source file',
    'Expected $INCLUDE to use a specific detail string',
  );
  assertEqual(
    KEYWORDS.LINE_INPUT.documentation.includes('LINE INPUT [#fileNum,] stringVariable$'),
    true,
    'LINE INPUT should expose generated syntax documentation',
  );
  assertEqual(
    KEYWORDS.OPEN.documentation.includes('FREEFILE'),
    true,
    'OPEN should expose a concrete usage example',
  );
  assertEqual(
    KEYWORDS._MEMCOPY.documentation.includes('_MEMCOPY srcMem, 0 TO dstMem, 0, byteCount'),
    true,
    '_MEMCOPY should expose concrete syntax for memory transfers',
  );
  assertEqual(
    KEYWORDS.INTERRUPT.documentation.includes('INTERRUPT &H10, inRegs, outRegs'),
    true,
    'INTERRUPT should expose a concrete BIOS/DOS interrupt example',
  );
  assertEqual(
    KEYWORDS.CALLS.documentation.includes('CALLS FarRoutine(argument%)'),
    true,
    'CALLS should expose an external procedure example',
  );
  assertEqual(
    FUNCTIONS.CSRLIN.params.length,
    0,
    'CSRLIN should not expose a fake placeholder parameter',
  );
  assertEqual(
    FUNCTIONS.CSRLIN.documentation.includes('current text cursor row'),
    true,
    'CSRLIN should expose a specialized generated description',
  );
  assertEqual(
    FUNCTIONS._OPENHOST.documentation.includes('networking handles'),
    true,
    '_OPENHOST should describe its generated networking usage',
  );
  assertEqual(
    FUNCTIONS.CBOOL.documentation.includes('true is `-1` and false is `0`'),
    true,
    'CBOOL should document BASIC boolean conversion behavior',
  );
  assertEqual(
    FUNCTIONS._CVD.documentation.includes('number# = _CVD(bytes$)'),
    true,
    '_CVD should expose a packed-byte conversion example',
  );
});

test('keyword lookup resolves longest multi-word keyword at cursor position', () => {
  const searchEntries = buildKeywordSearchEntries(KEYWORDS);
  const lineInputMatch = findKeywordEntryAtPosition(
    'LINE INPUT #1, playerName$',
    6,
    searchEntries,
  );
  const onErrorMatch = findKeywordEntryAtPosition(
    'ON ERROR GOTO Handler',
    4,
    searchEntries,
  );

  assertEqual(
    lineInputMatch.label,
    'LINE INPUT',
    'Lookup should prefer LINE INPUT over the shorter INPUT token',
  );
  assertEqual(
    onErrorMatch.label,
    'ON ERROR',
    'Lookup should resolve ON ERROR as one keyword label',
  );
});

test('snippet bodies escape literal dollar signs for VS Code snippet syntax', () => {
  const mismatches = [];

  for (const [name, snippet] of Object.entries(SNIPPETS)) {
    const originalBody = snippet.body;
    const sanitizedBody = sanitizeSnippetBody(originalBody);

    if (JSON.stringify(originalBody) !== JSON.stringify(sanitizedBody)) {
      mismatches.push({
        name,
        originalBody,
        sanitizedBody,
      });
    }
  }

  assertEqual(
    mismatches.length,
    0,
    `Snippet bodies contain unescaped literal dollar signs: ${JSON.stringify(mismatches.slice(0, 10))}`,
  );
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

test('document analysis captures every DIM variable on the same line', () => {
  const analysis = analyzeQBasicText(
    'DIM alpha, beta(10) AS INTEGER, gamma$\nPRINT beta(1), gamma$',
  );

  assertEqual(analysis.dimCount, 1, 'DIM statement count should stay per statement');
  assertEqual(analysis.variables.includes('alpha'), true, 'First DIM variable should be captured');
  assertEqual(analysis.variables.includes('beta'), true, 'Array DIM variable should be captured');
  assertEqual(analysis.variables.includes('gamma$'), true, 'Suffix DIM variable should be captured');
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

test('identifier matching excludes later DIM declarations on shared declaration lines', () => {
  const analysis = analyzeQBasicText(
    ['DIM alpha, beta(10) AS INTEGER', 'PRINT beta(1)', 'beta = 2'].join('\n'),
  );

  const refsOnly = findIdentifierMatchesInAnalysis(analysis, 'beta', {
    includeDeclaration: false,
  });

  assertEqual(refsOnly.length, 2, 'Second DIM declaration should not leak into references');
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

test('definition lookup resolves later DIM variables and keeps exact ranges', () => {
  const source = 'DIM alpha, beta(10) AS INTEGER, gamma$\nPRINT gamma$\n';
  const analysis = analyzeQBasicText(source);
  const betaDefinition = findDefinitionInAnalysis(analysis, 'beta');
  const gammaDefinition = findDefinitionInAnalysis(analysis, 'gamma$');

  assertEqual(betaDefinition.line, 0, 'beta should resolve to the DIM line');
  assertEqual(
    betaDefinition.start,
    source.indexOf('beta'),
    'beta should resolve to the exact identifier column',
  );
  assertEqual(
    gammaDefinition.start,
    source.indexOf('gamma$'),
    'gamma$ should resolve to the exact suffix identifier column',
  );
});

test('definition lookup resolves user-defined procedures and constants', () => {
  const source = ['CONST LIMIT = 10', 'TYPE Point', 'END TYPE', 'FUNCTION Add', 'END FUNCTION'].join('\n');
  const analysis = analyzeQBasicText(source);
  const constDefinition = findDefinitionInAnalysis(analysis, 'LIMIT');
  const typeDefinition = findDefinitionInAnalysis(analysis, 'Point');
  const functionDefinition = findDefinitionInAnalysis(analysis, 'Add');

  assertEqual(constDefinition.line, 0, 'CONST definition should be indexed');
  assertEqual(typeDefinition.line, 1, 'TYPE definition should be indexed');
  assertEqual(functionDefinition.line, 3, 'FUNCTION definition should be indexed');
});

test('semantic token helper distinguishes global, local, parameter, and array symbols', () => {
  const spans = buildSemanticTokenSpans(
    [
      'DIM globalValue',
      'TYPE Player',
      '  name AS STRING',
      'END TYPE',
      'SUB Demo(name$)',
      '  DIM localArray(10)',
      '  PRINT globalValue, localArray(1), name$',
      'END SUB',
    ].join('\n'),
  );

  const globalValueDecl = spans.find(
    (span) => span.line === 0 && span.start === 4,
  );
  const playerTypeDecl = spans.find(
    (span) => span.line === 1 && span.type === 'struct',
  );
  const paramUse = spans.find(
    (span) => span.line === 6 && span.type === 'parameter',
  );
  const localArrayUse = spans.find(
    (span) =>
      span.line === 6 &&
      span.type === 'variable' &&
      span.modifiers.includes('array') &&
      span.modifiers.includes('local'),
  );

  assertEqual(globalValueDecl.modifiers.includes('global'), true, 'Global DIM should be marked global');
  assertEqual(globalValueDecl.modifiers.includes('declaration'), true, 'Global DIM should be marked declaration');
  assertEqual(playerTypeDecl.modifiers.includes('declaration'), true, 'TYPE name should be marked declaration');
  assertEqual(paramUse.modifiers.includes('local'), true, 'Procedure parameter should be treated as local');
  assertEqual(localArrayUse.modifiers.includes('array'), true, 'Array usage should retain array modifier');
});

console.log('\n════════════════════════════════════════');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);

if (failed > 0) process.exit(1);
