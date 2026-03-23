/**
 * QBasic Nexus - Incremental Linter
 *
 * optimisation pass:
 *  - Caches last diagnostics per document URI
 *  - Adaptive debounce: responds faster on small edits (< 150 chars changed)
 *  - Version guard: skips work when document.version hasn't changed
 *  - Pending-version guard: skips re-scheduling for the same version
 *  - Lint result is compared against previous to avoid redundant VS Code
 *    diagnostic updates (reduces UI repaint pressure)
 *  - Singleton transpiler reused across all lint cycles (avoids re-creation)
 *  - Uses IncrementalTracker from cache.js for future incremental expansion
 *  - Cancel-all on deactivate() via dispose()
 */

'use strict';

const vscode = require('vscode');
const InternalTranspiler = require('../compiler/parser');

/**
 * Per-document linting state.
 * @typedef {{
 *   lastDiags: Array,
 *   lastLintVersion: number,
 *   pendingVersion: number | null,
 *   lastLength: number,
 *   lastDiagKey: string
 * }} DocState
 */

class IncrementalLinter {
  constructor() {
    /** @type {Map<string, DocState>} */
    this._docStates = new Map();

    /** @type {Map<string, NodeJS.Timeout>} */
    this._pendingTimers = new Map();

    // Singleton transpiler reused across lint cycles (avoids object creation overhead)
    this._transpiler = new InternalTranspiler();
  }

  /**
   * Schedule a lint for the given document.
   * @param {import('vscode').TextDocument} document
   * @param {import('vscode').DiagnosticCollection} diagnosticCollection
   * @param {number} baseDelay  - default delay in ms from settings
   */
  schedule(document, diagnosticCollection, baseDelay = 500) {
    if (!document || document.languageId !== 'qbasic') return;

    const key = document.uri.toString();
    const existing = this._pendingTimers.get(key);
    const state = this._getOrCreateState(key);
    const newLength = document.getText().length;
    const lengthDiff = Math.abs((state.lastLength || 0) - newLength);
    state.lastLength = newLength;

    // ── Version guards ──────────────────────────────────────────────────────
    // 1. Already linted this exact version → serve from cache immediately
    if (state.lastLintVersion === document.version) {
      diagnosticCollection.set(document.uri, state.lastDiags);
      return;
    }

    // 2. A timer is already queued for this exact version → no-op
    if (existing && state.pendingVersion === document.version) {
      return;
    }

    if (existing) clearTimeout(existing);

    // ── Adaptive delay ──────────────────────────────────────────────────────
    // Optimized thresholds for better responsiveness
    // Small edits (tiny keystrokes) get a shorter delay for snappier feedback.
    // Large pastes / structural changes get the full baseDelay.
    const adaptiveDelay =
      lengthDiff <= 100
        ? Math.min(baseDelay, 100) // tiny edit → respond even faster
        : lengthDiff <= 500
        ? Math.min(baseDelay, 250) // medium edit → moderate delay
        : baseDelay; // large edit → full delay

    const scheduledVersion = document.version;
    state.pendingVersion = scheduledVersion;

    const timerId = setTimeout(() => {
      this._pendingTimers.delete(key);
      if (state.pendingVersion !== scheduledVersion) return;
      this._runLint(document, diagnosticCollection, state);
    }, adaptiveDelay);

    this._pendingTimers.set(key, timerId);
  }

  /**
   * Cancel and remove state for a closed document.
   * Called from extension.js onDidCloseTextDocument to prevent memory leaks.
   * @param {string} uriKey
   */
  removeDocument(uriKey) {
    const timer = this._pendingTimers.get(uriKey);
    if (timer) clearTimeout(timer);
    this._pendingTimers.delete(uriKey);
    this._docStates.delete(uriKey);
  }

  /** Cancel all pending timers (call on deactivate). */
  dispose() {
    for (const t of this._pendingTimers.values()) clearTimeout(t);
    this._pendingTimers.clear();
    this._docStates.clear();
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _getOrCreateState(key) {
    if (!this._docStates.has(key)) {
      this._docStates.set(key, {
        lastDiags: [],
        lastLintVersion: -1,
        pendingVersion: null,
        lastLength: 0,
        lastDiagKey: '',
      });
    }
    return this._docStates.get(key);
  }

  /**
   * Run the actual lint using the shared transpiler singleton.
   * @param {import('vscode').TextDocument} document
   * @param {import('vscode').DiagnosticCollection} collection
   * @param {DocState} state
   */
  _runLint(document, collection, state) {
    try {
      const source = document.getText();
      const lineCount = document.lineCount;

      // Reuse transpiler instance (avoids object creation overhead)
      const errors = this._transpiler.lint(source, {
        sourcePath: document.uri.fsPath,
      });

      const diagnostics = errors.map((err) => {
        const line = Math.max(0, Math.min(err.line, lineCount - 1));
        const lineText = document.lineAt(line).text;
        const startColumn = Math.max(
          0,
          Math.min(Number(err.column) || 0, lineText.length),
        );
        const endColumn = Math.max(
          startColumn + 1,
          Math.min(
            lineText.length,
            startColumn + Math.max(1, Number(err.length) || 1),
          ),
        );
        const range = new vscode.Range(line, startColumn, line, endColumn);
        const severity = _getSeverity(err.severity || 'error');
        const diag = new vscode.Diagnostic(range, err.message, severity);
        diag.source = 'QBasic Nexus';
        diag.code = err.code || err.category?.toUpperCase() || 'E001';
        return diag;
      });

      // ── Redundancy guard ──────────────────────────────────────────────────
      // Build a lightweight fingerprint. If diagnostics haven't changed,
      // skip calling collection.set() to avoid VS Code's repaint overhead.
      const diagKey = _fingerprintDiags(diagnostics);
      if (diagKey !== state.lastDiagKey) {
        state.lastDiags = diagnostics;
        state.lastDiagKey = diagKey;
        collection.set(document.uri, diagnostics);
      }

      state.lastLintVersion = document.version;
      state.pendingVersion = null;
    } catch (err) {
      // Never let linting crash the extension
      console.error('[IncrementalLinter] Error:', err.message);
      state.pendingVersion = null;
    }
  }
}

// Severity lookup — maps directly to vscode enum
function _getSeverity(level) {
  switch (level) {
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    case 'hint':
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Error;
  }
}

/**
 * Compute a cheap string fingerprint of a diagnostic array.
 * Used to detect whether VS Code diagnostics actually changed before
 * invoking collection.set() (which triggers a repaint + editor decoration).
 * @param {import('vscode').Diagnostic[]} diags
 * @returns {string}
 */
function _fingerprintDiags(diags) {
  if (diags.length === 0) return '';
  let s = '';
  for (const d of diags) {
    s += `${d.range.start.line}:${d.range.start.character}:${d.severity}:${d.message}|`;
  }
  return s;
}

// Global singleton – one linter shared across the extension lifecycle
let _instance = null;

/**
 * Get (or create) the global IncrementalLinter singleton.
 * @returns {IncrementalLinter}
 */
function getIncrementalLinter() {
  if (!_instance) _instance = new IncrementalLinter();
  return _instance;
}

module.exports = { IncrementalLinter, getIncrementalLinter };
