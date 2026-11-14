'use strict';

const path = require('path');

const { CONFIG, COMMANDS } = require('../src/extension/constants');

// A workspace folder written the host's way, so the tests pass on every OS.
const WORKSPACE = path.join(path.parse(process.cwd()).root, 'Work', 'Game');
const {
  formatCompilerArgsLabel,
  formatCompilerPathLabel,
  formatDiagnosticFlagsLabel,
  formatLineNumberSettingsLabel,
  formatOutputDirectoryLabel,
  formatToolchainLabel,
  getSystemQuickActionItems,
} = require('../src/extension/systemSettingsShared');

console.log('\n⚙️  System Settings Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('Compiler path label prefers configured paths', () => {
  const label = formatCompilerPathLabel('C:\\QB64\\qb64.exe', 'D:\\QB64\\qb64.exe');
  assert(label === 'C:\\QB64\\qb64.exe', 'Expected configured path to override auto-detected path');
});

test('Compiler path label falls back to auto-detected paths', () => {
  const label = formatCompilerPathLabel('', 'D:\\QB64\\qb64.exe');
  assert(
    label === 'Auto-detected: D:\\QB64\\qb64.exe',
    'Expected auto-detected path label when no saved path exists',
  );
});

test('Compiler args label reports None when empty', () => {
  assert(formatCompilerArgsLabel('') === 'None', 'Expected empty compiler args to render as None');
});

test('Line number labels summarize start and step', () => {
  assert(
    formatLineNumberSettingsLabel(10, 10) === 'Start 10 | Step 10',
    'Expected line number summary label',
  );
});

test('Diagnostics flag labels list the active flags', () => {
  assert(formatDiagnosticFlagsLabel({}) === 'None', 'Expected None without flags');
  assert(
    formatDiagnosticFlagsLabel({ showWarnings: true, optionExplicit: true }) === 'warnings, OPTION _EXPLICIT',
    'Expected the enabled flags in order',
  );
});

test('Output folder labels describe the default and relative folders', () => {
  assert(formatOutputDirectoryLabel('') === 'Beside the source file', 'Expected the default label');
  assert(
    formatOutputDirectoryLabel('bin', WORKSPACE) === 'bin (in Game)',
    'Expected relative folders to name the workspace',
  );
});

test('Toolchain labels cover detecting, missing and found', () => {
  assert(formatToolchainLabel(undefined) === 'Detecting...', 'Expected detecting label');
  assert(formatToolchainLabel(null) === 'None found', 'Expected missing label');
  assert(
    formatToolchainLabel({ label: 'QBNex 2.0.0', path: '/opt/qbnex/qb' }) === 'QBNex 2.0.0 (/opt/qbnex/qb)',
    'Expected label with path',
  );
});

test('System quick actions cover every configurable setting', () => {
  const items = getSystemQuickActionItems({
    compilerMode: CONFIG.MODE_AUTO,
    compilerPath: '',
    qbnexPath: '',
    autoDetectedCompilerPath: 'C:\\QB64\\qb64pe.exe',
    compilerArgs: '-k',
    outputDirectory: 'bin',
    workspacePath: WORKSPACE,
    showWarnings: true,
    enableLinting: true,
    formatter: CONFIG.FORMATTER_BUILTIN,
    autoFormatOnSave: true,
    lineNumberStart: 10,
    lineNumberStep: 10,
  });

  const commands = items.map((item) => item.command);
  for (const command of [
    COMMANDS.SHOW_TOOLCHAIN_INFO,
    COMMANDS.SELECT_COMPILER_MODE,
    COMMANDS.SELECT_QBNEX_PATH,
    COMMANDS.SELECT_COMPILER_PATH,
    COMMANDS.SELECT_DIAGNOSTIC_FLAGS,
    COMMANDS.SELECT_COMPILER_ARGS,
    COMMANDS.SELECT_OUTPUT_DIRECTORY,
    COMMANDS.SELECT_ENABLE_LINTING,
    COMMANDS.SELECT_FORMATTER,
    COMMANDS.SELECT_AUTO_FORMAT,
    COMMANDS.SELECT_LINE_NUMBER_SETTINGS,
    COMMANDS.RESTART_LANGUAGE_SERVER,
  ]) {
    assert(commands.includes(command), `Expected a quick action for ${command}`);
  }
  const output = items.find((item) => item.command === COMMANDS.SELECT_OUTPUT_DIRECTORY);
  assert(output.detail.includes('bin (in Game)'), 'Expected the output folder detail');
});

test('Quick actions show legacy modes as their replacement', () => {
  const items = getSystemQuickActionItems({ compilerMode: 'QB64 (Recommended)' });
  const mode = items.find((item) => item.command === COMMANDS.SELECT_COMPILER_MODE);
  assert(mode.detail === 'Current: QB64', 'Expected the 1.x QB64 mode to read as QB64');
  const qbnex = items.find((item) => item.command === COMMANDS.SELECT_QBNEX_PATH);
  assert(qbnex.description === 'Unused in QB64 mode', 'Expected the QBNex path to be marked unused');
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${err.message}`);
      failed++;
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED\n`);

  process.exit(failed > 0 ? 1 : 0);
}

void run();
