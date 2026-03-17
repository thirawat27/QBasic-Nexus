/**
 * QBasic Nexus - Provider: Document Formatting
 * Auto-indent and keyword capitalization on format document
 */

'use strict';

const vscode = require('vscode');
const { formatQBasicLines } = require('../shared/editorLayout');

class QBasicDocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document, options) {
    const edits = [];
    const originalLines = document.getText().split(/\r?\n/);
    const formattedLines = formatQBasicLines(originalLines, options);

    for (let index = 0; index < originalLines.length; index++) {
      if (originalLines[index] !== formattedLines[index]) {
        edits.push(
          vscode.TextEdit.replace(
            new vscode.Range(index, 0, index, originalLines[index].length),
            formattedLines[index],
          ),
        );
      }
    }

    return edits;
  }
}

module.exports = { QBasicDocumentFormattingEditProvider };
