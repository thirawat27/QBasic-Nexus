/**
 * QBasic Nexus - Provider: Document Highlight
 * Highlights all occurrences of the word under the cursor
 */

'use strict';

const vscode = require('vscode');
const { PATTERNS } = require('./patterns');
const {
  findDefinitionInAnalysis,
  findIdentifierMatchesInAnalysis,
  getDocumentAnalysis,
} = require('../shared/documentAnalysis');

class QBasicDocumentHighlightProvider {
  provideDocumentHighlights(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const analysis = getDocumentAnalysis(document);
    const definition = findDefinitionInAnalysis(analysis, word);
    const matches = findIdentifierMatchesInAnalysis(analysis, word);

    return matches.map(({ line, start, end }) => {
      const range = new vscode.Range(line, start, line, end);
      const remainder = analysis.lines[line]?.slice(end) || '';
      const isDefinition =
        definition &&
        definition.line === line &&
        definition.start === start &&
        definition.end === end;
      const isWrite =
        isDefinition || /^\s*(?:\([^)]*\)\s*)?=/.test(remainder);

      return new vscode.DocumentHighlight(
        range,
        isWrite
          ? vscode.DocumentHighlightKind.Write
          : vscode.DocumentHighlightKind.Read,
      );
    });
  }
}

module.exports = { QBasicDocumentHighlightProvider };
