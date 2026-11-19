// @ts-nocheck -- tests mock vscode and poke at internals.
'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const originalLoad = Module._load;
const vscode = {
  DiagnosticSeverity: { Error: 0, Warning: 1 },
  Range: class Range {
    constructor(startLine, startCharacter, endLine, endCharacter) {
      this.start = { line: startLine, character: startCharacter };
      this.end = { line: endLine, character: endCharacter };
    }
  },
  Diagnostic: class Diagnostic {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  },
  workspace: { textDocuments: [] },
};

Module._load = function loadVscodeMock(request, parent, isMain) {
  if (request === 'vscode') return vscode;
  return originalLoad.call(this, request, parent, isMain);
};

try {
  const { state } = require('../src/extension/state');
  const { parseCompilerErrors } = require('../src/extension/qb64Compiler');
  const uri = {
    fsPath: path.join(process.cwd(), 'shared.inc'),
    toString() {
      return this.fsPath;
    },
  };
  const document = {
    uri,
    getText() {
      return ['PRINT 1', 'PRINT 2', 'PRINT 3', 'PRINT 4', 'BROKEN'].join('\n');
    },
  };
  let published = null;

  vscode.workspace.textDocuments = [document];
  state.diagnosticCollection = {
    set(publishedUri, diagnostics) {
      published = { uri: publishedUri, diagnostics };
    },
  };

  parseCompilerErrors('shared.inc:5: error: Syntax error', uri);

  assert.ok(published, 'Expected QB64 diagnostics to be published.');
  assert.equal(published.diagnostics.length, 1);
  assert.equal(published.diagnostics[0].message, 'Syntax error');
  assert.equal(published.diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
  assert.equal(published.diagnostics[0].range.start.line, 4);

  console.log('✅ QB64 diagnostics parse .inc compiler errors');

  // Real QB64 V2.1 outputs captured from `qb64 -x -c <file> -o <exe> -m [-w]`.
  const { parseQB64Output } = require('../src/extension/qb64Compiler');

  const forWithoutNext = parseQB64Output(
    'QB64 Compiler V2.1\n\nBeginning C++ output from QB64 code... \n' +
      '[........] 16%[................] 33%\nFOR without NEXT\n' +
      'Caused by (or after):SUB VWATCH ( )\nLINE 2:SUB vwatch ()\n',
    'bad.bas',
  );
  assert.deepEqual(forWithoutNext, [
    { line: 1, message: 'FOR without NEXT', severity: 'error', code: 'SUB vwatch ()' },
  ]);
  console.log('✅ QB64 error blocks are detected whatever the message text');

  const missingParen = parseQB64Output(
    '[..] 20%\rMissing )\nCaused by (or after):PRINT FOO$ (\nLINE 2:PRINT foo$(\n',
    'bad2.bas',
  );
  assert.equal(missingParen.length, 1);
  assert.equal(missingParen[0].line, 1);
  assert.equal(missingParen[0].message, 'Missing )\nCaused by (or after): PRINT FOO$ (');
  console.log('✅ QB64 error blocks survive progress bars and keep the cause');

  const unusedVariable = parseQB64Output(
    '[....] 100%\nw2.bas:1: warning: unused variable\n    q%   INTEGER\n\n' +
      'Compiling C++ code into EXE...\nOutput: w2.exe\n',
    'w2.bas',
  );
  assert.deepEqual(unusedVariable, [
    { line: 0, message: 'unused variable: q% INTEGER', severity: 'warning', code: '' },
  ]);
  console.log('✅ QB64 -w warnings are reported once with their detail line');

  const colored = parseQB64Output(
    '\x1b[31mIllegal string-number conversion\x1b[0m\nLINE 7:x = "a"\n',
    'pe.bas',
  );
  assert.equal(colored[0].message, 'Illegal string-number conversion');
  assert.equal(colored[0].line, 6);
  console.log('✅ Colored compiler output is parsed after stripping ANSI codes');

  assert.deepEqual(
    parseQB64Output('C:\\work\\src\\main.bas:3: warning: unused variable\n', 'main.bas'),
    [{ line: 2, message: 'unused variable', severity: 'warning', code: '' }],
  );
  console.log('✅ Located diagnostics with full Windows paths match the file');

  assert.deepEqual(parseQB64Output('other.bas:3: warning: x\n', 'main.bas'), []);
  console.log('✅ Located diagnostics for other files are ignored');
} finally {
  Module._load = originalLoad;
}
