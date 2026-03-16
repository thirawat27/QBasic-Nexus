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
    const items = lessons.map((l) => ({
      label: `$(mortar-board) ${l.title}`,
      description: l.objective,
      detail: l.description,
      lessonId: l.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '🎮 Select a Level to Play',
      matchOnDescription: true,
    });

    if (!selected) return;

    const lesson = lessons.find((l) => l.id === selected.lessonId);
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

    // 1. Open a new untitled editor with template code in Column One
    const doc = await vscode.workspace.openTextDocument({
      content: lesson.template,
      language: 'qbasic',
    });
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });

    // 2. Show lesson description as a read-only Markdown panel in Column Two
    //    Build a virtual URI that the Markdown content provider will serve
    const lessonUri = vscode.Uri.parse(
      `qbasic-nexus-lesson://tutorial/${encodeURIComponent(lesson.id)}`,
    );

    // Register an in-memory content provider (idempotent — safe to re-register)
    if (!TutorialManager._contentProviderRegistered) {
      vscode.workspace.registerTextDocumentContentProvider('qbasic-nexus-lesson', {
        provideTextDocumentContent() {
          const l = TutorialManager.currentLesson;
          if (!l) return '';
          return TutorialManager._buildMarkdown(l);
        },
      });
      TutorialManager._contentProviderRegistered = true;
    }

    // Open the virtual doc as a Markdown preview in Column Two
    await vscode.commands.executeCommand('markdown.showPreview', lessonUri, {
      viewColumn: vscode.ViewColumn.Two,
      preserveFocus: true,
    });
  }

  /** @type {string} Accumulated output for validation */
  static _outputHistory = '';

  /** @type {boolean} Whether the content provider has been registered */
  static _contentProviderRegistered = false;

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
        vscode.window.setStatusBarMessage(`✅ Lesson complete: ${lesson.title}`, 5000);
        TutorialManager.currentLesson = null;
        TutorialManager._outputHistory = '';
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

  /**
   * Builds rich Markdown content for the lesson description panel.
   * @param {Object} lesson
   * @returns {string}
   */
  static _buildMarkdown(lesson) {
    const hint = lesson.hint ? `\n> 💡 **Hint:** ${lesson.hint}\n` : '';
    return [
      `# 🎮 ${lesson.title}`,
      '',
      '## 🎯 Objective',
      `> ${lesson.objective}`,
      '',
      '## 📖 Description',
      lesson.description,
      hint,
      '---',
      '## 💻 Example Template',
      '```qbasic',
      lesson.template.trimEnd(),
      '```',
      '',
      '---',
      '_Write your solution in the editor on the left, then press **F5** to run it._',
      '_When your output matches the objective, the lesson is automatically marked complete!_ 🏆',
    ].join('\n');
  }
}

module.exports = TutorialManager;
