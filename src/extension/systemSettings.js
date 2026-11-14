'use strict';

const vscode = require('vscode');
const { CONFIG, normalizeCompilerMode } = require('./constants');
const { state } = require('./state');
const {
  expandHomePath,
  getConfig,
  getOutputChannel,
  invalidateConfigCache,
} = require('./utils');
const { findQB64, verifyQB64 } = require('./qb64AutoDetect');
const { getSystemQuickActionItems } = require('./systemSettingsShared');
const { findQBNex, verifyQBNex } = require('../toolchain/detect');
const {
  clearToolchainCache,
  resolveQB64,
  resolveQBNex,
} = require('../toolchain/resolve');

const COMPILER_MODE_ITEMS = Object.freeze([
  {
    label: 'Auto',
    detail: 'QBNex 2.x when it is installed, otherwise QB64 / QB64-PE',
    value: CONFIG.MODE_AUTO,
  },
  {
    label: 'QBNex',
    detail: 'Build with the QBNex compiler (qb / qbnex)',
    value: CONFIG.MODE_QBNEX,
  },
  {
    label: 'QB64',
    detail: 'Build with QB64 / QB64-PE (qb64pe / qb64)',
    value: CONFIG.MODE_QB64,
  },
]);

const COMPILER_ARGS_PRESETS = Object.freeze([
  {
    label: 'None',
    detail: 'No extra flags (warnings and OPTION _EXPLICIT have their own settings)',
    value: '',
  },
  {
    label: 'Compact diagnostics (QBNex)',
    detail: 'Pass -k to hide the extra detail notes',
    value: '-k',
  },
]);

const LINE_NUMBER_PRESETS = Object.freeze([
  {
    label: 'Modern Sequential',
    detail: 'Start 1, step 1',
    start: 1,
    step: 1,
  },
  {
    label: 'Classic BASIC',
    detail: 'Start 10, step 10',
    start: 10,
    step: 10,
  },
  {
    label: 'Wide Legacy',
    detail: 'Start 100, step 100',
    start: 100,
    step: 100,
  },
]);

function getStatusBarModule() {
  return require('./statusBar');
}

function getPreferredWorkspaceFolder() {
  const activeUri = vscode.window.activeTextEditor?.document?.uri;
  return (activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : null) ||
    vscode.workspace.workspaceFolders?.[0] ||
    null;
}

function getWorkspacePath() {
  return getPreferredWorkspaceFolder()?.uri.fsPath || '';
}

function getPreferredConfigTarget() {
  return getPreferredWorkspaceFolder()
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Global;
}

async function updateSetting(key, value, target = getPreferredConfigTarget()) {
  await vscode.workspace.getConfiguration(CONFIG.SECTION).update(key, value, target);
  // onDidChangeConfiguration is not guaranteed to have fired yet, so drop the
  // cached snapshot here to keep the immediate re-read below correct.
  invalidateConfigCache();
  getStatusBarModule().updateStatusBar();
}

function normalizePositiveInteger(value, fallback, minimum = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

async function showSystemQuickActions() {
  const picked = await vscode.window.showQuickPick(
    getSystemQuickActionItems({
      activeToolchain: state.activeToolchain,
      compilerMode: getConfig(CONFIG.COMPILER_MODE),
      compilerPath: getConfig(CONFIG.COMPILER_PATH, null),
      qbnexPath: getConfig(CONFIG.QBNEX_PATH, null),
      autoDetectedCompilerPath: state.autoDetectedCompilerPath,
      compilerArgs: getConfig(CONFIG.COMPILER_ARGS, ''),
      outputDirectory: getConfig(CONFIG.OUTPUT_DIRECTORY, ''),
      workspacePath: getWorkspacePath(),
      showWarnings: getConfig(CONFIG.SHOW_WARNINGS),
      warningsAsErrors: getConfig(CONFIG.WARNINGS_AS_ERRORS),
      optionExplicit: getConfig(CONFIG.EXPLICIT),
      enableLinting: getConfig(CONFIG.ENABLE_LINT, true),
      formatter: getConfig(CONFIG.FORMATTER),
      autoFormatOnSave: getConfig(CONFIG.AUTO_FORMAT, true),
      lineNumberStart: getConfig(CONFIG.LINE_NUMBER_START, 1),
      lineNumberStep: getConfig(CONFIG.LINE_NUMBER_STEP, 1),
      languageServerRunning: state.languageServerRunning,
    }),
    {
      title: 'QBasic Nexus: Configure System',
      placeHolder: 'Choose a setting to adjust',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;
  await vscode.commands.executeCommand(picked.command);
}

async function showToolchainInfo() {
  clearToolchainCache();
  const [qbnex, qb64] = await Promise.all([resolveQBNex(), resolveQB64()]);
  const { resolveToolchain } = require('../toolchain/resolve');
  const active = await resolveToolchain();
  state.activeToolchain = active || null;
  getStatusBarModule().updateStatusBar();

  const channel = getOutputChannel();
  const describe = (toolchain, hint) => {
    if (!toolchain) return `not found (${hint})`;
    const notes = [];
    if (toolchain.autoDetected) notes.push('auto-detected');
    if (!toolchain.supported) notes.push('older than 2.0: update for full support');
    return `${toolchain.label} at ${toolchain.path}${notes.length ? ` [${notes.join(', ')}]` : ''}`;
  };
  channel.appendLine('QBasic Nexus toolchain');
  channel.appendLine(`  Mode:            ${normalizeCompilerMode(getConfig(CONFIG.COMPILER_MODE))}`);
  channel.appendLine(`  Active:          ${active ? active.label : 'none'}`);
  channel.appendLine(`  QBNex:           ${describe(qbnex, 'set qbasic-nexus.qbnexPath')}`);
  channel.appendLine(`  QB64:            ${describe(qb64, 'set qbasic-nexus.compilerPath')}`);
  channel.appendLine(`  Language server: ${state.languageServerRunning ? 'qb-lsp running' : 'not running'}`);
  channel.appendLine('');
  channel.show(true);
}

async function selectCompilerMode() {
  const currentMode = normalizeCompilerMode(getConfig(CONFIG.COMPILER_MODE));
  const picked = await vscode.window.showQuickPick(
    COMPILER_MODE_ITEMS.map((item) => ({
      ...item,
      description: item.value === currentMode ? 'Current' : '',
    })),
    {
      title: 'QBasic Nexus: Compiler Mode',
      placeHolder: 'Choose the compiler used to build and check programs',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  await updateSetting(CONFIG.COMPILER_MODE, picked.value);
  vscode.window.showInformationMessage(`Compiler mode set to ${picked.value}`);
}

/**
 * Shared flow for choosing a compiler executable.
 * @param {{ key: string, name: string, find: () => Promise<string|null>, verify: (p: string) => Promise<boolean>, autoDetected?: string|null }} spec
 */
async function selectExecutablePath(spec) {
  const currentPath = String(getConfig(spec.key, '') || '').trim();
  const items = [];
  if (spec.autoDetected) {
    items.push({ label: `Save Auto-Detected ${spec.name}`, detail: spec.autoDetected, value: '__save_detected__' });
  }
  items.push(
    { label: `Auto-Detect ${spec.name} Now`, detail: 'Search PATH and common install locations', value: '__detect__' },
    { label: 'Choose Executable...', detail: `Pick the ${spec.name} executable from disk`, value: '__pick__' },
    { label: 'Custom Path...', detail: 'Type a full path or ~/ home-relative path', value: '__custom__' },
    { label: 'Clear Saved Path', detail: 'Return to auto-detection', value: '__clear__' },
  );

  const picked = await vscode.window.showQuickPick(items, {
    title: `QBasic Nexus: ${spec.name} Compiler Path`,
    placeHolder: `Choose how to configure ${spec.name}`,
    ignoreFocusOut: true,
  });
  if (!picked) return;

  if (picked.value === '__clear__') {
    await updateSetting(spec.key, null, vscode.ConfigurationTarget.Global);
    clearToolchainCache();
    vscode.window.showInformationMessage(`Cleared saved ${spec.name} compiler path.`);
    return;
  }

  let nextPath = null;
  if (picked.value === '__save_detected__') {
    nextPath = spec.autoDetected;
  } else if (picked.value === '__detect__') {
    nextPath = await spec.find();
    if (!nextPath) {
      vscode.window.showWarningMessage(`${spec.name} was not found. Choose the executable manually or install it first.`);
      return;
    }
  } else if (picked.value === '__pick__') {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: `Use ${spec.name} Executable`,
    });
    nextPath = selected?.[0]?.fsPath || null;
  } else if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: `QBasic Nexus: ${spec.name} Compiler Path`,
      prompt: `Enter the full path to the ${spec.name} executable`,
      value: currentPath || spec.autoDetected || '',
      ignoreFocusOut: true,
    });
    if (input === undefined) return;
    nextPath = input;
  }

  nextPath = expandHomePath(nextPath);
  if (!nextPath || !(await spec.verify(nextPath))) {
    vscode.window.showErrorMessage(`The selected path is not a working ${spec.name} executable.`);
    return;
  }

  await updateSetting(spec.key, nextPath, vscode.ConfigurationTarget.Global);
  clearToolchainCache();
  state.activeToolchain = undefined;
  getStatusBarModule().updateStatusBar();
  vscode.window.showInformationMessage(`${spec.name} compiler path set to ${nextPath}`);
}

async function selectCompilerPath() {
  await selectExecutablePath({
    key: CONFIG.COMPILER_PATH,
    name: 'QB64',
    find: findQB64,
    verify: verifyQB64,
    autoDetected: state.autoDetectedCompilerPath,
  });
}

async function selectQBNexPath() {
  await selectExecutablePath({
    key: CONFIG.QBNEX_PATH,
    name: 'QBNex',
    find: async () => (await findQBNex())?.path || null,
    verify: async (candidate) => !!(await verifyQBNex(candidate)),
    autoDetected: state.activeToolchain?.kind === 'qbnex' && state.activeToolchain.autoDetected
      ? state.activeToolchain.path
      : null,
  });
}

async function selectCompilerArgs() {
  const currentArgs = String(getConfig(CONFIG.COMPILER_ARGS, '') || '').trim();
  const picked = await vscode.window.showQuickPick(
    [
      ...COMPILER_ARGS_PRESETS.map((item) => ({
        ...item,
        description: item.value === currentArgs ? 'Current' : '',
      })),
      {
        label: 'Custom...',
        detail: 'Enter your own compiler flags',
        value: '__custom__',
      },
    ],
    {
      title: 'QBasic Nexus: Extra Compiler Args',
      placeHolder: 'Choose a preset or enter custom arguments',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextArgs = picked.value;
  if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Extra Compiler Args',
      prompt: 'Extra command-line arguments passed to QBNex or QB64',
      value: currentArgs,
      ignoreFocusOut: true,
    });
    if (input === undefined) return;
    nextArgs = String(input).trim();
  }

  await updateSetting(CONFIG.COMPILER_ARGS, nextArgs);
  vscode.window.showInformationMessage(`Extra compiler args set to ${nextArgs || 'none'}`);
}

async function selectDiagnosticFlags() {
  const items = [
    {
      label: 'Show warnings',
      detail: 'Pass -w (QBNex and QB64)',
      key: CONFIG.SHOW_WARNINGS,
    },
    {
      label: 'Warnings as errors',
      detail: 'Pass -Werror (QBNex only; QB64 has no such switch)',
      key: CONFIG.WARNINGS_AS_ERRORS,
    },
    {
      label: 'OPTION _EXPLICIT',
      detail: 'Pass -e: every variable must be declared',
      key: CONFIG.EXPLICIT,
    },
  ].map((item) => ({ ...item, picked: !!getConfig(item.key) }));

  const picked = await vscode.window.showQuickPick(items, {
    title: 'QBasic Nexus: Diagnostics Flags',
    placeHolder: 'Choose the flags every build and check uses',
    canPickMany: true,
    ignoreFocusOut: true,
  });
  if (!picked) return;

  for (const item of items) {
    await updateSetting(item.key, picked.includes(item));
  }
  vscode.window.showInformationMessage('Diagnostics flags updated.');
}

async function selectOutputDirectory() {
  const current = String(getConfig(CONFIG.OUTPUT_DIRECTORY, '') || '').trim();
  const workspacePath = getWorkspacePath();
  const picked = await vscode.window.showQuickPick(
    [
      { label: 'Beside the source file', detail: 'Default', value: '' },
      ...(workspacePath ? [{ label: 'bin in the workspace', detail: 'bin', value: 'bin' }] : []),
      { label: 'Choose Folder...', detail: 'Pick any folder', value: '__pick__' },
      { label: 'Custom Path...', detail: 'Absolute, ~/..., or relative to the workspace', value: '__custom__' },
    ].map((item) => ({ ...item, description: item.value === current ? 'Current' : '' })),
    {
      title: 'QBasic Nexus: Output Folder',
      placeHolder: 'Where compiled programs are written',
      ignoreFocusOut: true,
    },
  );
  if (!picked) return;

  let next = picked.value;
  if (next === '__pick__') {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Use Folder',
    });
    if (!selected?.[0]) return;
    next = selected[0].fsPath;
  } else if (next === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Output Folder',
      prompt: 'Output folder for compiled programs',
      value: current,
      ignoreFocusOut: true,
    });
    if (input === undefined) return;
    next = String(input).trim();
  }

  await updateSetting(CONFIG.OUTPUT_DIRECTORY, next);
  vscode.window.showInformationMessage(`Output folder set to ${next || 'beside the source file'}`);
}

async function selectEnableLinting() {
  const currentValue = !!getConfig(CONFIG.ENABLE_LINT, true);
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Enabled',
        detail: 'Check each saved file with the compiler (QBNex: as you type through qb-lsp)',
        value: true,
      },
      {
        label: 'Disabled',
        detail: 'Report errors only when you compile',
        value: false,
      },
    ].map((item) => ({
      ...item,
      description: item.value === currentValue ? 'Current' : '',
    })),
    {
      title: 'QBasic Nexus: Check On Save',
      placeHolder: 'Choose whether saved files are checked by the compiler',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  await updateSetting(CONFIG.ENABLE_LINT, picked.value);
  vscode.window.showInformationMessage(
    `Check on save ${picked.value ? 'enabled' : 'disabled'}.`,
  );
}

async function selectFormatter() {
  const current = getConfig(CONFIG.FORMATTER);
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Built-in',
        detail: 'QBasic Nexus formatter: indentation and keyword case',
        value: CONFIG.FORMATTER_BUILTIN,
      },
      {
        label: 'qb-fmt',
        detail: 'The QBNex formatter (qb-fmt next to the compiler, or on PATH)',
        value: CONFIG.FORMATTER_QB_FMT,
      },
    ].map((item) => ({ ...item, description: item.value === current ? 'Current' : '' })),
    {
      title: 'QBasic Nexus: Formatter',
      placeHolder: 'Choose the formatter for Format Document and format on save',
      ignoreFocusOut: true,
    },
  );
  if (!picked) return;
  await updateSetting(CONFIG.FORMATTER, picked.value);
  vscode.window.showInformationMessage(`Formatter set to ${picked.label}.`);
}

async function selectAutoFormat() {
  const currentValue = !!getConfig(CONFIG.AUTO_FORMAT, true);
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Enabled',
        detail: 'Format and capitalize keywords when saving',
        value: true,
      },
      {
        label: 'Disabled',
        detail: 'Save without automatic formatting',
        value: false,
      },
    ].map((item) => ({
      ...item,
      description: item.value === currentValue ? 'Current' : '',
    })),
    {
      title: 'QBasic Nexus: Auto Format On Save',
      placeHolder: 'Choose whether save should auto-format QBasic files',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  await updateSetting(CONFIG.AUTO_FORMAT, picked.value);
  vscode.window.showInformationMessage(
    `Auto format on save ${picked.value ? 'enabled' : 'disabled'}.`,
  );
}

async function selectLineNumberSettings() {
  const currentStart = normalizePositiveInteger(
    getConfig(CONFIG.LINE_NUMBER_START, 1),
    1,
  );
  const currentStep = normalizePositiveInteger(
    getConfig(CONFIG.LINE_NUMBER_STEP, 1),
    1,
  );
  const picked = await vscode.window.showQuickPick(
    [
      ...LINE_NUMBER_PRESETS.map((item) => ({
        ...item,
        description:
          item.start === currentStart && item.step === currentStep
            ? 'Current'
            : '',
      })),
      {
        label: 'Custom…',
        detail: 'Set your own start and step values',
        value: '__custom__',
      },
    ],
    {
      title: 'QBasic Nexus: Line Number Defaults',
      placeHolder: 'Choose renumbering defaults',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextStart = picked.start;
  let nextStep = picked.step;

  if (picked.value === '__custom__') {
    const startInput = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Line Number Start',
      prompt: 'Enter the starting line number (integer >= 1)',
      value: String(currentStart),
      ignoreFocusOut: true,
      validateInput(value) {
        return normalizePositiveInteger(value, -1) >= 1
          ? null
          : 'Line number start must be an integer greater than or equal to 1.';
      },
    });
    if (startInput === undefined) return;

    const stepInput = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Line Number Step',
      prompt: 'Enter the line number increment (integer >= 1)',
      value: String(currentStep),
      ignoreFocusOut: true,
      validateInput(value) {
        return normalizePositiveInteger(value, -1) >= 1
          ? null
          : 'Line number step must be an integer greater than or equal to 1.';
      },
    });
    if (stepInput === undefined) return;

    nextStart = normalizePositiveInteger(startInput, currentStart);
    nextStep = normalizePositiveInteger(stepInput, currentStep);
  }

  await updateSetting(CONFIG.LINE_NUMBER_START, nextStart);
  await updateSetting(CONFIG.LINE_NUMBER_STEP, nextStep);
  vscode.window.showInformationMessage(
    `Line number defaults set to start ${nextStart} with step ${nextStep}.`,
  );
}

module.exports = {
  getPreferredConfigTarget,
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
};
