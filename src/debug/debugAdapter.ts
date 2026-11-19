/**
 * QBasic Nexus - QB64-PE Debugger wiring
 * Registers the "qb64" debug type: an inline Debug Adapter backed by
 * QB64DebugSession, plus a configuration provider so F5 works without a
 * launch.json.
 */

import vscode = require('vscode');
import path = require('path');
import { CONFIG } from '../extension/constants';
import { getConfig } from '../extension/utils';
import { QB64DebugSession, DEBUG_METACOMMAND_RE } from './qb64DebugSession';

async function compileForDebug(programPath, log) {
  const {
    compileWithQB64,
    resolveCompilerPath,
  } = require('../extension/qb64Compiler');

  const { compilerPath } = await resolveCompilerPath(getConfig(CONFIG.COMPILER_PATH));
  if (!compilerPath) {
    throw new Error(
      'QB64-PE was not found. Set qbasic-nexus.compilerPath or the QB64_COMPILER environment variable.',
    );
  }

  const uri = vscode.Uri.file(programPath);
  const channel = {
    append: (text) => log(text),
    appendLine: (text) => log(`${text}\n`),
  };
  return compileWithQB64({ uri }, compilerPath, channel);
}

function launchInTerminal(exePath, { cwd, env }) {
  const terminal = vscode.window.createTerminal({
    name: `QB64 Debug: ${path.basename(exePath)}`,
    shellPath: exePath,
    cwd,
    env,
  });
  terminal.show(true);
  return { kill: () => terminal.dispose() };
}

class QB64InlineDebugAdapter {
  declare _emitter: any;
  declare onDidSendMessage: any;
  declare _session: any;

  constructor() {
    this._emitter = new vscode.EventEmitter();
    this.onDidSendMessage = this._emitter.event;
    this._session = new QB64DebugSession({
      send: (message) => this._emitter.fire(message),
      compile: compileForDebug,
      launch: launchInTerminal,
    });
  }

  handleMessage(message) {
    void this._session.handleMessage(message);
  }

  dispose() {
    this._session.dispose();
    this._emitter.dispose();
  }
}

class QB64DebugAdapterFactory {
  createDebugAdapterDescriptor() {
    return new vscode.DebugAdapterInlineImplementation(new QB64InlineDebugAdapter());
  }
}

/**
 * Offer to add `$DEBUG` when the program lacks it. Returns false when the
 * user declines, which cancels the launch.
 */
async function ensureDebugMetacommand(programPath) {
  const document = await vscode.workspace.openTextDocument(programPath);
  if (DEBUG_METACOMMAND_RE.test(document.getText())) return true;

  const choice = await vscode.window.showWarningMessage(
    `${path.basename(programPath)} has no $DEBUG metacommand, which QB64-PE needs to debug it.`,
    'Add $DEBUG and Debug',
    'Cancel',
  );
  if (choice !== 'Add $DEBUG and Debug') return false;

  const edit = new vscode.WorkspaceEdit();
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  edit.insert(document.uri, new vscode.Position(0, 0), `$DEBUG${eol}`);
  await vscode.workspace.applyEdit(edit);
  await document.save();
  return true;
}

class QB64DebugConfigurationProvider {
  provideDebugConfigurations() {
    return [
      {
        type: CONFIG.DEBUG_TYPE,
        request: 'launch',
        name: 'Debug QB64-PE program',
        program: '${file}',
        stopOnEntry: false,
      },
    ];
  }

  async resolveDebugConfiguration(folder, config) {
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.languageId !== CONFIG.LANGUAGE_ID) return config;
      config.type = CONFIG.DEBUG_TYPE;
      config.request = 'launch';
      config.name = 'Debug QB64-PE program';
      config.program = '${file}';
    }
    return config;
  }

  async resolveDebugConfigurationWithSubstitutedVariables(folder, config) {
    if (!config.program) {
      vscode.window.showErrorMessage('Set "program" to the .bas file to debug.');
      return undefined;
    }
    const openDocument = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.fsPath === config.program,
    );
    if (openDocument?.isDirty) await openDocument.save();
    return (await ensureDebugMetacommand(config.program)) ? config : undefined;
  }
}

function registerDebugger(context) {
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      CONFIG.DEBUG_TYPE,
      new QB64DebugAdapterFactory(),
    ),
    vscode.debug.registerDebugConfigurationProvider(
      CONFIG.DEBUG_TYPE,
      new QB64DebugConfigurationProvider(),
    ),
  );
}

export {
  registerDebugger,
};
