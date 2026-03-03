/**
 * QBasic Nexus - The Ultimate QBasic/QB64 Environment for VS Code
 * A professional-grade development suite designed to bring QBasic and QB64
 * into the modern era. Features a powerful transpiler, real-time visualization,
 * and comprehensive language support including graphics, sound, and file I/O.
 *
 * Key Capabilities:
 * - Intelligent Code Analysis: Real-time linting, IntelliSense, and symbol navigation
 * - Dual-Engine Execution: Native QB64 compilation + High-performance Web Transpiler
 * - Advanced Visualization: Neon CRT aesthetic with GPU-accelerated graphics
 * - Virtual File System: Persistent file I/O support within the web runtime
 * - Rich Tooling: Formatting, refactoring, and extensive debugging helpers
 */

"use strict"

const vscode = require("vscode")
const path = require("path")
const pathe = require("pathe")
const fs = require("fs").promises
const os = require("os")
const { spawn, execFile } = require("child_process")

// Static providers — always needed, load eagerly
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
} = require("./providers")
const { getIncrementalLinter } = require("./src/managers/IncrementalLinter")

// ── Lazy-loaded modules (load on first use, not at activation) ──────────────
let _WebviewManager = null
let _TutorialManager = null
let _InternalTranspiler = null

function getWebviewManager() {
  if (!_WebviewManager)
    _WebviewManager = require("./src/managers/WebviewManager")
  return _WebviewManager
}

function getTutorialManager() {
  if (!_TutorialManager)
    _TutorialManager = require("./src/managers/TutorialManager")
  return _TutorialManager
}

function getInternalTranspiler() {
  if (!_InternalTranspiler)
    _InternalTranspiler = require("./src/compiler/transpiler")
  return _InternalTranspiler
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

// ============================================================================
// GLOBAL STATE
// ============================================================================

let statusBarItem = null
let statsBarItem = null
let outputChannel = null
let terminal = null
let diagnosticCollection = null
let isCompiling = false
let extensionContext = null

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a debounced version of a function with cancel support
 */
function debounce(fn, delay) {
  let timer = null
  const debounced = (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }
  // Allow cancellation to prevent stale callbacks
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

/**
 * Create a throttled version of a function with trailing call support
 */
function throttle(fn, limit) {
  let inThrottle = false
  let lastArgs = null
  let timeoutId = null

  const throttled = (...args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      timeoutId = setTimeout(() => {
        inThrottle = false
        if (lastArgs) {
          fn(...lastArgs)
          lastArgs = null
        }
      }, limit)
    } else {
      lastArgs = args // Save latest args for trailing call
    }
  }
  // Allow cancellation
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    inThrottle = false
    lastArgs = null
  }
  return throttled
}

/**
 * Get or create the output channel
 */
function getOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(CONFIG.OUTPUT_CHANNEL)
  }
  return outputChannel
}

/*
 *
 * Get or create a terminal instance
 */
function getTerminal() {
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal({
      name: CONFIG.TERMINAL_NAME,
      iconPath: new vscode.ThemeIcon("terminal"),
    })
  }
  return terminal
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Get configuration value
 */
function getConfig(key, defaultValue = null) {
  const value = vscode.workspace.getConfiguration(CONFIG.SECTION).get(key)
  return value !== undefined ? value : defaultValue
}

/**
 * Log message to output channel
 */
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

// ============================================================================
// LINTING  (Phase 2.2 – IncrementalLinter)
// ============================================================================

/**
 * Schedule a lint for a QBasic document using the incremental linter.
 * Replaces the old per-call transpiler creation with a shared singleton.
 */
function lintDocument(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return
  if (!getConfig(CONFIG.ENABLE_LINT, true)) return

  const delay = getConfig(CONFIG.LINT_DELAY, 500)
  getIncrementalLinter().schedule(document, diagnosticCollection, delay)
}

// Lookup table for severity (faster than switch)
const SEVERITY_MAP = Object.freeze({
  warning: vscode.DiagnosticSeverity.Warning,
  info: vscode.DiagnosticSeverity.Information,
  hint: vscode.DiagnosticSeverity.Hint,
  error: vscode.DiagnosticSeverity.Error,
})

function getSeverity(level) {
  return SEVERITY_MAP[level] || vscode.DiagnosticSeverity.Error
}

// ============================================================================
// CODE STATS
// ============================================================================

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

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

async function activate(context) {
  console.log("[QBasic Nexus] ⚡ Extension activated")
  const startTime = Date.now()

  extensionContext = context

  // TutorialManager ↔ WebviewManager wiring is deferred to first use
  // (see START_TUTORIAL command handler below)

  // Initialize diagnostic collection
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("qbasic-nexus")
  context.subscriptions.push(diagnosticCollection)

  // Initialize status bars
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

  // Register language providers
  const selector = { language: CONFIG.LANGUAGE_ID, scheme: "file" }

  context.subscriptions.push(
    // Core providers
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

    // New providers for enhanced functionality
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

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.COMPILE, () =>
      executeCompile(false),
    ),
    vscode.commands.registerCommand(COMMANDS.COMPILE_RUN, () =>
      executeCompile(true),
    ),
    vscode.commands.registerCommand(COMMANDS.RUN_CRT, runInCrt),
    vscode.commands.registerCommand(COMMANDS.START_TUTORIAL, () => {
      // Lazy-wire on first use: load both modules and connect them
      const tm = getTutorialManager()
      tm.setWebviewManager(getWebviewManager())
      return tm.startTutorial(extensionContext)
    }),
    vscode.commands.registerCommand(COMMANDS.SHOW_STATS, showCodeStatsDetail),
  )

  // Event handlers with optimized debouncing
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
      // Invalidate cache
      invalidateCache(e.document.uri)

      // Lint and update stats
      lintDocument(e.document)
      throttledStatsUpdate(e.document)
    }),
    vscode.workspace.onWillSaveTextDocument((e) => {
      const autoFormat = getConfig(CONFIG.AUTO_FORMAT, true)
      if (autoFormat && e.document.languageId === CONFIG.LANGUAGE_ID) {
        try {
          // Retrieve editor formatting options or default to 4 spaces
          const editor = vscode.window.activeTextEditor
          const tabSize =
            editor && editor.document === e.document
              ? editor.options.tabSize
              : 4
          const insertSpaces =
            editor && editor.document === e.document
              ? editor.options.insertSpaces
              : true

          const formatter = new QBasicDocumentFormattingEditProvider()
          const edits = formatter.provideDocumentFormattingEdits(e.document, {
            tabSize,
            insertSpaces,
          })
          if (edits && edits.length > 0) {
            e.waitUntil(Promise.resolve(edits))
          }
        } catch (err) {
          console.error("Format on save failed:", err)
        }
      }
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

  // Initial setup
  updateStatusBar()
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document
    lintDocument(doc)
    updateCodeStats(doc)
  }

  const activationTime = Date.now() - startTime
  console.log(`[QBasic Nexus] ✅ Ready in ${activationTime}ms`)
}

// ============================================================================
// ADDITIONAL COMMANDS
// ============================================================================

/**
 * Show detailed code statistics
 */
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

// ============================================================================
// COMPILE COMMAND
// ============================================================================

/**
 * Execute compile (and optionally run) command
 */
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

  // Auto-save if dirty
  if (document.isDirty) {
    const saved = await document.save()
    if (!saved) {
      vscode.window.showWarningMessage(
        "💾 File must be saved before compiling.",
      )
      return
    }
  }

  // Get compiler mode
  const mode = getConfig(CONFIG.COMPILER_MODE)

  if (mode === CONFIG.MODE_INTERNAL) {
    await runInternalTranspiler(document, shouldRun)
  } else {
    await runQB64Compiler(document, shouldRun)
  }
}

// ============================================================================
// CRT RUNNER (NEW FEATURE)
// ============================================================================

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
      extensionContext.extensionUri,
    )

    log("Launched Retro CRT 📺", "success")
  } catch (error) {
    vscode.window.showErrorMessage(`❌ Failed to run in CRT: ${error.message}`)
    log(`CRT Error: ${error.message}`, "error")
  }
}

// ============================================================================
// INTERNAL TRANSPILER
// ============================================================================

async function runInternalTranspiler(document, shouldRun) {
  const channel = getOutputChannel()
  channel.clear()
  channel.show()

  const startTime = process.hrtime()
  const sourceCode = document.getText()
  const lineCount = document.lineCount
  const fileSize = (sourceCode.length / 1024).toFixed(2)
  const fileName = path.basename(document.uri.fsPath)
  const baseName = path.basename(
    document.uri.fsPath,
    path.extname(document.uri.fsPath),
  )
  const sourceDir = path.dirname(document.uri.fsPath)

  channel.appendLine("╔══════════════════════════════════════════════════╗")
  channel.appendLine("║            ⚡ QBasic Nexus Compiler               ║")
  channel.appendLine("╚══════════════════════════════════════════════════╝")
  channel.appendLine("")
  channel.appendLine(`  📦 Source:   ${fileName}`)
  channel.appendLine(`  📍 Path:     ${document.uri.fsPath}`)
  channel.appendLine(`  📊 Stats:    ${lineCount} lines • ${fileSize} KB`)
  channel.appendLine("")
  channel.appendLine("─────────────────────────────────────────────────────")

  isCompiling = true
  updateStatusBar()

  // ── progress bar helper (printed to Output Channel) ──────────────────────
  const BAR_WIDTH = 24
  function makeBar(pct, label) {
    const filled = Math.round((pct / 100) * BAR_WIDTH)
    const empty = BAR_WIDTH - filled
    return `  [${"█".repeat(filled)}${"░".repeat(empty)}] ${String(pct).padStart(3)}%  ${label}`
  }

  try {
    const InternalTranspiler = getInternalTranspiler()
    const transpiler = new InternalTranspiler()
    const outputExe = path.join(sourceDir, baseName + ".exe")
    const tempJs = path.join(sourceDir, `${baseName}._qbnx_.js`)

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `QBasic Nexus  —  ${fileName}`,
        cancellable: false,
      },
      async (progress) => {
        let lastPct = 0
        function report(pct, label) {
          channel.appendLine(makeBar(pct, label))
          progress.report({
            message: `${pct}%  ${label}`,
            increment: pct - lastPct,
          })
          lastPct = pct
        }

        // ── 1: Lexical & Syntax Analysis (0 → 30%) ─────────────────────
        channel.appendLine("")
        report(0, "Lexical & Syntax Analysis…")
        const jsCode = transpiler.transpile(sourceCode, "node")
        report(30, "Syntax analysis passed ✓")

        // ── 2: Code Generation / write JS (30 → 60%) ───────────────────
        channel.appendLine("")
        report(45, "Code generation…")
        await fs.writeFile(tempJs, jsCode, "utf8")
        const t0 = process.hrtime(startTime)
        const tMs = (t0[0] * 1000 + t0[1] / 1e6).toFixed(2)
        report(60, `Transpile complete (${tMs}ms) ✓`)

        // ── 3: pkg packaging (60 → 100%) ───────────────────────────────
        channel.appendLine("")
        report(65, "Packaging to .exe…")

        try {
          // pkg programmatic API — suppresses the "> pkg@x.x.x" CLI banner
          const pkgApi = require("pkg")
          await pkgApi.exec([
            tempJs,
            "--target",
            "node18-win-x64",
            "--output",
            outputExe,
          ])
        } catch (_) {
          // fallback: spawn CLI if API unavailable
          channel.appendLine("  ⚠ pkg API unavailable, falling back to CLI…")
          await new Promise((resolve, reject) => {
            const proc = spawn(
              "pkg",
              [tempJs, "--target", "node18-win-x64", "--output", outputExe],
              { shell: true, env: process.env },
            )
            proc.stdout.on("data", (d) => channel.append(d.toString()))
            proc.stderr.on("data", (d) => channel.append(d.toString()))
            proc.on("error", reject)
            proc.on("close", (code) =>
              code === 0 ? resolve() : reject(new Error(`pkg exit ${code}`)),
            )
          })
        } finally {
          fs.unlink(tempJs).catch(() => {})
        }

        report(100, "Done ✓")
        channel.appendLine("")
      },
    )

    // ── Result ────────────────────────────────────────────────────────────
    const endTime = process.hrtime(startTime)
    const totalDuration = (endTime[0] + endTime[1] / 1e9).toFixed(2)

    channel.appendLine("─────────────────────────────────────────────────────")
    channel.appendLine("")
    channel.appendLine(`  ✅ BUILD SUCCESSFUL (${totalDuration}s)`)
    channel.appendLine(`  📦 Output:  ${outputExe}`)
    channel.appendLine("")

    vscode.window
      .showInformationMessage(`✅ Compiled: ${baseName}.exe`, "Open Folder")
      .then((choice) => {
        if (choice === "Open Folder") {
          vscode.commands.executeCommand(
            "revealFileInOS",
            vscode.Uri.file(outputExe),
          )
        }
      })

    if (shouldRun) {
      channel.appendLine("  ➤ Running executable…")
      channel.appendLine(
        "─────────────────────────────────────────────────────",
      )
      runExecutable(outputExe)
    } else {
      channel.appendLine("═══════════════════════════════════════════════════")
    }
  } catch (error) {
    channel.appendLine("")
    channel.appendLine(`  ❌ Build Failed: ${error.message}`)
    channel.appendLine("═══════════════════════════════════════════════════")
    log(`Error: ${error.message}`, "error")
    vscode.window.showErrorMessage(`❌ Build Error: ${error.message}`)
  } finally {
    isCompiling = false
    updateStatusBar()
  }
}

// ============================================================================
// QB64 COMPILER
// ============================================================================

async function runQB64Compiler(document, shouldRun) {
  const compilerPath = getConfig(CONFIG.COMPILER_PATH)

  // Validate compiler path
  if (!compilerPath) {
    const choice = await vscode.window.showWarningMessage(
      "⚠️ QB64 compiler path is not configured.",
      "Open Settings",
      "Use Internal Mode",
    )

    if (choice === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        `${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`,
      )
    } else if (choice === "Use Internal Mode") {
      await vscode.workspace
        .getConfiguration(CONFIG.SECTION)
        .update(CONFIG.COMPILER_MODE, CONFIG.MODE_INTERNAL, true)
      await runInternalTranspiler(document, shouldRun)
    }
    return
  }

  if (!(await fileExists(compilerPath))) {
    vscode.window.showErrorMessage(`❌ QB64 not found at: ${compilerPath}`)
    return
  }

  // Start compilation
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

/**
 * Compile using QB64
 */
function compileWithQB64(document, compilerPath, channel) {
  return new Promise((resolve, reject) => {
    const sourcePath = document.uri.fsPath
    const sourceDir = path.dirname(sourcePath)
    const baseName = path.basename(sourcePath, path.extname(sourcePath))
    const outputPath = path.join(
      sourceDir,
      baseName + (process.platform === "win32" ? ".exe" : ""),
    )

    // Build arguments
    const extraArgs = (getConfig(CONFIG.COMPILER_ARGS) || "")
      .split(" ")
      .filter((arg) => arg.trim().length > 0)

    const args = ["-x", "-c", sourcePath, "-o", outputPath, ...extraArgs]

    // Log
    channel.appendLine("╔══════════════════════════════════════════════════╗")
    channel.appendLine("║           QBasic Nexus - QB64 Compiler           ║")
    channel.appendLine("╚══════════════════════════════════════════════════╝")
    channel.appendLine("")
    channel.appendLine(`📄 Source: ${path.basename(sourcePath)}`)
    channel.appendLine(`📦 Output: ${path.basename(outputPath)}`)
    channel.appendLine(`⚙️  Args:   ${args.join(" ")}`)
    channel.appendLine("")
    channel.appendLine("─────────────────────────────────────────────────────")
    channel.appendLine("")

    const startTime = process.hrtime()

    // Spawn process
    const proc = spawn(compilerPath, args, {
      cwd: path.dirname(compilerPath),
      shell: false,
    })

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
 * Parse QB64 compiler output for errors
 */
function parseCompilerErrors(output, uri) {
  const diagnostics = []
  const filename = path.basename(uri.fsPath).toLowerCase()

  // Pattern: filename.bas:line: error message
  const pattern =
    /([^\\/]+\.(?:bas|bi|bm))[:(](\d+)(?:[:)])?\s*(?:\d+:)?\s*(?:error|warning)?:?\s*(.+)/gi

  let match
  while ((match = pattern.exec(output)) !== null) {
    const [, file, lineStr, message] = match

    if (file.toLowerCase() === filename) {
      const line = Math.max(0, parseInt(lineStr, 10) - 1)
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
  }

  diagnosticCollection.set(uri, diagnostics)
}

/**
 * Run compiled executable
 * @param {string} exePath - Full path to the executable
 */
function runExecutable(exePath) {
  const term = getTerminal()
  term.show()

  const dir = path.dirname(exePath)
  const exe = path.basename(exePath)

  // Build platform-specific command
  // PowerShell uses semicolon, cmd uses &&, Unix uses &&
  if (process.platform === "win32") {
    // Use PowerShell syntax with proper escaping
    // Set-Location handles paths with spaces, then run the exe
    term.sendText(`Set-Location -LiteralPath '${dir}'; & '.\\${exe}'`)
  } else if (process.platform === "darwin") {
    // macOS - use bash with proper quoting
    term.sendText(`cd '${dir}' && './${exe}'`)
  } else {
    // Linux and others
    term.sendText(`cd '${dir}' && './${exe}'`)
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
    statusBarItem.text = "$(package) Build .exe ⚡"
    statusBarItem.tooltip = "Compile with Qbasic Nexus (pkg → .exe)"
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

  // Dispose the incremental linter (cancels all pending timers)
  getIncrementalLinter().dispose()

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
