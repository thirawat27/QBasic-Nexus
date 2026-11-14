/**
 * QBasic Nexus - qb-lsp client
 *
 * Starts the QBNex language server for diagnostics as you type. Completion,
 * hover, symbols, navigation and formatting stay with the QBasic Nexus
 * providers (they cover QB64 too), so those server features are muted here to
 * avoid duplicate results. When the official QBNex extension is installed it
 * already runs qb-lsp, and this client stays off.
 */

'use strict';

const vscode = require('vscode');
const { CONFIG } = require('../extension/constants');
const { state } = require('../extension/state');
const { getConfig } = require('../extension/utils');
const { locateCompanionTool } = require('./detect');
const { resolveQBNex } = require('./resolve');

let client = null;
let logChannel = null;
let queue = Promise.resolve();
let warnedMissing = false;

function mutedFeatures() {
  const none = () => undefined;
  const { formatDocumentEdits } = require('./formatter');
  return {
    provideCompletionItem: none,
    provideHover: none,
    provideDocumentSymbols: none,
    provideDefinition: none,
    provideReferences: none,
    // Same edits as the QBasic Nexus formatter, whichever provider VS Code picks.
    provideDocumentFormattingEdits: (document, options) => formatDocumentEdits(document, options),
  };
}

function officialExtensionActive() {
  return !!vscode.extensions.getExtension(CONFIG.QBNEX_EXTENSION_ID);
}

async function stop() {
  const current = client;
  client = null;
  state.languageServerRunning = false;
  if (current) await current.stop().catch(() => undefined);
}

async function start() {
  if (!getConfig(CONFIG.LANGUAGE_SERVER_ENABLED)) return;
  if (officialExtensionActive()) return;
  if (!vscode.workspace.isTrusted) return;

  const configured = String(getConfig(CONFIG.LANGUAGE_SERVER_PATH) || '').trim();
  const qbnex = await resolveQBNex();
  const command = await locateCompanionTool('qb-lsp', {
    configured,
    compilerPath: qbnex?.path,
  });
  logChannel = logChannel || vscode.window.createOutputChannel('QBasic Nexus Language Server', { log: true });

  if (!command) {
    // qb-lsp is optional: without it, saved files are still checked by the compiler.
    logChannel.appendLine('qb-lsp was not found next to the QBNex compiler or on PATH; diagnostics come from the compiler when you save.');
    if (configured) warnStartFailure(`qb-lsp was not found at ${configured}`);
    return;
  }

  const { LanguageClient } = require('vscode-languageclient/node');
  const next = new LanguageClient(
    'qbasic-nexus',
    'QBasic Nexus Language Server (qb-lsp)',
    { run: { command }, debug: { command } },
    {
      documentSelector: [
        { scheme: 'file', language: CONFIG.LANGUAGE_ID },
        { scheme: 'untitled', language: CONFIG.LANGUAGE_ID },
      ],
      diagnosticCollectionName: 'qbasic-nexus-lsp',
      outputChannel: logChannel,
      middleware: mutedFeatures(),
      initializationFailedHandler: () => false,
      errorHandler: {
        error: () => ({ action: 1 /* ErrorAction.Continue */ }),
        closed: () => {
          // The server exited: fall back to checking on save.
          state.languageServerRunning = false;
          require('../extension/statusBar').updateStatusBar();
          return { action: 1 /* CloseAction.DoNotRestart */ };
        },
      },
    },
  );

  try {
    await next.start();
    client = next;
    state.languageServerRunning = true;
    logChannel.appendLine(`qb-lsp started: ${command}`);
  } catch (error) {
    state.languageServerRunning = false;
    await Promise.resolve(next.dispose?.()).catch(() => undefined);
    logChannel.appendLine(`qb-lsp could not start (${command}): ${error?.message || error}`);
    warnStartFailure(`qb-lsp could not start: ${error?.message || error}`);
  } finally {
    require('../extension/statusBar').updateStatusBar();
  }
}

function warnStartFailure(reason) {
  if (warnedMissing) return;
  warnedMissing = true;
  void vscode.window.showWarningMessage(
    `QBasic Nexus: ${reason}. Errors still appear when you save; set qbasic-nexus.languageServer.path for live diagnostics.`,
    'Open Settings',
  ).then((choice) => {
    if (choice === 'Open Settings') {
      void vscode.commands.executeCommand(
        'workbench.action.openSettings',
        `${CONFIG.SECTION}.${CONFIG.LANGUAGE_SERVER_PATH}`,
      );
    }
  });
}

/** Starts, or restarts, the language server; one restart at a time. */
function restartLanguageServer() {
  queue = queue
    .catch(() => undefined)
    .then(async () => {
      await stop();
      await start();
    });
  return queue;
}

function stopLanguageServer() {
  queue = queue.catch(() => undefined).then(stop);
  return queue;
}

module.exports = { restartLanguageServer, stopLanguageServer };
