/**
 * QBasic Nexus - Provider: Reference
 * Find all references to a symbol in the document
 */

'use strict';

const vscode = require('vscode');
const { PATTERNS } = require('./patterns');
const { findDocumentIdentifierMatches } = require('../shared/documentAnalysis');

class QBasicReferenceProvider {
  provideReferences(document, position, context) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const matches = findDocumentIdentifierMatches(document, word, {
      includeDeclaration: context.includeDeclaration,
    });

    return matches.map(
      ({ line, start, end }) =>
        new vscode.Location(
          document.uri,
          new vscode.Range(line, start, line, end),
        ),
    );
  }
}

module.exports = { QBasicReferenceProvider };
