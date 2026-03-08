/**
 * QBasic Nexus - Provider: Hover
 * Hover documentation for keywords, built-in functions, and user-defined SUB/FUNCTIONs
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { PATTERNS } = require('./patterns');

class QBasicHoverProvider {
  provideHover(document, position) {
    const range = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$]*/,
    );
    if (!range) return null;

    const word = document.getText(range).toUpperCase();

    // Keyword
    if (KEYWORDS[word]) {
      const k = KEYWORDS[word];
      return new vscode.Hover(
        new vscode.MarkdownString(`**${k.label}** *(keyword)*\n\n${k.detail}`),
      );
    }

    // Function
    if (FUNCTIONS[word]) {
      const f = FUNCTIONS[word];
      return new vscode.Hover(
        new vscode.MarkdownString(
          `**${word}** *(function)*\n\n${f.documentation}`,
        ),
      );
    }

    // Check if it's a user-defined SUB/FUNCTION
    const originalWord = document.getText(range);
    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      const match = PATTERNS.SUB_DEF.exec(lineText);
      if (match && match[2].toUpperCase() === word) {
        return new vscode.Hover(
          new vscode.MarkdownString(
            `**${originalWord}** *(${match[1].toLowerCase()})*\n\nDefined at line ${i + 1}`,
          ),
        );
      }
    }

    return null;
  }
}

module.exports = { QBasicHoverProvider };
