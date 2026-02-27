'use strict';

const vscode = require('vscode');
const lessons = require('../tutorials/data');

// Manages interactive QBasic tutorial lessons and validates user output
class TutorialManager {
    static currentLesson = null;
    static _webviewManager = null;
    static _extensionContext = null;

    static setWebviewManager(wm) {
        TutorialManager._webviewManager = wm;
    }

    static async startTutorial(extensionContext) {
        if (!extensionContext) {
            vscode.window.showErrorMessage('Extension context not available.');
            return;
        }

        TutorialManager._extensionContext = extensionContext;
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

        if (!lesson.template || !lesson.matchRegex) {
            vscode.window.showErrorMessage('Invalid lesson data. Missing template or match criteria.');
            return;
        }

        TutorialManager.currentLesson = lesson;
        const doc = await vscode.workspace.openTextDocument({
            content: lesson.template,
            language: 'qbasic'
        });
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });
        const WebviewManager = TutorialManager._webviewManager;
        if (!WebviewManager) {
            vscode.window.showWarningMessage('Webview Manager not initialized.');
            return;
        }

        await WebviewManager.createOrShow(extensionContext.extensionUri);
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

    static _outputHistory = '';

    static clearHistory() {
        TutorialManager._outputHistory = '';
    }

    static checkResult(output) {
        if (!TutorialManager.currentLesson) return false;

        const lesson = TutorialManager.currentLesson;
        TutorialManager._outputHistory += output;

        try {
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
                TutorialManager._outputHistory = '';
                return true;
            }
        } catch (err) {
            console.error('[TutorialManager] Regex match error:', err);
        }

        return false;
    }

    static getCurrentLesson() {
        return TutorialManager.currentLesson;
    }

    static reset() {
        TutorialManager.currentLesson = null;
        TutorialManager._extensionContext = null;
    }
}

module.exports = TutorialManager;
