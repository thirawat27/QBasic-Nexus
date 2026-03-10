/**
 * QBasic Nexus - Internal Transpiler Command
 * Build a native executable using the bundled JS transpiler + @yao-pkg/pkg
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { spawn } = require('child_process');
const MagicString = require('magic-string');
const { state } = require('./state');
const { getOutputChannel, getTerminal, log } = require('./utils');
const { updateStatusBar } = require('./statusBar');
const { getInternalTranspiler } = require('./lazyModules');

const PACKAGER_MODULE = '@yao-pkg/pkg';
const PACKAGER_COMPRESSION = 'GZip';

// Packager-compatible Node.js header
// Shebang only needed on macOS/Linux; Windows ignores it but it causes no harm.
// Having it lets the fallback CLI mode work on all platforms.
const PACKAGER_HEADER = `#!/usr/bin/env node
// Built by QBasic Nexus — https://github.com/thirawat27/QBasic-Nexus
`;

function getOutputExtension() {
  return process.platform === 'win32' ? '.exe' : '';
}

function getPackagerTarget() {
  return 'host';
}

function quoteForShell(value) {
  return "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
}

function getPackagerCliInvocation(args) {
  const packageJsonPath = require.resolve(`${PACKAGER_MODULE}/package.json`);
  const packageJson = require(packageJsonPath);
  const cliRelativePath =
    typeof packageJson.bin === 'string'
      ? packageJson.bin
      : packageJson.bin?.pkg;

  if (!cliRelativePath) {
    throw new Error(`Could not locate ${PACKAGER_MODULE} CLI entry point`);
  }

  return {
    command: process.execPath,
    args: [path.join(path.dirname(packageJsonPath), cliRelativePath), ...args],
  };
}

async function runPackager(args, channel) {
  let packagerApi = null;

  try {
    packagerApi = require(PACKAGER_MODULE);
  } catch (_loadError) {
    channel.appendLine(
      `  ⚠ ${PACKAGER_MODULE} API unavailable, falling back to bundled CLI…`,
    );
  }

  if (packagerApi?.exec) {
    await packagerApi.exec(args);
    return;
  }

  const { command, args: cliArgs } = getPackagerCliInvocation(args);

  await new Promise((resolve, reject) => {
    const proc = spawn(command, cliArgs, {
      env: process.env,
      shell: false,
    });
    proc.stdout.on('data', (data) => channel.append(data.toString()));
    proc.stderr.on('data', (data) => channel.append(data.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${PACKAGER_MODULE} CLI exited with code ${code}`));
    });
  });
}

/**
 * Run the Internal Transpiler → packager pipeline to produce a native executable
 * @param {vscode.TextDocument} document
 * @param {boolean} shouldRun - whether to execute after building
 */
async function runInternalTranspiler(document, shouldRun) {
  const channel = getOutputChannel();
  channel.clear();
  channel.show();

  const startTime = process.hrtime();
  const sourceCode = document.getText();
  const lineCount = document.lineCount;
  const fileSize = (sourceCode.length / 1024).toFixed(2);
  const fileName = path.basename(document.uri.fsPath);
  const baseName = path.basename(
    document.uri.fsPath,
    path.extname(document.uri.fsPath),
  );
  const sourceDir = path.dirname(document.uri.fsPath);

  channel.appendLine('╔══════════════════════════════════════════════════╗');
  channel.appendLine('║            ⚡ QBasic Nexus Compiler               ║');
  channel.appendLine('╚══════════════════════════════════════════════════╝');
  channel.appendLine('');
  channel.appendLine(`  📦 Source:   ${fileName}`);
  channel.appendLine(`  📍 Path:     ${document.uri.fsPath}`);
  channel.appendLine(`  📊 Stats:    ${lineCount} lines • ${fileSize} KB`);
  channel.appendLine('');
  channel.appendLine('─────────────────────────────────────────────────────');

  state.isCompiling = true;
  updateStatusBar();

  let tempJs = null;

  // ── progress bar helper (printed to Output Channel) ──────────────────────
  const BAR_WIDTH = 24;
  function makeBar(pct, label) {
    const filled = Math.round((pct / 100) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    return `  [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${String(pct).padStart(3)}%  ${label}`;
  }

  try {
    const InternalTranspiler = getInternalTranspiler();
    const transpiler = new InternalTranspiler();
    const outputExt = getOutputExtension();
    const outputExe = path.join(sourceDir, baseName + outputExt);
    tempJs = path.join(os.tmpdir(), `${baseName}_${Date.now()}._qbnx_.js`);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `QBasic Nexus  —  ${fileName}`,
        cancellable: false,
      },
      async (progress) => {
        let lastPct = 0;
        function report(pct, label) {
          channel.appendLine(makeBar(pct, label));
          progress.report({
            message: `${pct}%  ${label}`,
            increment: pct - lastPct,
          });
          lastPct = pct;
        }

        // ── 1: Lexical & Syntax Analysis (0 → 30%) ─────────────────────
        channel.appendLine('');
        report(0, 'Lexical & Syntax Analysis…');
        const jsCode = transpiler.transpile(sourceCode, 'node', {
          sourcePath: document.uri.fsPath,
        });
        report(30, 'Syntax analysis passed ✓');

        // ── 2: Code Generation / write JS (30 → 60%) ───────────────────
        channel.appendLine('');
        report(45, 'Code generation…');

        // Use MagicString to prepend the packager-compatible header
        // This keeps the operation non-destructive and ready for future sourcemap support
        const ms = new MagicString(jsCode);
        ms.prepend(PACKAGER_HEADER);
        await fs.writeFile(tempJs, ms.toString(), 'utf8');

        const t0 = process.hrtime(startTime);
        const tMs = (t0[0] * 1000 + t0[1] / 1e6).toFixed(2);
        report(60, `Transpile complete (${tMs}ms) ✓`);

        // ── 3: Native packaging (60 → 100%) ────────────────────────────
        channel.appendLine('');
        report(65, 'Packaging executable…');

        const target = getPackagerTarget();
        const packagerArgs = [
          tempJs,
          '--target',
          target,
          '--compress',
          PACKAGER_COMPRESSION,
          '--output',
          outputExe,
        ];

        await runPackager(packagerArgs, channel);

        if (process.platform !== 'win32') {
          await fs.chmod(outputExe, 0o755).catch(() => {});
        }

        // Clean up temp JS only AFTER packaging has fully finished
        // (also cleaned in outer catch/finally via the variable kept in closure)
        await fs.unlink(tempJs).catch(() => {});

        report(100, 'Done ✓');
        channel.appendLine('');
      },
    );

    // ── Result ────────────────────────────────────────────────────────────
    const endTime = process.hrtime(startTime);
    const totalDuration = (endTime[0] + endTime[1] / 1e9).toFixed(2);

    channel.appendLine('─────────────────────────────────────────────────────');
    channel.appendLine('');
    channel.appendLine(`  ✅ BUILD SUCCESSFUL (${totalDuration}s)`);
    channel.appendLine(`  📦 Output:  ${outputExe}`);
    channel.appendLine('');

    vscode.window
      .showInformationMessage(
        `✅ Compiled: ${path.basename(outputExe)}`,
        'Open Folder',
      )
      .then((choice) => {
        if (choice === 'Open Folder') {
          vscode.commands.executeCommand(
            'revealFileInOS',
            vscode.Uri.file(outputExe),
          );
        }
      });

    if (shouldRun) {
      channel.appendLine('  ➤ Running executable…');
      channel.appendLine(
        '─────────────────────────────────────────────────────',
      );
      runExecutable(outputExe);
    } else {
      channel.appendLine('═══════════════════════════════════════════════════');
    }
  } catch (error) {
    channel.appendLine('');
    channel.appendLine(`  ❌ Build Failed: ${error.message}`);
    channel.appendLine('═══════════════════════════════════════════════════');
    log(`Error: ${error.message}`, 'error');
    vscode.window.showErrorMessage(`❌ Build Error: ${error.message}`);
  } finally {
    if (tempJs) {
      await fs.unlink(tempJs).catch(() => {});
    }
    state.isCompiling = false;
    updateStatusBar();
  }
}

/**
 * Run compiled executable using Node.js native child_process
 * (no external packages — mirrors what the `open` npm package does internally)
 * @param {string} exePath - Full path to the executable
 */
function runExecutable(exePath) {
  const channel = getOutputChannel();
  const workingDirectory = path.dirname(exePath);

  if (process.platform !== 'win32') {
    const term = getTerminal({ cwd: workingDirectory });
    term.show(true);
    term.sendText(quoteForShell(exePath), true);
    channel.appendLine(
      `  ➤ Running in integrated terminal: ${exePath} (cwd: ${workingDirectory})`,
    );
    return;
  }

  let child;
  try {
    // `start ""` opens a new console window for the exe.
    // We wrap inside cmd /c so Node doesn't need to find "start" itself.
    child = spawn('cmd', ['/c', 'start', '', exePath], {
      cwd: workingDirectory,
      detached: true, // let the child outlive the extension host
      stdio: 'ignore', // detach stdio so the process is truly independent
      shell: false,
    });
  } catch (err) {
    channel.appendLine(`  ⚠ Could not launch executable: ${err.message}`);
    const term = getTerminal({ cwd: workingDirectory });
    term.show(true);
    term.sendText(`& "${exePath.replace(/"/g, '""')}"`, true);
    return;
  }

  // Detach the child so it runs independently after the parent closes
  child.unref();

  child.on('error', (err) => {
    channel.appendLine(`  ⚠ Could not launch executable: ${err.message}`);
    const term = getTerminal({ cwd: workingDirectory });
    term.show(true);
    term.sendText(`& "${exePath.replace(/"/g, '""')}"`, true);
  });
}

module.exports = { runInternalTranspiler, runExecutable };
