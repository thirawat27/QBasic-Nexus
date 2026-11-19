/**
 * QBasic Nexus - Build Task Provider
 * Adds "qb64" tasks so Terminal → Run Build Task compiles the current file with
 * QB64 / QB64-PE. Output streams into the task terminal and errors land in the
 * Problems panel through the same parser the Compile command uses.
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const { CONFIG } = require('./constants');
const { getConfig } = require('./utils');

function isQBasicFile(fsPath) {
  return /\.(?:bas|bi|bm|inc)$/i.test(fsPath || '');
}

/**
 * Resolve a task's `file` property to an absolute path.
 * `${file}` or an empty value means the active editor's file.
 * @param {string|undefined} file
 * @param {vscode.WorkspaceFolder|undefined} folder
 * @returns {string|null}
 */
function resolveTaskFile(file, folder) {
  if (!file || file === '${file}') {
    const active = vscode.window.activeTextEditor?.document;
    return active && active.uri.scheme === 'file' && isQBasicFile(active.uri.fsPath)
      ? active.uri.fsPath
      : null;
  }

  const expanded = folder
    ? file.replace(/\$\{workspaceFolder\}/g, folder.uri.fsPath)
    : file;
  if (path.isAbsolute(expanded)) return expanded;
  return folder ? path.join(folder.uri.fsPath, expanded) : null;
}

/** Turn text with bare \n into terminal output. */
function toTerminalText(text) {
  return String(text).replace(/\r?\n/g, '\r\n');
}

class QB64BuildTerminal {
  constructor(definition, folder) {
    this._definition = definition;
    this._folder = folder;
    this._writeEmitter = new vscode.EventEmitter();
    this._closeEmitter = new vscode.EventEmitter();
    this._cancel = new vscode.CancellationTokenSource();
    this.onDidWrite = this._writeEmitter.event;
    this.onDidClose = this._closeEmitter.event;
  }

  _write(text) {
    this._writeEmitter.fire(toTerminalText(text));
  }

  open() {
    void this._build();
  }

  close() {
    this._cancel.cancel();
  }

  async _build() {
    // Required lazily: qb64Compiler pulls in the status bar and other UI modules.
    const {
      compileWithQB64,
      resolveCompilerPath,
    } = require('./qb64Compiler');

    const sourcePath = resolveTaskFile(this._definition.file, this._folder);
    if (!sourcePath) {
      this._write('No QBasic file to build. Open a .bas file or set "file" in the task.\n');
      this._closeEmitter.fire(1);
      return;
    }

    const { compilerPath } = await resolveCompilerPath(getConfig(CONFIG.COMPILER_PATH));
    if (!compilerPath) {
      this._write(
        'QB64 / QB64-PE was not found. Set qbasic-nexus.compilerPath or the QB64_COMPILER environment variable.\n',
      );
      this._closeEmitter.fire(1);
      return;
    }

    const uri = vscode.Uri.file(sourcePath);
    const openDocument = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.fsPath === sourcePath,
    );
    if (openDocument?.isDirty) await openDocument.save();

    const channel = {
      append: (text) => this._write(text),
      appendLine: (text) => this._write(`${text}\n`),
    };

    try {
      await compileWithQB64(
        { uri },
        compilerPath,
        channel,
        this._cancel.token,
        { extraArgs: Array.isArray(this._definition.args) ? this._definition.args : [] },
      );
      this._closeEmitter.fire(0);
    } catch (error) {
      if (!error?.canceled) this._write(`\n${error?.message || error}\n`);
      this._closeEmitter.fire(1);
    }
  }
}

function createBuildTask(definition, folder, name) {
  const task = new vscode.Task(
    definition,
    folder || vscode.TaskScope.Workspace,
    name,
    'qb64',
    new vscode.CustomExecution(async () => new QB64BuildTerminal(definition, folder)),
    [],
  );
  task.group = vscode.TaskGroup.Build;
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, clear: true };
  return task;
}

class QB64TaskProvider {
  provideTasks() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    return [
      createBuildTask({ type: CONFIG.TASK_TYPE, file: '${file}' }, folder, 'Build current file'),
    ];
  }

  resolveTask(task) {
    const definition = task.definition;
    if (definition?.type !== CONFIG.TASK_TYPE) return undefined;
    const folder = typeof task.scope === 'object' ? task.scope : undefined;
    return createBuildTask(definition, folder, task.name);
  }
}

module.exports = { QB64TaskProvider, resolveTaskFile, toTerminalText };
