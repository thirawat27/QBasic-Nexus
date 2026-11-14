/**
 * QBasic Nexus - Global State
 * Shared mutable state across the extension modules
 */

'use strict';

// Global mutable state — exported as a single object so mutations are visible
// across all modules that import this.
const state = {
  statusBarItem: null,
  toolchainBarItem: null,
  statsBarItem: null,
  outputChannel: null,
  terminal: null,
  terminalCwd: null,
  terminalKey: null,
  autoDetectedCompilerPath: null,
  /** undefined: not resolved yet; null: none found; else the active toolchain */
  activeToolchain: undefined,
  languageServerRunning: false,
  diagnosticCollection: null,
  isCompiling: false,
  extensionContext: null,
};

module.exports = { state };
