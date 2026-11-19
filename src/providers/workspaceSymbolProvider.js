/**
 * QBasic Nexus - Provider: Workspace Symbol
 * Go to Symbol in Workspace (Ctrl+T) for SUBs, FUNCTIONs, TYPEs, CONSTs and labels
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const { CONFIG } = require('../extension/constants');
const {
  SYMBOL_KIND,
  getDocumentAnalysis,
} = require('../shared/documentAnalysis');
const { workspaceAnalyzer } = require('../shared/workspaceAnalysis');
const { searchSymbols } = require('../shared/symbolSearch');

const SYMBOL_KIND_MAP = Object.freeze({
  [SYMBOL_KIND.FUNCTION]: vscode.SymbolKind.Function,
  [SYMBOL_KIND.METHOD]: vscode.SymbolKind.Method,
  [SYMBOL_KIND.STRUCT]: vscode.SymbolKind.Struct,
  [SYMBOL_KIND.CONSTANT]: vscode.SymbolKind.Constant,
  [SYMBOL_KIND.EVENT]: vscode.SymbolKind.Event,
});

class QBasicWorkspaceSymbolProvider {
  async provideWorkspaceSymbols(query) {
    const byFile = new Map();
    for (const entry of await workspaceAnalyzer.getAllFileAnalyses()) {
      byFile.set(entry.file, entry);
    }

    // Open editors may hold unsaved changes; prefer their live text.
    for (const document of vscode.workspace.textDocuments) {
      if (
        document.languageId === CONFIG.LANGUAGE_ID &&
        document.uri.scheme === 'file'
      ) {
        byFile.set(document.uri.fsPath, {
          file: document.uri.fsPath,
          analysis: getDocumentAnalysis(document),
        });
      }
    }

    return searchSymbols([...byFile.values()], query).map(
      (entry) =>
        new vscode.SymbolInformation(
          entry.name,
          SYMBOL_KIND_MAP[entry.kind] || vscode.SymbolKind.Variable,
          `${entry.detail} · ${path.basename(entry.file)}`,
          new vscode.Location(
            vscode.Uri.file(entry.file),
            new vscode.Range(entry.line, entry.start, entry.line, entry.end),
          ),
        ),
    );
  }
}

module.exports = { QBasicWorkspaceSymbolProvider };
