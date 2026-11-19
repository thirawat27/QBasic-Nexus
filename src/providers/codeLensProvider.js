/**
 * QBasic Nexus - Provider: CodeLens
 * Shows "N references" above every SUB and FUNCTION
 */

'use strict';

const vscode = require('vscode');
const { CONFIG } = require('../extension/constants');
const { getConfig } = require('../extension/utils');
const { getDocumentAnalysis } = require('../shared/documentAnalysis');
const { workspaceAnalyzer } = require('../shared/workspaceAnalysis');
const {
  getProcedures,
  findIncomingCalls,
} = require('../shared/procedureIndex');

class QBasicCodeLensProvider {
  constructor() {
    this._onDidChange = new vscode.EventEmitter();
    this.onDidChangeCodeLenses = this._onDidChange.event;
  }

  refresh() {
    this._onDidChange.fire();
  }

  provideCodeLenses(document) {
    if (!getConfig(CONFIG.CODE_LENS, true)) return [];

    return getProcedures(getDocumentAnalysis(document)).map((proc) => {
      const lens = new vscode.CodeLens(
        new vscode.Range(proc.line, proc.nameStart, proc.line, proc.nameEnd),
      );
      lens.document = document;
      lens.proc = proc;
      return lens;
    });
  }

  async resolveCodeLens(lens) {
    const { document, proc } = lens;
    const fileAnalyses = await workspaceAnalyzer.getFileAnalyses(document);
    const locations = [];
    for (const group of findIncomingCalls(fileAnalyses, proc.normName)) {
      const uri = vscode.Uri.file(group.file);
      for (const site of group.sites) {
        locations.push(
          new vscode.Location(
            uri,
            new vscode.Range(site.line, site.start, site.line, site.end),
          ),
        );
      }
    }

    const count = locations.length;
    lens.command = {
      title: count === 1 ? '1 reference' : `${count} references`,
      command: count > 0 ? 'editor.action.showReferences' : '',
      arguments:
        count > 0 ? [document.uri, lens.range.start, locations] : undefined,
    };
    return lens;
  }
}

module.exports = { QBasicCodeLensProvider };
