/**
 * QBasic Nexus - Provider: Document Symbol
 * Provides the Outline view with SUBs, FUNCTIONs, TYPEs, CONSTs, and Labels
 */

'use strict';

const vscode = require('vscode');
const { PATTERNS } = require('./patterns');
const { getCachedSymbols, setCachedSymbols } = require('./cache');

class QBasicDocumentSymbolProvider {
  provideDocumentSymbols(document) {
    // Check cache first
    const cached = getCachedSymbols(document);
    if (cached) return cached;

    const symbols = [];

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;

      if (PATTERNS.COMMENT.test(text) || PATTERNS.DECLARE.test(text)) continue;

      let match;

      // SUB/FUNCTION
      if ((match = PATTERNS.SUB_DEF.exec(text))) {
        const kind =
          match[1].toUpperCase() === 'FUNCTION'
            ? vscode.SymbolKind.Function
            : vscode.SymbolKind.Method;
        symbols.push(
          new vscode.DocumentSymbol(
            match[2],
            match[1].toUpperCase(),
            kind,
            line.range,
            line.range,
          ),
        );
      }
      // TYPE
      else if ((match = PATTERNS.TYPE_DEF.exec(text))) {
        symbols.push(
          new vscode.DocumentSymbol(
            match[1],
            'TYPE',
            vscode.SymbolKind.Struct,
            line.range,
            line.range,
          ),
        );
      }
      // CONST
      else if ((match = PATTERNS.CONST_DEF.exec(text))) {
        symbols.push(
          new vscode.DocumentSymbol(
            match[1],
            'CONST',
            vscode.SymbolKind.Constant,
            line.range,
            line.range,
          ),
        );
      }
      // Label
      else if ((match = PATTERNS.LABEL.exec(text))) {
        symbols.push(
          new vscode.DocumentSymbol(
            match[1],
            'Label',
            vscode.SymbolKind.Event,
            line.range,
            line.range,
          ),
        );
      }
    }

    setCachedSymbols(document, symbols);
    return symbols;
  }
}

module.exports = { QBasicDocumentSymbolProvider };
