/**
 * QBasic Nexus - Provider: Completion
 * IntelliSense completions for keywords, built-in functions, and user-defined symbols
 */

'use strict';

const vscode = require('vscode');
const {
  getKeywordCompletionItems,
  getFunctionCompletionItems,
} = require('./cache');
const {
  SYMBOL_KIND,
  getDocumentAnalysis,
} = require('../shared/documentAnalysis');

class QBasicCompletionItemProvider {
  provideCompletionItems(document, _position) {
    // Use pre-cached static items for keywords and functions
    const items = [
      ...getKeywordCompletionItems(),
      ...getFunctionCompletionItems(),
    ];
    const analysis = getDocumentAnalysis(document);

    // Variables from document (dynamic, needs per-document scan)
    for (const variableName of analysis.variables) {
      const item = new vscode.CompletionItem(
        variableName,
        vscode.CompletionItemKind.Variable,
      );
      item.detail = 'Variable';
      item.sortText = `2_${variableName}`;
      items.push(item);
    }

    // User-defined SUBs and FUNCTIONs share the same cached analysis pass.
    for (const symbol of analysis.symbols) {
      if (
        symbol.kind === SYMBOL_KIND.FUNCTION ||
        symbol.kind === SYMBOL_KIND.METHOD
      ) {
        const item = new vscode.CompletionItem(
          symbol.name,
          symbol.kind === SYMBOL_KIND.FUNCTION
            ? vscode.CompletionItemKind.Function
            : vscode.CompletionItemKind.Method,
        );
        item.detail = symbol.detail;
        item.sortText = `3_${symbol.name}`;
        items.push(item);
      }
    }

    return items;
  }
}

module.exports = { QBasicCompletionItemProvider };
