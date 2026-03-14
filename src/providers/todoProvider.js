'use strict';

const vscode = require('vscode');

const TODO_GLOB = '**/*.{bas,bi,bm,inc}';
const TODO_EXCLUDE_GLOB = '**/{node_modules,.git}/**';
const TODO_REGEX = /(?:'|\bREM\b).*?\b(TODO|FIXME|FIXIT|HACK|BUG|NOTE)\b.*$/gim;

class TodoItem extends vscode.TreeItem {
  constructor(label, collapsibleState, range, uri, keyword) {
    super(label, collapsibleState);
    this.range = range;
    this.uri = uri;
    this.keyword = keyword;
    
    // Set icons based on keyword
    if (keyword === 'TODO') {
      this.iconPath = new vscode.ThemeIcon('checklist');
    } else if (keyword === 'FIXME' || keyword === 'FIXIT' || keyword === 'HACK' || keyword === 'BUG') {
      this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    } else if (keyword === 'NOTE') {
      this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('infoForeground'));
    } else {
      this.iconPath = new vscode.ThemeIcon('comment');
    }

    this.tooltip = `${this.label} in ${vscode.workspace.asRelativePath(uri)}`;
    this.description = `Line ${range.start.line + 1}`;
    
    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [this.uri, { selection: this.range }]
    };
  }
}

class QBasicTodoProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.todos = [];
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  dispose() {
    this._onDidChangeTreeData.dispose();
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren(element) {
    if (element) {
      return Promise.resolve([]);
    } else {
      await this.scanWorkspace();
      return Promise.resolve(this.todos);
    }
  }

  async scanWorkspace() {
    this.todos = [];
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    if (workspaceFolders.length === 0) {
      return;
    }

    const files = await getWorkspaceQBasicFiles(workspaceFolders);

    for (const file of files) {
      try {
        const textStr = await vscode.workspace.fs.readFile(file);
        const text = new TextDecoder('utf-8').decode(textStr);
        const lines = text.split(/\r?\n/);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match;
          // Reset lastIndex because we're using /g flag on a per RegExp level but recreating it might be slow, so we just run it
          TODO_REGEX.lastIndex = 0;
          
          while ((match = TODO_REGEX.exec(line)) !== null) {
            const keyword = match[1].toUpperCase();
            // Just display the comment without the ' characters if possible
            const displayLabel = match[0].replace(/^('|REM)\s*/i, '').trim();
            
            const startPos = new vscode.Position(i, match.index);
            const endPos = new vscode.Position(i, match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            this.todos.push(new TodoItem(
              displayLabel,
              vscode.TreeItemCollapsibleState.None,
              range,
              file,
              keyword
            ));
          }
        }
      } catch (e) {
        console.error(`Error scanning file for TODOs: ${file.fsPath}`, e);
      }
    }
    
    // Sort so FIXMEs are first, sorted by filename and line number
    const keywordRank = { 'BUG': 1, 'FIXME': 1, 'FIXIT': 1, 'HACK': 1, 'TODO': 2, 'NOTE': 3 };
    this.todos.sort((a, b) => {
      const aRank = keywordRank[a.keyword] || 4;
      const bRank = keywordRank[b.keyword] || 4;
      if (aRank !== bRank) return aRank - bRank;
      
      const fileCompare = a.uri.fsPath.localeCompare(b.uri.fsPath);
      if (fileCompare !== 0) return fileCompare;
      
      return a.range.start.line - b.range.start.line;
    });
  }
}

async function getWorkspaceQBasicFiles(workspaceFolders) {
  const seenFiles = new Set();
  const files = [];

  for (const folder of workspaceFolders) {
    const matches = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, TODO_GLOB),
      TODO_EXCLUDE_GLOB,
    );

    for (const file of matches) {
      if (seenFiles.has(file.fsPath)) continue;
      seenFiles.add(file.fsPath);
      files.push(file);
    }
  }

  return files;
}

module.exports = { QBasicTodoProvider, TodoItem };
