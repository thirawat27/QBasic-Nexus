'use strict';

const vscode = require('vscode');
const {
  KEYWORD_RANK,
  scanTodoComments,
} = require('../shared/todoComments');
const UTF8_DECODER = new TextDecoder('utf-8');

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
    this._fileTodoCache = new Map();
    this._initialScanComplete = false;
    this._scanPromise = null;
    this._pendingRefreshes = new Map();
  }

  refresh(target) {
    if (target) {
      this._pendingRefreshes.set(target.toString(), target);
    } else {
      this._initialScanComplete = false;
      this._fileTodoCache.clear();
      this._pendingRefreshes.clear();
      this.todos = [];
    }

    this._onDidChangeTreeData.fire();
  }

  remove(target) {
    if (!target) {
      this.refresh();
      return;
    }

    const key = target.toString();
    this._pendingRefreshes.delete(key);
    this._fileTodoCache.delete(key);
    this._rebuildTodos();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren(element) {
    if (element) {
      return Promise.resolve([]);
    } else {
      await this._ensureTodos();
      return Promise.resolve(this.todos);
    }
  }

  async scanWorkspace() {
    if (this._scanPromise) {
      return this._scanPromise;
    }

    this._scanPromise = (async () => {
      const nextCache = new Map();

      if (!vscode.workspace.workspaceFolders) {
        this._fileTodoCache = nextCache;
        this._initialScanComplete = true;
        this._pendingRefreshes.clear();
        this.todos = [];
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

      for (const file of files.values()) {
        const fileTodos = await this._readTodosFromFile(file);
        if (fileTodos.length > 0) {
          nextCache.set(file.toString(), {
            uri: file,
            todos: fileTodos,
          });
        }
      }

      this._fileTodoCache = nextCache;
      this._initialScanComplete = true;
      this._pendingRefreshes.clear();
      this._rebuildTodos();
    })().finally(() => {
      this._scanPromise = null;
    });

    return this._scanPromise;
  }

  async _ensureTodos() {
    if (!this._initialScanComplete) {
      await this.scanWorkspace();
      return;
    }

    if (this._pendingRefreshes.size === 0) {
      return;
    }

    const pendingFiles = Array.from(this._pendingRefreshes.values());
    this._pendingRefreshes.clear();

    for (const file of pendingFiles) {
      await this._refreshFile(file);
    }

    this._rebuildTodos();
  }

  async _refreshFile(file) {
    const key = file.toString();
    const fileTodos = await this._readTodosFromFile(file);

    if (fileTodos.length > 0) {
      this._fileTodoCache.set(key, { uri: file, todos: fileTodos });
    } else {
      this._fileTodoCache.delete(key);
    }
  }

  async _readTodosFromFile(file) {
    try {
      const textStr = await vscode.workspace.fs.readFile(file);
      const text = UTF8_DECODER.decode(textStr);
      return this._extractTodos(text, file);
    } catch (e) {
      console.error(`Error scanning file for TODOs: ${file.fsPath}`, e);
      return [];
    }
  }

  _extractTodos(text, file) {
    return scanTodoComments(text).map((match) => {
      const startPos = new vscode.Position(match.line, match.start);
      const endPos = new vscode.Position(match.line, match.end);
      const range = new vscode.Range(startPos, endPos);

      return new TodoItem(
          match.label,
          vscode.TreeItemCollapsibleState.None,
          range,
          file,
          match.keyword
        );
    });
  }

  _rebuildTodos() {
    const todos = [];

    for (const entry of this._fileTodoCache.values()) {
      todos.push(...entry.todos);
    }

    todos.sort((a, b) => {
      const aRank = KEYWORD_RANK[a.keyword] || 4;
      const bRank = KEYWORD_RANK[b.keyword] || 4;
      if (aRank !== bRank) return aRank - bRank;

      const fileCompare = a.uri.fsPath.localeCompare(b.uri.fsPath);
      if (fileCompare !== 0) return fileCompare;

      return a.range.start.line - b.range.start.line;
    });

    this.todos = todos;
  }
}

module.exports = { QBasicTodoProvider, TodoItem };
