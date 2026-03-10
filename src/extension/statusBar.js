/**
 * QBasic Nexus - Status Bar
 * Status bar item management and updates
 */

'use strict';

const vscode = require('vscode');
const { CONFIG, COMMANDS } = require('./constants');
const { getDocumentAnalysis } = require('../shared/documentAnalysis');
const { state } = require('./state');
const { getConfig } = require('./utils');

function updateStatusBar() {
  const editor = vscode.window.activeTextEditor;
  const internalBuildLabel =
    process.platform === 'win32' ? 'native .exe' : 'native binary';

  if (!state.statusBarItem) return; // Guard: disposed during deactivation

  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    state.statusBarItem.hide();
    return;
  }

  const mode = getConfig(CONFIG.COMPILER_MODE);
  const compilerPath = getConfig(CONFIG.COMPILER_PATH);
  const autoDetectedCompilerPath = state.autoDetectedCompilerPath;

  if (state.isCompiling) {
    state.statusBarItem.text = '$(sync~spin) Compiling...';
    state.statusBarItem.tooltip = 'Compilation in progress';
    state.statusBarItem.command = COMMANDS.COMPILE_RUN;
    state.statusBarItem.backgroundColor = undefined;
  } else if (mode === CONFIG.MODE_INTERNAL) {
    state.statusBarItem.text = `$(package) Build ${internalBuildLabel} ⚡`;
    state.statusBarItem.tooltip = `Compile with QBasic Nexus (@yao-pkg/pkg -> ${internalBuildLabel})`;
    state.statusBarItem.command = COMMANDS.COMPILE_RUN;
    state.statusBarItem.backgroundColor = undefined;
  } else if (!compilerPath && autoDetectedCompilerPath) {
    state.statusBarItem.text = '$(check) QB64 Ready (Auto)';
    state.statusBarItem.tooltip = `Auto-detected QB64 at ${autoDetectedCompilerPath}\nClick to compile now. You can save this path from the next build prompt.`;
    state.statusBarItem.command = COMMANDS.COMPILE_RUN;
    state.statusBarItem.backgroundColor = undefined;
  } else if (!compilerPath) {
    state.statusBarItem.text = '$(search) QB64 Auto-Detect';
    state.statusBarItem.tooltip =
      'Click to set QB64 path manually. Compile also falls back to runtime auto-detection.';
    state.statusBarItem.command = {
      command: 'workbench.action.openSettings',
      arguments: [`${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`],
    };
    state.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.warningBackground',
    );
  } else {
    state.statusBarItem.text = '$(flame) Run ⚡';
    state.statusBarItem.tooltip = 'Compile & Run with QB64';
    state.statusBarItem.command = COMMANDS.COMPILE_RUN; // restore from warning state
    state.statusBarItem.backgroundColor = undefined;
  }

  state.statusBarItem.show();
}

function updateCodeStats(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) {
    if (state.statsBarItem) state.statsBarItem.hide();
    return;
  }

  const analysis = getDocumentAnalysis(document);

  state.statsBarItem.text = `$(code) ${analysis.codeLines}L | ${analysis.subCount}S ${analysis.funcCount}F`;
  state.statsBarItem.tooltip = `Lines: ${analysis.totalLines} (${analysis.codeLines} code)\nSUBs: ${analysis.subCount}\nFUNCTIONs: ${analysis.funcCount}`;
  state.statsBarItem.show();
}

module.exports = { updateStatusBar, updateCodeStats };
