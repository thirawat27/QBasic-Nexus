'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getDocumentAnalysis, analyzeQBasicText, findIdentifierMatchesInAnalysis } = require('./documentAnalysis');

class WorkspaceAnalysis {
  constructor() {
    this.symbolCache = new Map();
    this.lastModified = new Map();
    this.isRefreshing = false;
  }

  async parseWorkspaceSymbols() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    try {
      if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder, '**/*.{bas,bi,bm}'),
            '**/{node_modules,.git}/**',
            1000
          );
          for (const file of files) {
            await this.parseFileSymbols(file.fsPath);
          }
        }
      }
    } catch (err) {
      console.error('Error parsing workspace symbols:', err);
    } finally {
      this.isRefreshing = false;
    }
  }

  async parseFileSymbols(filePath) {
    try {
      const stat = fs.statSync(filePath);
      const lastMod = stat.mtimeMs;

      if (this.symbolCache.has(filePath) && this.lastModified.get(filePath) === lastMod) {
        return this.symbolCache.get(filePath);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const analysis = analyzeQBasicText(content);
      
      this.symbolCache.set(filePath, analysis);
      this.lastModified.set(filePath, lastMod);
      return analysis;
    } catch (_e) {
      return null;
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

    // First merge include files
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

    // Then merge workspace files (trigger async background parse if not done)
    if (this.symbolCache.size === 0 && !this.isRefreshing) {
      this.parseWorkspaceSymbols(); // Fire and forget
    }
    
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

module.exports = { workspaceAnalyzer };
