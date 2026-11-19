/**
 * QBasic Nexus - Global State
 * Shared mutable state across the extension modules
 */

// Global mutable state — exported as a single object so mutations are visible
// across all modules that import this.
const state = {
  statusBarItem: null,
  internalBuildBarItem: null,
  statsBarItem: null,
  outputChannel: null,
  terminal: null,
  terminalCwd: null,
  terminalKey: null,
  autoDetectedCompilerPath: null,
  diagnosticCollection: null,
  compatDiagnosticCollection: null,
  insightDiagnosticCollection: null,
  compilerIdentity: null,
  isCompiling: false,
  extensionContext: null,
};

export {
  state,
};
