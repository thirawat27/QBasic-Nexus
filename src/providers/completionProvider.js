/**
 * QBasic Nexus - Provider: Completion
 * IntelliSense completions for keywords, built-in functions, and user-defined symbols
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS } = require('../../languageData');
const { PATTERNS, makeDimRegex, makeAssignRegex } = require('./patterns');
const {
  getKeywordCompletionItems,
  getFunctionCompletionItems,
  getCachedVariables,
  setCachedVariables,
} = require('./cache');
const { QBasicDocumentSymbolProvider } = require('./symbolProvider');

class QBasicCompletionItemProvider {
  constructor() {
    this._symbolProvider = new QBasicDocumentSymbolProvider();
  }

  provideCompletionItems(document, _position) {
    // Use pre-cached static items for keywords and functions
    const items = [
      ...getKeywordCompletionItems(),
      ...getFunctionCompletionItems(),
    ];

    // Variables from document (dynamic, needs per-document scan)
    const vars = this._scanVariables(document);
    for (const v of vars) {
      const item = new vscode.CompletionItem(
        v,
        vscode.CompletionItemKind.Variable,
      );
      item.detail = 'Variable';
      item.sortText = `2_${v}`;
      items.push(item);
    }

    // User-defined SUBs and FUNCTIONs (dynamic, needs per-document scan)
    const symbols = this._symbolProvider.provideDocumentSymbols(document);
    for (const sym of symbols) {
      if (
        sym.kind === vscode.SymbolKind.Function ||
        sym.kind === vscode.SymbolKind.Method
      ) {
        const item = new vscode.CompletionItem(
          sym.name,
          sym.kind === vscode.SymbolKind.Function
            ? vscode.CompletionItemKind.Function
            : vscode.CompletionItemKind.Method,
        );
        item.detail = sym.detail;
        item.sortText = `3_${sym.name}`;
        items.push(item);
      }
    }

    return items;
  }

  _scanVariables(document) {
    const cached = getCachedVariables(document);
    if (cached) return cached;

    const text = document.getText();
    const vars = new Set();

    // Use factory helpers to get fresh regex instances with independent lastIndex
    const dimRe = makeDimRegex();
    const assignRe = makeAssignRegex();

    let m;
    while ((m = dimRe.exec(text))) vars.add(m[1]);
    while ((m = assignRe.exec(text))) {
      if (!KEYWORDS[m[1].toUpperCase()]) vars.add(m[1]);
    }

    setCachedVariables(document, vars);
    return vars;
  }
}

module.exports = { QBasicCompletionItemProvider };
