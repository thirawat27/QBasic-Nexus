/**
 * QBasic Nexus - Status Bar
 * Status bar item management and updates
 */

"use strict"

const vscode = require("vscode")
const { CONFIG, COMMANDS } = require("./constants")
const { state } = require("./state")
const { getConfig } = require("./utils")

function updateStatusBar() {
  const editor = vscode.window.activeTextEditor

  if (!state.statusBarItem) return // Guard: disposed during deactivation

  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    state.statusBarItem.hide()
    return
  }

  const mode = getConfig(CONFIG.COMPILER_MODE)
  const compilerPath = getConfig(CONFIG.COMPILER_PATH)

  if (state.isCompiling) {
    state.statusBarItem.text = "$(sync~spin) Compiling..."
    state.statusBarItem.tooltip = "Compilation in progress"
    state.statusBarItem.backgroundColor = undefined
  } else if (mode === CONFIG.MODE_INTERNAL) {
    state.statusBarItem.text = "$(package) Build .exe ⚡"
    state.statusBarItem.tooltip = "Compile with Qbasic Nexus (pkg → .exe)"
    state.statusBarItem.backgroundColor = undefined
  } else if (!compilerPath) {
    state.statusBarItem.text = "$(warning) Configure QB64"
    state.statusBarItem.tooltip = "Click to set QB64 path"
    state.statusBarItem.command = {
      command: "workbench.action.openSettings",
      arguments: [`${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`],
    }
    state.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground",
    )
  } else {
    state.statusBarItem.text = "$(flame) Run ⚡"
    state.statusBarItem.tooltip = "Compile & Run with QB64"
    state.statusBarItem.command = COMMANDS.COMPILE_RUN // restore from warning state
    state.statusBarItem.backgroundColor = undefined
  }

  state.statusBarItem.show()
}

function updateCodeStats(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) {
    if (state.statsBarItem) state.statsBarItem.hide()
    return
  }

  const text = document.getText()
  const lines = document.lineCount
  const codeLines = text.split("\n").filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed &&
      !trimmed.startsWith("'") &&
      !trimmed.toUpperCase().startsWith("REM ")
    )
  }).length
  const subCount = (text.match(/^\s*SUB\s+/gim) || []).length
  const funcCount = (text.match(/^\s*FUNCTION\s+/gim) || []).length

  state.statsBarItem.text = `$(code) ${codeLines}L | ${subCount}S ${funcCount}F`
  state.statsBarItem.tooltip = `Lines: ${lines} (${codeLines} code)\nSUBs: ${subCount}\nFUNCTIONs: ${funcCount}`
  state.statsBarItem.show()
}

module.exports = { updateStatusBar, updateCodeStats }
