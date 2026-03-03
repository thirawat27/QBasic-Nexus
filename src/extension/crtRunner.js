/**
 * QBasic Nexus - CRT Runner
 * Runs QBasic code in the Retro CRT Webview
 */

"use strict"

const vscode = require("vscode")
const path = require("path")
const { CONFIG } = require("./constants")
const { state } = require("./state")
const { log } = require("./utils")
const { getInternalTranspiler, getWebviewManager } = require("./lazyModules")

async function runInCrt() {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage("📄 Please open a QBasic file first.")
    return
  }

  const document = editor.document
  const sourceCode = document.getText()
  const fileName = path.basename(document.uri.fsPath)

  // Save if dirty
  if (document.isDirty) await document.save()

  try {
    log("Transpiling for CRT Webview...", "info")

    // Transpile with 'web' target
    const InternalTranspiler = getInternalTranspiler()
    const transpiler = new InternalTranspiler()
    const jsCode = transpiler.transpile(sourceCode, "web")

    // Launch Webview
    await getWebviewManager().runCode(
      jsCode,
      fileName,
      state.extensionContext.extensionUri,
    )

    log("Launched Retro CRT 📺", "success")
  } catch (error) {
    vscode.window.showErrorMessage(`❌ Failed to run in CRT: ${error.message}`)
    log(`CRT Error: ${error.message}`, "error")
  }
}

module.exports = { runInCrt }
