// QBasic Nexus extension for VS Code
// Cross-Platform Native Implementation
// Supports Windows, macOS, and Linux with optimized performance

"use strict"

const vscode = require("vscode")
const path = require("path")
const fs = require("fs").promises
const os = require("os")
const { spawn } = require("child_process")

// Import cross-platform utilities
const {
  IS_WIN,
  IS_MAC,
  getExecutableExtension,
} = require("./src/utils/pathUtils")
// Platform utilities imported as needed
const {
  detectCompiler,
  validateCompilerPath,
  getInstallationInstructions,
} = require("./src/utils/compilerDetector")

// Import modules
const {
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicDocumentFormattingEditProvider,
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
  QBasicOnTypeFormattingEditProvider,
  invalidateCache,
} = require("./src/providers")
const compilerWorker = require("./src/compiler/WorkerManager")
const WebviewManager = require("./src/managers/WebviewManager")
const TutorialManager = require("./src/managers/TutorialManager")

// Configuration constants
const CONFIG = Object.freeze({
  SECTION: "qbasic-nexus",
  COMPILER_PATH: "compilerPath",
  COMPILER_MODE: "compilerMode",
  COMPILER_ARGS: "compilerArgs",
  ENABLE_LINT: "enableLinting",
  LINT_DELAY: "lintDelay",
  AUTO_FORMAT: "autoFormatOnSave",
  MODE_QB64: "QB64 (Recommended)",
  MODE_INTERNAL: "QBasic Nexus",
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
  EXTRACT_SUB: "qbasic-nexus.extractToSub",
  SHOW_STATS: "qbasic-nexus.showCodeStats",
  TOGGLE_COMMENT: "qbasic-nexus.toggleComment",
  SHOW_VERSION: "qbasic-nexus.showVersion",
})

// Global state variables
let statusBarItem = null
let statsBarItem = null
let outputChannel = null
let terminal = null
let diagnosticCollection = null
let isCompiling = false
let extensionContext = null
let versionBarItem = null

const packageJson = require("./package.json")
const VERSION = packageJson.version

// Utility functions

const _ = require("lodash")

// Use Lodash for high-performance debouncing
const debounce = (fn, delay) => {
  const debounced = _.debounce(fn, delay)
  // Add cancel method to match existing interface
  debounced.cancel = () => debounced.cancel()
  return debounced
}

// Use Lodash for high-performance throttling
const throttle = (fn, limit) => {
  const throttled = _.throttle(fn, limit, { leading: true, trailing: true })
  // Add cancel method to match existing interface
  throttled.cancel = () => throttled.cancel()
  return throttled
}

function getOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(CONFIG.OUTPUT_CHANNEL)
  }
  return outputChannel
}

function getTerminal() {
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal({
      name: CONFIG.TERMINAL_NAME,
      iconPath: new vscode.ThemeIcon("terminal"),
    })
  }
  return terminal
}

function getConfig(key, defaultValue = null) {
  const value = vscode.workspace.getConfiguration(CONFIG.SECTION).get(key)
  return value !== undefined ? value : defaultValue
}

function log(message, type = "info") {
  const channel = getOutputChannel()
  const prefix =
    {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
      debug: "🔍",
    }[type] || ""
  channel.appendLine(`${prefix} ${message}`)
}

// Linting system

const pendingLints = new Map()

// Performs syntax checking and updates diagnostics for a document
function lintDocument(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return
  if (!getConfig(CONFIG.ENABLE_LINT, true)) return

  const uriKey = document.uri.toString()

  // Cancel pending lint for this document
  if (pendingLints.has(uriKey)) {
    clearTimeout(pendingLints.get(uriKey))
  }

  const delay = getConfig(CONFIG.LINT_DELAY, 500)

  const timerId = setTimeout(async () => {
    pendingLints.delete(uriKey)

    try {
      const errors = await compilerWorker.lintAsync(document.getText())
      const lineCount = document.lineCount

      const diagnostics = errors.map((err) => {
        const line = Math.max(0, Math.min(err.line, lineCount - 1))
        const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER)

        const diagnostic = new vscode.Diagnostic(
          range,
          err.message,
          getSeverity(err.severity || "error"),
        )
        diagnostic.source = "QBasic Nexus"
        diagnostic.code = err.code || "E001"

        return diagnostic
      })

      diagnosticCollection.set(document.uri, diagnostics)
    } catch (error) {
      console.error("[QBasic Nexus] Linting error:", error.message)
    }
  }, delay)

  pendingLints.set(uriKey, timerId)
}

const SEVERITY_MAP = Object.freeze({
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
  hint: vscode.DiagnosticSeverity.Hint,
  error: vscode.DiagnosticSeverity.Error,
})

function getSeverity(level) {
  return SEVERITY_MAP[level] || vscode.DiagnosticSeverity.Error
}

// Code statistics

function updateCodeStats(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) {
    if (statsBarItem) statsBarItem.hide()
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

  statsBarItem.text = `$(code) ${codeLines}L | ${subCount}S ${funcCount}F`
  statsBarItem.tooltip = `Lines: ${lines} (${codeLines} code)\nSUBs: ${subCount}\nFUNCTIONs: ${funcCount}`
  statsBarItem.show()
}

// Extension lifecycle

async function activate(context) {
  console.log("[QBasic Nexus] ⚡ Extension activated")
  const startTime = Date.now()

  extensionContext = context

  TutorialManager.setWebviewManager(WebviewManager)

  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("qbasic-nexus")
  context.subscriptions.push(diagnosticCollection)

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  )
  statusBarItem.command = COMMANDS.COMPILE_RUN
  context.subscriptions.push(statusBarItem)

  statsBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  )
  statsBarItem.command = COMMANDS.SHOW_STATS
  context.subscriptions.push(statsBarItem)

  versionBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    90,
  )
  versionBarItem.text = `QBasic v${VERSION}`
  versionBarItem.tooltip = `QBasic Nexus Version ${VERSION}`
  versionBarItem.command = COMMANDS.SHOW_VERSION
  versionBarItem.show()
  context.subscriptions.push(versionBarItem)

  const selector = { language: CONFIG.LANGUAGE_ID, scheme: "file" }

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      selector,
      new QBasicDocumentSymbolProvider(),
    ),
    vscode.languages.registerDefinitionProvider(
      selector,
      new QBasicDefinitionProvider(),
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      selector,
      new QBasicDocumentFormattingEditProvider(),
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new QBasicCompletionItemProvider(),
    ),
    vscode.languages.registerHoverProvider(selector, new QBasicHoverProvider()),
    vscode.languages.registerSignatureHelpProvider(
      selector,
      new QBasicSignatureHelpProvider(),
      "(",
      ",",
    ),

    vscode.languages.registerFoldingRangeProvider(
      selector,
      new QBasicFoldingRangeProvider(),
    ),
    vscode.languages.registerDocumentHighlightProvider(
      selector,
      new QBasicDocumentHighlightProvider(),
    ),
    vscode.languages.registerRenameProvider(
      selector,
      new QBasicRenameProvider(),
    ),
    vscode.languages.registerCodeActionsProvider(
      selector,
      new QBasicCodeActionProvider(),
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.RefactorExtract,
        ],
      },
    ),
    vscode.languages.registerReferenceProvider(
      selector,
      new QBasicReferenceProvider(),
    ),
    vscode.languages.registerOnTypeFormattingEditProvider(
      selector,
      new QBasicOnTypeFormattingEditProvider(),
      "\n",
    ),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.COMPILE, () =>
      executeCompile(false),
    ),
    vscode.commands.registerCommand(COMMANDS.COMPILE_RUN, () =>
      executeCompile(true),
    ),
    vscode.commands.registerCommand(COMMANDS.RUN_CRT, runInCrt),
    vscode.commands.registerCommand(COMMANDS.START_TUTORIAL, () =>
      TutorialManager.startTutorial(extensionContext),
    ),
    vscode.commands.registerCommand(COMMANDS.SHOW_STATS, showCodeStatsDetail),
    vscode.commands.registerCommand(COMMANDS.TOGGLE_COMMENT, toggleComment),
    vscode.commands.registerCommand(COMMANDS.EXTRACT_SUB, extractToSub),
    vscode.commands.registerCommand(COMMANDS.SHOW_VERSION, () => {
      vscode.window.showInformationMessage(`QBasic Nexus v${VERSION}`)
    }),
  )

  const throttledStatsUpdate = throttle(updateCodeStats, 500)
  const debouncedStatusUpdate = debounce(updateStatusBar, 200)

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      debouncedStatusUpdate()
      if (editor) {
        lintDocument(editor.document)
        throttledStatsUpdate(editor.document)
      } else {
        if (statsBarItem) statsBarItem.hide()
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      invalidateCache(e.document.uri)
      lintDocument(e.document)
      throttledStatsUpdate(e.document)
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      lintDocument(doc)
      updateCodeStats(doc)
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG.SECTION)) {
        updateStatusBar()
      }
    }),
    vscode.window.onDidCloseTerminal((t) => {
      if (t === terminal) terminal = null
    }),
  )

  updateStatusBar()
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document
    lintDocument(doc)
    updateCodeStats(doc)
  }

  const activationTime = Date.now() - startTime
  console.log(`[QBasic Nexus] ✅ Ready in ${activationTime}ms`)
}

// Command implementations

async function showCodeStatsDetail() {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage("📄 Please open a QBasic file first.")
    return
  }

  const doc = editor.document
  const text = doc.getText()

  const stats = {
    totalLines: doc.lineCount,
    codeLines: 0,
    commentLines: 0,
    blankLines: 0,
    subs: 0,
    functions: 0,
    types: 0,
    constants: 0,
    dimStatements: 0,
    labels: 0,
    fileSize: text.length,
  }

  const lines = text.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      stats.blankLines++
    } else if (
      trimmed.startsWith("'") ||
      trimmed.toUpperCase().startsWith("REM ")
    ) {
      stats.commentLines++
    } else {
      stats.codeLines++
    }
  }

  stats.subs = (text.match(/^\s*SUB\s+\w+/gim) || []).length
  stats.functions = (text.match(/^\s*FUNCTION\s+\w+/gim) || []).length
  stats.types = (text.match(/^\s*TYPE\s+\w+/gim) || []).length
  stats.constants = (text.match(/^\s*CONST\s+\w+/gim) || []).length
  stats.dimStatements = (text.match(/^\s*DIM\s+/gim) || []).length
  stats.labels = (text.match(/^[a-zA-Z_]\w*:/gm) || []).length

  vscode.window.showInformationMessage(
    `📊 Code Stats: ${stats.codeLines} code lines, ${stats.subs} SUBs, ${stats.functions} FUNCTIONs`,
  )
}

async function toggleComment() {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) return

  const doc = editor.document
  const selection = editor.selection

  await editor.edit((editBuilder) => {
    for (let i = selection.start.line; i <= selection.end.line; i++) {
      const line = doc.lineAt(i)
      const text = line.text
      const trimmed = text.trimStart()
      const leadingSpaces = text.length - trimmed.length

      if (trimmed.startsWith("'")) {
        // Uncomment
        const newText =
          text.substring(0, leadingSpaces) + trimmed.substring(1).trimStart()
        editBuilder.replace(line.range, newText)
      } else {
        // Comment
        const newText = text.substring(0, leadingSpaces) + "' " + trimmed
        editBuilder.replace(line.range, newText)
      }
    }
  })
}

async function extractToSub(document, range) {
  if (!document || !range) {
    const editor = vscode.window.activeTextEditor
    if (!editor) return
    document = editor.document
    range = editor.selection
  }

  const selectedText = document.getText(range)
  if (!selectedText.trim()) {
    vscode.window.showWarningMessage("Please select code to extract.")
    return
  }

  const subName = await vscode.window.showInputBox({
    prompt: "Enter name for the new SUB",
    placeHolder: "MySub",
    validateInput: (value) => {
      if (!value) return "Name is required"
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))
        return "Invalid identifier name"
      return null
    },
  })

  if (!subName) return

  const editor = vscode.window.activeTextEditor
  if (!editor) return

  await editor.edit((editBuilder) => {
    editBuilder.replace(range, `CALL ${subName}`)

    const endPos = new vscode.Position(document.lineCount, 0)
    const subCode = `\n\nSUB ${subName}\n    ${selectedText.split("\n").join("\n    ")}\nEND SUB`
    editBuilder.insert(endPos, subCode)
  })

  vscode.window.showInformationMessage(`✅ Extracted to SUB ${subName}`)
}

// Compilation system

async function executeCompile(shouldRun) {
  if (isCompiling) {
    vscode.window.showInformationMessage(
      "⏳ Compilation already in progress...",
    )
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage("📄 Please open a QBasic file first.")
    return
  }

  const document = editor.document

  if (document.isDirty) {
    const saved = await document.save()
    if (!saved) {
      vscode.window.showWarningMessage(
        "💾 File must be saved before compiling.",
      )
      return
    }
  }

  const mode = getConfig(CONFIG.COMPILER_MODE)

  if (mode === CONFIG.MODE_INTERNAL) {
    await runInternalTranspiler(document, shouldRun)
  } else {
    await runQB64Compiler(document, shouldRun)
  }
}

// CRT webview runner

async function runInCrt() {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage("📄 Please open a QBasic file first.")
    return
  }

  const document = editor.document
  const sourceCode = document.getText()
  const fileName = path.basename(document.uri.fsPath)

  if (document.isDirty) await document.save()

  try {
    log("Transpiling for CRT Webview...", "info")

    const jsCode = await compilerWorker.transpileAsync(sourceCode, "web")

    await WebviewManager.runCode(
      jsCode,
      fileName,
      extensionContext.extensionUri,
    )

    log("Launched Retro CRT 📺", "success")
  } catch (error) {
    vscode.window.showErrorMessage(`❌ Failed to run in CRT: ${error.message}`)
    log(`CRT Error: ${error.message}`, "error")
  }
}

// Internal transpiler execution

async function runInternalTranspiler(document, shouldRun) {
  const channel = getOutputChannel()
  channel.clear()
  channel.show()

  const startTime = process.hrtime()
  const sourceCode = document.getText()
  const lineCount = document.lineCount
  const fileSize = (sourceCode.length / 1024).toFixed(2)
  const fileName = path.basename(document.uri.fsPath)

  channel.appendLine("  QBasic Nexus ⚡ Internal Transpiler")
  channel.appendLine("═══════════════════════════════════════════════════")
  channel.appendLine("")
  channel.appendLine(`  📦 Source:   ${fileName}`)
  channel.appendLine(`  📍 Path:     ${document.uri.fsPath}`)
  channel.appendLine(`  📊 Stats:    ${lineCount} lines • ${fileSize} KB`)
  channel.appendLine("")
  channel.appendLine("  ➤ Processing...")

  try {
    channel.appendLine("  ✓ Lexical analysis requested")
    channel.appendLine("  ✓ Syntax analysis requested")

    const jsCode = await compilerWorker.transpileAsync(sourceCode, "node")

    channel.appendLine("  ✓ Code generation completed")

    const baseName = path.basename(
      document.uri.fsPath,
      path.extname(document.uri.fsPath),
    )
    const tempPath = path.join(
      os.tmpdir(),
      `qbasic_${baseName}_${Date.now()}.js`,
    )

    await fs.writeFile(tempPath, jsCode, "utf8")

    const outDir = path.dirname(document.uri.fsPath)
    const exeExt = IS_WIN ? ".exe" : ""
    const exePath = path.join(outDir, `${baseName}${exeExt}`)

    channel.appendLine("  ✓ Building standalone executable (pkg)...")

    await new Promise((resolve, reject) => {
      const pkgProc = spawn(
        IS_WIN ? "npx.cmd" : "npx",
        [
          "pkg",
          tempPath,
          "--target",
          `node18-${process.platform}-${process.arch}`,
          "--output",
          exePath,
        ],
        { shell: true },
      )
      pkgProc.on("close", (code) => {
        if (code === 0) resolve()
        else reject(new Error(`pkg packaging failed with code ${code}`))
      })
      pkgProc.on("error", (err) => reject(err))
    })

    const endTime = process.hrtime(startTime)
    const duration = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2)

    channel.appendLine("")
    channel.appendLine(`  ✨ Compilation Successful! (${duration}ms)`)
    channel.appendLine("")
    channel.appendLine(`  📂 Payload JS:   ${tempPath}`)
    channel.appendLine(`  🎯 Executable:   ${exePath}`)

    if (shouldRun) {
      channel.appendLine("")
      channel.appendLine("═══════════════════════════════════════════════════")
      log("Running standalone executable...", "info")
      channel.appendLine("")

      runExecutable(exePath)
    } else {
      channel.appendLine("═══════════════════════════════════════════════════")
    }
  } catch (error) {
    channel.appendLine("")
    channel.appendLine(`  ❌ Failed: ${error.message}`)
    channel.appendLine("═══════════════════════════════════════════════════")
    log(`Error: ${error.message}`, "error")
    vscode.window.showErrorMessage(`❌ Transpiler Error: ${error.message}`)
  }
}

// QB64 compiler execution

async function runQB64Compiler(document, shouldRun) {
  let compilerPath = getConfig(CONFIG.COMPILER_PATH)

  // Auto-detect compiler if not configured
  if (!compilerPath) {
    const detection = await detectCompiler()

    if (detection.found) {
      compilerPath = detection.path
      log(`Auto-detected QB64 at: ${compilerPath}`, "info")

      // Save the detected path
      await vscode.workspace
        .getConfiguration(CONFIG.SECTION)
        .update(CONFIG.COMPILER_PATH, compilerPath, true)
    } else {
      const choice = await vscode.window.showWarningMessage(
        "⚠️ QB64 compiler not found. Please install QB64 or configure the path.",
        "Auto-Detect",
        "Open Settings",
        "Use Internal Mode",
        "Installation Help",
      )

      if (choice === "Open Settings") {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`,
        )
        return
      } else if (choice === "Use Internal Mode") {
        await vscode.workspace
          .getConfiguration(CONFIG.SECTION)
          .update(CONFIG.COMPILER_MODE, CONFIG.MODE_INTERNAL, true)
        await runInternalTranspiler(document, shouldRun)
        return
      } else if (choice === "Installation Help") {
        vscode.window.showInformationMessage(getInstallationInstructions(), {
          modal: true,
        })
        return
      } else if (choice === "Auto-Detect") {
        vscode.window.showInformationMessage("Searching for QB64 compiler...")
        const retryDetection = await detectCompiler({
          checkPath: true,
          checkCommon: true,
          checkCommands: true,
        })

        if (retryDetection.found) {
          compilerPath = retryDetection.path
          await vscode.workspace
            .getConfiguration(CONFIG.SECTION)
            .update(CONFIG.COMPILER_PATH, compilerPath, true)
          vscode.window.showInformationMessage(
            `✅ Found QB64 at: ${compilerPath}`,
          )
        } else {
          vscode.window.showErrorMessage(
            "❌ QB64 not found. Please install QB64 or set the path manually.",
          )
          return
        }
      } else {
        return
      }
    }
  }

  // Validate compiler path
  const validation = await validateCompilerPath(compilerPath)
  if (!validation.valid) {
    vscode.window.showErrorMessage(`❌ Invalid QB64 path: ${validation.error}`)
    return
  }

  isCompiling = true
  updateStatusBar()
  diagnosticCollection.clear()

  const channel = getOutputChannel()
  channel.clear()
  channel.show()

  try {
    const outputPath = await compileWithQB64(document, compilerPath, channel)

    if (shouldRun && outputPath) {
      runExecutable(outputPath)
    }
  } catch (_error) {
    vscode.window.showErrorMessage(
      "❌ Compilation failed. Check output for details.",
    )
  } finally {
    isCompiling = false
    updateStatusBar()
  }
}

function compileWithQB64(document, compilerPath, channel) {
  return new Promise((resolve, reject) => {
    const sourcePath = document.uri.fsPath
    const sourceDir = path.dirname(sourcePath)
    const baseName = path.basename(sourcePath, path.extname(sourcePath))
    const outputPath = path.join(sourceDir, baseName + getExecutableExtension())

    const extraArgs = (getConfig(CONFIG.COMPILER_ARGS) || "")
      .split(" ")
      .filter((arg) => arg.trim().length > 0)

    const args = ["-x", "-c", sourcePath, "-o", outputPath, ...extraArgs]

    channel.appendLine("╔══════════════════════════════════════════════════╗")
    channel.appendLine("║           QBasic Nexus - QB64 Compiler           ║")
    channel.appendLine("╚══════════════════════════════════════════════════╝")
    channel.appendLine("")
    channel.appendLine(`📄 Source: ${path.basename(sourcePath)}`)
    channel.appendLine(`📦 Output: ${path.basename(outputPath)}`)
    channel.appendLine(`⚙️  Args:   ${args.join(" ")}`)
    channel.appendLine(`💻 Platform: ${process.platform} (${process.arch})`)
    channel.appendLine("")
    channel.appendLine("─────────────────────────────────────────────────────")
    channel.appendLine("")

    const startTime = process.hrtime()

    // Use platform-specific spawn options
    const spawnOptions = {
      cwd: path.dirname(compilerPath),
      shell: false,
      windowsHide: IS_WIN, // Hide console window on Windows
      env: { ...process.env }, // Inherit environment
    }

    const proc = spawn(compilerPath, args, spawnOptions)

    let output = ""

    proc.stdout.on("data", (data) => {
      const text = data.toString()
      channel.append(text)
      output += text
    })

    proc.stderr.on("data", (data) => {
      const text = data.toString()
      channel.append(text)
      output += text
    })

    proc.on("error", (err) => {
      channel.appendLine(`\n❌ Failed to start compiler: ${err.message}`)
      reject(err)
    })

    proc.on("close", (code) => {
      parseCompilerErrors(output, document.uri)

      const endTime = process.hrtime(startTime)
      const duration = (endTime[0] + endTime[1] / 1e9).toFixed(2)

      channel.appendLine("")
      channel.appendLine(
        "─────────────────────────────────────────────────────",
      )

      if (code === 0) {
        channel.appendLine("")
        channel.appendLine(`✅ BUILD SUCCESSFUL (${duration}s)`)
        channel.appendLine(`📦 ${outputPath}`)
        resolve(outputPath)
      } else {
        channel.appendLine("")
        channel.appendLine(`❌ BUILD FAILED (Exit code: ${code})`)
        reject(new Error(`Exit code ${code}`))
      }
    })
  })
}

/**
 * Parse QB64 compiler output and extract error/warning diagnostics.
 * Supports multiple output formats with robust error recovery.
 * @param {string} output - Raw compiler output
 * @param {vscode.Uri} uri - Document URI for matching filename
 */
function parseCompilerErrors(output, uri) {
  const diagnostics = []
  const filename = path.basename(uri.fsPath).toLowerCase()

  // Multiple patterns to handle different QB64 output formats
  const patterns = [
    // Standard format: file.bas:line: message
    /([^\\/]+\.(?:bas|bi|bm))[:(](\d+)(?:[:)])?\s*(?:\d+:)?\s*(?:error|warning)?:?\s*(.+)/gi,
    // Alternative format: line X: message
    /line\s+(\d+)\s+(error|warning):?\s*(.+)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(output)) !== null) {
      try {
        const [, fileOrLine, lineStrOrType, messageText] = match

        // Validate extracted data
        if (!fileOrLine || !messageText) continue

        // Determine if it's a file match or direct line
        let file, lineStr, message
        if (
          fileOrLine.toLowerCase().endsWith(".bas") ||
          fileOrLine.toLowerCase().endsWith(".bi") ||
          fileOrLine.toLowerCase().endsWith(".bm")
        ) {
          file = fileOrLine
          lineStr = lineStrOrType
          message = messageText
        } else {
          // Alternative format
          file = filename
          lineStr = fileOrLine
          message = lineStrOrType + ": " + messageText
        }

        if (file.toLowerCase() === filename) {
          const line = Math.max(0, parseInt(lineStr, 10) - 1)

          // Validate line number
          if (isNaN(line) || line < 0) continue

          const severity = message.toLowerCase().includes("warning")
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Error

          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
            message.trim(),
            severity,
          )
          diagnostic.source = "QB64"
          diagnostics.push(diagnostic)
        }
      } catch (err) {
        console.error("[QBasic Nexus] Error parsing compiler output:", err)
        // Continue with next match
      }
    }
  }

  diagnosticCollection.set(uri, diagnostics)
}

/**
 * Run compiled executable - Cross-platform implementation
 * @param {string} exePath - Full path to the executable
 */
function runExecutable(exePath) {
  const term = getTerminal()
  term.show()

  const dir = path.dirname(exePath)
  const exe = path.basename(exePath)

  // Build platform-specific command using utilities
  if (IS_WIN) {
    // Windows PowerShell syntax with proper escaping
    // Use -LiteralPath to handle special characters in paths
    const escapedDir = dir.replace(/'/g, "''")
    const escapedExe = exe.replace(/'/g, "''")
    term.sendText(
      `Set-Location -LiteralPath '${escapedDir}'; & '.\\${escapedExe}'`,
    )
  } else if (IS_MAC) {
    // macOS - use bash with proper quoting
    const escapedDir = dir.replace(/'/g, "'\\''")
    const escapedExe = exe.replace(/'/g, "'\\''")
    term.sendText(`cd '${escapedDir}' && './${escapedExe}'`)
  } else {
    // Linux and other Unix systems
    const escapedDir = dir.replace(/'/g, "'\\''")
    const escapedExe = exe.replace(/'/g, "'\\''")
    term.sendText(`cd '${escapedDir}' && './${escapedExe}'`)
  }
}

// ============================================================================
// STATUS BAR
// ============================================================================

function updateStatusBar() {
  const editor = vscode.window.activeTextEditor

  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    statusBarItem.hide()
    return
  }

  const mode = getConfig(CONFIG.COMPILER_MODE)
  const compilerPath = getConfig(CONFIG.COMPILER_PATH)

  if (isCompiling) {
    statusBarItem.text = "$(sync~spin) Compiling..."
    statusBarItem.tooltip = "Compilation in progress"
    statusBarItem.backgroundColor = undefined
  } else if (mode === CONFIG.MODE_INTERNAL) {
    statusBarItem.text = "$(play) Run (JS) ⚡"
    statusBarItem.tooltip = "Run with internal transpiler"
    statusBarItem.backgroundColor = undefined
  } else if (!compilerPath) {
    statusBarItem.text = "$(warning) Configure QB64"
    statusBarItem.tooltip = "Click to set QB64 path"
    statusBarItem.command = {
      command: "workbench.action.openSettings",
      arguments: [`${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`],
    }
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground",
    )
  } else {
    statusBarItem.text = "$(flame) Run ⚡"
    statusBarItem.tooltip = "Compile & Run with QB64"
    statusBarItem.command = COMMANDS.COMPILE_RUN
    statusBarItem.backgroundColor = undefined
  }

  statusBarItem.show()
}

// ============================================================================
// DEACTIVATION
// ============================================================================

function deactivate() {
  console.log("[QBasic Nexus] Extension deactivated")

  // Clear all pending lint timers
  for (const timerId of pendingLints.values()) {
    clearTimeout(timerId)
  }
  pendingLints.clear()

  // Dispose resources
  statusBarItem?.dispose()
  statsBarItem?.dispose()
  outputChannel?.dispose()
  diagnosticCollection?.dispose()
  terminal?.dispose()

  // Clear references
  statusBarItem = null
  statsBarItem = null
  outputChannel = null
  diagnosticCollection = null
  terminal = null
  extensionContext = null
}

module.exports = { activate, deactivate }
