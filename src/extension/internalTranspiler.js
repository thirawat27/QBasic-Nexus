/**
 * QBasic Nexus - Internal Transpiler Command
 * Build .exe using the bundled JS transpiler + pkg
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

// pkg-compatible Node.js header
// Shebang only needed on macOS/Linux; Windows ignores it but it causes no harm.
// Having it lets the fallback CLI `pkg` mode work on all platforms.
const PKG_HEADER = `#!/usr/bin/env node
// Built by QBasic Nexus — https://github.com/thirawat27/QBasic-Nexus
`;

/**
 * Run the Internal Transpiler → pkg pipeline to produce a .exe
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
    // Platform-aware output extension: .exe on Windows, no extension elsewhere
    const exeExt = process.platform === 'win32' ? '.exe' : '';
    const outputExe = path.join(sourceDir, baseName + exeExt);
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
        const jsCode = transpiler.transpile(sourceCode, 'node');
        report(30, 'Syntax analysis passed ✓');

        // ── 2: Code Generation / write JS (30 → 60%) ───────────────────
        channel.appendLine('');
        report(45, 'Code generation…');

        // Use MagicString to prepend the pkg-compatible header
        // This keeps the operation non-destructive and ready for future sourcemap support
        const ms = new MagicString(jsCode);
        ms.prepend(PKG_HEADER);
        await fs.writeFile(tempJs, ms.toString(), 'utf8');

        const t0 = process.hrtime(startTime);
        const tMs = (t0[0] * 1000 + t0[1] / 1e6).toFixed(2);
        report(60, `Transpile complete (${tMs}ms) ✓`);

        // ── 3: pkg packaging (60 → 100%) ───────────────────────────────
        channel.appendLine('');
        report(65, 'Packaging to .exe…');

        // Cross-platform target detection
        const platformTargets = {
          win32: 'node18-win-x64',
          darwin: 'node18-macos-x64',
          linux: 'node18-linux-x64',
          alpine: 'node18-alpine-x64',
        };
        const target = platformTargets[process.platform] || 'node18-win-x64';

        try {
          // pkg programmatic API — suppresses the "> pkg@x.x.x" CLI banner
          const pkgApi = require('pkg');
          await pkgApi.exec([tempJs, '--target', target, '--output', outputExe]);
        } catch (_) {
          // fallback: spawn CLI if API unavailable
          channel.appendLine('  ⚠ pkg API unavailable, falling back to CLI…');

          await new Promise((resolve, reject) => {
            const proc = spawn(
              'pkg',
              [tempJs, '--target', target, '--output', outputExe],
              { shell: true, env: process.env },
            );
            proc.stdout.on('data', (d) => channel.append(d.toString()));
            proc.stderr.on('data', (d) => channel.append(d.toString()));
            proc.on('error', reject);
            proc.on('close', (code) =>
              code === 0 ? resolve() : reject(new Error(`pkg exit ${code}`)),
            );
          });
        }

        // Clean up temp JS only AFTER pkg has fully finished
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
        `✅ Compiled: ${baseName}${exeExt}`,
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

  // Pick the platform-specific launcher:
  //   Windows  → "cmd" with /c "start "" "<exe>""
  //   macOS    → "open"
  //   Linux    → "xdg-open"
  let child;
  if (process.platform === 'win32') {
    // `start ""` opens a new console window for the exe.
    // We wrap inside cmd /c so Node doesn't need to find "start" itself.
    child = spawn('cmd', ['/c', 'start', '', exePath], {
      cwd: path.dirname(exePath),
      detached: true, // let the child outlive the extension host
      stdio: 'ignore', // detach stdio so the process is truly independent
      shell: false,
    });
  } else if (process.platform === 'darwin') {
    child = spawn('open', [exePath], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
    });
  } else {
    // Linux / other POSIX
    child = spawn('xdg-open', [exePath], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
    });
  }

  // Detach the child so it runs independently after the parent closes
  child.unref();

  child.on('error', (err) => {
    channel.appendLine(`  ⚠ Could not launch executable: ${err.message}`);
    const term = getTerminal();
    term.show();
    const safeExe = exePath.replace(/"/g, '""');
    term.sendText(`cmd /c "${safeExe}"`);
  });
}

module.exports = { runInternalTranspiler, runExecutable };
