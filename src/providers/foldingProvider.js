/**
 * QBasic Nexus - Provider: Folding Range
 * Code folding for SUB/FUNCTION/TYPE/IF/DO/FOR/SELECT/WHILE blocks and comment blocks
 */

'use strict';

const vscode = require('vscode');
const { collectQBasicFoldingRanges } = require('../shared/editorLayout');

class QBasicFoldingRangeProvider {
  provideFoldingRanges(document) {
    const text = document.getText();
    const lines = text.split(/\r?\n/);

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
