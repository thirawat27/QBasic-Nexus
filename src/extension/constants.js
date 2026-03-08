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
  ENABLE_LINT: 'enableLinting',
  LINT_DELAY: 'lintDelay',
  AUTO_FORMAT: 'autoFormatOnSave',
  LINE_NUMBER_START: 'lineNumberStart',
  LINE_NUMBER_STEP: 'lineNumberStep',
  MODE_QB64: 'QB64 (Recommended)',
  MODE_INTERNAL: 'Qbasic Nexus',
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
  SHOW_STATS: 'qbasic-nexus.showCodeStats',
  REMOVE_LINE_NUMBERS: 'qbasic-nexus.removeLineNumbers',
  RENUMBER_LINES: 'qbasic-nexus.renumberLines',
  SHOW_ASCII_CHART: 'qbasic-nexus.showAsciiChart',
  INSERT_CHR_FROM_ASCII: 'qbasic-nexus.insertChrFromAsciiChart',
});

module.exports = { CONFIG, COMMANDS };
