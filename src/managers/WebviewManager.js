/**
 * Webview Manager - Cross-Platform Implementation
 * Manages the CRT webview panel lifecycle with platform optimizations
 */

"use strict"

const vscode = require("vscode")
const fs = require("fs").promises

// Manages the CRT webview panel lifecycle and communication with the runtime
class WebviewManager {
  static currentPanel = undefined
  static viewType = "qbasicNexusCrt"
  static _disposables = []
  static _maxDisposables = 100 // Limit to prevent memory leak

  /**
   * Add a disposable with automatic cleanup when limit is reached.
   * Prevents memory leaks by limiting max disposables to 100.
   * @param {vscode.Disposable} d - Disposable to add
   */
  static _addDisposable(d) {
    if (WebviewManager._disposables.length >= WebviewManager._maxDisposables) {
      const old = WebviewManager._disposables.shift()
      old.dispose()
    }
    WebviewManager._disposables.push(d)
  }

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

    WebviewManager._addDisposable(
      panel.webview.onDidReceiveMessage((message) => {
        try {
          if (message.type === "check_output") {
            const TutorialManager = require("./TutorialManager")
            const completed = TutorialManager.checkResult(message.content)
            if (completed && panel.webview) {
              panel.webview.postMessage({ type: "quest_complete" })
            }
          } else if (message.type === "error") {
            console.error("[QBasic CRT] Runtime error:", message.content)
            vscode.window.showErrorMessage(
              `[QBasic Nexus] Runtime Error: ${message.content}`,
            )
          }
        } catch (err) {
          console.error("[QBasic CRT] Message handler error:", err)
        }
      }),
    )

    panel.onDidDispose(() => {
      WebviewManager.currentPanel = undefined
      WebviewManager._disposables.forEach((d) => d.dispose())
      WebviewManager._disposables = []
    })
  }

  static async runCode(code, filename, extensionUri) {
    try {
      const TutorialManager = require("./TutorialManager")
      TutorialManager.clearHistory()
    } catch (_e) {
      // Tutorial might not be active, safe to ignore
    }

    if (!WebviewManager.currentPanel) {
      await WebviewManager.createOrShow(extensionUri)
    }

    if (!WebviewManager.currentPanel) {
      vscode.window.showErrorMessage("Failed to open CRT panel.")
      return
    }

    WebviewManager.currentPanel.reveal()

    WebviewManager.currentPanel.webview.postMessage({
      type: "execute",
      code: code,
      filename: filename,
    })
  }

  static clearScreen() {
    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.webview.postMessage({ type: "clear" })
    }
  }

  static dispose() {
    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.dispose()
      WebviewManager.currentPanel = undefined
    }
  }

  static isActive() {
    return WebviewManager.currentPanel !== undefined
  }

  static _htmlCache = null

  static async _getHtmlForWebview(webview, extensionUri) {
    // Use cross-platform path resolution
    const cssPath = vscode.Uri.joinPath(
      extensionUri,
      "src",
      "webview",
      "crt.css",
    )
    const jsPath = vscode.Uri.joinPath(
      extensionUri,
      "src",
      "webview",
      "runtime.js",
    )
    const htmlPath = vscode.Uri.joinPath(
      extensionUri,
      "src",
      "webview",
      "runner.html",
    )

    // Convert to webview URIs (handles platform differences internally)
    const cssUri = webview.asWebviewUri(cssPath)
    const jsUri = webview.asWebviewUri(jsPath)

    let html = WebviewManager._htmlCache

    if (!html) {
      try {
        // Use fsPath which is platform-specific
        html = await fs.readFile(htmlPath.fsPath, "utf8")
        WebviewManager._htmlCache = html
      } catch (err) {
        console.error("[WebviewManager] Failed to load HTML template:", err)
        throw new Error(`Failed to load CRT template: ${err.message}`, {
          cause: err,
        })
      }
    }

    // Replace placeholders with actual URIs
    // Ensure URIs use forward slashes for web compatibility
    return html
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace("{{cssUri}}", cssUri.toString())
      .replace("{{jsUri}}", jsUri.toString())
  }
}

module.exports = WebviewManager
