/**
 * QBasic Nexus - Internal Transpiler Command
 * Build .exe using the bundled JS transpiler + pkg
 */

"use strict"

const vscode = require("vscode")
const path = require("path")
const fs = require("fs").promises
const { spawn } = require("child_process")
const MagicString = require("magic-string")
const { CONFIG } = require("./constants")
const { state } = require("./state")
const { getOutputChannel, getTerminal, log } = require("./utils")
const { updateStatusBar } = require("./statusBar")
const { getInternalTranspiler } = require("./lazyModules")

// pkg-compatible Node.js header — tells pkg which Node version to bundle
const PKG_HEADER = `#!/usr/bin/env node
// Built by QBasic Nexus — https://github.com/thirawat27/QBasic-Nexus
`

/**
 * Run the Internal Transpiler → pkg pipeline to produce a .exe
 * @param {vscode.TextDocument} document
 * @param {boolean} shouldRun - whether to execute after building
 */
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

  state.isCompiling = true
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

        // Use MagicString to prepend the pkg-compatible header
        // This keeps the operation non-destructive and ready for future sourcemap support
        const ms = new MagicString(jsCode)
        ms.prepend(PKG_HEADER)
        await fs.writeFile(tempJs, ms.toString(), "utf8")

        const t0 = process.hrtime(startTime)
        const tMs = (t0[0] * 1000 + t0[1] / 1e6).toFixed(2)
        report(60, `Transpile complete (${tMs}ms) ✓`)

        // ── 3: pkg packaging (60 → 100%) ───────────────────────────────
        channel.appendLine("")
        report(65, "Packaging to .exe…")

        try {
          // pkg programmatic API — suppresses the "> pkg@x.x.x" CLI banner
          const pkgApi = require("pkg")

          // Cross-platform target detection
          const platformTargets = {
            win32: "node18-win-x64",
            darwin: "node18-macos-x64",
            linux: "node18-linux-x64",
            alpine: "node18-alpine-x64",
          }
          const target = platformTargets[process.platform] || "node18-win-x64"

          await pkgApi.exec([tempJs, "--target", target, "--output", outputExe])
        } catch (_) {
          // fallback: spawn CLI if API unavailable
          channel.appendLine("  ⚠ pkg API unavailable, falling back to CLI…")

          // Cross-platform target detection (same as above)
          const platformTargets = {
            win32: "node18-win-x64",
            darwin: "node18-macos-x64",
            linux: "node18-linux-x64",
            alpine: "node18-alpine-x64",
          }
          const target = platformTargets[process.platform] || "node18-win-x64"

          await new Promise((resolve, reject) => {
            const proc = spawn(
              "pkg",
              [tempJs, "--target", target, "--output", outputExe],
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
    state.isCompiling = false
    updateStatusBar()
  }
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

  // Use platform-appropriate command, with properly escaped paths.
  // Windows: use cmd /c to avoid PowerShell dependency and single-quote issues.
  // Double-quoting handles paths with spaces.
  if (process.platform === "win32") {
    // Escape any embedded double-quotes in the path (edge case)
    const safeDir = dir.replace(/"/g, '\\"')
    const safeExe = exe.replace(/"/g, '\\"')
    term.sendText(`cmd /c "cd /d "${safeDir}" && "${safeExe}""`)
  } else {
    // macOS / Linux: use single-quoted paths (safe for most filenames)
    const safeDir = dir.replace(/'/g, "'\\''")
    const safeExe = exe.replace(/'/g, "'\\''")
    term.sendText(`cd '${safeDir}' && './${safeExe}'`)
  }
}

module.exports = { runInternalTranspiler, runExecutable }
