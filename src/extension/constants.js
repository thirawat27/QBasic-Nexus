/**
 * QBasic Nexus - Constants & Configuration
 * Centralized constants for the extension
 */

'use strict';

const CONFIG = Object.freeze({
  SECTION: 'qbasic-nexus',
  COMPILER_MODE: 'compilerMode',
  COMPILER_PATH: 'compilerPath',
  QBNEX_PATH: 'qbnexPath',
  COMPILER_ARGS: 'compilerArgs',
  OUTPUT_DIRECTORY: 'outputDirectory',
  SHOW_WARNINGS: 'showWarnings',
  WARNINGS_AS_ERRORS: 'warningsAsErrors',
  EXPLICIT: 'optionExplicit',
  EXTERNAL_BUILD_TIMEOUT_MS: 'externalBuildTimeoutMs',
  ENABLE_LINT: 'enableLinting',
  LANGUAGE_SERVER_ENABLED: 'languageServer.enabled',
  LANGUAGE_SERVER_PATH: 'languageServer.path',
  DEBUG_ADAPTER_PATH: 'debugAdapterPath',
  FORMATTER: 'formatter',
  FORMATTER_PATH: 'formatterPath',
  AUTO_FORMAT: 'autoFormatOnSave',
  LINE_NUMBER_START: 'lineNumberStart',
  LINE_NUMBER_STEP: 'lineNumberStep',
  MODE_AUTO: 'Auto',
  MODE_QBNEX: 'QBNex',
  MODE_QB64: 'QB64',
  FORMATTER_BUILTIN: 'builtin',
  FORMATTER_QB_FMT: 'qb-fmt',
  LANGUAGE_ID: 'qbasic',
  OUTPUT_CHANNEL: 'QBasic Nexus',
  TERMINAL_NAME: 'QBasic Nexus',
  DEBUG_TYPE: 'qbasic-nexus',
  QBNEX_EXTENSION_ID: 'qbnex.qbnex',
});

/** Mode names written by QBasic Nexus 1.x, mapped to the modes that replace them. */
const LEGACY_COMPILER_MODES = Object.freeze({
  'QB64 (Recommended)': CONFIG.MODE_QB64,
  'Qbasic Nexus': CONFIG.MODE_QBNEX,
  'Qbasic Nexus + WASM': CONFIG.MODE_QBNEX,
});

/** Settings of the removed internal compiler (1.x); cleared on activation. */
const REMOVED_SETTINGS = Object.freeze([
  'internalTargets',
  'internalWasmAccelerator',
  'compileWorkerMaxQueueSize',
  'compileWorkerRequestTimeoutMs',
  'lintWorkerMaxQueueSize',
  'lintWorkerRequestTimeoutMs',
  'lintDelay',
]);

const COMMANDS = Object.freeze({
  COMPILE: 'qbasic-nexus.compile',
  COMPILE_RUN: 'qbasic-nexus.compileAndRun',
  CHECK: 'qbasic-nexus.checkFile',
  RUN_CRT: 'qbasic-nexus.runInCrt',
  CRT_RERUN: 'qbasic-nexus.crtRerun',
  CRT_STOP: 'qbasic-nexus.crtStop',
  CRT_INPUT: 'qbasic-nexus.crtInput',
  START_TUTORIAL: 'qbasic-nexus.startTutorial',
  SHOW_SYSTEM_QUICK_ACTIONS: 'qbasic-nexus.configureSystem',
  SHOW_TOOLCHAIN_INFO: 'qbasic-nexus.showToolchainInfo',
  SELECT_COMPILER_MODE: 'qbasic-nexus.selectCompilerMode',
  SELECT_COMPILER_PATH: 'qbasic-nexus.selectCompilerPath',
  SELECT_QBNEX_PATH: 'qbasic-nexus.selectQBNexPath',
  SELECT_COMPILER_ARGS: 'qbasic-nexus.selectCompilerArgs',
  SELECT_OUTPUT_DIRECTORY: 'qbasic-nexus.selectOutputDirectory',
  SELECT_DIAGNOSTIC_FLAGS: 'qbasic-nexus.selectDiagnosticFlags',
  SELECT_FORMATTER: 'qbasic-nexus.selectFormatter',
  RESTART_LANGUAGE_SERVER: 'qbasic-nexus.restartLanguageServer',
  SHOW_STATS: 'qbasic-nexus.showCodeStats',
  REMOVE_LINE_NUMBERS: 'qbasic-nexus.removeLineNumbers',
  RENUMBER_LINES: 'qbasic-nexus.renumberLines',
  SHOW_ASCII_CHART: 'qbasic-nexus.showAsciiChart',
  INSERT_CHR_FROM_ASCII: 'qbasic-nexus.insertChrFromAsciiChart',
  REFRESH_TODO: 'qbasic-nexus.refreshTodo',
  SELECT_ENABLE_LINTING: 'qbasic-nexus.selectEnableLinting',
  SELECT_AUTO_FORMAT: 'qbasic-nexus.selectAutoFormat',
  SELECT_LINE_NUMBER_SETTINGS: 'qbasic-nexus.selectLineNumberSettings',
});

/**
 * Maps any stored compiler mode (current or 1.x) to a current one.
 * @param {unknown} value
 * @returns {'Auto'|'QBNex'|'QB64'}
 */
function normalizeCompilerMode(value) {
  const text = String(value || '').trim();
  if (Object.prototype.hasOwnProperty.call(LEGACY_COMPILER_MODES, text)) {
    return LEGACY_COMPILER_MODES[text];
  }
  const lower = text.toLowerCase();
  if (lower === 'qbnex') return CONFIG.MODE_QBNEX;
  if (lower === 'qb64') return CONFIG.MODE_QB64;
  return CONFIG.MODE_AUTO;
}

module.exports = {
  CONFIG,
  COMMANDS,
  LEGACY_COMPILER_MODES,
  REMOVED_SETTINGS,
  normalizeCompilerMode,
};
