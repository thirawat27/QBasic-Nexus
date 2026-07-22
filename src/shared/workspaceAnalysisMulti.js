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
const { BoundedCache } = require('./boundedCache');

const WORKSPACE_PARSE_YIELD_INTERVAL = 25;
const INCLUDE_PATTERN = /^\s*\$INCLUDE\s*:\s*(?:['"])(.+?)(?:['"])/i;

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

// Bound the per-analyzer memo caches so long editing sessions cannot grow
// without limit. Values are small (one merged view per document version).
const MERGED_ANALYSIS_CACHE_LIMIT = 32;
const WORKSPACE_MATCH_CACHE_LIMIT = 256;

class WorkspaceAnalysis {
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
    this.symbolCache = new Map();
    this.lastModified = new Map();
    this.isRefreshing = false;
    this._refreshPromise = null;
    this._hasParsedWorkspace = false;

    // Bumped on every mutation of symbolCache. Every derived memo is keyed by
    // it, so a single counter invalidates all downstream caches at once.
    this._generation = 0;

    /** @type {BoundedCache} */
    this._mergedCache = new BoundedCache(MERGED_ANALYSIS_CACHE_LIMIT);
    /** @type {BoundedCache} */
    this._matchCache = new BoundedCache(WORKSPACE_MATCH_CACHE_LIMIT);
  }

  /** Invalidate every memo derived from symbolCache. */
  _bumpGeneration() {
    this._generation++;
    this._mergedCache.clear();
    this._matchCache.clear();
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
            let processed = 0;
            for (const file of files) {
              await this.parseFileSymbols(file.fsPath);
              processed++;
              if (processed % WORKSPACE_PARSE_YIELD_INTERVAL === 0) {
                await yieldToEventLoop();
              }
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
      this._bumpGeneration();
      return analysis;
    } catch (_e) {
      this.invalidateFile(filePath);
      return null;
    }
  }

  prepareWorkspace() {
    if (!this._hasParsedWorkspace && !this._refreshPromise) {
      void this.parseWorkspaceSymbols();
    }

    return this._refreshPromise || Promise.resolve();
  }

  async warmFile(filePath) {
    if (!filePath) {
      return null;
    }

    return this.parseFileSymbols(filePath);
  }

  /**
   * Build a stable memo key for document-derived views.
   * `_generation` covers every symbolCache mutation, so one key invalidates all.
   * @param {vscode.TextDocument} document
   * @param {string} suffix
   * @returns {string|null} null when the document cannot be keyed safely
   */
  _memoKey(document, suffix = '') {
    const uri = document?.uri;
    if (!uri || typeof uri.toString !== 'function') return null;
    const version = Number(document.version);
    if (!Number.isFinite(version)) return null;
    return `${uri.toString()}\x00${version}\x00${this._hasParsedWorkspace ? 1 : 0}\x00${suffix}`;
  }

  async getWorkspaceAnalysis(document, options = {}) {
    const awaitWorkspace = options.awaitWorkspace === true;

    // Settle workspace parsing before keying the memo. Parsing only populates
    // symbolCache (and bumps the generation), so hoisting it does not change
    // the merged result — it just makes the cache key accurate.
    if (awaitWorkspace && !this._hasParsedWorkspace) {
      await this.parseWorkspaceSymbols();
    } else if (!awaitWorkspace) {
      this.prepareWorkspace();
    }

    const memoKey = this._memoKey(document, 'merged');
    if (memoKey !== null) {
      const cached = this._mergedCache.get(memoKey);
      if (cached && cached.generation === this._generation) {
        return cached.merged;
      }
    }

    const localAnalysis = getDocumentAnalysis(document);

    // Get include files
    const includedFiles = [];
    const includedFileSet = new Set();
    const workspaceFolder = vscode && vscode.workspace
      ? vscode.workspace.getWorkspaceFolder(document.uri)
      : null;

    for (const line of localAnalysis.lines) {
      const match = INCLUDE_PATTERN.exec(line);
      if (match) {
        const includePath = match[1];
        let fullPath;
        if (path.isAbsolute(includePath)) {
          fullPath = includePath;
        } else {
          fullPath = path.resolve(path.dirname(document.uri.fsPath), includePath);
          if (!fs.existsSync(fullPath) && workspaceFolder) {
            fullPath = path.resolve(workspaceFolder.uri.fsPath, includePath);
          }
        }
        if (fs.existsSync(fullPath) && !includedFileSet.has(fullPath)) {
          includedFiles.push(fullPath);
          includedFileSet.add(fullPath);
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

    // Merge workspace files after initial workspace parse completes
    for (const [filePath, analysis] of this.symbolCache.entries()) {
      if (filePath === document.uri.fsPath || includedFileSet.has(filePath)) continue;
      
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

    if (memoKey !== null) {
      this._mergedCache.set(memoKey, {
        generation: this._generation,
        merged: mergedAnalysis,
      });
    }

    return mergedAnalysis;
  }

  async findWorkspaceIdentifierMatches(document, identifier, options = {}) {
    const awaitWorkspace = options.awaitWorkspace !== false;

    // Refresh workspace symbols to ensure cache is populated
    if (awaitWorkspace && !this._hasParsedWorkspace) {
      await this.parseWorkspaceSymbols();
    } else if (!awaitWorkspace) {
      this.prepareWorkspace();
    }

    const memoKey = this._memoKey(
      document,
      `matches\x00${String(identifier).toUpperCase()}\x00${
        options.includeDeclaration === false ? 0 : 1
      }`,
    );
    if (memoKey !== null) {
      const cached = this._matchCache.get(memoKey);
      if (cached && cached.generation === this._generation) {
        return cached.matches;
      }
    }

    const allMatches = [];

    // Check the current document first
    const localMatches = findIdentifierMatchesInAnalysis(getDocumentAnalysis(document), identifier, options);
    for (const match of localMatches) {
        allMatches.push({ ...match, file: document.uri.fsPath });
    }

    for (const [filePath, analysis] of this.symbolCache.entries()) {
      if (filePath === document.uri.fsPath) continue; // Already handled
      
      const fileMatches = findIdentifierMatchesInAnalysis(analysis, identifier, options);
      for (const match of fileMatches) {
        allMatches.push({ ...match, file: filePath });
      }
    }

    if (memoKey !== null) {
      this._matchCache.set(memoKey, {
        generation: this._generation,
        matches: allMatches,
      });
    }

    return allMatches;
  }

  /**
   * Invalidate one cached file inside this workspace.
   * @param {string} filePath
   */
  invalidateFile(filePath) {
    if (!filePath) return;
    // Both deletes must run, so evaluate them before combining the results.
    const removedSymbols = this.symbolCache.delete(filePath);
    const removedTimestamp = this.lastModified.delete(filePath);
    // Nothing was cached for this path, so no derived memo can be stale.
    if (removedSymbols || removedTimestamp) this._bumpGeneration();
  }

  /**
   * Clear cache for this workspace
   */
  clear() {
    this.symbolCache.clear();
    this.lastModified.clear();
    this._hasParsedWorkspace = false;
    this._bumpGeneration();
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
