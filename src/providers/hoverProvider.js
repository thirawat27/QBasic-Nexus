/**
 * QBasic Nexus - Provider: Hover
 * Hover documentation for keywords, built-in functions, and user-defined SUB/FUNCTIONs
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { PATTERNS } = require('./patterns');
const {
  SYMBOL_KIND,
  findDefinitionInAnalysis,
  getDocumentAnalysis,
} = require('../shared/documentAnalysis');

const USER_SYMBOL_LABELS = Object.freeze({
  [SYMBOL_KIND.FUNCTION]: 'function',
  [SYMBOL_KIND.METHOD]: 'sub',
  [SYMBOL_KIND.STRUCT]: 'type',
  [SYMBOL_KIND.CONSTANT]: 'constant',
  [SYMBOL_KIND.EVENT]: 'label',
  variable: 'variable',
});

class QBasicHoverProvider {
  provideHover(document, position) {
    const range = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!range) return null;

    const originalWord = document.getText(range);
    const word = originalWord.toUpperCase();

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

    const analysis = getDocumentAnalysis(document);
    const definition = findDefinitionInAnalysis(analysis, originalWord);
    if (!definition) {
      return null;
    }

    const symbolLabel = USER_SYMBOL_LABELS[definition.kind] || 'symbol';
    return new vscode.Hover(
      new vscode.MarkdownString(
        `**${originalWord}** *(${symbolLabel})*\n\nDefined at line ${definition.line + 1}`,
      ),
    );
  }
}

module.exports = { QBasicHoverProvider };
