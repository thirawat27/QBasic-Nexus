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

'use strict';

const vscode = require('vscode');
const mitt = require('mitt');

/** Chunk size for large code payloads (64 KB) */
const CHUNK_SIZE = 64 * 1024;

/**
 * @typedef {'panelOpened' | 'panelClosed' | 'codeExecuted' | 'questComplete' | 'runtimeError'} WebviewEvent
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal event bus – used to decouple WebviewManager from TutorialManager
// ─────────────────────────────────────────────────────────────────────────────
/** @type {import('mitt').Emitter<Record<WebviewEvent, any>>} */
const emitter = mitt();

/**
 * Subscribe to internal WebviewManager events.
 * @param {WebviewEvent} event
 * @param {Function} handler
 */
function onWebviewEvent(event, handler) {
  emitter.on(event, handler);
}

/**
 * Unsubscribe from internal WebviewManager events.
 * @param {WebviewEvent} event
 * @param {Function} handler
 */
function offWebviewEvent(event, handler) {
  emitter.off(event, handler);
}

// ─────────────────────────────────────────────────────────────────────────────
// WebviewManager
// ─────────────────────────────────────────────────────────────────────────────
class WebviewManager {
  /** @type {vscode.WebviewPanel | undefined} */
  static currentPanel = undefined;

  /** @type {string} */
  static viewType = 'qbasicNexusCrt';

  /** @type {vscode.Disposable[]} */
  static _disposables = [];

  /** @type {string | null} Cached raw HTML template */
  static _htmlCache = null;

  /** @type {Promise<void> | null} */
  static _readyPromise = null;

  /** @type {(() => void) | null} */
  static _resolveReady = null;

  /** @type {((error: Error) => void) | null} */
  static _rejectReady = null;

  /** @type {boolean} */
  static _isReady = false;

  /** @type {any | null} Cached TutorialManager module */
  static _tutorialManagerCache = null;

  static _resetReadyState() {
    WebviewManager._isReady = false;
    WebviewManager._readyPromise = new Promise((resolve, reject) => {
      WebviewManager._resolveReady = resolve;
      WebviewManager._rejectReady = reject;
    });
  }

  static _markReady() {
    if (WebviewManager._isReady) return;
    WebviewManager._isReady = true;
    WebviewManager._resolveReady?.();
    WebviewManager._resolveReady = null;
    WebviewManager._rejectReady = null;
  }

  static _clearReadyState() {
    WebviewManager._isReady = false;
    WebviewManager._readyPromise = null;
    WebviewManager._resolveReady = null;
    WebviewManager._rejectReady = null;
  }

  static _handlePanelDisposed(reason = null) {
    const hadState =
      WebviewManager.currentPanel !== undefined ||
      WebviewManager._disposables.length > 0 ||
      WebviewManager._readyPromise !== null ||
      WebviewManager._tutorialManagerCache !== null;

    if (!hadState) {
      return;
    }

    if (!WebviewManager._isReady && WebviewManager._rejectReady) {
      WebviewManager._rejectReady(
        reason || new Error('CRT panel closed before initialization'),
      );
    }

    WebviewManager.currentPanel = undefined;
    WebviewManager._clearReadyState();
    WebviewManager._tutorialManagerCache = null;

    const disposables = WebviewManager._disposables;
    WebviewManager._disposables = [];
    for (const disposable of disposables) {
      disposable.dispose();
    }

    emitter.emit('panelClosed', undefined);
  }

  static async _waitUntilReady(timeoutMs = 5000) {
    if (WebviewManager._isReady) return;
    if (!WebviewManager._readyPromise) {
      WebviewManager._resetReadyState();
    }

    let timeoutHandle = null;
    try {
      await Promise.race([
        WebviewManager._readyPromise,
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error('CRT runtime initialization timed out')),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  static async _postMessage(panel, message) {
    if (!panel?.webview) {
      throw new Error('CRT panel is no longer available');
    }

    const delivered = await Promise.resolve(panel.webview.postMessage(message));
    if (delivered === false) {
      throw new Error('CRT panel rejected the message');
    }
  }

  /**
   * Creates or reveals the CRT Webview panel.
   * @param {vscode.Uri} extensionUri
   */
  static async createOrShow(extensionUri) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WebviewManager.viewType,
      'QBasic CRT 📺',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    WebviewManager.currentPanel = panel;
    WebviewManager._resetReadyState();
    let disposeReason = null;

    panel.onDidDispose(() => {
      WebviewManager._handlePanelDisposed(disposeReason);
    });

    // Message handler (lazy-load TutorialManager to break circular deps)
    WebviewManager._disposables.push(
      panel.webview.onDidReceiveMessage((message) => {
        try {
          if (message.type === 'ready') {
            WebviewManager._markReady();
          } else if (message.type === 'check_output') {
            // Cache TutorialManager to prevent memory leak from repeated requires
            if (!WebviewManager._tutorialManagerCache) {
              WebviewManager._tutorialManagerCache = require('./TutorialManager');
            }
            const completed = WebviewManager._tutorialManagerCache.checkResult(message.content);
            if (completed && panel.webview) {
              panel.webview.postMessage({ type: 'quest_complete' });
              emitter.emit('questComplete', message.content);
            }
          } else if (message.type === 'error') {
            console.error('[QBasic CRT] Runtime error:', message.content);
            emitter.emit('runtimeError', message.content);
          }
        } catch (err) {
          console.error('[QBasic CRT] Message handler error:', err);
        }
      }),
    );

    try {
      const html = await WebviewManager._getHtmlForWebview(
        panel.webview,
        extensionUri,
      );
      if (WebviewManager.currentPanel === panel) {
        panel.webview.html = html;
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to load CRT: ${err.message}`);
      if (WebviewManager.currentPanel === panel) {
        disposeReason = err;
        panel.dispose();
      }
      return;
    }

    emitter.emit('panelOpened', undefined);
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
      if (!WebviewManager._tutorialManagerCache) {
        WebviewManager._tutorialManagerCache = require('./TutorialManager');
      }
      WebviewManager._tutorialManagerCache.clearHistory();
    } catch {
      /* Optional – ignore if TM not loaded */
    }

    if (!WebviewManager.currentPanel) {
      await WebviewManager.createOrShow(extensionUri);
    }

    if (!WebviewManager.currentPanel) {
      vscode.window.showErrorMessage('Failed to open CRT panel.');
      return;
    }

    WebviewManager.currentPanel.reveal();
    await WebviewManager._waitUntilReady();

    // ── Chunked transfer for large payloads ──────────────────────────────
    if (code.length > CHUNK_SIZE) {
      await WebviewManager._sendChunked(code, filename);
    } else {
      // Small payload: send in one message (common case)
      await WebviewManager._postMessage(WebviewManager.currentPanel, {
        type: 'execute',
        code,
        filename,
      });
    }

    emitter.emit('codeExecuted', { filename, codeSize: code.length });
  }

  /**
   * Send code to the webview in 64 KB chunks so the UI thread is not blocked.
   * Webview runtime must reassemble chunks before executing.
   * @param {string} code
   * @param {string} filename
   */
  static async _sendChunked(code, filename) {
    const panel = WebviewManager.currentPanel;
    if (!panel) return;

    const total = Math.ceil(code.length / CHUNK_SIZE);

    for (let i = 0; i < code.length; i += CHUNK_SIZE) {
      const chunk = code.slice(i, i + CHUNK_SIZE);
      const chunkIdx = Math.floor(i / CHUNK_SIZE);
      const isFirst = chunkIdx === 0;
      const isLast = i + CHUNK_SIZE >= code.length;

      await WebviewManager._postMessage(panel, {
        type: isFirst
          ? 'execute_start'
          : isLast
            ? 'execute_end'
            : 'execute_chunk',
        chunk,
        filename: isFirst ? filename : undefined,
        chunkIdx,
        totalChunks: total,
      });

      // Yield to UI thread between chunks (prevents freezing)
      if (!isLast) {
        await new Promise((r) => setImmediate(r));
      }
    }
  }

  /** Clear the CRT screen. */
  static clearScreen() {
    if (WebviewManager.currentPanel) {
      void WebviewManager._postMessage(
        WebviewManager.currentPanel,
        { type: 'clear' },
      ).catch(() => {});
    }
  }

  /** Dispose the current panel. */
  static dispose() {
    if (WebviewManager.currentPanel) {
      WebviewManager.currentPanel.dispose();
      WebviewManager.currentPanel = undefined;
    }
  }

  /** @returns {boolean} */
  static isActive() {
    return WebviewManager.currentPanel !== undefined;
  }

  static async _getHtmlForWebview(webview, extensionUri) {
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'crt.css'),
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'runtime.js'),
    );

    if (!WebviewManager._htmlCache) {
      try {
        const htmlUri = vscode.Uri.joinPath(
          extensionUri,
          'src',
          'webview',
          'runner.html',
        );
        const htmlUint8Array = await vscode.workspace.fs.readFile(htmlUri);
        WebviewManager._htmlCache = new TextDecoder().decode(htmlUint8Array);
      } catch (err) {
        console.error('Failed to load runner.html', err);
        return '<html><body>Failed to load CRT template.</body></html>';
      }
    }

    return WebviewManager._htmlCache
      .replace(
        /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/i,
        `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; img-src ${webview.cspSource} data: blob:;">`,
      )
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace('{{cssUri}}', cssUri.toString())
      .replace('{{jsUri}}', jsUri.toString());
  }
}

module.exports = WebviewManager;
module.exports.onWebviewEvent = onWebviewEvent;
module.exports.offWebviewEvent = offWebviewEvent;
