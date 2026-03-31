/**
 * QBasic Nexus - QB64 Compiler Command
 * Handles compilation via the external QB64 executable
 */

'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { CONFIG } = require('./constants');
const {
  ensureExecutableReady,
  getExecutableOutputPath,
} = require('./executableUtils');
const { state } = require('./state');
const {
  getOutputChannel,
  getConfig,
  expandHomePath,
  splitCommandLineArgs,
} = require('./utils');
const { updateStatusBar } = require('./statusBar');
const { runExecutable, runInternalTranspiler } = require('./internalTranspiler');
const {
  findQB64,
  getInstallInstructions,
  verifyQB64,
} = require('./qb64AutoDetect');

const autoDetectPromptState = {
  inFlight: null,
  dismissedPaths: new Set(),
};
const autoDetectDiscoveryState = {
  inFlight: null,
  cachedPath: null,
};

function setAutoDetectedCompilerPath(compilerPath) {
  const nextPath = compilerPath || null;
  if (state.autoDetectedCompilerPath === nextPath) return;

  state.autoDetectedCompilerPath = nextPath;
  updateStatusBar();
}

async function saveCompilerPath(compilerPath) {
  await vscode.workspace
    .getConfiguration(CONFIG.SECTION)
    .update(CONFIG.COMPILER_PATH, compilerPath, vscode.ConfigurationTarget.Global);
  setAutoDetectedCompilerPath(null);
  updateStatusBar();
}

async function promptToSaveDetectedPath(
  detectedPath,
  message,
  includeContinueOnce = false,
) {
  if (!detectedPath) return 'skipped';
  if (autoDetectPromptState.dismissedPaths.has(detectedPath)) return 'skipped';
  if (autoDetectPromptState.inFlight) return autoDetectPromptState.inFlight;

  autoDetectPromptState.inFlight = (async () => {
    const buttons = ['Save Path'];
    if (includeContinueOnce) buttons.push('Continue Once');
    buttons.push('Not Now');

    const choice = await vscode.window.showInformationMessage(
      message,
      ...buttons,
    );

    if (choice === 'Save Path') {
      await saveCompilerPath(detectedPath);
      return 'saved';
    }

    if (choice === 'Continue Once') {
      return 'continue';
    }

    autoDetectPromptState.dismissedPaths.add(detectedPath);
    return 'dismissed';
  })();

  try {
    return await autoDetectPromptState.inFlight;
  } finally {
    autoDetectPromptState.inFlight = null;
  }
}

async function resolveCompilerPath(rawCompilerPath) {
  const configuredPath = expandHomePath(rawCompilerPath);
  const configuredPathValid = configuredPath
    ? await verifyQB64(configuredPath)
    : false;

  if (configuredPath && configuredPathValid) {
    setAutoDetectedCompilerPath(null);
    return {
      compilerPath: configuredPath,
      autoDetected: false,
      configuredPath,
      configuredPathValid,
    };
  }

  const detectedPath = await detectQB64ForSession();
  if (detectedPath) {
    return {
      compilerPath: detectedPath,
      autoDetected: true,
      configuredPath,
      configuredPathValid,
    };
  }

  return {
    compilerPath: null,
    autoDetected: false,
    configuredPath,
    configuredPathValid,
  };
}

async function detectQB64ForSession() {
  if (autoDetectDiscoveryState.cachedPath) {
    if (!(await verifyQB64(autoDetectDiscoveryState.cachedPath))) {
      autoDetectDiscoveryState.cachedPath = null;
    } else {
      setAutoDetectedCompilerPath(autoDetectDiscoveryState.cachedPath);
      return autoDetectDiscoveryState.cachedPath;
    }
  }

  if (autoDetectDiscoveryState.inFlight) {
    return autoDetectDiscoveryState.inFlight;
  }

  autoDetectDiscoveryState.inFlight = findQB64()
    .then((detectedPath) => {
      autoDetectDiscoveryState.cachedPath = detectedPath || null;
      setAutoDetectedCompilerPath(detectedPath);
      return detectedPath;
    })
    .finally(() => {
      autoDetectDiscoveryState.inFlight = null;
    });

  return autoDetectDiscoveryState.inFlight;
}

async function maybeAutoConfigureQB64(editor) {
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) return;
  if (getConfig(CONFIG.COMPILER_MODE) !== CONFIG.MODE_QB64) return;

  const configuredPath = expandHomePath(getConfig(CONFIG.COMPILER_PATH));
  if (configuredPath) return;

  const detectedPath = await detectQB64ForSession();
  if (!detectedPath) return;

  await promptToSaveDetectedPath(
    detectedPath,
    `Found QB64 at ${detectedPath}. Save this path for future builds?`,
  );
}

/**
 * Entry point: validate config then drive the QB64 compilation
 * @param {vscode.TextDocument} document
 * @param {boolean} shouldRun
 */
async function runQB64Compiler(document, shouldRun) {
  const rawCompilerPath = getConfig(CONFIG.COMPILER_PATH);
  const {
    compilerPath,
    autoDetected,
    configuredPath,
    configuredPathValid,
  } = await resolveCompilerPath(rawCompilerPath);
  const channel = getOutputChannel();

  if (!compilerPath) {
    channel.appendLine(getInstallInstructions().trim());
    const missingPathMessage =
      configuredPath && !configuredPathValid
        ? `⚠️ QB64 is invalid or not found at the configured path: ${configuredPath}\nAuto-detection did not find another installation.`
        : '⚠️ QB64 compiler path is not configured and auto-detection did not find one.';
    const choice = await vscode.window.showWarningMessage(
      missingPathMessage,
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

  if (!(await verifyQB64(compilerPath))) {
    vscode.window.showErrorMessage(
      `❌ QB64 is invalid or not found at: ${compilerPath}`,
    );
    return;
  }

  // Start compilation
  state.isCompiling = true;
  updateStatusBar();
  state.diagnosticCollection.clear();

  channel.clear();
  channel.show();
  if (configuredPath && !configuredPathValid && autoDetected) {
    channel.appendLine(
      `⚠ Configured QB64 path is invalid or not found: ${configuredPath}`,
    );
    channel.appendLine(`ℹ Falling back to auto-detected QB64: ${compilerPath}`);
    channel.appendLine('');
    await promptToSaveDetectedPath(
      compilerPath,
      `Configured QB64 path is invalid. Save the detected QB64 path instead?\n${compilerPath}`,
      true,
    );
  } else if (autoDetected) {
    setAutoDetectedCompilerPath(autoDetectDiscoveryState.cachedPath);
    await promptToSaveDetectedPath(
      compilerPath,
      `Found QB64 at ${compilerPath}. Save this path for future builds?`,
      true,
    );
  }

  if (autoDetected) {
    channel.appendLine(`ℹ Auto-detected QB64: ${compilerPath}`);
    channel.appendLine('');
  }

  try {
    const outputPath = await compileWithQB64(document, compilerPath, channel);

    if (shouldRun && outputPath) {
      await runExecutable(outputPath);
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
    const outputPath = getExecutableOutputPath(sourcePath);

    // Build arguments
    const extraArgs = splitCommandLineArgs(getConfig(CONFIG.COMPILER_ARGS));

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

    proc.on('close', async (code) => {
      try {
        parseCompilerErrors(output, document.uri);

        const endTime = process.hrtime(startTime);
        const duration = (endTime[0] + endTime[1] / 1e9).toFixed(2);

        channel.appendLine('');
        channel.appendLine(
          '─────────────────────────────────────────────────────',
        );

        if (code === 0) {
          await ensureExecutableReady(fs, outputPath);
          channel.appendLine('');
          channel.appendLine(`✅ BUILD SUCCESSFUL (${duration}s)`);
          channel.appendLine(`📦 ${outputPath}`);
          resolve(outputPath);
        } else {
          channel.appendLine('');
          channel.appendLine(`❌ BUILD FAILED (Exit code: ${code})`);
          reject(new Error(`Exit code ${code}`));
        }
      } catch (err) {
        reject(err);
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
  const filename = path.basename(uri.fsPath).toLowerCase();

  // Pattern: filename.bas:line: error message
  const pattern =
    /([^\\/]+\.(?:bas|bi|bm))[:(](\d+)(?:[:)])?\s*(?:\d+:)?\s*(?:(error|warning))?:?\s*(.+)/gi;

  let match;
  while ((match = pattern.exec(output)) !== null) {
    const [, file, lineStr, level, message] = match;

    if (file.toLowerCase() === filename) {
      const line = Math.max(0, parseInt(lineStr, 10) - 1);
      const severity = String(level || '').toLowerCase() === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Error;

      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
        message.trim(),
        severity,
      );
      diagnostic.source = 'QB64';
      diagnostics.push(diagnostic);
    }
  }

  // qb64pe-vscode-main robust output parsing
  const errorPrefixes = [
    'Illegal ', 'DIM: ', 'Cannot ', 'Undefine ', 'Undefined ', 'Expected', 'File ', 'Syntax ', 
    'RETURN ', 'Type ', 'Name ', 'Unexpected ', 'Invalid expression', 'Element not defined', 
    'Unknown ', 'Missing ', '_DEFINE: ', 'Command ', '2nd sub argument', 'Invalid ', 'Variable ', 
    'Array', 'THEN ', 'Incorrect ', '1st ', 'String ', 'END IF ', 'Statement ', 'Label \'', 
    'User defined types', 'IF without END IF', 'SUB ', 'TYPE ', 'Only ', 'Number required for function', 
    'CVL ', 'Expected IF expression THEN/GOTO'
  ];
  const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
  const sourceCode = document ? document.getText().split(/\r?\n/) : [];
  const lines = output.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lintLine = lines[i];
    if (!lintLine || lintLine.startsWith('[')) continue;
    if (errorPrefixes.some(prefix => lintLine.toUpperCase().startsWith(prefix.toUpperCase()))) {
      let errorLineNumber = -1;
      let code = '';
      for (let x = i; x < lines.length; x++) {
        if (lines[x].startsWith('LINE ')) {
          const parts = lines[x].split(':');
          if (parts.length > 0) {
             const lineToken = parts[0].split(' ').pop();
             errorLineNumber = Math.max(0, Number(lineToken) - 1);
             code = parts.slice(1).join(':').trim();
             if (!code || code.length < 1) code = lintLine;
          }
          break;
        }
      }
      if (errorLineNumber >= 0) {
        let range = new vscode.Range(errorLineNumber, 0, errorLineNumber, Number.MAX_SAFE_INTEGER);
        if (code && errorLineNumber < sourceCode.length) {
          try {
            const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('(' + escapedCode + ')', 'i');
            const codeMatch = sourceCode[errorLineNumber].match(regex);
            if (codeMatch && codeMatch.index !== undefined) {
               range = new vscode.Range(errorLineNumber, codeMatch.index, errorLineNumber, codeMatch.index + codeMatch[0].length);
            }
          } catch (_e) {
            // ignore regex failure
          }
        }
        const nextLine = (i + 1 < lines.length) ? lines[i+1].trim() : '';
        const message = lintLine + (nextLine && !nextLine.startsWith('LINE ') ? '\n' + nextLine : '');
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
        diagnostic.source = 'QB64';
        if (!diagnostics.some(d => d.range.isEqual(diagnostic.range) && d.message === diagnostic.message)) {
            diagnostics.push(diagnostic);
        }
      }
    } else if (lintLine.toLowerCase().includes('warning')) {
        const tokens = lintLine.split(':');
        if (tokens.length >= 4 && tokens[0].trim().toLowerCase() === filename) {
            const errorLineNumber = Math.max(0, Number(tokens[1]) - 1);
            const lineLen = errorLineNumber < sourceCode.length ? sourceCode[errorLineNumber].length : Number.MAX_SAFE_INTEGER;
            const message = tokens.slice(3).join(':').trim();
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(errorLineNumber, 0, errorLineNumber, lineLen), 
                message, 
                vscode.DiagnosticSeverity.Warning
            );
            diagnostic.source = 'QB64';
            if (!diagnostics.some(d => d.range.isEqual(diagnostic.range) && d.message === diagnostic.message)) {
                diagnostics.push(diagnostic);
            }
        }
    }
  }

  state.diagnosticCollection.set(uri, diagnostics);
}

module.exports = {
  runQB64Compiler,
  compileWithQB64,
  parseCompilerErrors,
  maybeAutoConfigureQB64,
};
