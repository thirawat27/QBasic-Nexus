/**
 * QBasic Nexus - Provider: Hover
 * Hover documentation for keywords, built-in functions, and user-defined SUB/FUNCTIONs
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { PATTERNS } = require('./patterns');
const {
  buildKeywordSearchEntries,
  findKeywordEntryAtPosition,
} = require('../shared/keywordLookup');
const {
  SYMBOL_KIND,
  findDefinitionInAnalysis,
} = require('../shared/documentAnalysis');
const { workspaceAnalyzer } = require('../shared/workspaceAnalysis');

const KEYWORD_SEARCH_ENTRIES = buildKeywordSearchEntries(KEYWORDS);

const USER_SYMBOL_LABELS = Object.freeze({
  [SYMBOL_KIND.FUNCTION]: 'function',
  [SYMBOL_KIND.METHOD]: 'sub',
  [SYMBOL_KIND.STRUCT]: 'type',
  [SYMBOL_KIND.CONSTANT]: 'constant',
  [SYMBOL_KIND.EVENT]: 'label',
  variable: 'variable',
});

class QBasicHoverProvider {
  async provideHover(document, position) {
    const lineText = document.lineAt(position.line).text;
    const keywordMatch = findKeywordEntryAtPosition(
      lineText,
      position.character,
      KEYWORD_SEARCH_ENTRIES,
    );
    const range = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    const originalWord = range ? document.getText(range) : '';
    const word = originalWord.toUpperCase();

    if (keywordMatch && /[\s#]/.test(keywordMatch.label)) {
      const keywordDoc = keywordMatch.entry.documentation || keywordMatch.entry.detail;
      return new vscode.Hover(
        new vscode.MarkdownString(keywordDoc),
      );
    }

    // Function
    if (FUNCTIONS[word]) {
      const f = FUNCTIONS[word];
      return new vscode.Hover(
        new vscode.MarkdownString(f.documentation),
      );
    }

    // Keyword
    if (keywordMatch) {
      const k = keywordMatch.entry;
      const keywordDoc = k.documentation || k.detail;
      return new vscode.Hover(
        new vscode.MarkdownString(keywordDoc),
      );
    }

    if (!range) return null;

    const analysis = await workspaceAnalyzer.getWorkspaceAnalysis(document);
    const definition = findDefinitionInAnalysis(analysis, originalWord);
    if (!definition) {
      return null;
    }

    const symbolLabel = USER_SYMBOL_LABELS[definition.kind] || 'symbol';
    const fileBase = definition.file ? require('path').basename(definition.file) : require('path').basename(document.uri.fsPath);
    return new vscode.Hover(
      new vscode.MarkdownString(
        `**${originalWord}** *(${symbolLabel})*\n\nDefined at line ${definition.line + 1} (*File: ${fileBase}*)`,
      ),
    );
  }
}

module.exports = { QBasicHoverProvider };
