/**
 * Runs inside the VS Code extension host (see run.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const EXTENSION_ID = 'Thirawat27.qbasic-nexus';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(what, fn, timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > until) throw new Error(`Timed out waiting for ${what}`);
    await sleep(200);
  }
}

async function setting(key, value) {
  await vscode.workspace
    .getConfiguration('qbasic-nexus')
    .update(key, value, vscode.ConfigurationTarget.Global);
}

async function open(file) {
  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc);
  return doc;
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(`  ✅ ${name}`);
  } catch (error) {
    results.push(`  ❌ ${name}\n     ${error.message}`);
  }
}

async function run() {
  const work = process.env.QBNX_TEST_WORK;
  try {
    await suite(work);
  } catch (error) {
    results.push(`  ❌ suite stopped\n     ${error.stack || error}`);
  }
  // The extension host console is not forwarded to the terminal; run.js prints this file.
  fs.writeFileSync(path.join(work, '..', 'results.txt'), `QBasic Nexus in VS Code\n${results.join('\n')}\n`);
  if (results.some((line) => line.includes('❌'))) {
    throw new Error('Some VS Code tests failed');
  }
}

async function suite(work) {
  fs.mkdirSync(work, { recursive: true });
  const bad = path.join(work, 'bad.bas');
  const good = path.join(work, 'good.bas');
  fs.writeFileSync(bad, 'PRINT "start"\nX = 1 +\n');
  fs.writeFileSync(good, 'CLS\nPRINT "Hello from QBasic Nexus"\nFOR i = 1 TO 3\n    PRINT i\nNEXT\n');

  await setting('compilerMode', 'QBNex');
  await setting('qbnexPath', process.env.QBNEX_TEST_COMPILER);
  await setting('languageServer.path', process.env.QBNEX_TEST_LSP || '');
  await setting('debugAdapterPath', process.env.QBNEX_TEST_DAP || '');

  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  await test('extension activates', async () => {
    if (!extension) throw new Error(`${EXTENSION_ID} is not loaded`);
    await extension.activate();
  });

  await test('all contributed commands are registered', async () => {
    const all = await vscode.commands.getCommands(true);
    const declared = extension.packageJSON.contributes.commands.map((c) => c.command);
    const missing = declared.filter((c) => !all.includes(c));
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
  });

  await test('check on save reports the QBNex error on line 2', async () => {
    const doc = await open(bad);
    await vscode.commands.executeCommand('qbasic-nexus.checkFile');
    const diag = await waitFor('a diagnostic in bad.bas', () =>
      vscode.languages.getDiagnostics(doc.uri).find((d) => d.range.start.line === 1),
    );
    if (diag.severity !== vscode.DiagnosticSeverity.Error) throw new Error('expected an error');
  });

  await test('Compile builds an executable', async () => {
    await open(good);
    await vscode.commands.executeCommand('qbasic-nexus.compile');
    const exe = good.replace(/\.bas$/, process.platform === 'win32' ? '.exe' : '');
    await waitFor('the executable', () => fs.existsSync(exe), 120000);
  });

    if (process.env.QBNEX_TEST_LSP) {
    // Only qb-lsp reports diagnostics for unsaved text, so this also proves it runs.
    await test('qb-lsp reports a block error while typing (unsaved)', async () => {
      const doc = await open(good);
      const editor = vscode.window.activeTextEditor;
      try {
        await editor.edit((e) => e.insert(new vscode.Position(doc.lineCount, 0), 'END IF\n'));
        await waitFor('a live diagnostic', () =>
          vscode.languages.getDiagnostics(doc.uri).some((d) => /END IF/i.test(d.message)),
        );
      } finally {
        await vscode.commands.executeCommand('workbench.action.files.revert');
      }
    });
  }

  await test('formatting provider capitalizes keywords', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'qbasic', content: 'print "a"\nfor i = 1 to 2\nprint i\nnext\n' });
    await vscode.window.showTextDocument(doc);
    const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', doc.uri, { tabSize: 4, insertSpaces: true });
    if (!edits || edits.length === 0) throw new Error('no edits');
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(doc.uri, edits);
    await vscode.workspace.applyEdit(workspaceEdit);
    if (!doc.getText().startsWith('PRINT')) throw new Error(doc.getText());
  });
await test('Run in Retro CRT opens the panel', async () => {
    await open(good);
    await vscode.commands.executeCommand('qbasic-nexus.runInCrt');
    await waitFor('the QBasic CRT tab', () =>
      vscode.window.tabGroups.all.some((g) => g.tabs.some((t) => String(t.label).startsWith('QBasic CRT'))),
    );
  });

  await test('the program runs on qb-web inside the Retro CRT', async () => {
    const result = await waitFor('a finished run', () =>
      vscode.commands.executeCommand('qbasic-nexus._lastCrtResult'), 60000);
    if (result.status !== 0) throw new Error(`status ${result.status}: ${result.message}`);
    if (!/Hello from QBasic Nexus/.test(result.screenText)) throw new Error(`screen: ${result.screenText}`);
  });

  await test('Format Document capitalizes keywords', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'qbasic', content: 'print "a"\nfor i = 1 to 2\nprint i\nnext\n' });
    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand('editor.action.formatDocument');
    await waitFor('formatted text', () => doc.getText().startsWith('PRINT'));
  });

  if (process.env.QBNEX_TEST_DAP) {
    await test('qb-dap debug session starts and stops on entry', async () => {
      await open(good);
      let stopped = false;
      const tracker = vscode.debug.registerDebugAdapterTrackerFactory('qbasic-nexus', {
        createDebugAdapterTracker: () => ({
          onDidSendMessage: (m) => {
            if (m.type === 'event' && m.event === 'stopped') stopped = true;
          },
        }),
      });
      try {
        const started = await vscode.debug.startDebugging(undefined, {
          type: 'qbasic-nexus',
          request: 'launch',
          name: 'test',
          program: good,
          stopOnEntry: true,
        });
        if (!started) throw new Error('startDebugging returned false');
        await waitFor('the stopped event', () => stopped, 60000);
        await vscode.debug.stopDebugging();
      } finally {
        tracker.dispose();
      }
    });
  }

}

module.exports = { run };
