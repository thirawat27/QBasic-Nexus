/**
 * QBasic Nexus - Tutorial Manager
 * Handles interactive tutorial lessons and result validation
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

    /** @type {vscode.ExtensionContext | null} Stored extension context for reuse */
    static _extensionContext = null;

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
        if (!lesson.template) {
            vscode.window.showErrorMessage('Invalid lesson data. Missing tutorial template.');
            return;
        }

        TutorialManager.clearHistory();
        TutorialManager.currentLesson = lesson;

        // Open a new untitled file with tutorial explanation + example code
        const doc = await vscode.workspace.openTextDocument({
            content: TutorialManager.buildLessonDocument(lesson),
            language: 'qbasic'
        });
        const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One
        });

        const startLine = TutorialManager.findTemplateStartLine(doc);
        const position = new vscode.Position(startLine, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter,
        );
    }

    /**
     * Builds the tutorial document content shown to the user.
     * @param {Object} lesson
     * @returns {string}
     */
    static buildLessonDocument(lesson) {
        const headerLines = [
            "' ============================================================",
            `' Tutorial: ${lesson.title}`,
            lesson.objective ? `' Objective: ${lesson.objective}` : null,
            lesson.description ? `' Explanation: ${lesson.description}` : null,
            lesson.hint ? `' Hint: ${lesson.hint}` : null,
            "' ============================================================",
            '',
        ].filter(Boolean);

        return `${headerLines.join('\n')}${lesson.template}`;
    }

    /**
     * Finds the first executable line after the tutorial comment header.
     * @param {vscode.TextDocument} document
     * @returns {number}
     */
    static findTemplateStartLine(document) {
        for (let index = 0; index < document.lineCount; index++) {
            const text = document.lineAt(index).text.trim();
            if (text && !text.startsWith("'")) {
                return index;
            }
        }

        return 0;
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
            if (
                lesson.matchRegex &&
                (lesson.matchRegex.global || lesson.matchRegex.sticky)
            ) {
                lesson.matchRegex.lastIndex = 0;
            }

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
