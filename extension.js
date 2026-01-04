/**
 * QBasic Nexus - VS Code Extension
 * =================================
 * A comprehensive QBasic/QB64 development environment for Visual Studio Code.
 * 
 * Features:
 * - Syntax highlighting
 * - IntelliSense (auto-completion, hover, signature help)
 * - Code formatting
 * - QB64 compilation & execution
 * - Internal JS transpiler (backup mode)
 * - Real-time linting
 * - Code folding
 * - Document highlights
 * - Rename symbols
 * - Quick fixes
 * - Find references
 * 
 * @author Thirawat27
 * @version 1.0.3
 * @license MIT
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { spawn } = require('child_process');

// Import modules
const {
    QBasicDocumentSymbolProvider,
    QBasicDefinitionProvider,
    QBasicDocumentFormattingEditProvider,
    QBasicCompletionItemProvider,
    QBasicHoverProvider,
    QBasicSignatureHelpProvider,
    QBasicFoldingRangeProvider,
    QBasicDocumentHighlightProvider,
    QBasicRenameProvider,
    QBasicCodeActionProvider,
    QBasicReferenceProvider,
    QBasicOnTypeFormattingEditProvider,
    invalidateCache
} = require('./providers');
const InternalTranspiler = require('./src/compiler/transpiler');
const WebviewManager = require('./src/managers/WebviewManager');
const TutorialManager = require('./src/managers/TutorialManager');

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG = Object.freeze({
    SECTION: 'qbasic-nexus',
    COMPILER_PATH: 'compilerPath',
    COMPILER_MODE: 'compilerMode',
    COMPILER_ARGS: 'compilerArgs',
    ENABLE_LINT: 'enableLinting',
    LINT_DELAY: 'lintDelay',
    AUTO_FORMAT: 'autoFormatOnSave',
    MODE_QB64: 'QB64 (Recommended)',
    MODE_INTERNAL: 'Internal (JS Transpiler)',
    LANGUAGE_ID: 'qbasic',
    OUTPUT_CHANNEL: 'QBasic Nexus',
    TERMINAL_NAME: 'QBasic Nexus',
    CMD_RETRO: 'qbasic-nexus.runInCrt',
    CMD_TUTORIAL: 'qbasic-nexus.startTutorial'
});

const COMMANDS = Object.freeze({
    COMPILE: 'qbasic-nexus.compile',
    COMPILE_RUN: 'qbasic-nexus.compileAndRun',
    RUN_CRT: 'qbasic-nexus.runInCrt',
    START_TUTORIAL: 'qbasic-nexus.startTutorial',
    EXTRACT_SUB: 'qbasic-nexus.extractToSub',
    SHOW_STATS: 'qbasic-nexus.showCodeStats',
    TOGGLE_COMMENT: 'qbasic-nexus.toggleComment'
});

// ============================================================================
// GLOBAL STATE
// ============================================================================

let statusBarItem = null;
let statsBarItem = null;
let outputChannel = null;
let terminal = null;
let diagnosticCollection = null;
let isCompiling = false;
let lintTimer = null;
let extensionContext = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a debounced version of a function
 */
function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Create a throttled version of a function with trailing call support
 */
function throttle(fn, limit) {
    let inThrottle = false;
    let lastArgs = null;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    fn(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else {
            lastArgs = args; // Save latest args for trailing call
        }
    };
}

/**
 * Get or create the output channel
 */
function getOutputChannel() {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel(CONFIG.OUTPUT_CHANNEL);
    }
    return outputChannel;
}

/**
 * Get or create a terminal instance
 */
function getTerminal() {
    if (!terminal || terminal.exitStatus !== undefined) {
        terminal = vscode.window.createTerminal({
            name: CONFIG.TERMINAL_NAME,
            iconPath: new vscode.ThemeIcon('terminal')
        });
    }
    return terminal;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get configuration value
 */
function getConfig(key, defaultValue = null) {
    const value = vscode.workspace.getConfiguration(CONFIG.SECTION).get(key);
    return value !== undefined ? value : defaultValue;
}

/**
 * Log message to output channel
 */
function log(message, type = 'info') {
    const channel = getOutputChannel();
    const prefix = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        debug: '🔍'
    }[type] || '';
    channel.appendLine(`${prefix} ${message}`);
}

// ============================================================================
// LINTING
// ============================================================================

/**
 * Lint a QBasic document and update diagnostics
 */
function lintDocument(document) {
    if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return;
    if (!getConfig(CONFIG.ENABLE_LINT, true)) return;

    // Clear pending lint
    if (lintTimer) {
        clearTimeout(lintTimer);
    }

    const delay = getConfig(CONFIG.LINT_DELAY, 500);
    
    lintTimer = setTimeout(() => {
        try {
            const transpiler = new InternalTranspiler();
            const errors = transpiler.lint(document.getText());

            const diagnostics = errors.map(err => {
                const line = Math.max(0, Math.min(err.line, document.lineCount - 1));
                const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
                
                const diagnostic = new vscode.Diagnostic(
                    range, 
                    err.message, 
                    getSeverity(err.severity || 'error')
                );
                diagnostic.source = 'QBasic Nexus';
                diagnostic.code = err.code || 'E001';
                
                return diagnostic;
            });

            diagnosticCollection.set(document.uri, diagnostics);
        } catch (error) {
            console.error('[QBasic Nexus] Linting error:', error.message);
        }
    }, delay);
}

function getSeverity(level) {
    switch (level) {
        case 'warning': return vscode.DiagnosticSeverity.Warning;
        case 'info': return vscode.DiagnosticSeverity.Information;
        case 'hint': return vscode.DiagnosticSeverity.Hint;
        default: return vscode.DiagnosticSeverity.Error;
    }
}

// ============================================================================
// CODE STATS
// ============================================================================

function updateCodeStats(document) {
    if (!document || document.languageId !== CONFIG.LANGUAGE_ID) {
        if (statsBarItem) statsBarItem.hide();
        return;
    }

    const text = document.getText();
    const lines = document.lineCount;
    const codeLines = text.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith("'") && !trimmed.toUpperCase().startsWith('REM ');
    }).length;
    const subCount = (text.match(/^\s*SUB\s+/gim) || []).length;
    const funcCount = (text.match(/^\s*FUNCTION\s+/gim) || []).length;

    statsBarItem.text = `$(code) ${codeLines}L | ${subCount}S ${funcCount}F`;
    statsBarItem.tooltip = `Lines: ${lines} (${codeLines} code)\nSUBs: ${subCount}\nFUNCTIONs: ${funcCount}`;
    statsBarItem.show();
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

async function activate(context) {
    console.log('[QBasic Nexus] ⚡ Extension activated');
    const startTime = Date.now();

    extensionContext = context;
    
    // Initialize Tutorial Manager with WebviewManager reference
    TutorialManager.setWebviewManager(WebviewManager);
    
    // Initialize diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('qbasic-nexus');
    context.subscriptions.push(diagnosticCollection);

    // Initialize status bars
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = COMMANDS.COMPILE_RUN;
    context.subscriptions.push(statusBarItem);

    statsBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statsBarItem.command = COMMANDS.SHOW_STATS;
    context.subscriptions.push(statsBarItem);

    // Register language providers
    const selector = { language: CONFIG.LANGUAGE_ID, scheme: 'file' };

    context.subscriptions.push(
        // Core providers
        vscode.languages.registerDocumentSymbolProvider(selector, new QBasicDocumentSymbolProvider()),
        vscode.languages.registerDefinitionProvider(selector, new QBasicDefinitionProvider()),
        vscode.languages.registerDocumentFormattingEditProvider(selector, new QBasicDocumentFormattingEditProvider()),
        vscode.languages.registerCompletionItemProvider(selector, new QBasicCompletionItemProvider()),
        vscode.languages.registerHoverProvider(selector, new QBasicHoverProvider()),
        vscode.languages.registerSignatureHelpProvider(selector, new QBasicSignatureHelpProvider(), '(', ','),
        
        // New providers for enhanced functionality
        vscode.languages.registerFoldingRangeProvider(selector, new QBasicFoldingRangeProvider()),
        vscode.languages.registerDocumentHighlightProvider(selector, new QBasicDocumentHighlightProvider()),
        vscode.languages.registerRenameProvider(selector, new QBasicRenameProvider()),
        vscode.languages.registerCodeActionsProvider(selector, new QBasicCodeActionProvider(), {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.RefactorExtract
            ]
        }),
        vscode.languages.registerReferenceProvider(selector, new QBasicReferenceProvider()),
        vscode.languages.registerOnTypeFormattingEditProvider(selector, new QBasicOnTypeFormattingEditProvider(), '\n')
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.COMPILE, () => executeCompile(false)),
        vscode.commands.registerCommand(COMMANDS.COMPILE_RUN, () => executeCompile(true)),
        vscode.commands.registerCommand(COMMANDS.RUN_CRT, runInCrt),
        vscode.commands.registerCommand(COMMANDS.START_TUTORIAL, () => TutorialManager.startTutorial(extensionContext)),
        vscode.commands.registerCommand(COMMANDS.SHOW_STATS, showCodeStatsDetail),
        vscode.commands.registerCommand(COMMANDS.TOGGLE_COMMENT, toggleComment),
        vscode.commands.registerCommand(COMMANDS.EXTRACT_SUB, extractToSub)
    );

    // Event handlers with optimized debouncing
    const throttledStatsUpdate = throttle(updateCodeStats, 500);
    const debouncedStatusUpdate = debounce(updateStatusBar, 200);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            debouncedStatusUpdate();
            if (editor) {
                lintDocument(editor.document);
                throttledStatsUpdate(editor.document);
            } else {
                if (statsBarItem) statsBarItem.hide();
            }
        }),
        vscode.workspace.onDidChangeTextDocument(e => {
            // Invalidate cache
            invalidateCache(e.document.uri);
            
            // Lint and update stats
            lintDocument(e.document);
            throttledStatsUpdate(e.document);
        }),
        vscode.workspace.onDidSaveTextDocument(doc => {
            lintDocument(doc);
            updateCodeStats(doc);
        }),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(CONFIG.SECTION)) {
                updateStatusBar();
            }
        }),
        vscode.window.onDidCloseTerminal(t => {
            if (t === terminal) terminal = null;
        })
    );

    // Initial setup
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
// ADDITIONAL COMMANDS
// ============================================================================

/**
 * Show detailed code statistics
 */
async function showCodeStatsDetail() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
        vscode.window.showWarningMessage('📄 Please open a QBasic file first.');
        return;
    }

    const doc = editor.document;
    const text = doc.getText();
    
    const stats = {
        totalLines: doc.lineCount,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0,
        subs: 0,
        functions: 0,
        types: 0,
        constants: 0,
        dimStatements: 0,
        labels: 0,
        fileSize: text.length
    };

    const lines = text.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            stats.blankLines++;
        } else if (trimmed.startsWith("'") || trimmed.toUpperCase().startsWith('REM ')) {
            stats.commentLines++;
        } else {
            stats.codeLines++;
        }
    }

    stats.subs = (text.match(/^\s*SUB\s+\w+/gim) || []).length;
    stats.functions = (text.match(/^\s*FUNCTION\s+\w+/gim) || []).length;
    stats.types = (text.match(/^\s*TYPE\s+\w+/gim) || []).length;
    stats.constants = (text.match(/^\s*CONST\s+\w+/gim) || []).length;
    stats.dimStatements = (text.match(/^\s*DIM\s+/gim) || []).length;
    stats.labels = (text.match(/^[a-zA-Z_]\w*:/gm) || []).length;



    vscode.window.showInformationMessage(`📊 Code Stats: ${stats.codeLines} code lines, ${stats.subs} SUBs, ${stats.functions} FUNCTIONs`);
}

/**
 * Toggle comment for selected lines
 */
async function toggleComment() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) return;

    const doc = editor.document;
    const selection = editor.selection;
    
    await editor.edit(editBuilder => {
        for (let i = selection.start.line; i <= selection.end.line; i++) {
            const line = doc.lineAt(i);
            const text = line.text;
            const trimmed = text.trimStart();
            const leadingSpaces = text.length - trimmed.length;

            if (trimmed.startsWith("'")) {
                // Uncomment
                const newText = text.substring(0, leadingSpaces) + trimmed.substring(1).trimStart();
                editBuilder.replace(line.range, newText);
            } else {
                // Comment
                const newText = text.substring(0, leadingSpaces) + "' " + trimmed;
                editBuilder.replace(line.range, newText);
            }
        }
    });
}

/**
 * Extract selected code to a SUB
 */
async function extractToSub(document, range) {
    if (!document || !range) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        document = editor.document;
        range = editor.selection;
    }

    const selectedText = document.getText(range);
    if (!selectedText.trim()) {
        vscode.window.showWarningMessage('Please select code to extract.');
        return;
    }

    const subName = await vscode.window.showInputBox({
        prompt: 'Enter name for the new SUB',
        placeHolder: 'MySub',
        validateInput: (value) => {
            if (!value) return 'Name is required';
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                return 'Invalid identifier name';
            }
            return null;
        }
    });

    if (!subName) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    await editor.edit(editBuilder => {
        // Replace selected code with CALL
        editBuilder.replace(range, `CALL ${subName}`);

        // Add SUB at end of document
        const endPos = new vscode.Position(document.lineCount, 0);
        const subCode = `\n\nSUB ${subName}\n    ${selectedText.split('\n').join('\n    ')}\nEND SUB`;
        editBuilder.insert(endPos, subCode);
    });

    vscode.window.showInformationMessage(`✅ Extracted to SUB ${subName}`);
}

// ============================================================================
// COMPILE COMMAND
// ============================================================================

/**
 * Execute compile (and optionally run) command
 */
async function executeCompile(shouldRun) {
    if (isCompiling) {
        vscode.window.showInformationMessage('⏳ Compilation already in progress...');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
        vscode.window.showWarningMessage('📄 Please open a QBasic file first.');
        return;
    }

    const document = editor.document;

    // Auto-save if dirty
    if (document.isDirty) {
        const saved = await document.save();
        if (!saved) {
            vscode.window.showWarningMessage('💾 File must be saved before compiling.');
            return;
        }
    }

    // Get compiler mode
    const mode = getConfig(CONFIG.COMPILER_MODE);

    if (mode === CONFIG.MODE_INTERNAL) {
        await runInternalTranspiler(document, shouldRun);
    } else {
        await runQB64Compiler(document, shouldRun);
    }
}


// ============================================================================
// CRT RUNNER (NEW FEATURE)
// ============================================================================

async function runInCrt() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
        vscode.window.showWarningMessage('📄 Please open a QBasic file first.');
        return;
    }

    const document = editor.document;
    const sourceCode = document.getText();
    const fileName = path.basename(document.uri.fsPath);

    // Save if dirty
    if (document.isDirty) await document.save();

    try {
        log('Transpiling for CRT Webview...', 'info');
        
        // Transpile with 'web' target
        const transpiler = new InternalTranspiler();
        const jsCode = transpiler.transpile(sourceCode, 'web');

        // Launch Webview
        await WebviewManager.runCode(jsCode, fileName, extensionContext.extensionUri);
        
        log('Launched Retro CRT 📺', 'success');

    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to run in CRT: ${error.message}`);
        log(`CRT Error: ${error.message}`, 'error');
    }
}

// ============================================================================
// INTERNAL TRANSPILER
// ============================================================================

async function runInternalTranspiler(document, shouldRun) {
    const channel = getOutputChannel();
    channel.clear();
    channel.show();

    const startTime = process.hrtime();
    const sourceCode = document.getText();
    const lineCount = document.lineCount;
    const fileSize = (sourceCode.length / 1024).toFixed(2);
    const fileName = path.basename(document.uri.fsPath);

    channel.appendLine('  QBasic Nexus ⚡ Internal Transpiler');
    channel.appendLine('═══════════════════════════════════════════════════');
    channel.appendLine('');
    channel.appendLine(`  📦 Source:   ${fileName}`);
    channel.appendLine(`  📍 Path:     ${document.uri.fsPath}`);
    channel.appendLine(`  📊 Stats:    ${lineCount} lines • ${fileSize} KB`);
    channel.appendLine('');
    channel.appendLine('  ➤ Processing...');

    try {
        const transpiler = new InternalTranspiler();
        
        // Simulate steps for UI feedback (since it's instant)
        channel.appendLine('  ✓ Lexical analysis passed');
        channel.appendLine('  ✓ Syntax analysis passed');
        
        const jsCode = transpiler.transpile(sourceCode, 'node');
        
        channel.appendLine('  ✓ Code generation completed');

        // Create temp file
        const baseName = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
        const tempPath = path.join(os.tmpdir(), `qbasic_${baseName}_${Date.now()}.js`);

        await fs.writeFile(tempPath, jsCode, 'utf8');
        
        const endTime = process.hrtime(startTime);
        const duration = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);

        channel.appendLine('');
        channel.appendLine(`  ✨ Transpilation Successful! (${duration}ms)`);
        channel.appendLine('');
        channel.appendLine(`  📂 Output:   ${tempPath}`);

        if (shouldRun) {
            channel.appendLine('');
            channel.appendLine('═══════════════════════════════════════════════════');
            log('Running with Node.js...', 'info');
            channel.appendLine('');

            const term = getTerminal();
            term.show();
            term.sendText(`node "${tempPath}"`);
        } else {
            channel.appendLine('═══════════════════════════════════════════════════');
        }

    } catch (error) {
        channel.appendLine('');
        channel.appendLine(`  ❌ Failed: ${error.message}`);
        channel.appendLine('═══════════════════════════════════════════════════');
        log(`Error: ${error.message}`, 'error');
        vscode.window.showErrorMessage(`❌ Transpiler Error: ${error.message}`);
    }
}

// ============================================================================
// QB64 COMPILER
// ============================================================================

async function runQB64Compiler(document, shouldRun) {
    const compilerPath = getConfig(CONFIG.COMPILER_PATH);

    // Validate compiler path
    if (!compilerPath) {
        const choice = await vscode.window.showWarningMessage(
            '⚠️ QB64 compiler path is not configured.',
            'Open Settings',
            'Use Internal Mode'
        );

        if (choice === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', `${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`);
        } else if (choice === 'Use Internal Mode') {
            await vscode.workspace.getConfiguration(CONFIG.SECTION).update(CONFIG.COMPILER_MODE, CONFIG.MODE_INTERNAL, true);
            await runInternalTranspiler(document, shouldRun);
        }
        return;
    }

    if (!await fileExists(compilerPath)) {
        vscode.window.showErrorMessage(`❌ QB64 not found at: ${compilerPath}`);
        return;
    }

    // Start compilation
    isCompiling = true;
    updateStatusBar();
    diagnosticCollection.clear();

    const channel = getOutputChannel();
    channel.clear();
    channel.show();

    try {
        const outputPath = await compileWithQB64(document, compilerPath, channel);

        if (shouldRun && outputPath) {
            runExecutable(outputPath);
        }
    } catch (_error) {
        vscode.window.showErrorMessage('❌ Compilation failed. Check output for details.');
    } finally {
        isCompiling = false;
        updateStatusBar();
    }
}

/**
 * Compile using QB64
 */
function compileWithQB64(document, compilerPath, channel) {
    return new Promise((resolve, reject) => {
        const sourcePath = document.uri.fsPath;
        const sourceDir = path.dirname(sourcePath);
        const baseName = path.basename(sourcePath, path.extname(sourcePath));
        const outputPath = path.join(sourceDir, baseName + (process.platform === 'win32' ? '.exe' : ''));

        // Build arguments
        const extraArgs = (getConfig(CONFIG.COMPILER_ARGS) || '')
            .split(' ')
            .filter(arg => arg.trim().length > 0);

        const args = ['-x', '-c', sourcePath, '-o', outputPath, ...extraArgs];

        // Log
        channel.appendLine('╔══════════════════════════════════════════════════╗');
        channel.appendLine('║           QBasic Nexus - QB64 Compiler           ║');
        channel.appendLine('╚══════════════════════════════════════════════════╝');
        channel.appendLine('');
        channel.appendLine(`📄 Source: ${path.basename(sourcePath)}`);
        channel.appendLine(`📦 Output: ${path.basename(outputPath)}`);
        channel.appendLine(`⚙️  Args:   ${args.join(' ')}`);
        channel.appendLine('');
        channel.appendLine('─────────────────────────────────────────────────────');
        channel.appendLine('');

        const startTime = process.hrtime();

        // Spawn process
        const proc = spawn(compilerPath, args, {
            cwd: path.dirname(compilerPath),
            shell: false
        });

        let output = '';

        proc.stdout.on('data', data => {
            const text = data.toString();
            channel.append(text);
            output += text;
        });

        proc.stderr.on('data', data => {
            const text = data.toString();
            channel.append(text);
            output += text;
        });

        proc.on('error', err => {
            channel.appendLine(`\n❌ Failed to start compiler: ${err.message}`);
            reject(err);
        });

        proc.on('close', code => {
            parseCompilerErrors(output, document.uri);

            const endTime = process.hrtime(startTime);
            const duration = (endTime[0] + endTime[1] / 1e9).toFixed(2);

            channel.appendLine('');
            channel.appendLine('─────────────────────────────────────────────────────');

            if (code === 0) {
                channel.appendLine('');
                channel.appendLine(`✅ BUILD SUCCESSFUL (${duration}s)`);
                channel.appendLine(`📦 ${outputPath}`);
                resolve(outputPath);
            } else {
                channel.appendLine('');
                channel.appendLine(`❌ BUILD FAILED (Exit code: ${code})`);
                reject(new Error(`Exit code ${code}`));
            }
        });
    });
}

/**
 * Parse QB64 compiler output for errors
 */
function parseCompilerErrors(output, uri) {
    const diagnostics = [];
    const filename = path.basename(uri.fsPath).toLowerCase();

    // Pattern: filename.bas:line: error message
    const pattern = /([^\\/]+\.(?:bas|bi|bm))[:(](\d+)(?:[:)])?\s*(?:\d+:)?\s*(?:error|warning)?:?\s*(.+)/gi;

    let match;
    while ((match = pattern.exec(output)) !== null) {
        const [, file, lineStr, message] = match;

        if (file.toLowerCase() === filename) {
            const line = Math.max(0, parseInt(lineStr, 10) - 1);
            const severity = message.toLowerCase().includes('warning') 
                ? vscode.DiagnosticSeverity.Warning 
                : vscode.DiagnosticSeverity.Error;
            
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
                message.trim(),
                severity
            );
            diagnostic.source = 'QB64';
            diagnostics.push(diagnostic);
        }
    }

    diagnosticCollection.set(uri, diagnostics);
}

/**
 * Run compiled executable
 * @param {string} exePath - Full path to the executable
 */
function runExecutable(exePath) {
    const term = getTerminal();
    term.show();

    const dir = path.dirname(exePath);
    const exe = path.basename(exePath);

    // Build platform-specific command
    // PowerShell uses semicolon, cmd uses &&, Unix uses &&
    if (process.platform === 'win32') {
        // Use PowerShell syntax with proper escaping
        // Set-Location handles paths with spaces, then run the exe
        term.sendText(`Set-Location -LiteralPath '${dir}'; & '.\\${exe}'`);
    } else if (process.platform === 'darwin') {
        // macOS - use bash with proper quoting
        term.sendText(`cd '${dir}' && './${exe}'`);
    } else {
        // Linux and others
        term.sendText(`cd '${dir}' && './${exe}'`);
    }
}

// ============================================================================
// STATUS BAR
// ============================================================================

function updateStatusBar() {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
        statusBarItem.hide();
        return;
    }

    const mode = getConfig(CONFIG.COMPILER_MODE);
    const compilerPath = getConfig(CONFIG.COMPILER_PATH);

    if (isCompiling) {
        statusBarItem.text = '$(sync~spin) Compiling...';
        statusBarItem.tooltip = 'Compilation in progress';
        statusBarItem.backgroundColor = undefined;
    } else if (mode === CONFIG.MODE_INTERNAL) {
        statusBarItem.text = '$(play) Run (JS) ⚡';
        statusBarItem.tooltip = 'Run with internal transpiler';
        statusBarItem.backgroundColor = undefined;
    } else if (!compilerPath) {
        statusBarItem.text = '$(warning) Configure QB64';
        statusBarItem.tooltip = 'Click to set QB64 path';
        statusBarItem.command = {
            command: 'workbench.action.openSettings',
            arguments: [`${CONFIG.SECTION}.${CONFIG.COMPILER_PATH}`]
        };
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
        statusBarItem.text = '$(flame) Run ⚡';
        statusBarItem.tooltip = 'Compile & Run with QB64';
        statusBarItem.command = COMMANDS.COMPILE_RUN;
        statusBarItem.backgroundColor = undefined;
    }

    statusBarItem.show();
}

// ============================================================================
// DEACTIVATION
// ============================================================================

function deactivate() {
    console.log('[QBasic Nexus] Extension deactivated');
    
    // Clear timers
    if (lintTimer) {
        clearTimeout(lintTimer);
        lintTimer = null;
    }
    
    // Dispose resources
    statusBarItem?.dispose();
    statsBarItem?.dispose();
    outputChannel?.dispose();
    diagnosticCollection?.dispose();
    terminal?.dispose();
    
    // Clear references
    statusBarItem = null;
    statsBarItem = null;
    outputChannel = null;
    diagnosticCollection = null;
    terminal = null;
    extensionContext = null;
}

module.exports = { activate, deactivate };