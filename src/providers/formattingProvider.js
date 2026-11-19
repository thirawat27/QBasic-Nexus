/**
 * QBasic Nexus - Provider: Document Formatting
 * Auto-indent and keyword capitalization on format document / format selection
 */

'use strict';

const vscode = require('vscode');
const { formatQBasicLines } = require('../shared/editorLayout');

/**
 * Format the whole document but only emit edits for lines in
 * [fromLine, toLine]. Indentation depends on the blocks opened above the
 * range, so the lines before it are still read.
 */
function buildFormattingEdits(document, options, fromLine = 0, toLine = Infinity) {
  const edits = [];
  const originalLines = document.getText().split(/\r?\n/);
  const formattedLines = formatQBasicLines(originalLines, options);
  const last = Math.min(toLine, originalLines.length - 1);

  for (let index = Math.max(0, fromLine); index <= last; index++) {
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

class QBasicDocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document, options) {
    return buildFormattingEdits(document, options);
  }

  provideDocumentRangeFormattingEdits(document, range, options) {
    // A selection that ends at column 0 of a line does not include that line.
    const endLine =
      range.end.character === 0 && range.end.line > range.start.line
        ? range.end.line - 1
        : range.end.line;
    return buildFormattingEdits(document, options, range.start.line, endLine);
  }
}

module.exports = { QBasicDocumentFormattingEditProvider, buildFormattingEdits };
