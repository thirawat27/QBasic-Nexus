'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const { getDocumentAnalysis, analyzeQBasicText, findIdentifierMatchesInAnalysis } = require('./documentAnalysis');

const DEFAULT_WORKSPACE_INDEX_MAX_FILES = 5000;
const WORKSPACE_GLOB = '**/*.{bas,bi,bm,inc}';
const WORKSPACE_EXCLUDE_GLOB = '**/{node_modules,.git}/**';

class WorkspaceAnalysis {
  constructor() {
    this.symbolCache = new Map();
    this.lastModified = new Map();
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.lastScanSummary = {
      indexedFiles: 0,
      limitHit: false,
      maxFiles: DEFAULT_WORKSPACE_INDEX_MAX_FILES,
    };
  }

  async parseWorkspaceSymbols() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doParseWorkspaceSymbols();
    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async doParseWorkspaceSymbols() {
    try {
      const seenFiles = new Set();
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      const maxFiles = this.getWorkspaceIndexMaxFiles();
      let remaining = maxFiles === 0 ? undefined : maxFiles;
      let limitHit = false;

      for (const [index, folder] of workspaceFolders.entries()) {
        if (remaining === 0) {
          limitHit = true;
          break;
        }

        const files = await vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, WORKSPACE_GLOB),
          WORKSPACE_EXCLUDE_GLOB,
          remaining
        );

        for (const file of files) {
          seenFiles.add(file.fsPath);
          await this.parseFileSymbols(file.fsPath);
        }

        if (remaining !== undefined) {
          remaining = Math.max(remaining - files.length, 0);
          if (remaining === 0 && (index < workspaceFolders.length - 1 || files.length > 0)) {
            limitHit = true;
          }
        }
      }

      this.removeMissingFiles(seenFiles);
      this.lastScanSummary = {
        indexedFiles: seenFiles.size,
        limitHit,
        maxFiles,
      };

      if (limitHit && maxFiles > 0) {
        console.warn(
          `[QBasic Nexus] Workspace indexing hit the configured limit (${maxFiles} files). Increase qbasic-nexus.workspaceIndexMaxFiles for full-symbol search.`
        );
      }
    } catch (err) {
      console.error('Error parsing workspace symbols:', err);
    }
  }

  async parseFileSymbols(filePath) {
    try {
      const stat = await fs.stat(filePath);
      const lastMod = stat.mtimeMs;

      if (this.symbolCache.has(filePath) && this.lastModified.get(filePath) === lastMod) {
        return this.symbolCache.get(filePath);
      }

      const content = await fs.readFile(filePath, 'utf8');
      const analysis = analyzeQBasicText(content);

      this.symbolCache.set(filePath, analysis);
      this.lastModified.set(filePath, lastMod);
      return analysis;
    } catch (_e) {
      this.removeFile(filePath);
      return null;
    }
  }

  async refreshFile(filePath) {
    if (!isQBasicFile(filePath)) return null;
    return this.parseFileSymbols(filePath);
  }

  queueRefresh() {
    if (!this.refreshPromise) {
      void this.parseWorkspaceSymbols();
    }
  }

  invalidateFile(filePath) {
    if (!filePath) return;
    this.lastModified.delete(filePath);
  }

  removeFile(filePath) {
    if (!filePath) return;
    this.symbolCache.delete(filePath);
    this.lastModified.delete(filePath);
  }

  clear() {
    this.symbolCache.clear();
    this.lastModified.clear();
    this.lastScanSummary = {
      indexedFiles: 0,
      limitHit: false,
      maxFiles: this.getWorkspaceIndexMaxFiles(),
    };
  }

  getWorkspaceIndexMaxFiles() {
    const rawValue = vscode.workspace
      .getConfiguration('qbasic-nexus')
      .get('workspaceIndexMaxFiles', DEFAULT_WORKSPACE_INDEX_MAX_FILES);
    const normalizedValue = Number(rawValue);

    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      return DEFAULT_WORKSPACE_INDEX_MAX_FILES;
    }

    return Math.floor(normalizedValue);
  }

  removeMissingFiles(seenFiles) {
    for (const filePath of this.symbolCache.keys()) {
      if (!seenFiles.has(filePath)) {
        this.removeFile(filePath);
      }
    }
  }

  async getWorkspaceAnalysis(document) {
    const localAnalysis = getDocumentAnalysis(document);
    
    // We get include files
    const includePattern = /^\s*\$INCLUDE\s*:\s*(?:['"])(.+?)(?:['"])/i;
    let includedFiles = [];
    
    const lines = document.getText().split(/\r?\n/);
    for (const line of lines) {
      const match = includePattern.exec(line);
      if (match) {
        const includePath = match[1];
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        let fullPath;
        if (path.isAbsolute(includePath)) {
          fullPath = includePath;
        } else {
          fullPath = path.resolve(path.dirname(document.uri.fsPath), includePath);
          if (!(await fileExists(fullPath)) && workspaceFolder) {
            fullPath = path.resolve(workspaceFolder.uri.fsPath, includePath);
          }
        }
        if (await fileExists(fullPath)) {
          includedFiles.push(fullPath);
        }
      }
    }

    const mergedAnalysis = {
      symbols: [...localAnalysis.symbols],
      variables: new Set(localAnalysis.variables),
      definitions: new Map(localAnalysis.definitions)
    };

    // First merge include files
    for (const file of includedFiles) {
      const analysis = await this.parseFileSymbols(file);
      mergeAnalysisInto(mergedAnalysis, analysis, file);
    }

    // Then merge workspace files (trigger async background parse if not done)
    if (this.symbolCache.size === 0 && !this.isRefreshing) {
      this.queueRefresh();
    }
    
    for (const [filePath, analysis] of this.symbolCache.entries()) {
      if (filePath === document.uri.fsPath || includedFiles.includes(filePath)) continue;

      mergeAnalysisInto(mergedAnalysis, analysis, filePath);
    }

    mergedAnalysis.variables = Array.from(mergedAnalysis.variables);
    return mergedAnalysis;
  }

  async findWorkspaceIdentifierMatches(document, identifier, options = {}) {
    const allMatches = [];
    
    // Check the current document first
    const localMatches = findIdentifierMatchesInAnalysis(getDocumentAnalysis(document), identifier, options);
    for (const match of localMatches) {
        allMatches.push({ ...match, file: document.uri.fsPath });
    }

    // Refresh workspace symbols to ensure cache is populated
    if (this.symbolCache.size === 0 && !this.isRefreshing) {
      await this.parseWorkspaceSymbols();
    }

    for (const [filePath, analysis] of this.symbolCache.entries()) {
      if (filePath === document.uri.fsPath) continue; // Already handled
      
      const fileMatches = findIdentifierMatchesInAnalysis(analysis, identifier, options);
      for (const match of fileMatches) {
        allMatches.push({ ...match, file: filePath });
      }
    }

    return allMatches;
  }
}

const workspaceAnalyzer = new WorkspaceAnalysis();

function mergeAnalysisInto(targetAnalysis, sourceAnalysis, filePath) {
  if (!sourceAnalysis) return;

  for (const sym of sourceAnalysis.symbols) {
    targetAnalysis.symbols.push({ ...sym, file: filePath });
  }

  for (const variableName of sourceAnalysis.variables) {
    targetAnalysis.variables.add(variableName);
  }

  for (const [definitionName, definition] of sourceAnalysis.definitions.entries()) {
    if (!targetAnalysis.definitions.has(definitionName)) {
      targetAnalysis.definitions.set(definitionName, { ...definition, file: filePath });
    }
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isQBasicFile(filePath) {
  return typeof filePath === 'string' && /\.(?:bas|bi|bm|inc)$/i.test(filePath);
}

module.exports = { workspaceAnalyzer };
