/**
 * QBasic Nexus - Status Bar
 * Status bar item management and updates
 */

'use strict';

const vscode = require('vscode');
const { CONFIG, COMMANDS } = require('./constants');
const { getDocumentAnalysis } = require('../shared/documentAnalysis');
const {
  getNativeExecutableLabel,
  normalizePackagerTargets,
  validatePackagerTargets,
} = require('./executableUtils');
const { formatCompilerPathLabel } = require('./systemSettingsShared');
const { formatInternalOutputDirLabel } = require('./internalBuildSettings');
const { state } = require('./state');
const { getConfig } = require('./utils');

function updateStatusBar() {
  const editor = vscode.window.activeTextEditor;
  const internalBuildLabel = getNativeExecutableLabel();

  if (!state.statusBarItem) return; // Guard: disposed during deactivation

  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    state.statusBarItem.hide();
    state.internalBuildBarItem?.hide();
    return;
  }

  const mode = getConfig(CONFIG.COMPILER_MODE);
  const isInternalMode =
    mode === CONFIG.MODE_INTERNAL || mode === CONFIG.MODE_INTERNAL_WASM;
  const isWasmInternalMode = mode === CONFIG.MODE_INTERNAL_WASM;
  const compilerPath = getConfig(CONFIG.COMPILER_PATH);
  const internalOutputDir = getConfig(CONFIG.INTERNAL_OUTPUT_DIR, '');
  const autoDetectedCompilerPath = state.autoDetectedCompilerPath;
  const workspaceFolder =
    vscode.workspace.getWorkspaceFolder(editor.document.uri) ||
    vscode.workspace.workspaceFolders?.[0] ||
    null;
  const workspacePath = workspaceFolder?.uri.fsPath || '';
  let internalTargets = [];
  let internalTargetError = null;

  if (isInternalMode) {
    try {
      internalTargets = validatePackagerTargets(getConfig(CONFIG.INTERNAL_TARGETS));
    } catch (error) {
      internalTargets = normalizePackagerTargets(getConfig(CONFIG.INTERNAL_TARGETS));
      internalTargetError = error;
    }
  }

  if (state.internalBuildBarItem) {
    const tooltipLines = ['QBasic Nexus system quick actions', `Mode: ${mode}`];

    if (isInternalMode) {
      const targetSummary = internalTargets.length > 0
        ? internalTargets.join(', ')
        : 'host';
      const outputSummary = formatInternalOutputDirLabel(
        internalOutputDir,
        workspacePath,
      );
      tooltipLines.push(`Targets: ${targetSummary}`, `Output: ${outputSummary}`);
    } else {
      tooltipLines.push(
        `QB64: ${formatCompilerPathLabel(compilerPath, autoDetectedCompilerPath)}`,
      );
    }

    state.internalBuildBarItem.text = internalTargetError
      ? '$(warning) Config'
      : '$(settings-gear) Config';
    state.internalBuildBarItem.tooltip = internalTargetError
      ? `${internalTargetError.message}\nClick to fix build or system settings.`
      : tooltipLines.join('\n');
    state.internalBuildBarItem.command = COMMANDS.SHOW_SYSTEM_QUICK_ACTIONS;
    state.internalBuildBarItem.backgroundColor = internalTargetError
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
    state.internalBuildBarItem.show();
  }

  if (state.isCompiling) {
    state.statusBarItem.text = '$(sync~spin) Compiling...';
    state.statusBarItem.tooltip = 'Compilation in progress';
    state.statusBarItem.command = COMMANDS.COMPILE_RUN;
    state.statusBarItem.backgroundColor = undefined;
  } else if (isInternalMode && internalTargetError) {
    state.statusBarItem.text = '$(warning) Internal Target Error';
    state.statusBarItem.tooltip = `${internalTargetError.message}\nClick to open the internal target setting.`;
    state.statusBarItem.command = {
      command: 'workbench.action.openSettings',
      arguments: [`${CONFIG.SECTION}.${CONFIG.INTERNAL_TARGETS}`],
    };
    state.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.warningBackground',
    );
  } else if (isInternalMode) {
    const targetLabel =
      internalTargets.length === 1
        ? internalTargets[0]
        : `${internalTargets.length} targets`;
    state.statusBarItem.text = isWasmInternalMode
      ? `$(package) Build ${targetLabel} WASM`
      : `$(package) Build ${targetLabel} ⚡`;
    state.statusBarItem.tooltip = isWasmInternalMode
      ? `Compile with QBasic Nexus + WASM (@yao-pkg/pkg -> ${internalBuildLabel}; targets: ${internalTargets.join(', ')})`
      : `Compile with QBasic Nexus (@yao-pkg/pkg -> ${internalBuildLabel}; targets: ${internalTargets.join(', ')})`;
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
