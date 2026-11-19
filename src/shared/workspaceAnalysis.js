'use strict';

const {
  workspaceAnalysisManager,
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
} = require('./workspaceAnalysisMulti');

const workspaceAnalyzer = {
  async getWorkspaceAnalysis(document, options = {}) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri)
      .getWorkspaceAnalysis(document, options);
  },

  async findWorkspaceIdentifierMatches(document, identifier, options = {}) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri)
      .findWorkspaceIdentifierMatches(document, identifier, options);
  },

  async getFileAnalyses(document, options = {}) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri || options.uri)
      .getFileAnalyses(document, options);
  },

  /**
   * Analyses of every QBasic file in every workspace folder.
   * @returns {Promise<Array<{file: string, analysis: object}>>}
   */
  async getAllFileAnalyses() {
    const folders = workspaceAnalysisManager.getWorkspaceFolderUris();
    const seen = new Set();
    const result = [];
    for (const folderUri of folders) {
      for (const entry of await workspaceAnalysisManager
        .getAnalyzer(folderUri)
        .getFileAnalyses(null)) {
        if (seen.has(entry.file)) continue;
        seen.add(entry.file);
        result.push(entry);
      }
    }
    return result;
  },

  prepareWorkspace(target) {
    const documentUri =
      target && typeof target === 'object'
        ? target.scheme
          ? target
          : target.uri || null
        : null;

    return workspaceAnalysisManager
      .getAnalyzer(documentUri)
      .prepareWorkspace();
  },

  warmFile(target) {
    if (!target) {
      return Promise.resolve(null);
    }

    const filePath =
      typeof target === 'string'
        ? target
        : target.fsPath || target.uri?.fsPath || null;
    const documentUri =
      typeof target === 'string'
        ? null
        : target.scheme
        ? target
        : target.uri || null;

    if (!filePath) {
      return Promise.resolve(null);
    }

    return workspaceAnalysisManager
      .getAnalyzer(documentUri)
      .warmFile(filePath);
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
