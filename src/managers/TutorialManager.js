/**
 * QBasic Nexus - Tutorial Manager
 * ===============================
 * Handles interactive tutorial lessons and result validation.
 * 
 * @author Thirawat27
 * @version 1.0.2
 */

'use strict';

const vscode = require('vscode');
const lessons = require('../tutorials/data');

/**
 * Manages interactive QBasic tutorials.
 */
class TutorialManager {
    /** @type {Object | null} Current active lesson */
    static currentLesson = null;

    /** @type {Object | null} Reference to WebviewManager (set externally to avoid circular deps) */
    static _webviewManager = null;

    /** @type {vscode.ExtensionContext | null} Stored extension context for reuse */
    static _extensionContext = null;

    /**
     * Sets the WebviewManager reference (called during extension activation).
     * @param {Object} wm - The WebviewManager class.
     */
    static setWebviewManager(wm) {
        TutorialManager._webviewManager = wm;
    }

    /**
     * Starts the interactive tutorial by showing a lesson picker.
     * @param {vscode.ExtensionContext} extensionContext - The extension context.
     */
    static async startTutorial(extensionContext) {
        if (!extensionContext) {
            vscode.window.showErrorMessage('Extension context not available.');
            return;
        }

        // Store context for reuse (e.g., Next Level)
        TutorialManager._extensionContext = extensionContext;

        // Build lesson picker items
        const items = lessons.map(l => ({
            label: `$(mortar-board) ${l.title}`,
            description: l.objective,
            detail: l.description,
            lessonId: l.id
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '🎮 Select a Level to Play',
            matchOnDescription: true
        });

        if (!selected) return;

        const lesson = lessons.find(l => l.id === selected.lessonId);
        if (!lesson) {
            vscode.window.showErrorMessage('Lesson not found. Please try again.');
            return;
        }

        // Validate lesson data
        if (!lesson.template || !lesson.matchRegex) {
            vscode.window.showErrorMessage('Invalid lesson data. Missing template or match criteria.');
            return;
        }

        TutorialManager.currentLesson = lesson;

        // 1. Open a new untitled file with template code
        const doc = await vscode.workspace.openTextDocument({
            content: lesson.template,
            language: 'qbasic'
        });
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });

        // 2. Open CRT Webview and show objective HUD
        const WebviewManager = TutorialManager._webviewManager;
        if (!WebviewManager) {
            vscode.window.showWarningMessage('Webview Manager not initialized.');
            return;
        }

        await WebviewManager.createOrShow(extensionContext.extensionUri);

        // Wait for webview to be ready, then send quest data
        setTimeout(() => {
            if (WebviewManager.currentPanel) {
                WebviewManager.currentPanel.webview.postMessage({
                    type: 'start_quest',
                    quest: {
                        title: lesson.title,
                        objective: lesson.objective
                    }
                });
            }
        }, 800);
    }

    /** @type {string} Accumulated output for validation */
    static _outputHistory = '';

    /**
     * Clear the output history (called when new code is run).
     */
    static clearHistory() {
        TutorialManager._outputHistory = '';
    }

    /**
     * Checks if the output matches the current lesson's goal.
     * @param {string} output - The output from the CRT (chunk).
     * @returns {boolean} True if passed.
     */
    static checkResult(output) {
        if (!TutorialManager.currentLesson) return false;

        const lesson = TutorialManager.currentLesson;
        
        // Accumulate output
        TutorialManager._outputHistory += output;

        try {
            // Check against full history
            const passed = lesson.matchRegex.test(TutorialManager._outputHistory);

            if (passed) {
                vscode.window.showInformationMessage(
                    `🎉 Mission Complete: ${lesson.title}!`,
                    'Next Level'
                ).then(selection => {
                    if (selection === 'Next Level' && TutorialManager._extensionContext) {
                        TutorialManager.startTutorial(TutorialManager._extensionContext);
                    }
                });
                TutorialManager.currentLesson = null;
                TutorialManager._outputHistory = ''; // Reset on success
                return true;
            }
        } catch (err) {
            console.error('[TutorialManager] Regex match error:', err);
        }

        return false;
    }

    /**
     * Gets the current lesson (for debugging/testing)
     * @returns {Object|null}
     */
    static getCurrentLesson() {
        return TutorialManager.currentLesson;
    }

    /**
     * Resets the tutorial state
     */
    static reset() {
        TutorialManager.currentLesson = null;
        TutorialManager._extensionContext = null;
    }
}

module.exports = TutorialManager;
