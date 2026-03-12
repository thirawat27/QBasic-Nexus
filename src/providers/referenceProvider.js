/**
 * QBasic Nexus - Provider: Reference
 * Find all references to a symbol in the document
 */

'use strict';

const vscode = require('vscode');
const { PATTERNS } = require('./patterns');
const { workspaceAnalyzer } = require('../shared/workspaceAnalysis');

class QBasicReferenceProvider {
  async provideReferences(document, position, context) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const matches = await workspaceAnalyzer.findWorkspaceIdentifierMatches(document, word, {
      includeDeclaration: context.includeDeclaration,
    });

    return matches.map(
      ({ file, line, start, end }) =>
        new vscode.Location(
          vscode.Uri.file(file),
          new vscode.Range(line, start, line, end),
        ),
    );
  }
}

module.exports = { QBasicReferenceProvider };
