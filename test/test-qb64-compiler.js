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
} finally {
  Module._load = originalLoad;
}
