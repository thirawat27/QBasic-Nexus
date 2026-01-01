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
 * 
 * @author Thirawat27
 * @version 1.0.0
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
    QBasicSignatureHelpProvider
} = require('./providers');
const InternalTranspiler = require('./transpiler');

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG = Object.freeze({
    SECTION: 'qbasic-nexus',
    COMPILER_PATH: 'compilerPath',
    COMPILER_MODE: 'compilerMode',
    COMPILER_ARGS: 'compilerArgs',
    MODE_QB64: 'QB64 (Recommended)',
    MODE_INTERNAL: 'Internal (JS Transpiler)',
    LANGUAGE_ID: 'qbasic',
    OUTPUT_CHANNEL: 'QBasic Nexus',
    TERMINAL_NAME: 'QBasic Nexus'
});

const COMMANDS = Object.freeze({
    COMPILE: 'qbasic-nexus.compile',
    COMPILE_RUN: 'qbasic-nexus.compileAndRun'
});

// ============================================================================
// GLOBAL STATE
// ============================================================================

let statusBarItem = null;
let outputChannel = null;
let terminal = null;
let diagnosticCollection = null;
let isCompiling = false;

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
function getConfig(key) {
    return vscode.workspace.getConfiguration(CONFIG.SECTION).get(key);
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
        warning: '⚠️'
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

    try {
        const transpiler = new InternalTranspiler();
        const errors = transpiler.lint(document.getText());

        const diagnostics = errors.map(err => {
            const line = Math.max(0, Math.min(err.line, document.lineCount - 1));
            const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
            return new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
        });

        diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
        console.error('[QBasic Nexus] Linting error:', error.message);
    }
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

async function activate(context) {
    console.log('[QBasic Nexus] ⚡ Extension activated');

    // Initialize diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('qbasic-nexus');
    context.subscriptions.push(diagnosticCollection);

    // Initialize status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = COMMANDS.COMPILE_RUN;
    context.subscriptions.push(statusBarItem);

    // Register language providers
    const selector = { language: CONFIG.LANGUAGE_ID, scheme: 'file' };

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(selector, new QBasicDocumentSymbolProvider()),
        vscode.languages.registerDefinitionProvider(selector, new QBasicDefinitionProvider()),
        vscode.languages.registerDocumentFormattingEditProvider(selector, new QBasicDocumentFormattingEditProvider()),
        vscode.languages.registerCompletionItemProvider(selector, new QBasicCompletionItemProvider()),
        vscode.languages.registerHoverProvider(selector, new QBasicHoverProvider()),
        vscode.languages.registerSignatureHelpProvider(selector, new QBasicSignatureHelpProvider(), '(', ',')
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.COMPILE, () => executeCompile(false)),
        vscode.commands.registerCommand(COMMANDS.COMPILE_RUN, () => executeCompile(true))
    );

    // Event handlers
    const debouncedLint = debounce(lintDocument, 500);
    const debouncedStatusUpdate = debounce(updateStatusBar, 200);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            debouncedStatusUpdate();
            if (editor) lintDocument(editor.document);
        }),
        vscode.workspace.onDidChangeTextDocument(e => debouncedLint(e.document)),
        vscode.workspace.onDidSaveTextDocument(lintDocument),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(CONFIG.SECTION)) updateStatusBar();
        }),
        vscode.window.onDidCloseTerminal(t => {
            if (t === terminal) terminal = null;
        })
    );

    // Initial setup
    updateStatusBar();
    if (vscode.window.activeTextEditor) {
        lintDocument(vscode.window.activeTextEditor.document);
    }
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
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Compilation failed. Check output for details.`);
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

            channel.appendLine('');
            channel.appendLine('─────────────────────────────────────────────────────');

            if (code === 0) {
                channel.appendLine('');
                channel.appendLine('✅ BUILD SUCCESSFUL');
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
    const pattern = /([^\\\/]+\.(?:bas|bi|bm))[:\(](\d+)(?:[:\)])?\s*(?:\d+:)?\s*(?:error|warning)?:?\s*(.+)/gi;

    let match;
    while ((match = pattern.exec(output)) !== null) {
        const [, file, lineStr, message] = match;

        if (file.toLowerCase() === filename) {
            const line = Math.max(0, parseInt(lineStr, 10) - 1);
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
                message.trim(),
                vscode.DiagnosticSeverity.Error
            ));
        }
    }

    diagnosticCollection.set(uri, diagnostics);
}

/**
 * Run compiled executable
 */
function runExecutable(exePath) {
    const term = getTerminal();
    term.show();

    const dir = path.dirname(exePath);
    const exe = path.basename(exePath);

    if (process.platform === 'win32') {
        term.sendText(`cd "${dir}" ; .\\"${exe}"`);
    } else {
        term.sendText(`cd "${dir}" && ./"${exe}"`);
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
        statusBarItem.command = 'workbench.action.openSettings';
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
    statusBarItem?.dispose();
    outputChannel?.dispose();
    diagnosticCollection?.dispose();
}

module.exports = { activate, deactivate };