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
const { CONFIG } = require('./constants');
const {
  buildPackagerArgs,
  ensureExecutableReady,
  ensureOutputDirectoryReady,
  getExecutableOutputPath,
  hasExperimentalMacosArm64Target,
  isHostCompatibleTarget,
  getPackagerTarget,
  getTerminalLaunchSpec,
  parsePackagerTarget,
  resolveExecutableOutputDir,
  shouldUsePortablePackaging,
  validatePackagerTargets,
} = require('./executableUtils');
const { state } = require('./state');
const { getConfig, getOutputChannel, getTerminal, log } = require('./utils');
const { updateStatusBar } = require('./statusBar');

const PACKAGER_MODULE = '@yao-pkg/pkg';
const PACKAGER_COMPRESSION = 'GZip';

// Packager-compatible Node.js header
// Shebang only needed on macOS/Linux; Windows ignores it but it causes no harm.
// Having it lets the fallback CLI mode work on all platforms.
const PACKAGER_HEADER = `#!/usr/bin/env node
// Built by QBasic Nexus — https://github.com/thirawat27/QBasic-Nexus
`;

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

function isPackagedExecutableCandidate(fileName, baseName) {
  const extension = path.extname(fileName).toLowerCase();
  if (['.bas', '.bi', '.bm', '.inc', '.js', '.json'].includes(extension)) {
    return false;
  }

  const stem = extension ? path.basename(fileName, extension) : fileName;
  return stem === baseName || stem.startsWith(`${baseName}-`);
}

async function snapshotPackagedOutputs(outputDir, baseName) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const snapshot = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !isPackagedExecutableCandidate(entry.name, baseName)) {
      continue;
    }

    const filePath = path.join(outputDir, entry.name);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) continue;
    snapshot.set(filePath, {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }

  return snapshot;
}

async function collectUpdatedPackagedOutputs(outputDir, baseName, previousSnapshot) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const outputs = [];

  for (const entry of entries) {
    if (!entry.isFile() || !isPackagedExecutableCandidate(entry.name, baseName)) {
      continue;
    }

    const filePath = path.join(outputDir, entry.name);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) continue;

    const previous = previousSnapshot.get(filePath);
    if (!previous || previous.size !== stat.size || previous.mtimeMs !== stat.mtimeMs) {
      outputs.push(filePath);
    }
  }

  return outputs.sort((left, right) => left.localeCompare(right));
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
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  let packagerTargets = [];
  let outputDir = '';
  let multiTargetBuild = false;
  let outputExe = null;
  let tempJs = null;
  let generatedOutputs = [];
  state.isCompiling = true;
  updateStatusBar();

  // ── progress bar helper (printed to Output Channel) ──────────────────────
  const BAR_WIDTH = 24;
  function makeBar(pct, label) {
    const filled = Math.round((pct / 100) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    return `  [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${String(pct).padStart(3)}%  ${label}`;
  }

  try {
    packagerTargets = validatePackagerTargets(
      getConfig(CONFIG.INTERNAL_TARGETS, getPackagerTarget()),
    );
    outputDir = resolveExecutableOutputDir(
      document.uri.fsPath,
      getConfig(CONFIG.INTERNAL_OUTPUT_DIR, ''),
      { workspaceDir: workspaceFolder?.uri.fsPath },
    );
    multiTargetBuild = packagerTargets.length > 1;
    const singleTargetPlatform = parsePackagerTarget(packagerTargets[0]).platform;
    outputExe = multiTargetBuild
      ? null
      : getExecutableOutputPath(
          document.uri.fsPath,
          singleTargetPlatform || process.platform,
          outputDir,
        );

    channel.appendLine('╔══════════════════════════════════════════════════╗');
    channel.appendLine('║            ⚡ QBasic Nexus Compiler               ║');
    channel.appendLine('╚══════════════════════════════════════════════════╝');
    channel.appendLine('');
    channel.appendLine(`  📦 Source:   ${fileName}`);
    channel.appendLine(`  📍 Path:     ${document.uri.fsPath}`);
    channel.appendLine(`  📊 Stats:    ${lineCount} lines • ${fileSize} KB`);
    channel.appendLine(`  📂 Output:   ${outputDir}`);
    channel.appendLine('');
    channel.appendLine('─────────────────────────────────────────────────────');

    const { compile } = require('../compiler/compiler');
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
        const result = compile(sourceCode, {
          target: 'node',
          sourcePath: document.uri.fsPath,
        });

        if (!result.isSuccess()) {
          const msg = result.getErrors().map((e) => e.message).join('; ');
          throw new Error(`Syntax Error: ${msg || 'Compilation failed'}`);
        }

        const jsCode = result.getCode();
        const meta = result.getMetadata();
        if (meta.cached) {
          channel.appendLine(`  [L1/L2] Cache hit (age ${meta.cacheAge}ms) — parsing skipped`);
        }
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

        await ensureOutputDirectoryReady(fs, outputDir);
        const outputSnapshot = multiTargetBuild
          ? await snapshotPackagedOutputs(outputDir, baseName)
          : null;
        const packagerArgs = buildPackagerArgs(
          tempJs,
          multiTargetBuild ? outputDir : outputExe,
          {
            targets: packagerTargets,
            platform: process.platform,
            arch: process.arch,
            compression: PACKAGER_COMPRESSION,
          },
        );
        if (shouldUsePortablePackaging(packagerTargets)) {
          channel.appendLine(
            '  ℹ Cross-target packaging enabled: using portable pkg flags (--no-bytecode --public-packages "*" --public).',
          );
        }
        if (hasExperimentalMacosArm64Target(packagerTargets, {
          platform: process.platform,
          arch: process.arch,
        })) {
          channel.appendLine(
            '  ℹ macOS arm64 targets may require ad-hoc or Developer ID code signing on macOS before distribution.',
          );
        }
        channel.appendLine(`  🎯 Targets: ${packagerTargets.join(', ')}`);

        await runPackager(packagerArgs, channel);

        if (multiTargetBuild) {
          generatedOutputs = await collectUpdatedPackagedOutputs(
            outputDir,
            baseName,
            outputSnapshot,
          );
          if (generatedOutputs.length === 0) {
            throw new Error(
              'Packaging completed but no updated target binaries were detected in the output folder.',
            );
          }
          for (const outputPath of generatedOutputs) {
            await ensureExecutableReady(fs, outputPath);
          }
        } else {
          generatedOutputs = [await ensureExecutableReady(fs, outputExe)];
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
    if (generatedOutputs.length === 1) {
      channel.appendLine(`  📦 Output:  ${generatedOutputs[0]}`);
    } else {
      channel.appendLine(`  📦 Outputs: ${generatedOutputs.length} targets in ${outputDir}`);
      for (const outputPath of generatedOutputs) {
        channel.appendLine(`     • ${outputPath}`);
      }
    }
    channel.appendLine('');

    vscode.window
      .showInformationMessage(
        generatedOutputs.length === 1
          ? `✅ Compiled: ${path.basename(generatedOutputs[0])}`
          : `✅ Compiled: ${generatedOutputs.length} targets`,
        'Open Folder',
      )
      .then((choice) => {
        if (choice === 'Open Folder') {
          vscode.commands.executeCommand(
            'revealFileInOS',
            vscode.Uri.file(
              generatedOutputs.length === 1 ? generatedOutputs[0] : outputDir,
            ),
          );
        }
      });

    if (shouldRun) {
      if (generatedOutputs.length !== 1) {
        channel.appendLine(
          '  ℹ Multiple targets were generated; skipping auto-run. Select a single host target to run automatically.',
        );
      } else if (!isHostCompatibleTarget(packagerTargets[0])) {
        channel.appendLine(
          `  ℹ Skipping auto-run because target ${packagerTargets[0]} is not runnable on this host.`,
        );
      } else {
        channel.appendLine('  ➤ Running executable…');
        channel.appendLine(
          '─────────────────────────────────────────────────────',
        );
        await runExecutable(generatedOutputs[0]);
      }
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
 * Run a compiled executable inside a deterministic integrated terminal shell
 * @param {string} exePath - Full path to the executable
 */
async function runExecutable(exePath) {
  const channel = getOutputChannel();
  const launchSpec = getTerminalLaunchSpec(exePath);

  try {
    await ensureExecutableReady(fs, exePath);
  } catch (err) {
    channel.appendLine(`  ⚠ Could not launch executable: ${err.message}`);
    throw err;
  }

  const term = getTerminal({
    cwd: launchSpec.cwd,
    shellPath: launchSpec.shellPath,
    shellArgs: launchSpec.shellArgs,
  });
  term.show(true);
  term.sendText(launchSpec.commandText, true);
  channel.appendLine(
    `  ➤ Running in integrated terminal: ${exePath} (cwd: ${launchSpec.cwd})`,
  );
}

module.exports = { runInternalTranspiler, runExecutable };
