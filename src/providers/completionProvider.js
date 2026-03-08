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

const SYMBOL_COMPLETION_KIND_MAP = Object.freeze({
  [SYMBOL_KIND.FUNCTION]: vscode.CompletionItemKind.Function,
  [SYMBOL_KIND.METHOD]: vscode.CompletionItemKind.Method,
  [SYMBOL_KIND.STRUCT]: vscode.CompletionItemKind.Struct,
  [SYMBOL_KIND.CONSTANT]: vscode.CompletionItemKind.Constant,
});

function getDynamicCompletionItems(analysis) {
  if (analysis.dynamicCompletionItems) {
    return analysis.dynamicCompletionItems;
  }

  const items = [];

  for (const variableName of analysis.variables) {
    const item = new vscode.CompletionItem(
      variableName,
      vscode.CompletionItemKind.Variable,
    );
    item.detail = 'Variable';
    item.sortText = `2_${variableName}`;
    items.push(item);
  }

  for (const symbol of analysis.symbols) {
    const kind = SYMBOL_COMPLETION_KIND_MAP[symbol.kind];
    if (!kind) continue;

    const item = new vscode.CompletionItem(symbol.name, kind);
    item.detail = symbol.detail;
    item.sortText = `3_${symbol.name}`;
    items.push(item);
  }

  analysis.dynamicCompletionItems = items;
  return items;
}

class QBasicCompletionItemProvider {
  provideCompletionItems(document, _position) {
    // Use pre-cached static items for keywords and functions
    const analysis = getDocumentAnalysis(document);
    return [
      ...getKeywordCompletionItems(),
      ...getFunctionCompletionItems(),
      ...getDynamicCompletionItems(analysis),
    ];
  }
}

module.exports = { QBasicCompletionItemProvider };
