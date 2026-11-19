/**
 * QBasic Nexus - Provider: Reference
 * Find all references to a symbol in the document
 */

import vscode = require('vscode');
import { PATTERNS } from './patterns';
import { workspaceAnalyzer } from '../shared/workspaceAnalysis';

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

export {
  QBasicReferenceProvider,
};
