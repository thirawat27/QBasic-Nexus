/**
 * QBasic Nexus - Provider: Definition
 * Go-to-Definition for SUBs, FUNCTIONs, TYPEs, CONSTs, labels, and DIM vars
 */

import vscode = require('vscode');
import { PATTERNS } from './patterns';
import { findDefinitionInAnalysis } from '../shared/documentAnalysis';
import { workspaceAnalyzer } from '../shared/workspaceAnalysis';

class QBasicDefinitionProvider {
  async provideDefinition(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      PATTERNS.IDENTIFIER,
    );
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const analysis = await workspaceAnalyzer.getWorkspaceAnalysis(document);
    const definition = findDefinitionInAnalysis(analysis, word);

    if (!definition) {
      return null;
    }
    
    const uri = definition.file ? vscode.Uri.file(definition.file) : document.uri;

    return new vscode.Location(
      uri,
      new vscode.Range(
        definition.line,
        definition.start,
        definition.line,
        definition.end,
      ),
    );
  }
}

export {
  QBasicDefinitionProvider,
};
