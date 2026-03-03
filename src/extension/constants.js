/**
 * QBasic Nexus - Constants & Configuration
 * Centralized constants for the extension
 */

"use strict"

const CONFIG = Object.freeze({
  SECTION: "qbasic-nexus",
  COMPILER_PATH: "compilerPath",
  COMPILER_MODE: "compilerMode",
  COMPILER_ARGS: "compilerArgs",
  ENABLE_LINT: "enableLinting",
  LINT_DELAY: "lintDelay",
  AUTO_FORMAT: "autoFormatOnSave",
  MODE_QB64: "QB64 (Recommended)",
  MODE_INTERNAL: "Qbasic Nexus",
  LANGUAGE_ID: "qbasic",
  OUTPUT_CHANNEL: "QBasic Nexus",
  TERMINAL_NAME: "QBasic Nexus",
  CMD_RETRO: "qbasic-nexus.runInCrt",
  CMD_TUTORIAL: "qbasic-nexus.startTutorial",
})

const COMMANDS = Object.freeze({
  COMPILE: "qbasic-nexus.compile",
  COMPILE_RUN: "qbasic-nexus.compileAndRun",
  RUN_CRT: "qbasic-nexus.runInCrt",
  START_TUTORIAL: "qbasic-nexus.startTutorial",
  SHOW_STATS: "qbasic-nexus.showCodeStats",
})

module.exports = { CONFIG, COMMANDS }
