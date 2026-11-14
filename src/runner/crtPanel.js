/**
 * QBasic Nexus - Retro CRT
 *
 * Compiles the program to QIR with QBNex (`qb --emit-ir`) and runs it on
 * qb-web (the QBNex VM built for WebAssembly, vendor/qb-web) inside a webview:
 * text and graphics screens, sound, INPUT and the keyboard. Files, SHELL and
 * networking are not available there; build natively for those.
 */

'use strict';

const vscode = require('vscode');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CONFIG } = require('../extension/constants');
const { getConfig, getOutputChannel } = require('../extension/utils');
const { buildQirArgs, runTool, KIND_QBNEX } = require('../toolchain/build');
const { compilerFlagOptions, publishCompilerDiagnostics } = require('../toolchain/problems');
const { resolveQBNex } = require('../toolchain/resolve');
const { toClassicScript } = require('./qbWebLoader');

let panel = null;
let pageReady = false;
let pendingRun = null;
let vendorCache = null;
/** Result of the last finished run (status, stdout, screenText, ...). */
let lastResult = null;
/** Text INPUT reads first (one answer per line), set from the panel's INPUT button. */
let preparedInput = '';

function nonce() {
  return crypto.randomBytes(16).toString('base64');
}

function vendorFiles(extensionPath) {
  if (vendorCache) return vendorCache;
  const dir = path.join(extensionPath, 'vendor', 'qb-web');
  const loader = toClassicScript(fs.readFileSync(path.join(dir, 'qbnex.js'), 'utf8'));
  vendorCache = {
    loader,
    wasm: fs.readFileSync(path.join(dir, 'qb_web.wasm')),
  };
  return vendorCache;
}

function html(webview, extensionUri) {
  const n = nonce();
  const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'crt-runner.js'));
  const theme = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'crt.css'));
  const style = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'crt-runner.css'));
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource}`,
    `script-src 'nonce-${n}' 'wasm-unsafe-eval'`,
    'worker-src blob:',
    'img-src data: blob:',
    'media-src blob:',
  ].join('; ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${theme}">
<link rel="stylesheet" href="${style}">
<title>QBasic Nexus CRT</title>
</head>
<body>
<div id="monitor">
  <div id="screen" aria-label="Console output"></div>
  <canvas id="gfx-layer" width="640" height="400" tabindex="0" aria-label="Program screen; click to type"></canvas>
  <div id="quest-hud">
    <div id="quest-title">CURRENT OBJECTIVE</div>
    <div id="quest-desc">Loading...</div>
  </div>
  <div id="scanlines"></div>
  <div id="flicker"></div>
  <div id="overlay"></div>
</div>
<script nonce="${n}" src="${script}"></script>
</body>
</html>`;
}

function onMessage(message) {
  const channel = getOutputChannel();
  switch (message?.type) {
    case 'hello': {
      const { state } = require('../extension/state');
      const vendor = vendorFiles(state.extensionContext.extensionPath);
      void panel?.webview.postMessage({
        type: 'init',
        loader: vendor.loader,
        wasm: new Uint8Array(vendor.wasm),
      });
      break;
    }
    case 'ready':
      pageReady = true;
      if (pendingRun) {
        void panel?.webview.postMessage(pendingRun);
        pendingRun = null;
      }
      break;
    case 'done': {
      const r = message.result || {};
      lastResult = r;
      if (r.status === 1) {
        const text = `Runtime error ${r.error} at line ${r.line}: ${r.message}`;
        channel.appendLine(`Retro CRT: ${text}`);
        void vscode.window.showErrorMessage(`QBasic CRT: ${text}`);
      } else if (r.status >= 2) {
        channel.appendLine(`Retro CRT: the program stopped: ${r.message}`);
        void vscode.window.showWarningMessage(`QBasic CRT: the program stopped: ${r.message}`);
      } else {
        vscode.window.setStatusBarMessage(`$(device-desktop) Program finished in ${((r.ms || 0) / 1000).toFixed(2)}s`, 4000);
      }
      const TutorialManager = require('../managers/TutorialManager');
      if (TutorialManager.getCurrentLesson()) {
        const lesson = TutorialManager.getCurrentLesson();
        const passed = TutorialManager.checkOutput(`${r.stdout || ''}\n${r.screenText || ''}`);
        void panel?.webview.postMessage({
          type: 'lesson',
          passed,
          title: lesson.title,
          objective: lesson.objective,
        });
        if (passed) {
          void vscode.window.showInformationMessage(`Lesson complete: ${lesson.title}`, 'Next Lesson').then((choice) => {
            if (choice === 'Next Lesson') {
              void vscode.commands.executeCommand('qbasic-nexus.startTutorial');
            }
          });
        }
      }
      break;
    }
    case 'fatal':
      channel.appendLine(`Retro CRT: ${message.message}`);
      void vscode.window.showErrorMessage(`Retro CRT could not start qb-web: ${message.message}`);
      break;
    default:
      break;
  }
}

function ensurePanel(context) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Two, true);
    return panel;
  }
  pageReady = false;
  panel = vscode.window.createWebviewPanel(
    'qbasicNexusCrt',
    'QBasic CRT 📺',
    { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')],
    },
  );
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'qb64.svg');
  panel.webview.html = html(panel.webview, context.extensionUri);
  panel.webview.onDidReceiveMessage(onMessage);
  panel.onDidDispose(() => {
    panel = null;
    pageReady = false;
    pendingRun = null;
  });
  return panel;
}

/** The file to compile: the saved document, or a temporary copy of an untitled one. */
async function sourceFileFor(document) {
  if (!document.isUntitled) {
    if (document.isDirty && !(await document.save())) return null;
    return { file: document.uri.fsPath, temporary: false };
  }
  const dir = path.join(os.tmpdir(), 'qbasic-nexus', 'crt');
  await fs.promises.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'program.bas');
  await fs.promises.writeFile(file, document.getText(), 'utf8');
  return { file, temporary: true };
}

/**
 * Runs the active QBasic document (or the given one) in the Retro CRT.
 * @param {vscode.TextDocument} [target]
 */
async function runInCrt(target) {
  const { state } = require('../extension/state');
  const context = state.extensionContext;
  const document = target && !target.isClosed
    ? target
    : vscode.window.activeTextEditor?.document;
  if (!context || !document || document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage('Open a QBasic file first.');
    return;
  }

  const qbnex = await resolveQBNex();
  if (!qbnex) {
    const choice = await vscode.window.showErrorMessage(
      'Retro CRT runs programs with QBNex 2.0. Install QBNex or set qbasic-nexus.qbnexPath.',
      'Open Settings',
    );
    if (choice === 'Open Settings') {
      void vscode.commands.executeCommand('workbench.action.openSettings', `${CONFIG.SECTION}.${CONFIG.QBNEX_PATH}`);
    }
    return;
  }

  const source = await sourceFileFor(document);
  if (!source) return;
  const qirPath = path.join(os.tmpdir(), 'qbasic-nexus', `crt-${process.pid}.qir`);
  await fs.promises.mkdir(path.dirname(qirPath), { recursive: true });

  try {
    const result = await runTool(
      qbnex.path,
      buildQirArgs(source.file, qirPath, compilerFlagOptions()),
      {
        cwd: path.dirname(source.file),
        timeoutMs: getConfig(CONFIG.EXTERNAL_BUILD_TIMEOUT_MS),
      },
    );
    if (!source.temporary) {
      publishCompilerDiagnostics(source.file, result.output, KIND_QBNEX);
    }
    if (result.code !== 0) {
      const channel = getOutputChannel();
      channel.appendLine(result.output.trim());
      channel.show(true);
      vscode.window.showErrorMessage('The program did not compile. See the Problems view or the QBasic Nexus output.');
      return;
    }

    const qir = await fs.promises.readFile(qirPath, 'utf8');
    const view = ensurePanel(context);
    view._qbSource = document;
    const fileName = path.basename(document.isUntitled ? 'program.bas' : document.uri.fsPath);
    view.title = `QBasic CRT 📺 ${fileName}`;
    const lesson = require('../managers/TutorialManager').getCurrentLesson();
    const run = {
      type: 'run',
      qir,
      stdin: preparedInput,
      title: fileName,
      lesson: lesson ? { title: lesson.title, objective: lesson.objective } : null,
    };
    if (pageReady) void view.webview.postMessage(run);
    else pendingRun = run;
  } catch (error) {
    vscode.window.showErrorMessage(`Retro CRT: ${error.message}`);
  } finally {
    fs.promises.unlink(qirPath).catch(() => {});
  }
}

function disposeCrt() {
  panel?.dispose();
  panel = null;
}

function getLastCrtResult() {
  return lastResult;
}

/** Panel title button: compile and run the same program again. */
function rerunCrt() {
  return runInCrt(panel?._qbSource);
}

/** Panel title button: stop the running program. */
function stopCrt() {
  void panel?.webview.postMessage({ type: 'stop' });
}

/** Panel title button: answers that INPUT / LINE INPUT read, in order. */
async function setCrtInput() {
  const value = await vscode.window.showInputBox({
    title: 'QBasic CRT: INPUT answers',
    prompt: 'Answers for INPUT and LINE INPUT, in order, separated by |  (e.g.  Alice | 42)',
    value: preparedInput.split('\n').filter(Boolean).join(' | '),
    ignoreFocusOut: true,
  });
  if (value === undefined) return;
  preparedInput = value
    .split('|')
    .map((answer) => answer.trim())
    .filter((answer, index, all) => answer || index < all.length - 1)
    .map((answer) => `${answer}\n`)
    .join('');
  vscode.window.setStatusBarMessage(
    preparedInput ? '$(keyboard) INPUT answers set for the next run' : '$(keyboard) INPUT answers cleared',
    3000,
  );
}

module.exports = { disposeCrt, getLastCrtResult, rerunCrt, runInCrt, setCrtInput, stopCrt };
