/**
 * QBasic Nexus - Global State
 * Shared mutable state across the extension modules
 */

"use strict"

// Global mutable state — exported as a single object so mutations are visible
// across all modules that import this.
const state = {
  statusBarItem: null,
  statsBarItem: null,
  outputChannel: null,
  terminal: null,
  diagnosticCollection: null,
  isCompiling: false,
  extensionContext: null,
}

module.exports = { state }
