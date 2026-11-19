'use strict';

const assert = require('node:assert/strict');

const Transpiler = require('../src/compiler/parser');
const { KEYWORDS, FUNCTIONS } = require('../languageData');

console.log('\n🔥 QB64 / QB64-PE Language Support Tests\n');

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

const transpiler = new Transpiler();
const lintMessages = (source) =>
  transpiler.lint(source, {}).map((error) => `${error.line}:${error.message}`);

const QB64PE_PROGRAMS = {
  'metacommands with arguments':
    "$CONSOLE:ONLY\n$RESIZE:ON\n$SCREENHIDE\n$EXEICON:'./app.ico'\n$VERSIONINFO:CompanyName=Me\nPRINT 1",
  '$NOPREFIX and $INCLUDEONCE': '$NOPREFIX\n$INCLUDEONCE\nPRINT 1',
  '$EMBED and _EMBEDDED$': "$EMBED:'./data.txt','mydata'\nPRINT _EMBEDDED$(\"mydata\")",
  '$UNSTABLE and _MIDISOUNDBANK': '$UNSTABLE:MIDI\n_MIDISOUNDBANK "gm.sf2"',
  'precompiler $LET / $IF': '$LET X = 1\n$IF X = 1 THEN\nPRINT 1\n$ELSE\nPRINT 2\n$END IF',
  '_IIF, _ANDALSO, _ORELSE, _NEGATE':
    'x = 5\nPRINT _IIF(x > 3, "big", "small")\nIF x > 1 _ANDALSO x < 10 THEN PRINT "in"\nIF x < 1 _ORELSE x > 3 THEN PRINT "or"\nIF _NEGATE x THEN PRINT "z"',
  'Unicode text and files':
    '_UPRINTSTRING (10, 10), "Hi"\nw = _UPRINTWIDTH("Hi")\ns$ = _READFILE$("a.txt")\n_WRITEFILE "b.txt", s$',
  'dialogs and logging':
    'a$ = _OPENFILEDIALOG$("Open")\nr = _MESSAGEBOX("T", "M", "yesno")\n_NOTIFYPOPUP "T", "M"\n_LOGINFO "hi"\n_LOGERROR "e"',
  'math, hashing and compression':
    'PRINT _MIN(1, 2), _MAX(1, 2), _CLAMP(5, 1, 3), _ROL(1, 2)\nPRINT _MD5$("a"), _CRC32("a")\nz$ = _DEFLATE$("aaaa")\nPRINT _INFLATE$(z$)',
  'assertions': '$ASSERTS\n_ASSERT 1 = 1, "ok"',
};

for (const [name, source] of Object.entries(QB64PE_PROGRAMS)) {
  test(`Linter accepts QB64-PE ${name}`, () => {
    assert.deepEqual(lintMessages(source), []);
  });
}

test('Linter still reports real errors next to metacommands', () => {
  const messages = lintMessages('$RESIZE:ON\nFOR i = 1 TO 3\nPRINT i');
  assert.equal(messages.length, 1);
  assert.match(messages[0], /NEXT/);
});

test('Editor catalog lists QB64-PE functions with parameters', () => {
  assert.deepEqual(FUNCTIONS._IIF.params, ['condition', 'truePart', 'falsePart']);
  assert.ok(FUNCTIONS['_READFILE$']);
  assert.ok(FUNCTIONS._MESSAGEBOX.detail.includes('QB64-PE'));
});

test('Editor catalog lists QB64-PE operators, statements and metacommands', () => {
  for (const keyword of ['_ANDALSO', '_ORELSE', '_UPRINTSTRING', '_SAVEIMAGE', '$NOPREFIX', '$EMBED', '$UNSTABLE']) {
    assert.ok(KEYWORDS[keyword], `Missing ${keyword}`);
  }
});

console.log('\n════════════════════════════════════════');
console.log(`Results: ${passed} PASSED, ${failed} FAILED\n`);
process.exit(failed > 0 ? 1 : 0);
