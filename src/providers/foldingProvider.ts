/**
 * QBasic Nexus - Provider: Folding Range
 * Code folding for SUB/FUNCTION/TYPE/IF/DO/FOR/SELECT/WHILE blocks and comment blocks
 */

import vscode = require('vscode');
import { collectQBasicFoldingRanges } from '../shared/editorLayout';

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

export {
  QBasicFoldingRangeProvider,
};
