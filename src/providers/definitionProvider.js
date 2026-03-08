/**
 * QBasic Nexus - Provider: Definition
 * Go-to-Definition for SUBs, FUNCTIONs, TYPEs, CONSTs, labels, and DIM vars
 */

'use strict';

const vscode = require('vscode');
const { PATTERNS, escapeRegex, IDENTIFIER_CHAR_CLASS } = require('./patterns');

class QBasicDefinitionProvider {
  provideDefinition(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const escapedWord = escapeRegex(word);
    const patterns = [
      new RegExp(
        `^\\s*(?:SUB|FUNCTION|TYPE)\\s+${escapedWord}(?![${IDENTIFIER_CHAR_CLASS}])`,
        'i',
      ),
      new RegExp(`^${escapedWord}:(?![${IDENTIFIER_CHAR_CLASS}])`, 'i'),
      new RegExp(
        `^\\s*CONST\\s+${escapedWord}(?![${IDENTIFIER_CHAR_CLASS}])`,
        'i',
      ),
      new RegExp(
        `\\bDIM\\s+(?:SHARED\\s+)?${escapedWord}(?![${IDENTIFIER_CHAR_CLASS}])`,
        'i',
      ),
    ];

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      if (PATTERNS.DECLARE.test(lineText)) continue;

      for (const pattern of patterns) {
        if (pattern.test(lineText)) {
          return new vscode.Location(document.uri, new vscode.Position(i, 0));
        }
      }
    }

    return null;
  }
}

module.exports = { QBasicDefinitionProvider };
