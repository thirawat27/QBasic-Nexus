/**
 * QBasic Nexus - Provider: Document Symbol
 * Provides the Outline view with SUBs, FUNCTIONs, TYPEs, CONSTs, and Labels
 */

'use strict';

const vscode = require('vscode');
const { getCachedSymbols, setCachedSymbols } = require('./cache');
const {
  SYMBOL_KIND,
  getDocumentAnalysis,
} = require('../shared/documentAnalysis');

const SYMBOL_KIND_MAP = Object.freeze({
  [SYMBOL_KIND.FUNCTION]: vscode.SymbolKind.Function,
  [SYMBOL_KIND.METHOD]: vscode.SymbolKind.Method,
  [SYMBOL_KIND.STRUCT]: vscode.SymbolKind.Struct,
  [SYMBOL_KIND.CONSTANT]: vscode.SymbolKind.Constant,
  [SYMBOL_KIND.EVENT]: vscode.SymbolKind.Event,
});

class QBasicDocumentSymbolProvider {
  provideDocumentSymbols(document) {
    // Check cache first
    const cached = getCachedSymbols(document);
    if (cached) return cached;

    const analysis = getDocumentAnalysis(document);
    const symbols = analysis.symbols.map((symbol) => {
      const range = document.lineAt(symbol.line).range;
      return new vscode.DocumentSymbol(
        symbol.name,
        symbol.detail,
        SYMBOL_KIND_MAP[symbol.kind] || vscode.SymbolKind.Variable,
        range,
        range,
      );
    });

    setCachedSymbols(document, symbols);
    return symbols;
  }
}

module.exports = { QBasicDocumentSymbolProvider };
