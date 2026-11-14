/**
 * QBasic Nexus - Debugging with qb-dap (QBNex)
 *
 * qb-dap compiles the program to QIR with the QBNex compiler and runs it on
 * the qb-exec VM: breakpoints, stepping, call stack and variables. Debugging
 * needs QBNex; QB64 has no debug adapter.
 */

'use strict';

const vscode = require('vscode');
const { CONFIG } = require('../extension/constants');
const { getConfig } = require('../extension/utils');
const { locateCompanionTool } = require('./detect');
const { resolveQBNex } = require('./resolve');

/** A launch configuration with defaults filled in (F5 without a launch.json). */
function completeDebugConfig(config, activeFile, compiler) {
  const out = { ...config };
  if (!out.type && !out.request && !out.name) {
    if (!activeFile) return undefined;
    out.type = CONFIG.DEBUG_TYPE;
    out.request = 'launch';
    out.name = 'Debug QBasic program';
    out.program = activeFile;
  }
  if (!out.program) {
    if (!activeFile) return undefined;
    out.program = activeFile;
  }
  if (!out.compiler && compiler) out.compiler = compiler;
  return out;
}

function registerDebugAdapter(context) {
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(CONFIG.DEBUG_TYPE, {
      async createDebugAdapterDescriptor() {
        const qbnex = await resolveQBNex();
        const command = await locateCompanionTool('qb-dap', {
          configured: getConfig(CONFIG.DEBUG_ADAPTER_PATH),
          compilerPath: qbnex?.path,
        });
        if (!command) {
          throw new Error(
            'The QBNex debug adapter qb-dap was not found next to the QBNex compiler or on PATH. Set qbasic-nexus.debugAdapterPath to qb-dap.',
          );
        }
        return new vscode.DebugAdapterExecutable(command);
      },
    }),
    vscode.debug.registerDebugConfigurationProvider(CONFIG.DEBUG_TYPE, {
      async resolveDebugConfiguration(_folder, config) {
        const editor = vscode.window.activeTextEditor;
        const file = editor?.document.languageId === CONFIG.LANGUAGE_ID && !editor.document.isUntitled
          ? editor.document.uri.fsPath
          : undefined;
        if (file && editor.document.isDirty) await editor.document.save();

        const qbnex = await resolveQBNex();
        if (!qbnex && !config.compiler && !config.qir) {
          const choice = await vscode.window.showErrorMessage(
            'Debugging needs QBNex 2.0 (qb-dap). Install QBNex or set qbasic-nexus.qbnexPath.',
            'Open Settings',
          );
          if (choice === 'Open Settings') {
            void vscode.commands.executeCommand(
              'workbench.action.openSettings',
              `${CONFIG.SECTION}.${CONFIG.QBNEX_PATH}`,
            );
          }
          return undefined;
        }

        const done = completeDebugConfig(config, file, qbnex?.path);
        if (!done) {
          void vscode.window.showErrorMessage('Open a saved .bas file to debug it.');
        }
        return done;
      },
    }),
  );
}

module.exports = { completeDebugConfig, registerDebugAdapter };
