/**
 * QBasic Nexus - Webview Manager
 * ==============================
 * Manages the CRT Webview panel lifecycle and communication.
 * 
 * @author Thirawat27
 * @version 1.0.2
 */

'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;

/**
 * Manages the Retro CRT Webview panel.
 */
class WebviewManager {
    /** @type {vscode.WebviewPanel | undefined} */
    static currentPanel = undefined;

    /** @type {string} */
    static viewType = 'qbasicNexusCrt';

    /** @type {Array} Disposables for cleanup */
    static _disposables = [];

    /**
     * Creates or reveals the CRT Webview panel.
     * @param {vscode.Uri} extensionUri - The extension's URI.
     */
    static async createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        // If we already have a panel, show it.
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            WebviewManager.viewType,
            'QBasic CRT 📺',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')]
            }
        );

        WebviewManager.currentPanel = panel;

        // Set content
        try {
            panel.webview.html = await WebviewManager._getHtmlForWebview(panel.webview, extensionUri);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to load CRT: ${err.message}`);
            panel.dispose();
            WebviewManager.currentPanel = undefined;
            return;
        }

        // Handle messages from Webview (lazy-load TutorialManager)
        WebviewManager._disposables.push(
            panel.webview.onDidReceiveMessage(
                message => {
                    try {
                        if (message.type === 'check_output') {
                            // Lazy-load to avoid circular dependency
                            const TutorialManager = require('./TutorialManager');
                            const completed = TutorialManager.checkResult(message.content);
                            if (completed && panel.webview) {
                                panel.webview.postMessage({ type: 'quest_complete' });
                            }
                        } else if (message.type === 'error') {
                            console.error('[QBasic CRT] Runtime error:', message.content);
                        }
                    } catch (err) {
                        console.error('[QBasic CRT] Message handler error:', err);
                    }
                }
            )
        );

        // Cleanup when closed
        panel.onDidDispose(() => {
            WebviewManager.currentPanel = undefined;
            // Dispose all handlers
            WebviewManager._disposables.forEach(d => d.dispose());
            WebviewManager._disposables = [];
        });
    }

    /**
     * Runs transpiled code in the CRT Webview.
     * @param {string} code - The JavaScript code to execute.
     * @param {string} filename - The source filename for display.
     * @param {vscode.Uri} extensionUri - The extension's URI.
     */
    static async runCode(code, filename, extensionUri) {
        // Reset tutorial history for new run
        try {
            const TutorialManager = require('./TutorialManager');
            TutorialManager.clearHistory();
        } catch { /* Ignore if not loaded */ }

        if (!WebviewManager.currentPanel) {
            await WebviewManager.createOrShow(extensionUri);
        }

        // Ensure panel exists after creation attempt
        if (!WebviewManager.currentPanel) {
            vscode.window.showErrorMessage('Failed to open CRT panel.');
            return;
        }

        // Ensure visible
        WebviewManager.currentPanel.reveal();

        // Send code to webview
        WebviewManager.currentPanel.webview.postMessage({
            type: 'execute',
            code: code,
            filename: filename
        });
    }

    /**
     * Clears the CRT screen.
     */
    static clearScreen() {
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.webview.postMessage({ type: 'clear' });
        }
    }

    /**
     * Disposes the current panel.
     */
    static dispose() {
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.dispose();
            WebviewManager.currentPanel = undefined;
        }
    }

    /**
     * Checks if the panel is currently active.
     * @returns {boolean}
     */
    static isActive() {
        return WebviewManager.currentPanel !== undefined;
    }

    /** @type {string|null} Cache for HTML content */
    static _htmlCache = null;

    /**
     * Generates the HTML content for the Webview.
     * @param {vscode.Webview} webview - The webview instance.
     * @param {vscode.Uri} extensionUri - The extension's URI.
     * @returns {Promise<string>} The HTML content.
     * @private
     */
    static async _getHtmlForWebview(webview, extensionUri) {
        const cssPath = vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'crt.css');
        const jsPath = vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'runtime.js');

        const cssUri = webview.asWebviewUri(cssPath);
        const jsUri = webview.asWebviewUri(jsPath);

        let html = WebviewManager._htmlCache;
        
        if (!html) {
             const htmlPath = vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'runner.html');
             html = await fs.readFile(htmlPath.fsPath, 'utf8');
             WebviewManager._htmlCache = html;
        }

        // Replace placeholders with actual URIs
        // We do this every time because URIs might change if webview is recreated? 
        // Actually, asWebviewUri results are tied to the webview instance/session. 
        // So we must replace on the fresh template.
        return html
            .replace(/\{\{cspSource\}\}/g, webview.cspSource)
            .replace('{{cssUri}}', cssUri.toString())
            .replace('{{jsUri}}', jsUri.toString());
    }


}

module.exports = WebviewManager;
