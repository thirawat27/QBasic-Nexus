/**
 * QBasic Nexus - Compile / Compile & Run / Check commands
 * Builds with the active toolchain (QBNex 2.x or QB64 / QB64-PE).
 */

'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const { CONFIG, COMMANDS } = require('./constants');
const { state } = require('./state');
const { getConfig, getOutputChannel, getTerminal } = require('./utils');
const {
  ensureExecutableReady,
  ensureOutputDirectoryReady,
  getExecutableOutputPath,
  getTerminalLaunchSpec,
  resolveExecutableOutputDir,
} = require('./executableUtils');
const { updateStatusBar } = require('./statusBar');
const { buildCompileArgs, runTool } = require('../toolchain/build');
const { clearToolchainCache, missingToolchainMessage, resolveToolchain } = require('../toolchain/resolve');
const {
  checkDocument,
  compilerFlagOptions,
  publishCompilerDiagnostics,
} = require('../toolchain/problems');

/** Detected compiler paths the user already answered "Not Now" for. */
const dismissedSavePrompts = new Set();

async function activeQBasicDocument() {
  const document = vscode.window.activeTextEditor?.document;
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage('Open a QBasic file first.');
    return null;
  }
  if (document.isDirty || document.isUntitled) {
    const saved = await document.save();
    // Saving an untitled editor replaces it with a document for the new file.
    const current = document.isUntitled ? vscode.window.activeTextEditor?.document : document;
    if (!saved || !current || current.isUntitled || current.languageId !== CONFIG.LANGUAGE_ID) {
      vscode.window.showWarningMessage('Save the file before compiling.');
      return null;
    }
    return current;
  }
  return document;
}

async function reportMissingToolchain() {
  const message = missingToolchainMessage();
  getOutputChannel().appendLine(message);
  const choice = await vscode.window.showWarningMessage(message, 'Configure', 'Open Settings');
  if (choice === 'Configure') {
    await vscode.commands.executeCommand(COMMANDS.SHOW_SYSTEM_QUICK_ACTIONS);
  } else if (choice === 'Open Settings') {
    await vscode.commands.executeCommand('workbench.action.openSettings', CONFIG.SECTION);
  }
}

async function offerToSaveDetectedPath(toolchain) {
  if (!toolchain.autoDetected || dismissedSavePrompts.has(toolchain.path)) return;
  const key = toolchain.kind === 'qbnex' ? CONFIG.QBNEX_PATH : CONFIG.COMPILER_PATH;
  const choice = await vscode.window.showInformationMessage(
    `Using ${toolchain.label} found at ${toolchain.path}. Save this path?`,
    'Save Path',
    'Not Now',
  );
  if (choice === 'Save Path') {
    await vscode.workspace
      .getConfiguration(CONFIG.SECTION)
      .update(key, toolchain.path, vscode.ConfigurationTarget.Global);
    clearToolchainCache();
  } else {
    dismissedSavePrompts.add(toolchain.path);
  }
}

/**
 * Runs a compiled program in the integrated terminal.
 * @param {string} exePath
 */
async function runExecutable(exePath) {
  const channel = getOutputChannel();
  await ensureExecutableReady(fs, exePath);
  const launch = getTerminalLaunchSpec(exePath);
  const terminal = getTerminal({
    cwd: launch.cwd,
    shellPath: launch.shellPath,
    shellArgs: launch.shellArgs,
  });
  terminal.show(true);
  terminal.sendText(launch.commandText, true);
  channel.appendLine(`> Running ${exePath}`);
}

/**
 * Builds one document with a toolchain; resolves the executable path, or null.
 */
async function buildDocument(document, toolchain, token) {
  const channel = getOutputChannel();
  const sourcePath = document.uri.fsPath;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const outputDir = resolveExecutableOutputDir(
    sourcePath,
    getConfig(CONFIG.OUTPUT_DIRECTORY, ''),
    { workspaceDir: workspaceFolder?.uri.fsPath },
  );
  await ensureOutputDirectoryReady(fs, outputDir);
  const outputPath = getExecutableOutputPath(sourcePath, process.platform, outputDir);
  const args = buildCompileArgs(toolchain.kind, sourcePath, outputPath, compilerFlagOptions());

  channel.appendLine(`QBasic Nexus - ${toolchain.label}`);
  channel.appendLine(`  Source:   ${sourcePath}`);
  channel.appendLine(`  Output:   ${outputPath}`);
  channel.appendLine(`  Compiler: ${toolchain.path}`);
  channel.appendLine(`> ${[toolchain.path, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
  channel.appendLine('');

  const started = Date.now();
  const result = await runTool(toolchain.path, args, {
    cwd: path.dirname(sourcePath),
    timeoutMs: getConfig(CONFIG.EXTERNAL_BUILD_TIMEOUT_MS),
    token,
    onData: (text) => channel.append(text),
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(2);

  if (result.canceled) {
    channel.appendLine('\nBuild canceled.');
    return null;
  }
  if (result.timedOut) {
    channel.appendLine(`\nBuild stopped after ${getConfig(CONFIG.EXTERNAL_BUILD_TIMEOUT_MS)} ms (qbasic-nexus.externalBuildTimeoutMs).`);
    vscode.window.showErrorMessage('The build timed out. See the QBasic Nexus output.');
    return null;
  }

  const errors = publishCompilerDiagnostics(sourcePath, result.output, toolchain.kind);
  if (result.code !== 0) {
    channel.appendLine(`\nBuild failed (exit code ${result.code}) in ${seconds}s.`);
    const choice = await vscode.window.showErrorMessage(
      errors > 0
        ? `Build failed with ${errors} error(s).`
        : 'Build failed. See the QBasic Nexus output.',
      'Show Problems',
      'Show Output',
    );
    if (choice === 'Show Problems') {
      await vscode.commands.executeCommand('workbench.actions.view.problems');
    } else if (choice === 'Show Output') {
      channel.show(true);
    }
    return null;
  }

  await ensureExecutableReady(fs, outputPath);
  channel.appendLine(`\nBuild succeeded in ${seconds}s: ${outputPath}`);
  return outputPath;
}

/**
 * Compile (and optionally run) the active document.
 * @param {boolean} shouldRun
 */
async function executeCompile(shouldRun) {
  if (state.isCompiling) {
    vscode.window.showInformationMessage('A build is already running.');
    return;
  }
  const document = await activeQBasicDocument();
  if (!document) return;

  const toolchain = await resolveToolchain();
  if (!toolchain) {
    await reportMissingToolchain();
    return;
  }
  if (!toolchain.supported) {
    vscode.window.showWarningMessage(
      `${toolchain.label} is older than QBNex 2.0; some switches may not work. Update QBNex for full support.`,
    );
  }

  const channel = getOutputChannel();
  channel.clear();
  channel.show(true);
  state.isCompiling = true;
  updateStatusBar();

  try {
    const outputPath = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${toolchain.label}: ${path.basename(document.uri.fsPath)}`,
        cancellable: true,
      },
      (progress, token) => {
        progress.report({ message: 'Compiling...' });
        return buildDocument(document, toolchain, token);
      },
    );
    if (outputPath) {
      void offerToSaveDetectedPath(toolchain);
      if (shouldRun) await runExecutable(outputPath);
    }
  } catch (error) {
    channel.appendLine(`\nCould not run ${toolchain.path}: ${error.message}`);
    vscode.window.showErrorMessage(`Could not start ${toolchain.label}: ${error.message}`);
  } finally {
    state.isCompiling = false;
    updateStatusBar();
  }
}

/** Checks the active document for errors without building it. */
async function executeCheck() {
  const document = await activeQBasicDocument();
  if (!document) return;
  if (!(await resolveToolchain())) {
    await reportMissingToolchain();
    return;
  }
  const errors = await checkDocument(document, { force: true });
  if (errors === null) return;
  vscode.window.setStatusBarMessage(
    errors === 0 ? '$(check) No errors' : `$(error) ${errors} error(s)`,
    4000,
  );
}

module.exports = { executeCheck, executeCompile, runExecutable };
