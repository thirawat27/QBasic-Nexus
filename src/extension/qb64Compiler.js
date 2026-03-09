/**
 * QBasic Nexus - QB64 Compiler Command
 * Handles compilation via the external QB64 executable
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');
const { CONFIG } = require('./constants');
const { state } = require('./state');
const { getOutputChannel, getConfig, fileExists } = require('./utils');
const {
  splitCommandLineArgs,
  parseQb64CompilerOutput,
} = require('./processUtils');
const { updateStatusBar } = require('./statusBar');
const { runExecutable, runInternalTranspiler } = require('./internalTranspiler');

/**
 * Entry point: validate config then drive the QB64 compilation
 * @param {vscode.TextDocument} document
 * @param {boolean} shouldRun
 */
async function runQB64Compiler(document, shouldRun) {
  const compilerPath = getConfig(CONFIG.COMPILER_PATH);

  // Validate compiler path
  if (!compilerPath) {
    const choice = await vscode.window.showWarningMessage(
      '⚠️ QB64 compiler path is not configured.',
      'Open Settings',
      'Use Internal Mode',
    );

    if (choice === 'Open Settings') {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        `${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`,
      );
    } else if (choice === 'Use Internal Mode') {
      await vscode.workspace
        .getConfiguration(CONFIG.SECTION)
        .update(CONFIG.COMPILER_MODE, CONFIG.MODE_INTERNAL, true);
      await runInternalTranspiler(document, shouldRun);
    }
    return;
  }

  if (!(await fileExists(compilerPath))) {
    vscode.window.showErrorMessage(`❌ QB64 not found at: ${compilerPath}`);
    return;
  }

  // Start compilation
  state.isCompiling = true;
  updateStatusBar();
  state.diagnosticCollection.clear();

  const channel = getOutputChannel();
  channel.clear();
  channel.show();

  try {
    const outputPath = await compileWithQB64(document, compilerPath, channel);

    if (shouldRun && outputPath) {
      runExecutable(outputPath);
    }
  } catch (_error) {
    vscode.window.showErrorMessage(
      '❌ Compilation failed. Check output for details.',
    );
  } finally {
    state.isCompiling = false;
    updateStatusBar();
  }
}

/**
 * Compile using QB64
 * @param {vscode.TextDocument} document
 * @param {string} compilerPath
 * @param {vscode.OutputChannel} channel
 * @returns {Promise<string>} resolved output path on success
 */
function compileWithQB64(document, compilerPath, channel) {
  return new Promise((resolve, reject) => {
    const sourcePath = document.uri.fsPath;
    const sourceDir = path.dirname(sourcePath);
    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    const outputPath = path.join(
      sourceDir,
      baseName + (process.platform === 'win32' ? '.exe' : ''),
    );

    // Build arguments
    const extraArgs = splitCommandLineArgs(
      getConfig(CONFIG.COMPILER_ARGS) || '',
    );

    const args = ['-x', '-c', sourcePath, '-o', outputPath, ...extraArgs];

    // Log
    channel.appendLine('╔══════════════════════════════════════════════════╗');
    channel.appendLine('║           QBasic Nexus - QB64 Compiler           ║');
    channel.appendLine('╚══════════════════════════════════════════════════╝');
    channel.appendLine('');
    channel.appendLine(`📄 Source: ${path.basename(sourcePath)}`);
    channel.appendLine(`📦 Output: ${path.basename(outputPath)}`);
    channel.appendLine(`⚙️  Args:   ${args.join(' ')}`);
    channel.appendLine('');
    channel.appendLine('─────────────────────────────────────────────────────');
    channel.appendLine('');

    const startTime = process.hrtime();

    // Spawn process
    // Use sourceDir as cwd so QB64 resolves $INCLUDE and relative paths correctly
    // (compiler dir is NOT the right cwd on macOS/Linux)
    const proc = spawn(compilerPath, args, {
      cwd: sourceDir,
      shell: false,
    });

    let output = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      channel.append(text);
      output += text;
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      channel.append(text);
      output += text;
    });

    proc.on('error', (err) => {
      channel.appendLine(`\n❌ Failed to start compiler: ${err.message}`);
      reject(err);
    });

    proc.on('close', (code) => {
      parseCompilerErrors(output, document.uri);

      const endTime = process.hrtime(startTime);
      const duration = (endTime[0] + endTime[1] / 1e9).toFixed(2);

      channel.appendLine('');
      channel.appendLine(
        '─────────────────────────────────────────────────────',
      );

      if (code === 0) {
        channel.appendLine('');
        channel.appendLine(`✅ BUILD SUCCESSFUL (${duration}s)`);
        channel.appendLine(`📦 ${outputPath}`);
        resolve(outputPath);
      } else {
        channel.appendLine('');
        channel.appendLine(`❌ BUILD FAILED (Exit code: ${code})`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

/**
 * Parse QB64 compiler output for errors and populate the diagnosticCollection
 * @param {string} output
 * @param {vscode.Uri} uri
 */
function parseCompilerErrors(output, uri) {
  const diagnostics = [];
  const filename = path.basename(uri.fsPath);

  for (const entry of parseQb64CompilerOutput(output, filename)) {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(entry.line, 0, entry.line, Number.MAX_SAFE_INTEGER),
      entry.message,
      entry.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = 'QB64';
    diagnostics.push(diagnostic);
  }

  state.diagnosticCollection.set(uri, diagnostics);
}

module.exports = { runQB64Compiler, compileWithQB64, parseCompilerErrors };
