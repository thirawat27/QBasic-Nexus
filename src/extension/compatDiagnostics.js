/**
 * QBasic Nexus - QB64-PE Compatibility Diagnostics
 * Warns when a program uses QB64-PE-only keywords but the compiler in use is
 * the original QB64, which cannot build them.
 */

'use strict';

const vscode = require('vscode');
const { CONFIG } = require('./constants');
const { state } = require('./state');
const { getConfig } = require('./utils');
const { getDocumentAnalysis } = require('../shared/documentAnalysis');
const {
  findQB64PEOnlyUsages,
  isQB64PEIdentity,
} = require('../shared/qb64peCompat');

const COMPAT_DELAY_MS = 400;
const timers = new Map();

/**
 * True when the compiler is known and is not QB64-PE.
 */
function compilerLacksPEFeatures() {
  return Boolean(state.compilerIdentity) && !isQB64PEIdentity(state.compilerIdentity);
}

function computeCompatDiagnostics(document) {
  if (!compilerLacksPEFeatures() || !getConfig(CONFIG.WARN_QB64PE_ONLY, true)) {
    return [];
  }

  return findQB64PEOnlyUsages(getDocumentAnalysis(document).lines).map((usage) => {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(usage.line, usage.start, usage.line, usage.end),
      `${usage.keyword} is a QB64-PE addition. The compiler in use (${state.compilerIdentity}) cannot build it; install QB64-PE or avoid this keyword.`,
      vscode.DiagnosticSeverity.Warning,
    );
    diagnostic.source = 'QBasic Nexus';
    diagnostic.code = 'qb64pe-only';
    return diagnostic;
  });
}

/**
 * Recompute compatibility warnings for one document, debounced.
 * @param {vscode.TextDocument} document
 * @param {{immediate?: boolean}} [options]
 */
function updateCompatDiagnostics(document, options = {}) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return;
  if (!state.compatDiagnosticCollection) return;

  const key = document.uri.toString();
  clearTimeout(timers.get(key));

  const run = () => {
    timers.delete(key);
    if (document.isClosed) return;
    state.compatDiagnosticCollection.set(
      document.uri,
      computeCompatDiagnostics(document),
    );
  };

  if (options.immediate) run();
  else timers.set(key, setTimeout(run, COMPAT_DELAY_MS));
}

/** Recheck every open QBasic document (after the compiler changed). */
function refreshAllCompatDiagnostics() {
  for (const document of vscode.workspace.textDocuments) {
    updateCompatDiagnostics(document, { immediate: true });
  }
}

function removeCompatDiagnostics(uri) {
  const key = uri.toString();
  clearTimeout(timers.get(key));
  timers.delete(key);
  state.compatDiagnosticCollection?.delete(uri);
}

function disposeCompatDiagnostics() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}

module.exports = {
  computeCompatDiagnostics,
  updateCompatDiagnostics,
  refreshAllCompatDiagnostics,
  removeCompatDiagnostics,
  disposeCompatDiagnostics,
};
