/**
 * QBasic Nexus - Provider: Rename
 * Rename a symbol across the entire workspace (cross-file support)
 */

'use strict';

const vscode = require('vscode');
const {
  isBuiltInFunction,
  isReservedWord,
} = require('../shared/languageRegistry');
const { PATTERNS } = require('./patterns');
const { workspaceAnalyzer } = require('../shared/workspaceAnalysis');

class QBasicRenameProvider {
  async provideRenameEdits(document, position, newName, _token) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const oldName = document.getText(wordRange);

    // Validate new name
    if (!/^[a-zA-Z_][a-zA-Z0-9_$%!#&]*$/.test(newName)) {
      throw new Error('Invalid identifier name');
    }

    // Check if it's a keyword
    if (isReservedWord(oldName) || isReservedWord(newName)) {
      throw new Error('Cannot rename keywords');
    }

    const edits = new vscode.WorkspaceEdit();
    
    // Search across workspace via workspaceAnalyzer
    // Include declarations so they are renamed too
    const options = { includeDeclaration: true };
    const matches = await workspaceAnalyzer.findWorkspaceIdentifierMatches(document, oldName, options);

    for (const match of matches) {
      const uri = vscode.Uri.file(match.file);
      const range = new vscode.Range(match.line, match.start, match.line, match.end);
      edits.replace(uri, range, newName);
    }

    return edits;
  }

  prepareRename(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) {
      throw new Error('Cannot rename this element');
    }

    const word = document.getText(wordRange);

    // Check if it's a keyword or built-in function
    if (isReservedWord(word) || isBuiltInFunction(word)) {
      throw new Error('Cannot rename keywords or built-in functions');
    }

    return { range: wordRange, placeholder: word };
  }
}

module.exports = { QBasicRenameProvider };
