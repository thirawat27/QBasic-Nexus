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
const {
  buildWebviewCsp,
  validateWebviewCodePayload,
} = require('../extension/processUtils');

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

  /** @type {boolean} */
  static _panelReady = false;

  /** @type {Array<Record<string, any>>} */
  static _pendingMessages = [];

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
    WebviewManager._panelReady = false;
    WebviewManager._pendingMessages = [];

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
        panel.dispose();
        WebviewManager.currentPanel = undefined;
      }
      return;
    }

    // Message handler (lazy-load TutorialManager to break circular deps)
    WebviewManager._disposables.push(
      panel.webview.onDidReceiveMessage((message) => {
        try {
          if (
            !message ||
            typeof message !== 'object' ||
            typeof message.type !== 'string'
          ) {
            return;
          }

          if (message.type === 'check_output') {
            const TutorialManager = require('./TutorialManager');
            const completed = TutorialManager.checkResult(message.content);
            if (completed && panel.webview) {
              WebviewManager.postMessage({ type: 'quest_complete' });
              emitter.emit('questComplete', message.content);
            }
          } else if (message.type === 'ready') {
            WebviewManager._panelReady = true;
            void WebviewManager._flushPendingMessages();
          } else if (message.type === 'error') {
            console.error('[QBasic CRT] Runtime error:', message.content);
            emitter.emit('runtimeError', message.content);
          }
        } catch (err) {
          console.error('[QBasic CRT] Message handler error:', err);
        }
      }),
    );

    // Cleanup on close
    panel.onDidDispose(() => {
      WebviewManager.currentPanel = undefined;
      WebviewManager._panelReady = false;
      WebviewManager._pendingMessages = [];
      WebviewManager._disposables.forEach((d) => d.dispose());
      WebviewManager._disposables = [];
      emitter.emit('panelClosed', undefined);
    });

    emitter.emit('panelOpened', undefined);
  }

  /**
   * Run transpiled code in the CRT Webview with chunked transfer.
   * @param {string} code       - JavaScript code to execute
   * @param {string} filename   - Source filename for display
   * @param {vscode.Uri} extensionUri
   */
  static async runCode(code, filename, extensionUri) {
    const payloadError = validateWebviewCodePayload(code);
    if (payloadError) {
      vscode.window.showErrorMessage(payloadError);
      emitter.emit('runtimeError', payloadError);
      return;
    }

    const safeFilename =
      typeof filename === 'string' && filename.trim()
        ? filename
        : 'program.bas';

    // Reset tutorial history for a fresh run
    try {
      const TutorialManager = require('./TutorialManager');
      TutorialManager.clearHistory();
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

    // ── Chunked transfer for large payloads ──────────────────────────────
    if (code.length > CHUNK_SIZE) {
      await WebviewManager._sendChunked(code, safeFilename);
    } else {
      // Small payload: send in one message (common case)
      await WebviewManager.postMessage({
        type: 'execute',
        code,
        filename: safeFilename,
      });
    }

    emitter.emit('codeExecuted', { filename: safeFilename, codeSize: code.length });
  }

  /**
   * Send code to the webview in 64 KB chunks so the UI thread is not blocked.
   * Webview runtime must reassemble chunks before executing.
   * @param {string} code
   * @param {string} filename
   */
  static async _sendChunked(code, filename) {
    const total = Math.ceil(code.length / CHUNK_SIZE);

    for (let i = 0; i < code.length; i += CHUNK_SIZE) {
      const chunk = code.slice(i, i + CHUNK_SIZE);
      const chunkIdx = Math.floor(i / CHUNK_SIZE);
      const isFirst = chunkIdx === 0;
      const isLast = i + CHUNK_SIZE >= code.length;

      await WebviewManager.postMessage({
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
      void WebviewManager.postMessage({ type: 'clear' });
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

  static async postMessage(message) {
    const panel = WebviewManager.currentPanel;
    if (!panel) return false;

    if (!WebviewManager._panelReady) {
      if (WebviewManager._replacesQueuedExecution(message.type)) {
        WebviewManager._pendingMessages = WebviewManager._pendingMessages.filter(
          (entry) => !WebviewManager._isExecutionMessageType(entry.type),
        );
      }
      WebviewManager._pendingMessages.push(message);
      return true;
    }

    return panel.webview.postMessage(message);
  }

  static async _flushPendingMessages() {
    const panel = WebviewManager.currentPanel;
    if (!panel || !WebviewManager._panelReady) return;

    const pending = WebviewManager._pendingMessages;
    WebviewManager._pendingMessages = [];

    for (const message of pending) {
      if (
        !WebviewManager.currentPanel ||
        WebviewManager.currentPanel !== panel ||
        !WebviewManager._panelReady
      ) {
        break;
      }
      await panel.webview.postMessage(message);
    }
  }

  static _isExecutionMessageType(type) {
    return (
      type === 'execute' ||
      type === 'execute_start' ||
      type === 'execute_chunk' ||
      type === 'execute_end' ||
      type === 'clear'
    );
  }

  static _replacesQueuedExecution(type) {
    return type === 'execute' || type === 'execute_start' || type === 'clear';
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
        `<meta http-equiv="Content-Security-Policy" content="${buildWebviewCsp(webview.cspSource)}">`,
      )
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace('{{cssUri}}', cssUri.toString())
      .replace('{{jsUri}}', jsUri.toString());
  }
}

module.exports = WebviewManager;
module.exports.onWebviewEvent = onWebviewEvent;
module.exports.offWebviewEvent = offWebviewEvent;
