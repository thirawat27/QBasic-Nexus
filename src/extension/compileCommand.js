/**
 * QBasic Nexus - Compile Command
 * Entry point for compile / compile-and-run commands
 */

'use strict';

const vscode = require('vscode');
const { CONFIG } = require('./constants');
const { state } = require('./state');
const { getConfig } = require('./utils');
const { runInternalTranspiler } = require('./internalTranspiler');
const { runQB64Compiler } = require('./qb64Compiler');

/**
 * Execute compile (and optionally run) command
 * @param {boolean} shouldRun
 */
async function executeCompile(shouldRun) {
  // Prevent concurrent compilations (race condition fix)
  if (state.isCompiling) {
    vscode.window.showInformationMessage(
      '⏳ Compilation already in progress...',
    );
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage('📄 Please open a QBasic file first.');
    return;
  }

  const document = editor.document;

  // Auto-save if dirty
  if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      vscode.window.showWarningMessage(
        '💾 File must be saved before compiling.',
      );
      return;
    }
  }

  // Set compilation flag to prevent concurrent runs
  state.isCompiling = true;

  try {
    // Get compiler mode
    const mode = getConfig(CONFIG.COMPILER_MODE);

    if (mode === CONFIG.MODE_INTERNAL || mode === CONFIG.MODE_INTERNAL_WASM) {
      await runInternalTranspiler(document, shouldRun);
    } else {
      await runQB64Compiler(document, shouldRun);
    }
  } finally {
    // Always reset flag, even if compilation fails
    state.isCompiling = false;
  }
}

module.exports = { executeCompile };
