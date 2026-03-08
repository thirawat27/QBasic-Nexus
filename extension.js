/**
 * QBasic Nexus - The Ultimate QBasic/QB64 Environment for VS Code
 * A professional-grade development suite designed to bring QBasic and QB64
 * into the modern era. Features a powerful transpiler, real-time visualization,
 * and comprehensive language support including graphics, sound, and file I/O.
 *
 * Key Capabilities:
 * - Intelligent Code Analysis: Real-time linting, IntelliSense, and symbol navigation
 * - Dual-Engine Execution: Native QB64 compilation + High-performance Web Transpiler
 * - Advanced Visualization: Neon CRT aesthetic with GPU-accelerated graphics
 * - Virtual File System: Persistent file I/O support within the web runtime
 * - Rich Tooling: Formatting, refactoring, and extensive debugging helpers
 *
 * Entry point — wires everything together and delegates to focused sub-modules.
 */

'use strict';

const vscode = require('vscode');

// ── Sub-modules ──────────────────────────────────────────────────────────────
const { CONFIG, COMMANDS } = require('./src/extension/constants');
const { state } = require('./src/extension/state');
const {
  debounce,
  throttle,
} = require('./src/extension/utils');
const {
  updateStatusBar,
  updateCodeStats,
} = require('./src/extension/statusBar');
const { lintDocument } = require('./src/extension/linting');
const { showCodeStatsDetail } = require('./src/extension/codeStats');
const { executeCompile } = require('./src/extension/compileCommand');
const { runInCrt } = require('./src/extension/crtRunner');
const {
  removeLineNumbers,
  renumberLines,
} = require('./src/commands/lineNumbers');
const {
  showAsciiChart,
  insertChrFromAsciiChart,
} = require('./src/extension/asciiChart');
const { getWebviewManager } = require('./src/extension/lazyModules');
const { getIncrementalLinter } = require('./src/managers/IncrementalLinter');

// ── Language Providers ───────────────────────────────────────────────────────
const {
  invalidateCache,
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
  QBasicDocumentFormattingEditProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
  QBasicOnTypeFormattingEditProvider,
} = require('./src/providers/index');

// ── Lazy-loaded modules ──────────────────────────────────────────────────────
let _TutorialManager = null;

function getTutorialManager() {
  if (!_TutorialManager)
    _TutorialManager = require('./src/managers/TutorialManager');
  return _TutorialManager;
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

async function activate(context) {
  console.log('[QBasic Nexus] ⚡ Extension activated');
  const startTime = Date.now();

  state.extensionContext = context;

  // Initialize diagnostic collection
  state.diagnosticCollection =
    vscode.languages.createDiagnosticCollection('qbasic-nexus');
  context.subscriptions.push(state.diagnosticCollection);

  // Initialize status bars
  state.statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  state.statusBarItem.command = COMMANDS.COMPILE_RUN;
  context.subscriptions.push(state.statusBarItem);

  state.statsBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  state.statsBarItem.command = COMMANDS.SHOW_STATS;
  context.subscriptions.push(state.statsBarItem);

  // ── Register language providers ──────────────────────────────────────────
  const selector = { language: CONFIG.LANGUAGE_ID, scheme: 'file' };

  context.subscriptions.push(
    // Core providers
    vscode.languages.registerDocumentSymbolProvider(
      selector,
      new QBasicDocumentSymbolProvider(),
    ),
    vscode.languages.registerDefinitionProvider(
      selector,
      new QBasicDefinitionProvider(),
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      selector,
      new QBasicDocumentFormattingEditProvider(),
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new QBasicCompletionItemProvider(),
    ),
    vscode.languages.registerHoverProvider(selector, new QBasicHoverProvider()),
    vscode.languages.registerSignatureHelpProvider(
      selector,
      new QBasicSignatureHelpProvider(),
      '(',
      ',',
    ),

    // Enhanced providers
    vscode.languages.registerFoldingRangeProvider(
      selector,
      new QBasicFoldingRangeProvider(),
    ),
    vscode.languages.registerDocumentHighlightProvider(
      selector,
      new QBasicDocumentHighlightProvider(),
    ),
    vscode.languages.registerRenameProvider(
      selector,
      new QBasicRenameProvider(),
    ),
    vscode.languages.registerCodeActionsProvider(
      selector,
      new QBasicCodeActionProvider(),
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.RefactorExtract,
        ],
      },
    ),
    vscode.languages.registerReferenceProvider(
      selector,
      new QBasicReferenceProvider(),
    ),
    vscode.languages.registerOnTypeFormattingEditProvider(
      selector,
      new QBasicOnTypeFormattingEditProvider(),
      '\n',
    ),
  );

  // ── Register commands ────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.COMPILE, () =>
      executeCompile(false),
    ),
    vscode.commands.registerCommand(COMMANDS.COMPILE_RUN, () =>
      executeCompile(true),
    ),
    vscode.commands.registerCommand(COMMANDS.RUN_CRT, runInCrt),
    vscode.commands.registerCommand(COMMANDS.START_TUTORIAL, () => {
      // Lazy-wire on first use: load both modules and connect them
      const tm = getTutorialManager();
      tm.setWebviewManager(getWebviewManager());
      return tm.startTutorial(state.extensionContext);
    }),
    vscode.commands.registerCommand(COMMANDS.SHOW_STATS, showCodeStatsDetail),
    vscode.commands.registerCommand(
      COMMANDS.REMOVE_LINE_NUMBERS,
      removeLineNumbers,
    ),
    vscode.commands.registerCommand(COMMANDS.RENUMBER_LINES, renumberLines),
    vscode.commands.registerCommand(COMMANDS.SHOW_ASCII_CHART, () =>
      showAsciiChart(context.extensionUri),
    ),
    vscode.commands.registerCommand(
      COMMANDS.INSERT_CHR_FROM_ASCII,
      insertChrFromAsciiChart,
    ),
  );

  // ── Event handlers ───────────────────────────────────────────────────────
  const throttledStatsUpdate = throttle(updateCodeStats, 500);
  const debouncedStatusUpdate = debounce(updateStatusBar, 200);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      debouncedStatusUpdate();
      if (editor) {
        lintDocument(editor.document);
        throttledStatsUpdate(editor.document);
      } else {
        if (state.statsBarItem) state.statsBarItem.hide();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      // Invalidate cache
      invalidateCache(e.document.uri);

      // Lint and update stats
      lintDocument(e.document);
      throttledStatsUpdate(e.document);
    }),
    vscode.workspace.onWillSaveTextDocument((e) => {
      const autoFormat = vscode.workspace
        .getConfiguration(CONFIG.SECTION)
        .get(CONFIG.AUTO_FORMAT, true);
      if (autoFormat && e.document.languageId === CONFIG.LANGUAGE_ID) {
        try {
          const editor = vscode.window.activeTextEditor;
          const tabSize =
            editor && editor.document === e.document
              ? editor.options.tabSize
              : 4;
          const insertSpaces =
            editor && editor.document === e.document
              ? editor.options.insertSpaces
              : true;

          const formatter = new QBasicDocumentFormattingEditProvider();
          const edits = formatter.provideDocumentFormattingEdits(e.document, {
            tabSize,
            insertSpaces,
          });
          if (edits && edits.length > 0) {
            e.waitUntil(Promise.resolve(edits));
          }
        } catch (err) {
          console.error('Format on save failed:', err);
        }
      }
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      lintDocument(doc);
      updateCodeStats(doc);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG.SECTION)) {
        updateStatusBar();
      }
    }),
    vscode.window.onDidCloseTerminal((t) => {
      if (t === state.terminal) state.terminal = null;
    }),
    // Memory leak fix: remove incremental linter state when doc is closed
    vscode.workspace.onDidCloseTextDocument((doc) => {
      getIncrementalLinter().removeDocument(doc.uri.toString());
      invalidateCache(doc.uri);
    }),
  );

  // ── Initial setup ────────────────────────────────────────────────────────
  updateStatusBar();
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    lintDocument(doc);
    updateCodeStats(doc);
  }

  const activationTime = Date.now() - startTime;
  console.log(`[QBasic Nexus] ✅ Ready in ${activationTime}ms`);
}

// ============================================================================
// EXTENSION DEACTIVATION
// ============================================================================

function deactivate() {
  console.log('[QBasic Nexus] Extension deactivated');

  // Dispose the incremental linter (cancels all pending timers)
  getIncrementalLinter().dispose();

  // Dispose VS Code resources
  state.statusBarItem?.dispose();
  state.statsBarItem?.dispose();
  state.outputChannel?.dispose();
  state.diagnosticCollection?.dispose();
  state.terminal?.dispose();

  // Clear references
  state.statusBarItem = null;
  state.statsBarItem = null;
  state.outputChannel = null;
  state.diagnosticCollection = null;
  state.terminal = null;
  state.extensionContext = null;
}

module.exports = { activate, deactivate };
