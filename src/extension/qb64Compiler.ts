/**
 * QBasic Nexus - QB64 Compiler Command
 * Handles compilation via the external QB64 executable
 */

import vscode = require('vscode');
const fs = require('fs').promises;
import path = require('path');
import { spawn } from 'child_process';
import { CONFIG } from './constants';
import { ensureExecutableReady, getExecutableOutputPath, getTerminalLaunchSpec } from './executableUtils';
import { state } from './state';
import { getOutputChannel, getConfig, expandHomePath, splitCommandLineArgs, attachProcessTimeout, getTerminal } from './utils';
import { updateStatusBar } from './statusBar';
import { refreshAllCompatDiagnostics } from './compatDiagnostics';
import { findQB64, getCompilerIdentity, getInstallInstructions, verifyQB64 } from './qb64AutoDetect';

/** Thrown when the user cancels an in-progress build. */
class BuildCanceledError extends Error {
  declare name: any;
  declare canceled: any;

  constructor(message = 'Build canceled') {
    super(message);
    this.name = 'BuildCanceledError';
    this.canceled = true;
  }
}

/**
 * Run a compiled executable inside a deterministic integrated terminal shell
 * @param {string} exePath - Full path to the executable
 */
async function runExecutable(exePath) {
  const channel = getOutputChannel();
  const launchSpec = getTerminalLaunchSpec(exePath);

  try {
    await ensureExecutableReady(fs, exePath);
  } catch (err) {
    channel.appendLine(`  ⚠ Could not launch executable: ${err.message}`);
    throw err;
  }

  const term = getTerminal({
    cwd: launchSpec.cwd,
    shellPath: launchSpec.shellPath,
    shellArgs: launchSpec.shellArgs,
  });
  term.show(true);
  term.sendText(launchSpec.commandText, true);
  channel.appendLine(
    `  ➤ Running in integrated terminal: ${exePath} (cwd: ${launchSpec.cwd})`,
  );
}

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

/**
 * Ask once per path whether to save an auto-detected compiler. Callers must
 * not await this before building: the notification can stay unanswered.
 */
async function promptToSaveDetectedPath(detectedPath: string, message: string) {
  if (!detectedPath) return 'skipped';
  if (autoDetectPromptState.dismissedPaths.has(detectedPath)) return 'skipped';
  if (autoDetectPromptState.inFlight) return autoDetectPromptState.inFlight;

  autoDetectPromptState.inFlight = (async () => {
    const choice = await vscode.window.showInformationMessage(
      message,
      'Save Path',
      'Not Now',
    );

    if (choice === 'Save Path') {
      await saveCompilerPath(detectedPath);
      return 'saved';
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
 * Record the compiler banner and recheck QB64-PE-only keyword warnings when it
 * changes.
 * @param {string|null} identity
 */
function setCompilerIdentity(identity) {
  const next = identity || null;
  if (state.compilerIdentity === next) return;
  state.compilerIdentity = next;
  refreshAllCompatDiagnostics();
}

/**
 * Find the compiler that a build would use, without prompting, and record its
 * banner. Called at activation and when the compiler path setting changes.
 */
async function refreshCompilerIdentity() {
  try {
    const { compilerPath } = await resolveCompilerPath(
      getConfig(CONFIG.COMPILER_PATH),
    );
    setCompilerIdentity(
      compilerPath ? await getCompilerIdentity(compilerPath) : null,
    );
  } catch {
    setCompilerIdentity(null);
  }
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
      'Run in Retro CRT',
    );

    if (choice === 'Open Settings') {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        `${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`,
      );
    } else if (choice === 'Run in Retro CRT') {
      await vscode.commands.executeCommand(CONFIG.CMD_RETRO);
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
  const compilerIdentity = await getCompilerIdentity(compilerPath);
  setCompilerIdentity(compilerIdentity);
  channel.appendLine(
    `🧬 Compiler: ${compilerIdentity || 'QB64-family compiler'} (${compilerPath})`,
  );
  channel.appendLine('');
  if (configuredPath && !configuredPathValid && autoDetected) {
    channel.appendLine(
      `⚠ Configured QB64 path is invalid or not found: ${configuredPath}`,
    );
    channel.appendLine(`ℹ Falling back to auto-detected QB64: ${compilerPath}`);
    channel.appendLine('');
    // Offer to save the path without holding up the build: an unanswered
    // notification would otherwise block Compile forever.
    void promptToSaveDetectedPath(
      compilerPath,
      `Configured QB64 path is invalid. Save the detected QB64 path instead?\n${compilerPath}`,
    );
  } else if (autoDetected) {
    setAutoDetectedCompilerPath(autoDetectDiscoveryState.cachedPath);
    void promptToSaveDetectedPath(
      compilerPath,
      `Found QB64 at ${compilerPath}. Save this path for future builds?`,
    );
  }

  if (autoDetected) {
    channel.appendLine(`ℹ Auto-detected QB64: ${compilerPath}`);
    channel.appendLine('');
  }

  try {
    const outputPath = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `QBasic Nexus  —  QB64  —  ${path.basename(document.uri.fsPath)}`,
        cancellable: true,
      },
      (progress, token) => {
        progress.report({ message: 'Compiling with QB64…' });
        return compileWithQB64(document, compilerPath, channel, token);
      },
    );

    if (shouldRun && outputPath) {
      await runExecutable(outputPath);
    }
  } catch (error) {
    if (error instanceof BuildCanceledError || error?.canceled) {
      channel.appendLine('');
      channel.appendLine('⏹ Compilation canceled.');
      vscode.window.showInformationMessage('⏹ Compilation canceled.');
    } else {
      vscode.window.showErrorMessage(
        '❌ Compilation failed. Check output for details.',
      );
    }
  } finally {
    state.isCompiling = false;
    updateStatusBar();
  }
}

/**
 * Compile using QB64
 * @param {{uri: vscode.Uri}} document - only the file location is used
 * @param {string} compilerPath
 * @param {{append: (text: string) => void, appendLine: (text: string) => void}} channel
 * @returns {Promise<string>} resolved output path on success
 */
function compileWithQB64(
  document: { uri: vscode.Uri },
  compilerPath: string,
  channel: { append(text: string): void; appendLine(text: string): void },
  token: vscode.CancellationToken | null = null,
  options: { extraArgs?: string[] } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sourcePath = document.uri.fsPath;
    const sourceDir = path.dirname(sourcePath);
    const outputPath = getExecutableOutputPath(sourcePath);

    // Build arguments
    const extraArgs = splitCommandLineArgs(getConfig(CONFIG.COMPILER_ARGS));

    const args = [
      '-x',
      '-c',
      sourcePath,
      '-o',
      outputPath,
      ...extraArgs,
      ...(options.extraArgs || []),
    ];

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

    // Guard against a QB64 process that never exits (stuck backend compile,
    // waiting on a prompt). Without this the Promise never settles and
    // state.isCompiling stays true until the window is reloaded.
    const timeoutMs = getConfig(CONFIG.EXTERNAL_BUILD_TIMEOUT_MS, 300000);
    let timedOut = false;
    let canceled = false;
    const cancelTimeout = attachProcessTimeout(proc, timeoutMs, () => {
      timedOut = true;
      channel.appendLine(
        `\n⏱ Compilation exceeded ${timeoutMs}ms — terminating QB64.`,
      );
    });

    const cancelSub = token?.onCancellationRequested?.(() => {
      canceled = true;
      channel.appendLine('\n⏹ Canceled — terminating QB64.');
      try {
        proc.kill('SIGTERM');
      } catch {
        // Process may already be gone.
      }
    });

    const cleanup = () => {
      cancelTimeout();
      cancelSub?.dispose?.();
    };

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
      cleanup();
      channel.appendLine(`\n❌ Failed to start compiler: ${err.message}`);
      reject(err);
    });

    proc.on('close', async (code) => {
      cleanup();

      if (canceled) {
        channel.appendLine('');
        channel.appendLine('⏹ BUILD CANCELED');
        reject(new BuildCanceledError());
        return;
      }

      if (timedOut) {
        channel.appendLine('');
        channel.appendLine(`❌ BUILD TIMED OUT (${timeoutMs}ms)`);
        reject(new Error(`QB64 compilation timed out after ${timeoutMs}ms`));
        return;
      }

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

// eslint-disable-next-line no-control-regex -- ESC starts ANSI colour codes in compiler output
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;
const PROGRESS_PREFIX_PATTERN = /^(?:\s*\[[^\]]*\]\s*\d+%)+/;
const QB64_LINE_PATTERN = /^LINE\s+(\d+)\s*:(.*)$/i;
const CAUSED_BY_PATTERN = /^Caused by(?: \(or after\))?\s*:/i;
const LOCATED_DIAGNOSTIC_PATTERN =
  /^\s*(?:.*[\\/])?([^\\/:]+\.(?:bas|bi|bm|inc))(?::(\d+)|\((\d+)\))(?::\d+)?\s*:?\s*(?:(error|warning)\s*:)?\s*(.*)$/i;
const SEVERITY_PREFIX_PATTERN = /^(error|warning)\s*:\s*/i;

function cleanOutputLine(line) {
  return String(line || '')
    .replace(ANSI_ESCAPE_PATTERN, '')
    .replace(PROGRESS_PREFIX_PATTERN, '')
    .trimEnd();
}

function splitSeverity(message, fallback = 'error') {
  const match = SEVERITY_PREFIX_PATTERN.exec(message);
  if (!match) return { severity: fallback, message };
  return {
    severity: match[1].toLowerCase(),
    message: message.slice(match[0].length).trim(),
  };
}

/**
 * Parse QB64 / QB64-PE compiler output into plain diagnostics.
 *
 * Two formats are recognised:
 * - The QB64 error block, whatever the message text is:
 *     <message>
 *     Caused by (or after):<code>     (optional)
 *     LINE <n>:<source line>
 * - Located lines such as `file.bas:12: warning: unused variable`,
 *   optionally followed by indented detail lines.
 *
 * @param {string} output
 * @param {string} fileName - base name of the compiled source file
 * @returns {Array<{line: number, message: string, severity: 'error'|'warning', code: string}>}
 */
function parseQB64Output(output, fileName) {
  const lines = String(output || '').split(/\r\n|\r|\n/).map(cleanOutputLine);
  const targetName = String(fileName || '').toLowerCase();
  const results = [];
  const seen = new Set();
  const add = (entry) => {
    if (!entry.message) return;
    const key = `${entry.line}|${entry.severity}|${entry.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(entry);
  };

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (!text.trim()) continue;

    const lineMatch = QB64_LINE_PATTERN.exec(text.trim());
    if (lineMatch) {
      let j = i - 1;
      let causedBy = '';
      if (j >= 0 && CAUSED_BY_PATTERN.test(lines[j].trim())) {
        causedBy = lines[j].trim().replace(CAUSED_BY_PATTERN, '').trim();
        // QB64 reports its injected debugger stub instead of user code here.
        if (/^SUB\s+VWATCH\b/i.test(causedBy)) causedBy = '';
        j--;
      }
      while (j >= 0 && !lines[j].trim()) j--;
      const rawMessage = j >= 0 ? lines[j].trim() : '';
      const { severity, message } = splitSeverity(
        rawMessage || 'QB64 compilation error',
      );
      add({
        line: Math.max(0, Number(lineMatch[1]) - 1),
        message: causedBy ? `${message}\nCaused by (or after): ${causedBy}` : message,
        severity,
        code: lineMatch[2].trim(),
      });
      continue;
    }

    const located = LOCATED_DIAGNOSTIC_PATTERN.exec(text);
    if (!located || located[1].toLowerCase() !== targetName) continue;

    const detail = [];
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
      detail.push(lines[i + 1].trim().replace(/\s+/g, ' '));
      i++;
    }
    const baseMessage = located[5].trim();
    add({
      line: Math.max(0, Number(located[2] || located[3]) - 1),
      message: [baseMessage, ...detail].filter(Boolean).join(': '),
      severity: (located[4] || 'error').toLowerCase(),
      code: '',
    });
  }

  return results;
}

/**
 * Parse QB64 compiler output for errors and populate the diagnosticCollection
 * @param {string} output
 * @param {vscode.Uri} uri
 */
function parseCompilerErrors(output, uri) {
  const document = vscode.workspace.textDocuments.find(
    (d) => d.uri.toString() === uri.toString(),
  );
  const sourceLines = document ? document.getText().split(/\r?\n/) : [];

  const diagnostics = parseQB64Output(output, path.basename(uri.fsPath)).map(
    (entry) => {
      const sourceLine = sourceLines[entry.line];
      let range = new vscode.Range(
        entry.line,
        0,
        entry.line,
        sourceLine === undefined ? Number.MAX_SAFE_INTEGER : sourceLine.length,
      );
      if (entry.code && sourceLine !== undefined) {
        const column = sourceLine.toLowerCase().indexOf(entry.code.toLowerCase());
        if (column >= 0) {
          range = new vscode.Range(
            entry.line,
            column,
            entry.line,
            column + entry.code.length,
          );
        }
      }
      const diagnostic = new vscode.Diagnostic(
        range,
        entry.message,
        entry.severity === 'warning'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Error,
      );
      diagnostic.source = 'QB64';
      return diagnostic;
    },
  );

  state.diagnosticCollection.set(uri, diagnostics);
}

export {
  runQB64Compiler,
  resolveCompilerPath,
  refreshCompilerIdentity,
  BuildCanceledError,
  compileWithQB64,
  parseCompilerErrors,
  parseQB64Output,
  maybeAutoConfigureQB64,
};
