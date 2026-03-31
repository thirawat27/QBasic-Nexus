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
const { maybeAutoConfigureQB64 } = require('./src/extension/qb64Compiler');
const {
  selectInternalOutputDir,
  selectInternalTargets,
  showInternalBuildQuickActions,
} = require('./src/extension/internalBuildSettings');
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
const { workspaceAnalyzer } = require('./src/shared/workspaceAnalysis');

// ── Language Providers ───────────────────────────────────────────────────────
const {
  invalidateCache,
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
  QBasicDocumentSemanticTokenProvider,
  QBasicSemanticTokensLegend,
  invalidateSemanticTokenCache,
  QBasicDocumentFormattingEditProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
  QBasicOnTypeFormattingEditProvider,
  QBasicColorProvider,
  activateDecorators,
  QBasicTodoProvider,
} = require('./src/providers/index');

// ── Lazy-loaded modules ──────────────────────────────────────────────────────
let _TutorialManager = null;

function getTutorialManager() {
  if (!_TutorialManager)
    _TutorialManager = require('./src/managers/TutorialManager');
  return _TutorialManager;
}

function isQBasicTarget(target) {
  const fsPath = target?.fsPath || target?.uri?.fsPath || '';
  return /\.(?:bas|bi|bm|inc)$/i.test(fsPath);
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

  state.internalBuildBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99,
  );
  state.internalBuildBarItem.command = COMMANDS.SHOW_INTERNAL_BUILD_QUICK_ACTIONS;
  context.subscriptions.push(state.internalBuildBarItem);

  state.statsBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  state.statsBarItem.command = COMMANDS.SHOW_STATS;
  context.subscriptions.push(state.statsBarItem);

  // ── Register language providers ──────────────────────────────────────────
  const selector = { language: CONFIG.LANGUAGE_ID };

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
      ' ',
    ),
    vscode.languages.registerDocumentSemanticTokensProvider(
      selector,
      new QBasicDocumentSemanticTokenProvider(),
      QBasicSemanticTokensLegend,
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
    vscode.languages.registerColorProvider(
      selector,
      new QBasicColorProvider(),
    ),

  );

  // ── Activate custom internal decorators ──────────────────────────────────
  activateDecorators(context);

  // ── Register Todo Tree View ──────────────────────────────────────────────
  const todoProvider = new QBasicTodoProvider();
  const qbasicFileWatcher = vscode.workspace.createFileSystemWatcher(
    '**/*.{bas,bi,bm,inc}',
  );
  context.subscriptions.push(
    qbasicFileWatcher,
    vscode.window.registerTreeDataProvider('qbasic-todo', todoProvider),
    vscode.commands.registerCommand('qbasic-nexus.refreshTodo', () => todoProvider.refresh()),
    qbasicFileWatcher.onDidChange((uri) => {
      workspaceAnalyzer.invalidateFile(uri);
      void workspaceAnalyzer.warmFile(uri);
      todoProvider.refresh(uri);
    }),
    qbasicFileWatcher.onDidCreate((uri) => {
      void workspaceAnalyzer.warmFile(uri);
      todoProvider.refresh(uri);
    }),
    qbasicFileWatcher.onDidDelete((uri) => {
      workspaceAnalyzer.invalidateFile(uri);
      todoProvider.remove(uri);
    }),
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
    vscode.commands.registerCommand(
      COMMANDS.SHOW_INTERNAL_BUILD_QUICK_ACTIONS,
      showInternalBuildQuickActions,
    ),
    vscode.commands.registerCommand(
      COMMANDS.SELECT_INTERNAL_TARGETS,
      selectInternalTargets,
    ),
    vscode.commands.registerCommand(
      COMMANDS.SELECT_INTERNAL_OUTPUT_DIR,
      selectInternalOutputDir,
    ),
  );

  // ── Event handlers ───────────────────────────────────────────────────────
  const throttledStatsUpdate = throttle(updateCodeStats, 500);
  const debouncedStatusUpdate = debounce(updateStatusBar, 200);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      debouncedStatusUpdate();
      if (editor) {
        void maybeAutoConfigureQB64(editor);
        if (editor.document.languageId === CONFIG.LANGUAGE_ID) {
          void workspaceAnalyzer.prepareWorkspace(editor.document);
        }
        lintDocument(editor.document);
        throttledStatsUpdate(editor.document);
      } else {
        if (state.statsBarItem) state.statsBarItem.hide();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      // Invalidate cache
      invalidateCache(e.document.uri);
      invalidateSemanticTokenCache(e.document.uri);

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
      if (doc.languageId === CONFIG.LANGUAGE_ID) {
        workspaceAnalyzer.invalidateFile(doc);
        void workspaceAnalyzer.warmFile(doc);
        todoProvider.refresh(doc.uri);
        invalidateSemanticTokenCache(doc.uri);
      }
      lintDocument(doc);
      updateCodeStats(doc);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG.SECTION)) {
        updateStatusBar();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      workspaceAnalyzer.clear();
      todoProvider.refresh();
    }),
    vscode.workspace.onDidCreateFiles((event) => {
      for (const file of event.files) {
        if (!isQBasicTarget(file)) continue;
        void workspaceAnalyzer.warmFile(file);
        todoProvider.refresh(file);
      }
    }),
    vscode.workspace.onDidDeleteFiles((event) => {
      for (const file of event.files) {
        if (!isQBasicTarget(file)) continue;
        workspaceAnalyzer.invalidateFile(file);
        todoProvider.remove(file);
        invalidateSemanticTokenCache(file);
      }
    }),
    vscode.workspace.onDidRenameFiles((event) => {
      for (const { oldUri, newUri } of event.files) {
        if (isQBasicTarget(oldUri)) {
          workspaceAnalyzer.invalidateFile(oldUri);
          todoProvider.remove(oldUri);
          invalidateSemanticTokenCache(oldUri);
        }
        if (isQBasicTarget(newUri)) {
          void workspaceAnalyzer.warmFile(newUri);
          todoProvider.refresh(newUri);
          invalidateSemanticTokenCache(newUri);
        }
      }
    }),
    vscode.window.onDidCloseTerminal((t) => {
      if (t === state.terminal) {
        state.terminal = null;
        state.terminalCwd = null;
      }
    }),
    // Memory leak fix: remove incremental linter state when doc is closed
    vscode.workspace.onDidCloseTextDocument((doc) => {
      getIncrementalLinter().removeDocument(doc.uri.toString());
      invalidateCache(doc.uri);
      invalidateSemanticTokenCache(doc.uri);
    }),
  );

  // ── Initial setup ────────────────────────────────────────────────────────
  updateStatusBar();
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    void maybeAutoConfigureQB64(vscode.window.activeTextEditor);
    if (doc.languageId === CONFIG.LANGUAGE_ID) {
      void workspaceAnalyzer.prepareWorkspace(doc);
    }
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
  workspaceAnalyzer.dispose();

  // Dispose VS Code resources
  state.statusBarItem?.dispose();
  state.internalBuildBarItem?.dispose();
  state.statsBarItem?.dispose();
  state.outputChannel?.dispose();
  state.diagnosticCollection?.dispose();
  state.terminal?.dispose();

  // Clear references
  state.statusBarItem = null;
  state.internalBuildBarItem = null;
  state.statsBarItem = null;
  state.outputChannel = null;
  state.diagnosticCollection = null;
  state.terminal = null;
  state.terminalCwd = null;
  state.extensionContext = null;
}

module.exports = { activate, deactivate };
