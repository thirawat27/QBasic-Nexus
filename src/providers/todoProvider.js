'use strict';

const vscode = require('vscode');

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
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    const files = new Map();
    for (const folder of vscode.workspace.workspaceFolders) {
      const folderFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, '**/*.{bas,bi,bm,inc}'),
        '**/{node_modules,.git}/**'
      );
      for (const file of folderFiles) {
        files.set(file.toString(), file);
      }
    }

    const regex = /(?:'|\bREM\b)[^\r\n]*?\b(TODO|FIXME|FIXIT|HACK|BUG|NOTE)\b[^\r\n]*/gi;

    for (const file of files.values()) {
      try {
        const textStr = await vscode.workspace.fs.readFile(file);
        const text = new TextDecoder('utf-8').decode(textStr);
        const lines = text.split(/\r?\n/);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Fast path to avoid regex execution on lines that don't have our keywords
          const upperLine = line.toUpperCase();
          if (!upperLine.includes('TODO') && !upperLine.includes('FIX') && 
              !upperLine.includes('HACK') && !upperLine.includes('BUG') && 
              !upperLine.includes('NOTE')) {
            continue;
          }

          let match;
          // Reset lastIndex because we're using /g flag on a per RegExp level but recreating it might be slow, so we just run it
          regex.lastIndex = 0;
          
          while ((match = regex.exec(line)) !== null) {
            const keyword = match[1].toUpperCase();
            // Just display the comment without the ' characters if possible
            let displayLabel = match[0].replace(/^('|REM)\s*/i, '').trim();
            
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

module.exports = { QBasicTodoProvider, TodoItem };
