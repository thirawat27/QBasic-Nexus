'use strict';

const assert = require('assert');
const vscode = require('vscode');

suite('QBasic Nexus Extension', () => {
  test('activates and registers core commands', async () => {
    const extension =
      vscode.extensions.getExtension('Thirawat27.qbasic-nexus') ||
      vscode.extensions.getExtension('thirawat27.qbasic-nexus');

    assert.ok(extension, 'Extension should be discoverable by VS Code');

    await extension.activate();
    assert.strictEqual(
      extension.isActive,
      true,
      'Extension should activate successfully',
    );

    const commands = await vscode.commands.getCommands(true);
    for (const command of [
      'qbasic-nexus.compile',
      'qbasic-nexus.compileAndRun',
      'qbasic-nexus.runInCrt',
      'qbasic-nexus.startTutorial',
      'qbasic-nexus.showAsciiChart',
    ]) {
      assert.ok(commands.includes(command), `Missing command: ${command}`);
    }
  });

  test('opens untitled qbasic documents with the expected language id', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'PRINT "HELLO"',
      language: 'qbasic',
    });

    assert.strictEqual(doc.languageId, 'qbasic');
    assert.ok(doc.getText().includes('PRINT "HELLO"'));
  });

  test('start tutorial opens lesson code with inline explanation instead of CRT webview', async () => {
    const lessons = require('../src/tutorials/data');
    const TutorialManager = require('../src/managers/TutorialManager');
    const WebviewManager = require('../src/managers/WebviewManager');
    const lesson = lessons[0];
    const originalShowQuickPick = vscode.window.showQuickPick;
    const originalPanel = WebviewManager.currentPanel;

    vscode.window.showQuickPick = async () => ({
      lessonId: lesson.id,
    });

    try {
      await vscode.commands.executeCommand('qbasic-nexus.startTutorial');

      const editor = vscode.window.activeTextEditor;
      assert.ok(editor, 'Tutorial should open an editor');
      assert.strictEqual(editor.document.languageId, 'qbasic');

      const text = editor.document.getText();
      assert.ok(text.includes(`' Tutorial: ${lesson.title}`));
      assert.ok(text.includes(`' Objective: ${lesson.objective}`));
      assert.ok(text.includes(`' Explanation: ${lesson.description}`));
      assert.ok(text.includes(lesson.template.trim()));
      assert.strictEqual(
        TutorialManager.getCurrentLesson()?.id,
        lesson.id,
        'Tutorial should track the selected lesson for validation',
      );
      assert.strictEqual(
        WebviewManager.currentPanel,
        undefined,
        'Tutorial should not create the CRT webview',
      );
    } finally {
      TutorialManager.reset();
      TutorialManager.clearHistory();
      vscode.window.showQuickPick = originalShowQuickPick;
      WebviewManager.currentPanel = originalPanel;
    }
  });

  test('tutorial validation resets regex state between lesson runs', async () => {
    const TutorialManager = require('../src/managers/TutorialManager');
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    const regex = /DONE/g;

    vscode.window.showInformationMessage = async () => undefined;

    try {
      TutorialManager.currentLesson = { title: 'Test', matchRegex: regex };
      TutorialManager.clearHistory();
      assert.strictEqual(TutorialManager.checkResult('DONE'), true);

      TutorialManager.currentLesson = { title: 'Test', matchRegex: regex };
      TutorialManager.clearHistory();
      assert.strictEqual(
        TutorialManager.checkResult('DONE'),
        true,
        'Repeated runs should not inherit a stale lastIndex',
      );
    } finally {
      TutorialManager.reset();
      TutorialManager.clearHistory();
      vscode.window.showInformationMessage = originalShowInformationMessage;
    }
  });

  test('queued execute messages keep only the latest pending run before ready', async () => {
    const WebviewManager = require('../src/managers/WebviewManager');
    const originalPanel = WebviewManager.currentPanel;
    const originalReady = WebviewManager._panelReady;
    const originalPending = WebviewManager._pendingMessages;

    try {
      WebviewManager.currentPanel = {
        webview: {
          postMessage: async () => true,
        },
      };
      WebviewManager._panelReady = false;
      WebviewManager._pendingMessages = [
        { type: 'start_quest', quest: { title: 'A', objective: 'B' } },
        { type: 'execute', code: 'old', filename: 'old.bas' },
      ];

      await WebviewManager.postMessage({
        type: 'execute',
        code: 'new',
        filename: 'new.bas',
      });

      assert.deepStrictEqual(
        WebviewManager._pendingMessages.map((entry) => entry.type),
        ['start_quest', 'execute'],
      );
      assert.strictEqual(WebviewManager._pendingMessages[1].code, 'new');
      assert.strictEqual(
        WebviewManager._pendingMessages[1].filename,
        'new.bas',
      );
    } finally {
      WebviewManager.currentPanel = originalPanel;
      WebviewManager._panelReady = originalReady;
      WebviewManager._pendingMessages = originalPending;
    }
  });
});
