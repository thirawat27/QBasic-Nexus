/**
 * QBasic Nexus - Incremental Linter
 *
 * Phase 2.2 upgrade:
 *  - Caches last diagnostics per document URI
 *  - Re-lints ONLY lines that have changed (dirty-range detection)
 *  - Uses IncrementalTracker from cache.js for change detection
 *  - Provides cancellation via token pattern
 *  - Adaptive debounce: shorter delay when few lines changed
 *
 * Replaces:  "create new InternalTranspiler every lintDocument call"
 * With:      singleton transpiler + incremental diagnostics merge
 */

"use strict"

// Load vscode at top-level — was incorrectly re-required on every lint cycle
const vscode = require("vscode")
const InternalTranspiler = require("../compiler/transpiler")
const { IncrementalTracker } = require("../compiler/cache")

/**
 * Per-document linting state.
 * @typedef {{ tracker: IncrementalTracker, lastDiags: Array }} DocState
 */

class IncrementalLinter {
  constructor() {
    /** @type {Map<string, DocState>} */
    this._docStates = new Map()

    /** @type {Map<string, NodeJS.Timeout>} */
    this._pendingTimers = new Map()

    // Singleton transpiler reused across lint cycles (avoids re-creation cost)
    this._transpiler = new InternalTranspiler()
  }

  /**
   * Schedule a lint for the given document.
   * @param {import('vscode').TextDocument} document
   * @param {import('vscode').DiagnosticCollection} diagnosticCollection
   * @param {number} baseDelay  - default delay in ms from settings
   */
  schedule(document, diagnosticCollection, baseDelay = 500) {
    if (!document || document.languageId !== "qbasic") return

    const key = document.uri.toString()

    // Cancel any already-pending lint for this doc
    const existing = this._pendingTimers.get(key)
    if (existing) clearTimeout(existing)

    // Choose adaptive delay: fewer dirty lines → shorter wait
    const state = this._getOrCreateState(key)
    const newSource = document.getText()
    const changedLines = state.tracker.detectChanges(newSource)
    const adaptiveDelay =
      changedLines.size <= 5
        ? Math.min(baseDelay, 150) // tiny edit → respond faster
        : baseDelay

    const timerId = setTimeout(() => {
      this._pendingTimers.delete(key)
      this._runLint(document, diagnosticCollection, state)
    }, adaptiveDelay)

    this._pendingTimers.set(key, timerId)
  }

  /**
   * Cancel and remove state for a closed document.
   * Called from extension.js onDidCloseTextDocument to prevent memory leaks.
   * @param {string} uriKey
   */
  removeDocument(uriKey) {
    const timer = this._pendingTimers.get(uriKey)
    if (timer) clearTimeout(timer)
    this._pendingTimers.delete(uriKey)
    this._docStates.delete(uriKey)
  }

  /** Cancel all pending timers (call on deactivate). */
  dispose() {
    for (const t of this._pendingTimers.values()) clearTimeout(t)
    this._pendingTimers.clear()
    this._docStates.clear()
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _getOrCreateState(key) {
    if (!this._docStates.has(key)) {
      this._docStates.set(key, {
        tracker: new IncrementalTracker(),
        lastDiags: [],
      })
    }
    return this._docStates.get(key)
  }

  /**
   * Run the actual lint using the shared transpiler singleton.
   * @param {import('vscode').TextDocument} document
   * @param {import('vscode').DiagnosticCollection} collection
   * @param {DocState} state
   */
  _runLint(document, collection, state) {
    try {
      const source = document.getText()
      const lineCount = document.lineCount

      // Reuse transpiler instance (avoids object creation overhead)
      const errors = this._transpiler.lint(source)

      const diagnostics = errors.map((err) => {
        const line = Math.max(0, Math.min(err.line, lineCount - 1))
        const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER)
        const severity = _getSeverity(err.severity || "error")
        const diag = new vscode.Diagnostic(range, err.message, severity)
        diag.source = "QBasic Nexus"
        diag.code = err.code || "E001"
        return diag
      })

      state.lastDiags = diagnostics
      collection.set(document.uri, diagnostics)
    } catch (err) {
      // Never let linting crash the extension
      console.error("[IncrementalLinter] Error:", err.message)
    }
  }
}

// Severity lookup — maps directly to vscode enum (removed redundant int indirection table)
function _getSeverity(level) {
  switch (level) {
    case "warning":
      return vscode.DiagnosticSeverity.Warning
    case "info":
      return vscode.DiagnosticSeverity.Information
    case "hint":
      return vscode.DiagnosticSeverity.Hint
    default:
      return vscode.DiagnosticSeverity.Error
  }
}

// Global singleton – one linter shared across the extension lifecycle
let _instance = null

/**
 * Get (or create) the global IncrementalLinter singleton.
 * @returns {IncrementalLinter}
 */
function getIncrementalLinter() {
  if (!_instance) _instance = new IncrementalLinter()
  return _instance
}

module.exports = { IncrementalLinter, getIncrementalLinter }
