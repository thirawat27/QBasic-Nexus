import vscode = require('vscode');
import {
  workspaceAnalysisManager,
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
  type FileAnalysisEntry,
} from './workspaceAnalysisMulti';

const workspaceAnalyzer = {
  async getWorkspaceAnalysis(
    document: vscode.TextDocument,
    options: { awaitWorkspace?: boolean } = {},
  ) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri)
      .getWorkspaceAnalysis(document, options);
  },

  async findWorkspaceIdentifierMatches(
    document: vscode.TextDocument,
    identifier: string,
    options: { includeDeclaration?: boolean; awaitWorkspace?: boolean } = {},
  ) {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri)
      .findWorkspaceIdentifierMatches(document, identifier, options);
  },

  /**
   * Per-file analyses for the workspace of `document` (or `options.uri` when
   * the file is not open), with the live document first.
   */
  async getFileAnalyses(
    document: vscode.TextDocument | null,
    options: { uri?: vscode.Uri; awaitWorkspace?: boolean } = {},
  ): Promise<FileAnalysisEntry[]> {
    return workspaceAnalysisManager
      .getAnalyzer(document?.uri || options.uri)
      .getFileAnalyses(document, options);
  },

  /** Analyses of every QBasic file in every workspace folder. */
  async getAllFileAnalyses(): Promise<FileAnalysisEntry[]> {
    const folders = workspaceAnalysisManager.getWorkspaceFolderUris();
    const seen = new Set<string>();
    const result: FileAnalysisEntry[] = [];
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

export {
  workspaceAnalyzer,
  workspaceAnalysisManager,
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
};
