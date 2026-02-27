'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;

// Manages the CRT webview panel lifecycle and communication with the runtime
class WebviewManager {
    static currentPanel = undefined;
    static viewType = 'qbasicNexusCrt';
    static _disposables = [];

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
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')]
            }
        );

        WebviewManager.currentPanel = panel;

        try {
            panel.webview.html = await WebviewManager._getHtmlForWebview(panel.webview, extensionUri);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to load CRT: ${err.message}`);
            panel.dispose();
            WebviewManager.currentPanel = undefined;
            return;
        }

        WebviewManager._disposables.push(
            panel.webview.onDidReceiveMessage(
                message => {
                    try {
                        if (message.type === 'check_output') {
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

        panel.onDidDispose(() => {
            WebviewManager.currentPanel = undefined;
            WebviewManager._disposables.forEach(d => d.dispose());
            WebviewManager._disposables = [];
        });
    }

    static async runCode(code, filename, extensionUri) {
        try {
            const TutorialManager = require('./TutorialManager');
            TutorialManager.clearHistory();
        } catch { }

        if (!WebviewManager.currentPanel) {
            await WebviewManager.createOrShow(extensionUri);
        }

        if (!WebviewManager.currentPanel) {
            vscode.window.showErrorMessage('Failed to open CRT panel.');
            return;
        }

        WebviewManager.currentPanel.reveal();

        WebviewManager.currentPanel.webview.postMessage({
            type: 'execute',
            code: code,
            filename: filename
        });
    }

    static clearScreen() {
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.webview.postMessage({ type: 'clear' });
        }
    }

    static dispose() {
        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel.dispose();
            WebviewManager.currentPanel = undefined;
        }
    }

    static isActive() {
        return WebviewManager.currentPanel !== undefined;
    }

    static _htmlCache = null;

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

        return html
            .replace(/\{\{cspSource\}\}/g, webview.cspSource)
            .replace('{{cssUri}}', cssUri.toString())
            .replace('{{jsUri}}', jsUri.toString());
    }
}

module.exports = WebviewManager;
