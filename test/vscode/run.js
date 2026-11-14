/**
 * QBasic Nexus - end-to-end tests inside VS Code.
 *
 *   QBNEX_TEST_COMPILER=<qb>  [QBNEX_TEST_LSP=<qb-lsp>]  [QBNEX_TEST_DAP=<qb-dap>]
 *   [VSCODE_TEST_EXECUTABLE=<Code executable>]  node test/vscode/run.js
 *
 * Starts VS Code with a throw-away profile and this extension, then runs
 * suite.js in its extension host. Without VSCODE_TEST_EXECUTABLE a VS Code
 * build is downloaded.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  if (!process.env.QBNEX_TEST_COMPILER) {
    console.error('Set QBNEX_TEST_COMPILER to a QBNex 2.x compiler (qb).');
    process.exit(2);
  }
  const root = path.resolve(__dirname, '..', '..');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-vscode-'));
  try {
    await runTests({
      vscodeExecutablePath: process.env.VSCODE_TEST_EXECUTABLE || undefined,
      extensionDevelopmentPath: root,
      extensionTestsPath: path.join(__dirname, 'suite.js'),
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        '--skip-welcome',
        '--skip-release-notes',
        `--user-data-dir=${path.join(profile, 'user')}`,
        `--extensions-dir=${path.join(profile, 'extensions')}`,
      ],
      extensionTestsEnv: { ...process.env, QBNX_TEST_WORK: path.join(profile, 'work') },
    });
  } catch (error) {
    console.error(`VS Code tests failed: ${error.message || error}`);
    process.exitCode = 1;
  } finally {
    const report = path.join(profile, 'results.txt');
    if (fs.existsSync(report)) console.log(`\n${fs.readFileSync(report, 'utf8')}`);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  }
}

void main();
