'use strict';

const {
  workspaceAnalysisManager,
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
} = require('./workspaceAnalysisMulti');

const workspaceAnalyzer = {
  async getWorkspaceAnalysis(document) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri)
      .getWorkspaceAnalysis(document);
  },

  async findWorkspaceIdentifierMatches(document, identifier, options = {}) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri)
      .findWorkspaceIdentifierMatches(document, identifier, options);
  },

  invalidateFile(target) {
    if (!target) return;

    const filePath =
      typeof target === 'string'
        ? target
        : target.fsPath || target.uri?.fsPath || null;
    const documentUri =
      typeof target === 'string'
        ? null
        : target.scheme ? target : target.uri || null;

    workspaceAnalysisManager.invalidateFile(filePath, documentUri);
  },

  clear() {
    workspaceAnalysisManager.clear();
  },

  dispose() {
    workspaceAnalysisManager.dispose();
  },
};

module.exports = {
  workspaceAnalyzer,
  workspaceAnalysisManager,
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
};
