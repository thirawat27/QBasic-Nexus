/**
 * QBasic Nexus - Provider: On-Type Formatting
 * Auto-indent triggered after pressing Enter inside a QBasic block
 */

'use strict';

const vscode = require('vscode');
const { getOnTypeIndentText } = require('../shared/editorLayout');

class QBasicOnTypeFormattingEditProvider {
  /**
   * Provides on-type formatting edits (triggered after newline)
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {string} ch - The character that triggered formatting
   * @returns {vscode.TextEdit[]}
   */
  provideOnTypeFormattingEdits(document, position, ch) {
    if (ch !== '\n' || position.line === 0) {
      return [];
    }

    const prevLine = document.lineAt(position.line - 1).text;
    const indentText = getOnTypeIndentText(prevLine);
    return indentText ? [vscode.TextEdit.insert(position, indentText)] : [];
  }
}

module.exports = { QBasicOnTypeFormattingEditProvider };
