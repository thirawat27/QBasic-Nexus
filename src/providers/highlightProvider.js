/**
 * QBasic Nexus - Provider: Document Highlight
 * Highlights all occurrences of the word under the cursor
 */

'use strict';

const vscode = require('vscode');
const { escapeRegex } = require('./patterns');

class QBasicDocumentHighlightProvider {
  provideDocumentHighlights(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const highlights = [];
    const wordPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;
      let match;

      // MUST reset lastIndex before each new line — the regex is reused across
      // iterations and lastIndex from the previous line carries over otherwise
      wordPattern.lastIndex = 0;

      while ((match = wordPattern.exec(line)) !== null) {
        const range = new vscode.Range(
          i,
          match.index,
          i,
          match.index + word.length,
        );

        // Determine if it's a write or read
        const lineText = line.substring(0, match.index + word.length);
        const isWrite =
          /\s*=\s*$/.test(line.substring(match.index + word.length)) ||
          /\bDIM\s+(?:SHARED\s+)?$/i.test(lineText.substring(0, match.index));

        highlights.push(
          new vscode.DocumentHighlight(
            range,
            isWrite
              ? vscode.DocumentHighlightKind.Write
              : vscode.DocumentHighlightKind.Read,
          ),
        );
      }
    }

    return highlights;
  }
}

module.exports = { QBasicDocumentHighlightProvider };
