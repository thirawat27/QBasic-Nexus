/**
 * QBasic Nexus - Provider: Definition
 * Go-to-Definition for SUBs, FUNCTIONs, TYPEs, CONSTs, labels, and DIM vars
 */

'use strict';

const vscode = require('vscode');
const { PATTERNS } = require('./patterns');
const {
  findDefinitionInAnalysis,
  getDocumentAnalysis,
} = require('../shared/documentAnalysis');

class QBasicDefinitionProvider {
  provideDefinition(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const definition = findDefinitionInAnalysis(getDocumentAnalysis(document), word);

    if (!definition) {
      return null;
    }

    return new vscode.Location(
      document.uri,
      new vscode.Range(
        definition.line,
        definition.start,
        definition.line,
        definition.end,
      ),
    );
  }
}

module.exports = { QBasicDefinitionProvider };
