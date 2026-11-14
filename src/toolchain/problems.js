/**
 * QBasic Nexus - Compiler diagnostics in the Problems view, and check on save
 */

'use strict';

const vscode = require('vscode');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CONFIG } = require('../extension/constants');
const { state } = require('../extension/state');
const { getConfig, splitCommandLineArgs } = require('../extension/utils');
const { parseCompilerOutput, diagnosticSpan } = require('./diagnostics');
const { buildCheckArgs, runTool, KIND_QBNEX } = require('./build');
const { resolveToolchain } = require('./resolve');

/** Source file -> the files its last compiler run reported diagnostics in. */
const reportedFiles = new Map();
/** Source file -> cancellation of its running check. */
const runningChecks = new Map();

const SEVERITY = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
};

function fileKey(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function lineTextOf(filePath, line) {
  const open = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.scheme === 'file' && fileKey(doc.uri.fsPath) === fileKey(filePath),
  );
  if (open) return line < open.lineCount ? open.lineAt(line).text : '';
  try {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/)[line] || '';
  } catch {
    return '';
  }
}

/** Options for the compiler flags every run shares. */
function compilerFlagOptions() {
  return {
    warnings: !!getConfig(CONFIG.SHOW_WARNINGS),
    warningsAsErrors: !!getConfig(CONFIG.WARNINGS_AS_ERRORS),
    explicit: !!getConfig(CONFIG.EXPLICIT),
    extraArgs: splitCommandLineArgs(getConfig(CONFIG.COMPILER_ARGS)),
  };
}

/**
 * Shows the diagnostics of one compiler run, replacing what the previous run
 * of the same source reported (also in included files).
 * @param {string} sourcePath
 * @param {string} output
 * @param {'qbnex'|'qb64'} kind
 * @returns {number} number of errors
 */
function publishCompilerDiagnostics(sourcePath, output, kind) {
  const collection = state.diagnosticCollection;
  if (!collection) return 0;

  const parsed = parseCompilerOutput(output, { sourcePath, compiler: kind });
  const byFile = new Map();
  byFile.set(fileKey(sourcePath), { file: sourcePath, items: [] });
  let errors = 0;

  for (const item of parsed) {
    const key = fileKey(item.file);
    if (!byFile.has(key)) byFile.set(key, { file: item.file, items: [] });
    const [start, end] = diagnosticSpan(lineTextOf(item.file, item.line), item);
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(item.line, start, item.line, end),
      item.message,
      SEVERITY[item.severity] ?? vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = item.source;
    if (item.code) diagnostic.code = item.code;
    byFile.get(key).items.push(diagnostic);
    if (item.severity === 'error') errors++;
  }

  const previous = reportedFiles.get(fileKey(sourcePath)) || new Set();
  for (const oldKey of previous) {
    if (!byFile.has(oldKey)) collection.delete(vscode.Uri.file(oldKey));
  }
  for (const { file, items } of byFile.values()) {
    collection.set(vscode.Uri.file(file), items);
  }
  reportedFiles.set(fileKey(sourcePath), new Set(byFile.keys()));
  return errors;
}

/** Drops what the compiler reported for a source (file closed or deleted). */
function clearCompilerDiagnostics(sourcePath) {
  const key = fileKey(sourcePath);
  const files = reportedFiles.get(key);
  if (!files) return;
  for (const file of files) state.diagnosticCollection?.delete(vscode.Uri.file(file));
  reportedFiles.delete(key);
}

/**
 * Checks a saved document with the active compiler, without building it.
 * Skipped for QBNex while qb-lsp reports diagnostics as you type.
 * @param {vscode.TextDocument} document
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<number|null>} error count, or null when no check ran
 */
async function checkDocument(document, options = {}) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return null;
  if (document.uri.scheme !== 'file') return null;
  if (!options.force && !getConfig(CONFIG.ENABLE_LINT)) return null;

  const toolchain = await resolveToolchain();
  if (!toolchain) return null;
  if (!options.force && toolchain.kind === KIND_QBNEX && state.languageServerRunning) {
    return null;
  }

  const sourcePath = document.uri.fsPath;
  const key = fileKey(sourcePath);
  runningChecks.get(key)?.cancel();
  const cancel = new vscode.CancellationTokenSource();
  runningChecks.set(key, cancel);

  const scratch = path.join(os.tmpdir(), 'qbasic-nexus');
  fs.mkdirSync(scratch, { recursive: true });
  const qirPath = path.join(
    scratch,
    `${crypto.createHash('sha1').update(key).digest('hex').slice(0, 12)}.qir`,
  );

  try {
    const result = await runTool(
      toolchain.path,
      buildCheckArgs(toolchain.kind, sourcePath, qirPath, compilerFlagOptions()),
      {
        cwd: path.dirname(sourcePath),
        timeoutMs: getConfig(CONFIG.EXTERNAL_BUILD_TIMEOUT_MS),
        token: cancel.token,
      },
    );
    if (result.canceled || result.timedOut) return null;
    return publishCompilerDiagnostics(sourcePath, result.output, toolchain.kind);
  } catch {
    return null;
  } finally {
    if (runningChecks.get(key) === cancel) runningChecks.delete(key);
    cancel.dispose();
    fs.promises.unlink(qirPath).catch(() => {});
  }
}

function disposeChecks() {
  for (const cancel of runningChecks.values()) cancel.cancel();
  runningChecks.clear();
  reportedFiles.clear();
}

module.exports = {
  checkDocument,
  clearCompilerDiagnostics,
  compilerFlagOptions,
  disposeChecks,
  publishCompilerDiagnostics,
};
