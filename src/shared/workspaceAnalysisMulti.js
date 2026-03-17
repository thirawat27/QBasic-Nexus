/**
 * QBasic Nexus - Multi-Workspace Analysis System
 * Workspace-aware symbol analysis with isolated caches per workspace
 */

'use strict';

// Conditional vscode import (only in VS Code environment)
let vscode;
try {
  vscode = require('vscode');
} catch {
  vscode = null;
}

const fs = require('fs');
const path = require('path');
const { getDocumentAnalysis, analyzeQBasicText, findIdentifierMatchesInAnalysis } = require('./documentAnalysis');

class WorkspaceAnalysis {
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
    this.symbolCache = new Map();
    this.lastModified = new Map();
    this.isRefreshing = false;
    this._refreshPromise = null;
    this._hasParsedWorkspace = false;
  }

  async parseWorkspaceSymbols() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this.isRefreshing = true;
    this._refreshPromise = (async () => {
      try {
        if (vscode && vscode.workspace && vscode.workspace.workspaceFolders) {
          for (const folder of vscode.workspace.workspaceFolders) {
            // Only parse files in this workspace
            if (folder.uri.toString() !== this.workspaceId) continue;

            const files = await vscode.workspace.findFiles(
              new vscode.RelativePattern(folder, '**/*.{bas,bi,bm,inc}'),
              '**/{node_modules,.git}/**',
              1000
            );
            for (const file of files) {
              await this.parseFileSymbols(file.fsPath);
            }
          }
        }
        this._hasParsedWorkspace = true;
      } catch (err) {
        console.error(`[WorkspaceAnalysis:${this.workspaceId}] Error parsing workspace symbols:`, err);
      } finally {
        this.isRefreshing = false;
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  async parseFileSymbols(filePath) {
    try {
      const stat = await fs.promises.stat(filePath);
      const lastMod = stat.mtimeMs;

      if (this.symbolCache.has(filePath) && this.lastModified.get(filePath) === lastMod) {
        return this.symbolCache.get(filePath);
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      const analysis = analyzeQBasicText(content);
      
      this.symbolCache.set(filePath, analysis);
      this.lastModified.set(filePath, lastMod);
      return analysis;
    } catch (_e) {
      this.invalidateFile(filePath);
      return null;
    }
  }

  async getWorkspaceAnalysis(document) {
    const localAnalysis = getDocumentAnalysis(document);
    
    // Get include files
    const includePattern = /^\s*\$INCLUDE\s*:\s*(?:['"])(.+?)(?:['"])/i;
    let includedFiles = [];
    
    const lines = document.getText().split(/\r?\n/);
    for (const line of lines) {
      const match = includePattern.exec(line);
      if (match) {
        const includePath = match[1];
        const workspaceFolder = vscode && vscode.workspace ? vscode.workspace.getWorkspaceFolder(document.uri) : null;
        let fullPath;
        if (path.isAbsolute(includePath)) {
          fullPath = includePath;
        } else {
          fullPath = path.resolve(path.dirname(document.uri.fsPath), includePath);
          if (!fs.existsSync(fullPath) && workspaceFolder) {
            fullPath = path.resolve(workspaceFolder.uri.fsPath, includePath);
          }
        }
        if (fs.existsSync(fullPath)) {
          includedFiles.push(fullPath);
        }
      }
    }

    const mergedAnalysis = {
      symbols: [...localAnalysis.symbols],
      variables: new Set(localAnalysis.variables),
      definitions: new Map(localAnalysis.definitions)
    };

    // Merge include files
    for (const file of includedFiles) {
      const analysis = await this.parseFileSymbols(file);
      if (analysis) {
        for (const sym of analysis.symbols) mergedAnalysis.symbols.push({...sym, file});
        for (const v of analysis.variables) mergedAnalysis.variables.add(v);
        for (const [k, v] of analysis.definitions.entries()) {
          if (!mergedAnalysis.definitions.has(k)) {
            mergedAnalysis.definitions.set(k, {...v, file});
          }
        }
      }
    }

    if (!this._hasParsedWorkspace) {
      await this.parseWorkspaceSymbols();
    }

    // Merge workspace files after initial workspace parse completes
    for (const [filePath, analysis] of this.symbolCache.entries()) {
      if (filePath === document.uri.fsPath || includedFiles.includes(filePath)) continue;
      
      for (const sym of analysis.symbols) {
        mergedAnalysis.symbols.push({...sym, file: filePath});
      }
      for (const v of analysis.variables) {
         mergedAnalysis.variables.add(v);
      }
      for (const [k, v] of analysis.definitions.entries()) {
        if (!mergedAnalysis.definitions.has(k)) {
           mergedAnalysis.definitions.set(k, {...v, file: filePath});
        }
      }
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
    if (!this._hasParsedWorkspace) {
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

  /**
   * Invalidate one cached file inside this workspace.
   * @param {string} filePath
   */
  invalidateFile(filePath) {
    if (!filePath) return;
    this.symbolCache.delete(filePath);
    this.lastModified.delete(filePath);
  }

  /**
   * Clear cache for this workspace
   */
  clear() {
    this.symbolCache.clear();
    this.lastModified.clear();
    this._hasParsedWorkspace = false;
  }

  /**
   * Dispose this workspace analyzer
   */
  dispose() {
    this.clear();
  }
}

/**
 * Multi-workspace manager
 */
class WorkspaceAnalysisManager {
  constructor() {
    this.analyzers = new Map();
  }

  /**
   * Get or create analyzer for workspace
   * @param {vscode.Uri} documentUri
   * @returns {WorkspaceAnalysis}
   */
  getAnalyzer(documentUri) {
    if (!vscode || !vscode.workspace) {
      // Fallback for non-VS Code environment
      return this.analyzers.get('default') || (() => {
        const analyzer = new WorkspaceAnalysis('default');
        this.analyzers.set('default', analyzer);
        return analyzer;
      })();
    }

    const workspace = documentUri
      ? vscode.workspace.getWorkspaceFolder(documentUri)
      : null;
    const workspaceId = workspace ? workspace.uri.toString() : 'default';

    if (!this.analyzers.has(workspaceId)) {
      this.analyzers.set(workspaceId, new WorkspaceAnalysis(workspaceId));
    }

    return this.analyzers.get(workspaceId);
  }

  /**
   * Invalidate one cached file. If the workspace cannot be resolved, clear
   * matching entries from all analyzers as a safe fallback.
   * @param {string} filePath
   * @param {vscode.Uri} [documentUri]
   */
  invalidateFile(filePath, documentUri) {
    if (!filePath) return;

    if (documentUri) {
      this.getAnalyzer(documentUri).invalidateFile(filePath);
      return;
    }

    for (const analyzer of this.analyzers.values()) {
      analyzer.invalidateFile(filePath);
    }
  }

  /**
   * Remove analyzer for workspace
   * @param {string} workspaceId
   */
  removeAnalyzer(workspaceId) {
    const analyzer = this.analyzers.get(workspaceId);
    if (analyzer) {
      analyzer.dispose();
      this.analyzers.delete(workspaceId);
    }
  }

  /**
   * Clear all analyzers
   */
  clear() {
    for (const analyzer of this.analyzers.values()) {
      analyzer.dispose();
    }
    this.analyzers.clear();
  }

  /**
   * Dispose manager
   */
  dispose() {
    this.clear();
  }
}

// Singleton instance
const workspaceAnalysisManager = new WorkspaceAnalysisManager();

module.exports = { 
  workspaceAnalysisManager,
  WorkspaceAnalysis,
  WorkspaceAnalysisManager,
};
