/**
 * QBasic Nexus - Provider: Folding Range
 * Code folding for SUB/FUNCTION/TYPE/IF/DO/FOR/SELECT/WHILE blocks and comment blocks
 */

'use strict';

const vscode = require('vscode');
const { collectQBasicFoldingRanges } = require('../shared/editorLayout');

class QBasicFoldingRangeProvider {
  provideFoldingRanges(document) {
    const lines = [];
    for (let index = 0; index < document.lineCount; index++) {
      lines.push(document.lineAt(index).text);
    }

    return collectQBasicFoldingRanges(lines).map(
      ({ start, end, kind }) =>
        new vscode.FoldingRange(
          start,
          end,
          kind === 'comment' ? vscode.FoldingRangeKind.Comment : undefined,
        ),
    );
  }
}

module.exports = { QBasicFoldingRangeProvider };
