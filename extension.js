/**
 * QBasic Nexus - QBasic, QB64 and QBNex development for VS Code
 *
 * Builds, checks, runs and debugs programs with the real compilers:
 * QBNex 2.x (qb, qb-lsp, qb-dap, qb-fmt, qb-web) and QB64 / QB64-PE.
 * The editor features (completion, hover, navigation, formatting, TODOs,
 * tutorials, tools) are provided here and work with either compiler.
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
  invalidateConfigCache,
} = require('./src/extension/utils');
const {
  refreshToolchainStatus,
  updateStatusBar,
  updateCodeStats,
} = require('./src/extension/statusBar');
const { showCodeStatsDetail } = require('./src/extension/codeStats');
const { executeCheck, executeCompile } = require('./src/extension/compileCommand');
const { migrateLegacySettings } = require('./src/extension/migration');
const {
  showSystemQuickActions,
  showToolchainInfo,
  selectAutoFormat,
  selectCompilerArgs,
  selectCompilerMode,
  selectCompilerPath,
  selectDiagnosticFlags,
  selectEnableLinting,
  selectFormatter,
  selectLineNumberSettings,
  selectOutputDirectory,
  selectQBNexPath,
} = require('./src/extension/systemSettings');
const {
  removeLineNumbers,
  renumberLines,
} = require('./src/commands/lineNumbers');
const {
  showAsciiChart,
  insertChrFromAsciiChart,
} = require('./src/extension/asciiChart');
const { workspaceAnalyzer } = require('./src/shared/workspaceAnalysis');
const { clearToolchainCache } = require('./src/toolchain/resolve');
const {
  checkDocument,
  clearCompilerDiagnostics,
  disposeChecks,
} = require('./src/toolchain/problems');
const {
  restartLanguageServer,
  stopLanguageServer,
} = require('./src/toolchain/languageServer');
const { registerDebugAdapter } = require('./src/toolchain/debugAdapter');
const { QBasicFormattingProvider, formatDocumentEdits } = require('./src/toolchain/formatter');
const {
  disposeCrt,
  getLastCrtResult,
  rerunCrt,
  runInCrt,
  setCrtInput,
  stopCrt,
} = require('./src/runner/crtPanel');

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

/** Settings whose change re-detects the compiler. */
const TOOLCHAIN_KEYS = [
  CONFIG.COMPILER_MODE,
  CONFIG.COMPILER_PATH,
  CONFIG.QBNEX_PATH,
];

/** Settings whose change restarts qb-lsp. */
const LANGUAGE_SERVER_KEYS = [
  'languageServer',
  CONFIG.QBNEX_PATH,
];

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

async function activate(context) {
  const startTime = Date.now();
  state.extensionContext = context;

  await migrateLegacySettings();
  invalidateConfigCache();

  // Diagnostics reported by the compilers (build, check on save)
  state.diagnosticCollection =
    vscode.languages.createDiagnosticCollection('qbasic-nexus');
  context.subscriptions.push(state.diagnosticCollection);

  // Status bar: Run, active toolchain, code stats
  state.statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  state.statusBarItem.command = COMMANDS.COMPILE_RUN;
  state.toolchainBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99,
  );
  state.toolchainBarItem.command = COMMANDS.SHOW_SYSTEM_QUICK_ACTIONS;
  state.statsBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  state.statsBarItem.command = COMMANDS.SHOW_STATS;
  context.subscriptions.push(state.statusBarItem, state.toolchainBarItem, state.statsBarItem);

  // ── Register language providers ──────────────────────────────────────────
  const selector = { language: CONFIG.LANGUAGE_ID };

  context.subscriptions.push(
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
      new QBasicFormattingProvider(),
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

  activateDecorators(context);
  registerDebugAdapter(context);
  let officialQBNexInstalled = !!vscode.extensions.getExtension(CONFIG.QBNEX_EXTENSION_ID);

  // ── Register Todo Tree View ──────────────────────────────────────────────
  const todoProvider = new QBasicTodoProvider();
  const qbasicFileWatcher = vscode.workspace.createFileSystemWatcher(
    '**/*.{bas,bi,bm,inc}',
  );
  context.subscriptions.push(
    qbasicFileWatcher,
    vscode.window.registerTreeDataProvider('qbasic-todo', todoProvider),
    vscode.commands.registerCommand(COMMANDS.REFRESH_TODO, () => todoProvider.refresh()),
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
      clearCompilerDiagnostics(uri.fsPath);
    }),
  );

  // ── Register commands ────────────────────────────────────────────────────
  const commands = {
    [COMMANDS.COMPILE]: () => executeCompile(false),
    [COMMANDS.COMPILE_RUN]: () => {
      // A tutorial lesson is an untitled editor: run it where it is checked.
      const doc = vscode.window.activeTextEditor?.document;
      if (doc?.isUntitled && getTutorialManager().getCurrentLesson()) {
        return runInCrt(doc);
      }
      return executeCompile(true);
    },
    [COMMANDS.CHECK]: executeCheck,
    [COMMANDS.RUN_CRT]: () => runInCrt(),
    [COMMANDS.CRT_RERUN]: rerunCrt,
    [COMMANDS.CRT_STOP]: stopCrt,
    [COMMANDS.CRT_INPUT]: setCrtInput,
    [COMMANDS.START_TUTORIAL]: () => getTutorialManager().startTutorial(state.extensionContext),
    [COMMANDS.SHOW_STATS]: showCodeStatsDetail,
    [COMMANDS.REMOVE_LINE_NUMBERS]: removeLineNumbers,
    [COMMANDS.RENUMBER_LINES]: renumberLines,
    [COMMANDS.SHOW_ASCII_CHART]: () => showAsciiChart(context.extensionUri),
    [COMMANDS.INSERT_CHR_FROM_ASCII]: insertChrFromAsciiChart,
    [COMMANDS.SHOW_SYSTEM_QUICK_ACTIONS]: showSystemQuickActions,
    [COMMANDS.SHOW_TOOLCHAIN_INFO]: showToolchainInfo,
    [COMMANDS.SELECT_COMPILER_MODE]: selectCompilerMode,
    [COMMANDS.SELECT_COMPILER_PATH]: selectCompilerPath,
    [COMMANDS.SELECT_QBNEX_PATH]: selectQBNexPath,
    [COMMANDS.SELECT_COMPILER_ARGS]: selectCompilerArgs,
    [COMMANDS.SELECT_OUTPUT_DIRECTORY]: selectOutputDirectory,
    [COMMANDS.SELECT_DIAGNOSTIC_FLAGS]: selectDiagnosticFlags,
    [COMMANDS.SELECT_FORMATTER]: selectFormatter,
    [COMMANDS.SELECT_ENABLE_LINTING]: selectEnableLinting,
    [COMMANDS.SELECT_AUTO_FORMAT]: selectAutoFormat,
    [COMMANDS.SELECT_LINE_NUMBER_SETTINGS]: selectLineNumberSettings,
    [COMMANDS.RESTART_LANGUAGE_SERVER]: () => restartLanguageServer(),
  };
  for (const [id, handler] of Object.entries(commands)) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }
  // Not contributed (hidden from the palette): lets tests and other tools read the last Retro CRT run.
  context.subscriptions.push(
    vscode.commands.registerCommand('qbasic-nexus._lastCrtResult', getLastCrtResult),
  );

  // ── Event handlers ───────────────────────────────────────────────────────
  const throttledStatsUpdate = throttle(updateCodeStats, 500);
  const debouncedStatusUpdate = debounce(updateStatusBar, 200);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      debouncedStatusUpdate();
      if (editor) {
        if (editor.document.languageId === CONFIG.LANGUAGE_ID) {
          void workspaceAnalyzer.prepareWorkspace(editor.document);
        }
        throttledStatsUpdate(editor.document);
      } else if (state.statsBarItem) {
        state.statsBarItem.hide();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      invalidateCache(e.document.uri);
      invalidateSemanticTokenCache(e.document.uri);
      throttledStatsUpdate(e.document);
      // qb-lsp reports the edited text; the last build's results are stale.
      if (
        state.languageServerRunning &&
        e.contentChanges.length > 0 &&
        e.document.languageId === CONFIG.LANGUAGE_ID
      ) {
        state.diagnosticCollection?.delete(e.document.uri);
      }
    }),
    vscode.workspace.onWillSaveTextDocument((e) => {
      if (e.document.languageId !== CONFIG.LANGUAGE_ID) return;
      // An explicit editor.formatOnSave already formats through our provider.
      const editorFormatOnSave = vscode.workspace
        .getConfiguration('editor', e.document)
        .get('formatOnSave', false);
      const autoFormat = vscode.workspace
        .getConfiguration(CONFIG.SECTION, e.document)
        .get(CONFIG.AUTO_FORMAT, true);
      if (!autoFormat || editorFormatOnSave) return;

      const editor = vscode.window.activeTextEditor;
      const sameEditor = editor && editor.document === e.document;
      e.waitUntil(
        Promise.resolve(
          formatDocumentEdits(e.document, {
            tabSize: sameEditor ? editor.options.tabSize : 4,
            insertSpaces: sameEditor ? editor.options.insertSpaces : true,
          }),
        ).catch((err) => {
          console.error('[QBasic Nexus] format on save failed:', err);
          return [];
        }),
      );
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== CONFIG.LANGUAGE_ID) return;
      workspaceAnalyzer.invalidateFile(doc);
      void workspaceAnalyzer.warmFile(doc);
      todoProvider.refresh(doc.uri);
      invalidateSemanticTokenCache(doc.uri);
      updateCodeStats(doc);
      void checkDocument(doc);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      // Drop the cached settings snapshot first so every downstream handler
      // below reads post-change values.
      invalidateConfigCache();

      if (TOOLCHAIN_KEYS.some((key) => e.affectsConfiguration(`${CONFIG.SECTION}.${key}`))) {
        clearToolchainCache();
        state.activeToolchain = undefined;
        void refreshToolchainStatus();
      }
      if (LANGUAGE_SERVER_KEYS.some((key) => e.affectsConfiguration(`${CONFIG.SECTION}.${key}`))) {
        void restartLanguageServer();
      }
      if (e.affectsConfiguration(CONFIG.SECTION)) {
        updateStatusBar();
      }
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      void restartLanguageServer();
    }),
    vscode.extensions.onDidChange(() => {
      // The official QBNex extension runs its own qb-lsp; follow its install state.
      const installed = !!vscode.extensions.getExtension(CONFIG.QBNEX_EXTENSION_ID);
      if (installed !== officialQBNexInstalled) {
        officialQBNexInstalled = installed;
        void restartLanguageServer();
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
        clearCompilerDiagnostics(file.fsPath);
      }
    }),
    vscode.workspace.onDidRenameFiles((event) => {
      for (const { oldUri, newUri } of event.files) {
        if (isQBasicTarget(oldUri)) {
          workspaceAnalyzer.invalidateFile(oldUri);
          todoProvider.remove(oldUri);
          invalidateSemanticTokenCache(oldUri);
          clearCompilerDiagnostics(oldUri.fsPath);
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
    vscode.workspace.onDidCloseTextDocument((doc) => {
      invalidateCache(doc.uri);
      invalidateSemanticTokenCache(doc.uri);
    }),
  );

  // ── Initial setup ────────────────────────────────────────────────────────
  updateStatusBar();
  void refreshToolchainStatus();
  void restartLanguageServer();
  if (vscode.window.activeTextEditor) {
    const doc = vscode.window.activeTextEditor.document;
    if (doc.languageId === CONFIG.LANGUAGE_ID) {
      void workspaceAnalyzer.prepareWorkspace(doc);
    }
    updateCodeStats(doc);
  }

  console.log(`[QBasic Nexus] Ready in ${Date.now() - startTime}ms`);
}

// ============================================================================
// EXTENSION DEACTIVATION
// ============================================================================

async function deactivate() {
  invalidateConfigCache();
  disposeChecks();
  disposeCrt();
  workspaceAnalyzer.dispose();

  state.statusBarItem?.dispose();
  state.toolchainBarItem?.dispose();
  state.statsBarItem?.dispose();
  state.outputChannel?.dispose();
  state.diagnosticCollection?.dispose();
  state.terminal?.dispose();

  state.statusBarItem = null;
  state.toolchainBarItem = null;
  state.statsBarItem = null;
  state.outputChannel = null;
  state.diagnosticCollection = null;
  state.terminal = null;
  state.terminalCwd = null;
  state.extensionContext = null;

  await stopLanguageServer();
}

module.exports = { activate, deactivate };
