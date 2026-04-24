/**
 * QBasic Nexus - Constants & Configuration
 * Centralized constants for the extension
 */

'use strict';

const CONFIG = Object.freeze({
  SECTION: 'qbasic-nexus',
  COMPILER_PATH: 'compilerPath',
  COMPILER_MODE: 'compilerMode',
  COMPILER_ARGS: 'compilerArgs',
  INTERNAL_TARGETS: 'internalTargets',
  INTERNAL_OUTPUT_DIR: 'internalOutputDir',
  COMPILE_WORKER_MAX_QUEUE_SIZE: 'compileWorkerMaxQueueSize',
  COMPILE_WORKER_REQUEST_TIMEOUT_MS: 'compileWorkerRequestTimeoutMs',
  LINT_WORKER_MAX_QUEUE_SIZE: 'lintWorkerMaxQueueSize',
  LINT_WORKER_REQUEST_TIMEOUT_MS: 'lintWorkerRequestTimeoutMs',
  ENABLE_LINT: 'enableLinting',
  LINT_DELAY: 'lintDelay',
  AUTO_FORMAT: 'autoFormatOnSave',
  LINE_NUMBER_START: 'lineNumberStart',
  LINE_NUMBER_STEP: 'lineNumberStep',
  MODE_QB64: 'QB64 (Recommended)',
  MODE_INTERNAL: 'Qbasic Nexus',
  MODE_INTERNAL_WASM: 'Qbasic Nexus + WASM',
  LANGUAGE_ID: 'qbasic',
  OUTPUT_CHANNEL: 'QBasic Nexus',
  TERMINAL_NAME: 'QBasic Nexus',
  CMD_RETRO: 'qbasic-nexus.runInCrt',
  CMD_TUTORIAL: 'qbasic-nexus.startTutorial',
});

const COMMANDS = Object.freeze({
  COMPILE: 'qbasic-nexus.compile',
  COMPILE_RUN: 'qbasic-nexus.compileAndRun',
  RUN_CRT: 'qbasic-nexus.runInCrt',
  START_TUTORIAL: 'qbasic-nexus.startTutorial',
  SHOW_SYSTEM_QUICK_ACTIONS: 'qbasic-nexus.configureSystem',
  SELECT_COMPILER_MODE: 'qbasic-nexus.selectCompilerMode',
  SELECT_COMPILER_PATH: 'qbasic-nexus.selectCompilerPath',
  SELECT_COMPILER_ARGS: 'qbasic-nexus.selectCompilerArgs',
  SHOW_STATS: 'qbasic-nexus.showCodeStats',
  REMOVE_LINE_NUMBERS: 'qbasic-nexus.removeLineNumbers',
  RENUMBER_LINES: 'qbasic-nexus.renumberLines',
  SHOW_ASCII_CHART: 'qbasic-nexus.showAsciiChart',
  INSERT_CHR_FROM_ASCII: 'qbasic-nexus.insertChrFromAsciiChart',
  REFRESH_TODO: 'qbasic-nexus.refreshTodo',
  SHOW_INTERNAL_BUILD_QUICK_ACTIONS: 'qbasic-nexus.showInternalBuildQuickActions',
  SELECT_INTERNAL_TARGETS: 'qbasic-nexus.selectInternalTargets',
  SELECT_INTERNAL_OUTPUT_DIR: 'qbasic-nexus.selectInternalOutputDir',
  SELECT_COMPILE_WORKER_RESILIENCE: 'qbasic-nexus.selectCompileWorkerResilience',
  SELECT_LINT_WORKER_RESILIENCE: 'qbasic-nexus.selectLintWorkerResilience',
  SELECT_ENABLE_LINTING: 'qbasic-nexus.selectEnableLinting',
  SELECT_LINT_DELAY: 'qbasic-nexus.selectLintDelay',
  SELECT_AUTO_FORMAT: 'qbasic-nexus.selectAutoFormat',
  SELECT_LINE_NUMBER_SETTINGS: 'qbasic-nexus.selectLineNumberSettings',
});

module.exports = { CONFIG, COMMANDS };
