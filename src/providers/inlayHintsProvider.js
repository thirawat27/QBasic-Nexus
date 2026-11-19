/**
 * QBasic Nexus - Provider: Inlay Hints
 * Parameter names at call sites and suffix-implied variable types
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { CONFIG } = require('../extension/constants');
const { getConfig } = require('../extension/utils');
const { workspaceAnalyzer } = require('../shared/workspaceAnalysis');
const { indexProcedures } = require('../shared/procedureIndex');
const { computeInlayHints } = require('../shared/inlayHints');

const RESERVED = new Set(
  [...Object.keys(KEYWORDS), ...Object.keys(FUNCTIONS)].map((name) =>
    name.toUpperCase(),
  ),
);

class QBasicInlayHintsProvider {
  constructor() {
    this._onDidChange = new vscode.EventEmitter();
    this.onDidChangeInlayHints = this._onDidChange.event;
  }

  refresh() {
    this._onDidChange.fire();
  }

  async provideInlayHints(document, range) {
    const parameterNames = getConfig(CONFIG.INLAY_PARAMETER_NAMES, true);
    const variableTypes = getConfig(CONFIG.INLAY_VARIABLE_TYPES, false);
    if (!parameterNames && !variableTypes) return [];

    const fileAnalyses = await workspaceAnalyzer.getFileAnalyses(document, {
      awaitWorkspace: false,
    });
    const lines = fileAnalyses[0].analysis.lines;

    return computeInlayHints(lines, {
      fromLine: range.start.line,
      toLine: range.end.line,
      procedures: indexProcedures(fileAnalyses),
      builtins: FUNCTIONS,
      reserved: RESERVED,
      parameterNames,
      variableTypes,
    }).map((hint) => {
      const inlay = new vscode.InlayHint(
        new vscode.Position(hint.line, hint.character),
        hint.label,
        hint.kind === 'parameter'
          ? vscode.InlayHintKind.Parameter
          : vscode.InlayHintKind.Type,
      );
      if (hint.kind === 'parameter') inlay.paddingRight = true;
      return inlay;
    });
  }
}

module.exports = { QBasicInlayHintsProvider };
