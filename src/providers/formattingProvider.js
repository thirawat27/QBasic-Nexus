/**
 * QBasic Nexus - Provider: Document Formatting
 * Auto-indent and keyword capitalization on format document
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { PATTERNS } = require('./patterns');

// Pre-built once at module load — avoids O(n) Set construction on every Format call
const UPPER_KEYWORDS = new Set(
  [
    ...Object.keys(KEYWORDS),
    ...Object.keys(FUNCTIONS),
    'AS',
    'TO',
    'STEP',
    'UNTIL',
    'IS',
    'AND',
    'OR',
    'NOT',
    'MOD',
    'XOR',
    'EQV',
    'IMP',
    'SHARED',
    'PRESERVE',
    'ANY',
    'APPEND',
    'BINARY',
    'OUTPUT',
    'INPUT',
    'RANDOM',
    'BEEP',
  ].map((k) => k.toUpperCase()),
);

class QBasicDocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document, options) {
    const edits = [];
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    let level = 0;
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;
      const trimmed = text.trim();

      if (!trimmed) continue;

      // Decrease indent for END/LOOP/NEXT/WEND or ELSE/CASE
      if (
        PATTERNS.BLOCK_END.test(trimmed) ||
        PATTERNS.BLOCK_MID.test(trimmed)
      ) {
        level = Math.max(0, level - 1);
      }

      // Apply indent
      const expectedIndent = indent.repeat(level);

      // Auto-capitalize keywords (skip strings and comments)
      // Uses a smart regex that captures strings/comments in group 1, and regular words in group 2
      const formattedLine = text.replace(
        /(".*?"|'.*|\bREM\b.*)|([a-zA-Z_][a-zA-Z0-9_$]*)/gi,
        (match, literal, word) => {
          if (literal) return literal; // Preserve strings and comments exactly as they are
          if (word && UPPER_KEYWORDS.has(word.toUpperCase())) {
            return word.toUpperCase(); // Capitalize recognized keyword
          }
          return match; // Leave unknown variables/identifiers alone
        },
      );

      const newText = expectedIndent + formattedLine.trimStart();

      if (text !== newText) {
        edits.push(
          vscode.TextEdit.replace(
            new vscode.Range(i, 0, i, text.length),
            newText,
          ),
        );
      }

      // Increase indent for block start
      if (PATTERNS.BLOCK_START.test(trimmed)) {
        // Single-line IF doesn't increase indent
        if (!/^\s*IF\b/i.test(trimmed) || /\bTHEN\s*$/i.test(trimmed)) {
          level++;
        }
      }
      // ELSE/ELSEIF/CASE also increase after processing
      else if (PATTERNS.BLOCK_MID.test(trimmed)) {
        level++;
      }
    }

    return edits;
  }
}

module.exports = { QBasicDocumentFormattingEditProvider };
