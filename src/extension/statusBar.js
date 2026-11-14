/**
 * QBasic Nexus - Status Bar
 * Status bar item management and updates
 */

'use strict';

const vscode = require('vscode');
const { CONFIG, COMMANDS, normalizeCompilerMode } = require('./constants');
const { getDocumentAnalysis } = require('../shared/documentAnalysis');
const { state } = require('./state');
const { getConfig } = require('./utils');

let refreshing = null;

/** Re-resolves the active toolchain, then redraws the status bar. */
function refreshToolchainStatus() {
  if (refreshing) return refreshing;
  const { resolveToolchain } = require('../toolchain/resolve');
  refreshing = resolveToolchain()
    .then((toolchain) => {
      state.activeToolchain = toolchain || null;
    })
    .catch(() => {
      state.activeToolchain = null;
    })
    .finally(() => {
      refreshing = null;
      updateStatusBar();
    });
  return refreshing;
}

function updateStatusBar() {
  const editor = vscode.window.activeTextEditor;
  if (!state.statusBarItem) return; // disposed during deactivation

  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    state.statusBarItem.hide();
    state.toolchainBarItem?.hide();
    return;
  }

  if (state.activeToolchain === undefined) {
    void refreshToolchainStatus();
  }

  const mode = normalizeCompilerMode(getConfig(CONFIG.COMPILER_MODE));
  const toolchain = state.activeToolchain;

  if (state.toolchainBarItem) {
    const lines = [`Compiler mode: ${mode}`];
    if (toolchain) {
      lines.push(`${toolchain.label}: ${toolchain.path}${toolchain.autoDetected ? ' (auto-detected)' : ''}`);
    } else if (toolchain === null) {
      lines.push('No compiler found');
    }
    lines.push(
      `Language server: ${state.languageServerRunning ? 'running' : 'off'}`,
      'Click for QBasic Nexus settings',
    );
    state.toolchainBarItem.text = toolchain
      ? `$(settings-gear) ${toolchain.label}`
      : '$(warning) No compiler';
    state.toolchainBarItem.tooltip = lines.join('\n');
    state.toolchainBarItem.command = COMMANDS.SHOW_SYSTEM_QUICK_ACTIONS;
    state.toolchainBarItem.backgroundColor = toolchain === null
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
    state.toolchainBarItem.show();
  }

  if (state.isCompiling) {
    state.statusBarItem.text = '$(sync~spin) Compiling...';
    state.statusBarItem.tooltip = 'Compilation in progress';
  } else if (toolchain === null) {
    state.statusBarItem.text = '$(search) Find Compiler';
    state.statusBarItem.tooltip = 'No QBNex or QB64 compiler was found. Click to configure.';
  } else {
    state.statusBarItem.text = '$(play) Run';
    state.statusBarItem.tooltip = toolchain
      ? `Compile & Run with ${toolchain.label} (F5)`
      : 'Compile & Run (F5)';
  }
  state.statusBarItem.command = toolchain === null && !state.isCompiling
    ? COMMANDS.SHOW_SYSTEM_QUICK_ACTIONS
    : COMMANDS.COMPILE_RUN;
  state.statusBarItem.backgroundColor = undefined;
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

module.exports = { refreshToolchainStatus, updateStatusBar, updateCodeStats };
