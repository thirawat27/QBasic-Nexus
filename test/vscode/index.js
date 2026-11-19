// @ts-nocheck -- runs inside the VS Code extension host
'use strict';

/**
 * Integration tests that run inside a real VS Code instance (see run.js).
 * VS Code loads this file through --extensionTestsPath and calls run().
 * Results are written to the JSON file named by QBNX_TEST_RESULTS.
 */

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const EXTENSION_ID = 'Thirawat27.qbasic-nexus';
const results = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, timeoutMs = 15000, intervalMs = 200) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    last = await check();
    if (last) return last;
    await sleep(intervalMs);
  }
  throw new Error(`timed out after ${timeoutMs} ms`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function workspaceFile(name) {
  return vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, name));
}

async function open(name) {
  const document = await vscode.workspace.openTextDocument(workspaceFile(name));
  await vscode.window.showTextDocument(document);
  return document;
}

function diagnosticsWithCode(uri, code) {
  return vscode.languages.getDiagnostics(uri).filter((d) => String(d.code) === code);
}

async function test(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - started, detail: detail || '' });
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: error && error.stack ? error.stack : String(error) });
  }
}

async function run() {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);

  await test('extension is found and activates', async () => {
    assert(extension, `${EXTENSION_ID} not found`);
    await open('main.bas');
    await waitFor(() => extension.isActive);
    return `version ${extension.packageJSON.version}, from ${extension.extensionPath}`;
  });

  await test('every contributed command is registered', async () => {
    const registered = new Set(await vscode.commands.getCommands(true));
    const missing = extension.packageJSON.contributes.commands
      .map((c) => c.command)
      .filter((c) => !registered.has(c));
    assert(missing.length === 0, `missing: ${missing.join(', ')}`);
    return `${extension.packageJSON.contributes.commands.length} commands`;
  });

  await test('.bas files open with the qbasic language', async () => {
    const doc = await open('main.bas');
    assert(doc.languageId === 'qbasic', `languageId is ${doc.languageId}`);
  });

  await test('hover shows keyword help', async () => {
    const doc = await open('main.bas');
    const line = doc.lineAt(6);
    const hovers = await vscode.commands.executeCommand(
      'vscode.executeHoverProvider', doc.uri, new vscode.Position(6, line.text.indexOf('PRINT') + 1));
    assert(hovers && hovers.length > 0, 'no hover');
  });

  await test('completion offers keywords and user SUBs', async () => {
    const doc = await open('main.bas');
    const list = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', doc.uri, new vscode.Position(4, 0));
    const labels = list.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label));
    assert(labels.includes('PRINT'), 'PRINT missing');
    assert(labels.includes('DrawPlayer'), 'DrawPlayer missing');
    return `${labels.length} items`;
  });

  await test('learned ranking stars a word seen twice after the same word', async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: 'qbasic',
      content: 'SCREEN 12\nCLS\nSCREEN 13\nCLS\nSCREEN 12\n',
    });
    await vscode.window.showTextDocument(doc);
    const list = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', doc.uri, new vscode.Position(5, 0));
    const starred = list.items.filter((i) => typeof i.label !== 'string' && /★/.test(i.label.description || ''));
    assert(starred.some((i) => i.label.label === 'CLS'), 'CLS not promoted');
    return `starred: ${starred.map((i) => i.label.label).join(', ')}`;
  });

  await test('signature help for a built-in function', async () => {
    const doc = await open('main.bas');
    const text = doc.lineAt(7).text;
    const help = await vscode.commands.executeCommand(
      'vscode.executeSignatureHelpProvider', doc.uri, new vscode.Position(7, text.indexOf('(') + 2), '(');
    assert(help && help.signatures.length > 0, 'no signature help');
    return help.signatures[0].label;
  });

  await test('go to definition jumps into the $INCLUDEd file', async () => {
    const doc = await open('main.bas');
    const col = doc.lineAt(5).text.indexOf('Twice') + 1;
    const locations = await vscode.commands.executeCommand(
      'vscode.executeDefinitionProvider', doc.uri, new vscode.Position(5, col));
    const target = locations[0];
    const uri = target.uri || target.targetUri;
    assert(uri && uri.fsPath.endsWith('lib.bi'), `went to ${uri && uri.fsPath}`);
  });

  await test('$INCLUDE file name is a link', async () => {
    const doc = await open('main.bas');
    const links = await vscode.commands.executeCommand('vscode.executeLinkProvider', doc.uri);
    assert(links.some((l) => l.target && l.target.fsPath.endsWith('lib.bi')), 'no link to lib.bi');
  });

  await test('document symbols list SUBs', async () => {
    const doc = await open('main.bas');
    const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', doc.uri);
    const names = symbols.map((s) => s.name);
    assert(names.includes('DrawPlayer') && names.includes('NeverCalled'), names.join(', '));
  });

  await test('workspace symbol search finds symbols in other files', async () => {
    const symbols = await waitFor(async () => {
      const found = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', 'Twic');
      return found.length > 0 ? found : null;
    });
    assert(symbols.some((s) => s.location.uri.fsPath.endsWith('lib.bi')), 'Twice not found in lib.bi');
  });

  await test('find references and rename', async () => {
    const doc = await open('main.bas');
    const pos = new vscode.Position(4, 2);
    const refs = await vscode.commands.executeCommand('vscode.executeReferenceProvider', doc.uri, pos);
    assert(refs.length >= 3, `only ${refs.length} references`);
    const edit = await vscode.commands.executeCommand('vscode.executeDocumentRenameProvider', doc.uri, pos, 'DrawHero');
    assert(edit && edit.size > 0, 'rename produced no edit');
    return `${refs.length} references`;
  });

  await test('reference CodeLens resolves to a count', async () => {
    const doc = await open('main.bas');
    const lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', doc.uri, 10);
    const titles = lenses.map((l) => l.command && l.command.title).filter(Boolean);
    assert(titles.some((t) => /^1 reference$/.test(t)), `titles: ${titles.join(' | ')}`);
    assert(titles.some((t) => /^0 references$/.test(t)), 'NeverCalled should show 0 references');
    return titles.join(' | ');
  });

  await test('complexity CodeLens appears above a complex SUB', async () => {
    await vscode.workspace.getConfiguration('qbasic-nexus').update('codeLens.complexityThreshold', 5, vscode.ConfigurationTarget.Workspace);
    const doc = await open('complex.bas');
    const lenses = await vscode.commands.executeCommand('vscode.executeCodeLensProvider', doc.uri, 10);
    const complexity = lenses.map((l) => l.command && l.command.title).find((t) => /^complexity \d+/.test(t || ''));
    assert(complexity, 'no complexity lens');
    return complexity;
  });

  await test('call hierarchy shows incoming calls', async () => {
    const doc = await open('main.bas');
    const items = await vscode.commands.executeCommand('vscode.prepareCallHierarchy', doc.uri, new vscode.Position(9, 6));
    assert(items && items.length === 1, 'no item');
    const incoming = await vscode.commands.executeCommand('vscode.provideIncomingCalls', items[0]);
    assert(incoming.length >= 1, 'no incoming calls');
    return `${items[0].name}: ${incoming.length} caller(s)`;
  });

  await test('inlay hints show parameter names', async () => {
    const doc = await open('main.bas');
    const hints = await vscode.commands.executeCommand(
      'vscode.executeInlayHintProvider', doc.uri, new vscode.Range(0, 0, doc.lineCount, 0));
    const labels = hints.map((h) => (typeof h.label === 'string' ? h.label : h.label.map((p) => p.value).join('')));
    assert(labels.includes('x:') && labels.includes('y:'), `hints: ${labels.join(' ')}`);
    return labels.join(' ');
  });

  await test('format document and format selection', async () => {
    const doc = await open('format.bas');
    const whole = await vscode.commands.executeCommand(
      'vscode.executeFormatDocumentProvider', doc.uri, { tabSize: 4, insertSpaces: true });
    assert(whole.length > 0, 'no edits');
    const range = await vscode.commands.executeCommand(
      'vscode.executeFormatRangeProvider', doc.uri, new vscode.Range(2, 0, 4, 6), { tabSize: 4, insertSpaces: true });
    assert(range.length > 0 && range.every((e) => e.range.start.line >= 2 && e.range.start.line <= 4), 'range edits outside selection');
    return `${whole.length} document edits, ${range.length} range edits`;
  });

  await test('folding ranges and semantic tokens', async () => {
    const doc = await open('main.bas');
    const folds = await vscode.commands.executeCommand('vscode.executeFoldingRangeProvider', doc.uri);
    assert(folds.length > 0, 'no folding ranges');
    const tokens = await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', doc.uri);
    assert(tokens && tokens.data.length > 0, 'no semantic tokens');
  });

  await test('typo warning and its quick fix', async () => {
    const doc = await open('typo.bas');
    const diags = await waitFor(() => {
      const found = diagnosticsWithCode(doc.uri, 'possible-typo');
      return found.length >= 2 ? found : null;
    });
    const actions = await vscode.commands.executeCommand(
      'vscode.executeCodeActionProvider', doc.uri, diags[0].range);
    const fix = actions.find((a) => a.title === "Change to 'PRINT'");
    assert(fix, `actions: ${actions.map((a) => a.title).join(', ')}`);
    await vscode.workspace.applyEdit(fix.edit);
    assert(doc.lineAt(0).text.startsWith('PRINT'), doc.lineAt(0).text);
    await vscode.commands.executeCommand('workbench.action.files.revert');
    return diags.map((d) => d.message).join(' / ');
  });

  await test('GOTO loop hint and DO...LOOP rewrite', async () => {
    const doc = await open('gotoloop.bas');
    await waitFor(() => diagnosticsWithCode(doc.uri, 'goto-loop').length > 0);
    const actions = await vscode.commands.executeCommand(
      'vscode.executeCodeActionProvider', doc.uri, new vscode.Range(3, 0, 3, 0), vscode.CodeActionKind.RefactorRewrite.value);
    const rewrite = actions.find((a) => /DO\.\.\.LOOP/.test(a.title));
    assert(rewrite, 'no rewrite action');
    await vscode.workspace.applyEdit(rewrite.edit);
    const text = doc.getText();
    assert(/^DO$/m.test(text) && /^LOOP WHILE i < 3$/m.test(text), text);
    await vscode.commands.executeCommand('workbench.action.files.revert');
  });

  await test('unused SUB is faded out', async () => {
    const doc = await open('main.bas');
    const unused = await waitFor(() => {
      const found = diagnosticsWithCode(doc.uri, 'unused-procedure');
      return found.length ? found : null;
    });
    assert(unused.some((d) => /NeverCalled/.test(d.message)), unused.map((d) => d.message).join(', '));
    assert(!unused.some((d) => /DrawPlayer/.test(d.message)), 'DrawPlayer wrongly reported');
  });

  await test('duplicate code is reported', async () => {
    const doc = await open('dup.bas');
    const dups = await waitFor(() => {
      const found = diagnosticsWithCode(doc.uri, 'duplicate-code');
      return found.length ? found : null;
    });
    return dups[0].message;
  });

  await test('linter reports a syntax error', async () => {
    const doc = await open('build-error.bas');
    const errors = await waitFor(() => {
      const found = vscode.languages.getDiagnostics(doc.uri).filter((d) => d.source === 'QBasic Nexus' && d.severity === vscode.DiagnosticSeverity.Error);
      return found.length ? found : null;
    });
    return errors.map((d) => d.message).join(' / ');
  });

  await test('QB64-PE-only keyword is flagged with the original QB64', async () => {
    const doc = await open('pe-only.bas');
    const warnings = await waitFor(() => {
      const found = diagnosticsWithCode(doc.uri, 'qb64pe-only');
      return found.length ? found : null;
    }, 30000);
    return warnings[0].message;
  });

  await test('build task compiles with QB64', async () => {
    const doc = await open('build-ok.bas');
    const tasks = await vscode.tasks.fetchTasks({ type: 'qb64' });
    const task = tasks.find((t) => t.name === 'Build current file');
    assert(task, `tasks: ${tasks.map((t) => t.name).join(', ')}`);
    const exe = doc.uri.fsPath.replace(/\.bas$/i, '.exe');
    if (fs.existsSync(exe)) fs.unlinkSync(exe);
    const exitCode = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('task did not finish in 180 s')), 180000);
      const sub = vscode.tasks.onDidEndTaskProcess((event) => {
        if (event.execution.task.definition.type !== 'qb64') return;
        clearTimeout(timer);
        sub.dispose();
        resolve(event.exitCode);
      });
      vscode.tasks.executeTask(task).then(undefined, reject);
    });
    assert(exitCode === 0, `exit code ${exitCode}`);
    assert(fs.existsSync(exe), `${exe} was not created`);
    return `exit ${exitCode}, ${path.basename(exe)} created`;
  });

  await test('Compile command reports QB64 errors in Problems', async () => {
    const doc = await open('build-error.bas');
    await vscode.commands.executeCommand('qbasic-nexus.compile');
    const errors = await waitFor(() => {
      const found = vscode.languages.getDiagnostics(doc.uri).filter((d) => d.source === 'QB64');
      return found.length ? found : null;
    }, 180000, 500);
    return errors.map((d) => `line ${d.range.start.line + 1}: ${d.message.split('\n')[0]}`).join(' / ');
  });

  await test('debugger stops at a breakpoint and runs to the end', async () => {
    const doc = await open('debugme.bas');
    const events = [];
    const tracker = vscode.debug.registerDebugAdapterTrackerFactory('qb64', {
      createDebugAdapterTracker() {
        return {
          onDidSendMessage(message) {
            if (message.type === 'event') events.push(message);
          },
        };
      },
    });
    const breakpoint = new vscode.SourceBreakpoint(new vscode.Location(doc.uri, new vscode.Position(3, 0)));
    vscode.debug.addBreakpoints([breakpoint]);
    try {
      const started = await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], {
        type: 'qb64',
        request: 'launch',
        name: 'test',
        program: doc.uri.fsPath,
      });
      assert(started, 'startDebugging returned false');
      const stopped = await waitFor(() => events.find((e) => e.event === 'stopped'), 240000, 500);
      const session = vscode.debug.activeDebugSession;
      const stack = await session.customRequest('stackTrace', { threadId: 1 });
      const line = stack.stackFrames[0].line;
      await session.customRequest('continue', { threadId: 1 });
      await waitFor(() => events.find((e) => e.event === 'terminated'), 60000, 500);
      assert(stopped.body.reason === 'breakpoint', `stopped for ${stopped.body.reason}`);
      assert(line === 4, `stopped at line ${line}, expected 4`);
      return `stopped (${stopped.body.reason}) at line ${line}, then terminated`;
    } finally {
      vscode.debug.removeBreakpoints([breakpoint]);
      tracker.dispose();
    }
  });

  await test('Run in Retro CRT opens without error', async () => {
    await open('build-ok.bas');
    await vscode.commands.executeCommand('qbasic-nexus.runInCrt');
    await sleep(3000);
  });

  const out = process.env.QBNX_TEST_RESULTS;
  if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) throw new Error(`${failed.length} of ${results.length} VS Code tests failed`);
}

module.exports = { run };
