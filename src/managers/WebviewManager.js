/**
 * QBasic Nexus - Upgraded WebviewManager
 *
 * Phase 3.1 upgrades (ARCHITECTURE_REFACTORING_PLAN.md):
 *  - mitt EventEmitter for typed, lightweight internal events (200 bytes)
 *  - Chunked code transfer (64 KB chunks) for large programs
 *  - pathe for cross-platform path handling
 *  - HTML template cache kept, but URI replacement is correct per webview
 *  - Proper disposable cleanup on panel close
 */

"use strict"

const vscode = require("vscode")
const fs = require("fs").promises
const mitt = require("mitt")
// pathe: cross-platform path util (always uses forward slashes, safe on Windows)
const { join: pathJoin } = require("pathe")

/** Chunk size for large code payloads (64 KB) */
const CHUNK_SIZE = 64 * 1024

/**
 * @typedef {'panelOpened' | 'panelClosed' | 'codeExecuted' | 'questComplete' | 'runtimeError'} WebviewEvent
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal event bus – used to decouple WebviewManager from TutorialManager
// ─────────────────────────────────────────────────────────────────────────────
/** @type {import('mitt').Emitter<Record<WebviewEvent, any>>} */
const emitter = mitt()

/**
 * Subscribe to internal WebviewManager events.
 * @param {WebviewEvent} event
 * @param {Function} handler
 */
function onWebviewEvent(event, handler) {
  emitter.on(event, handler)
}

/**
 * Unsubscribe from internal WebviewManager events.
 * @param {WebviewEvent} event
 * @param {Function} handler
 */
function offWebviewEvent(event, handler) {
  emitter.off(event, handler)
}

// ─────────────────────────────────────────────────────────────────────────────
// WebviewManager
// ─────────────────────────────────────────────────────────────────────────────
class WebviewManager {
  /** @type {vscode.WebviewPanel | undefined} */
  static currentPanel = undefined

  /** @type {string} */
  static viewType = "qbasicNexusCrt"

  /** @type {vscode.Disposable[]} */
  static _disposables = []

  /** @type {string | null} Cached raw HTML template */
  static _htmlCache = null

  /**
   * Creates or reveals the CRT Webview panel.
   * @param {vscode.Uri} extensionUri
   */
  static async createOrShow(extensionUri) {
    const column = vscode.window.activeTextEditor?.viewColumn

    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.reveal(column)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      WebviewManager.viewType,
      "QBasic CRT 📺",
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "src", "webview"),
        ],
      },
    )

    WebviewManager.currentPanel = panel

    try {
      panel.webview.html = await WebviewManager._getHtmlForWebview(
        panel.webview,
        extensionUri,
      )
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to load CRT: ${err.message}`)
      panel.dispose()
      WebviewManager.currentPanel = undefined
      return
    }

    // Message handler (lazy-load TutorialManager to break circular deps)
    WebviewManager._disposables.push(
      panel.webview.onDidReceiveMessage((message) => {
        try {
          if (message.type === "check_output") {
            const TutorialManager = require("./TutorialManager")
            const completed = TutorialManager.checkResult(message.content)
            if (completed && panel.webview) {
              panel.webview.postMessage({ type: "quest_complete" })
              emitter.emit("questComplete", message.content)
            }
          } else if (message.type === "error") {
            console.error("[QBasic CRT] Runtime error:", message.content)
            emitter.emit("runtimeError", message.content)
          }
        } catch (err) {
          console.error("[QBasic CRT] Message handler error:", err)
        }
      }),
    )

    // Cleanup on close
    panel.onDidDispose(() => {
      WebviewManager.currentPanel = undefined
      WebviewManager._disposables.forEach((d) => d.dispose())
      WebviewManager._disposables = []
      emitter.emit("panelClosed", undefined)
    })

    emitter.emit("panelOpened", undefined)
  }

  /**
   * Run transpiled code in the CRT Webview with chunked transfer.
   * @param {string} code       - JavaScript code to execute
   * @param {string} filename   - Source filename for display
   * @param {vscode.Uri} extensionUri
   */
  static async runCode(code, filename, extensionUri) {
    // Reset tutorial history for a fresh run
    try {
      const TutorialManager = require("./TutorialManager")
      TutorialManager.clearHistory()
    } catch {
      /* Optional – ignore if TM not loaded */
    }

    if (!WebviewManager.currentPanel) {
      await WebviewManager.createOrShow(extensionUri)
    }

    if (!WebviewManager.currentPanel) {
      vscode.window.showErrorMessage("Failed to open CRT panel.")
      return
    }

    WebviewManager.currentPanel.reveal()

    // ── Chunked transfer for large payloads ──────────────────────────────
    if (code.length > CHUNK_SIZE) {
      await WebviewManager._sendChunked(code, filename)
    } else {
      // Small payload: send in one message (common case)
      WebviewManager.currentPanel.webview.postMessage({
        type: "execute",
        code,
        filename,
      })
    }

    emitter.emit("codeExecuted", { filename, codeSize: code.length })
  }

  /**
   * Send code to the webview in 64 KB chunks so the UI thread is not blocked.
   * Webview runtime must reassemble chunks before executing.
   * @param {string} code
   * @param {string} filename
   */
  static async _sendChunked(code, filename) {
    const panel = WebviewManager.currentPanel
    if (!panel) return

    const total = Math.ceil(code.length / CHUNK_SIZE)

    for (let i = 0; i < code.length; i += CHUNK_SIZE) {
      const chunk = code.slice(i, i + CHUNK_SIZE)
      const chunkIdx = Math.floor(i / CHUNK_SIZE)
      const isFirst = chunkIdx === 0
      const isLast = i + CHUNK_SIZE >= code.length

      panel.webview.postMessage({
        type: isFirst
          ? "execute_start"
          : isLast
            ? "execute_end"
            : "execute_chunk",
        chunk,
        filename: isFirst ? filename : undefined,
        chunkIdx,
        totalChunks: total,
      })

      // Yield to UI thread between chunks (prevents freezing)
      if (!isLast) {
        await new Promise((r) => setImmediate(r))
      }
    }
  }

  /** Clear the CRT screen. */
  static clearScreen() {
    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.webview.postMessage({ type: "clear" })
    }
  }

  /** Dispose the current panel. */
  static dispose() {
    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.dispose()
      WebviewManager.currentPanel = undefined
    }
  }

  /** @returns {boolean} */
  static isActive() {
    return WebviewManager.currentPanel !== undefined
  }

  /**
   * Build HTML content for the Webview.
   * Uses pathe for safe cross-platform URI joining.
   * @param {vscode.Webview} webview
   * @param {vscode.Uri} extensionUri
   * @returns {Promise<string>}
   * @private
   */
  static async _getHtmlForWebview(webview, extensionUri) {
    // Use pathe.join for consistent forward-slash paths, then convert to vscode URI
    const baseFsPath = extensionUri.fsPath
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(pathJoin(baseFsPath, "src", "webview", "crt.css")),
    )
    const jsUri = webview.asWebviewUri(
      vscode.Uri.file(pathJoin(baseFsPath, "src", "webview", "runtime.js")),
    )

    // Cache the raw HTML template; replace URIs each time (they're session-bound)
    if (!WebviewManager._htmlCache) {
      const htmlPath = pathJoin(baseFsPath, "src", "webview", "runner.html")
      WebviewManager._htmlCache = await fs.readFile(htmlPath, "utf8")
    }

    return WebviewManager._htmlCache
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace("{{cssUri}}", cssUri.toString())
      .replace("{{jsUri}}", jsUri.toString())
  }
}

module.exports = WebviewManager
module.exports.onWebviewEvent = onWebviewEvent
module.exports.offWebviewEvent = offWebviewEvent
