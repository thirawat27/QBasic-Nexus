'use strict';

/**
 * Launch the installed VS Code with this extension in development mode and
 * run test/vscode/index.js inside it.
 *
 *   npm run test:vscode
 *
 * Environment:
 *   VSCODE_EXECUTABLE  path to Code.exe / code (default: the usual install)
 *   QB64_PATH          QB64 / QB64-PE executable for the compile, task and
 *                      debugger tests (default: auto-detection)
 *
 * VS Code runs with a throwaway profile and extensions folder, so the user's
 * own settings and installed extensions are not used or changed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Compiled to out/test/vscode; the repository root is three levels up.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKSPACE_SOURCE = path.join(ROOT, 'test', 'vscode', 'workspace');

function defaultExecutable() {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe');
  }
  if (process.platform === 'darwin') {
    return '/Applications/Visual Studio Code.app/Contents/MacOS/Electron';
  }
  return '/usr/share/code/code';
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

async function main() {
  const executable = process.env.VSCODE_EXECUTABLE || defaultExecutable();
  if (!fs.existsSync(executable)) {
    throw new Error(`VS Code not found at ${executable}. Set VSCODE_EXECUTABLE.`);
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-vscode-'));
  const workspace = path.join(temp, 'workspace');
  copyDir(WORKSPACE_SOURCE, workspace);

  const settings = {
    'qbasic-nexus.autoFormatOnSave': false,
    'security.workspace.trust.enabled': false,
  };
  fs.mkdirSync(path.join(workspace, '.vscode'), { recursive: true });
  fs.writeFileSync(path.join(workspace, '.vscode', 'settings.json'), JSON.stringify(settings, null, 2));

  // compilerPath is machine-scoped, so VS Code only honours it in user
  // settings, not in workspace settings.
  const userSettingsDir = path.join(temp, 'user-data', 'User');
  fs.mkdirSync(userSettingsDir, { recursive: true });
  const userSettings = { 'security.workspace.trust.enabled': false };
  if (process.env.QB64_PATH) userSettings['qbasic-nexus.compilerPath'] = process.env.QB64_PATH;
  fs.writeFileSync(path.join(userSettingsDir, 'settings.json'), JSON.stringify(userSettings, null, 2));

  const resultsFile = path.join(temp, 'results.json');
  const args = [
    workspace,
    `--extensionDevelopmentPath=${ROOT}`,
    `--extensionTestsPath=${path.join(__dirname, 'index.js')}`,
    `--user-data-dir=${path.join(temp, 'user-data')}`,
    `--extensions-dir=${path.join(temp, 'extensions')}`,
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-telemetry',
  ];

  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, QBNX_TEST_RESULTS: resultsFile };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.VSCODE_IPC_HOOK_CLI;

  console.log(`VS Code: ${executable}`);
  console.log(`Workspace: ${workspace}\n`);

  const exitCode = await new Promise((resolve) => {
    const child = spawn(executable, args, { env, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code));
  });

  if (!fs.existsSync(resultsFile)) {
    throw new Error(`VS Code exited with code ${exitCode} before writing results`);
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  console.log('\n🧪 VS Code Integration Tests\n');
  for (const result of results) {
    const mark = result.ok ? '✅' : '❌';
    const detail = result.ok ? (result.detail ? ` — ${result.detail}` : '') : `\n      ${result.error.split('\n').slice(0, 3).join('\n      ')}`;
    console.log(`  ${mark} ${result.name} (${result.ms} ms)${detail}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n📊 Results: ${results.length - failed} passed, ${failed} failed`);
  process.exitCode = failed > 0 || exitCode !== 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
