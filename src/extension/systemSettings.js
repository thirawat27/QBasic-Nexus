'use strict';

const vscode = require('vscode');
const { CONFIG } = require('./constants');
const { state } = require('./state');
const { expandHomePath, getConfig } = require('./utils');
const {
  getPreferredConfigTarget,
} = require('./internalBuildSettings');
const {
  findQB64,
  verifyQB64,
} = require('./qb64AutoDetect');
const { getSystemQuickActionItems } = require('./systemSettingsShared');

const COMPILER_MODE_ITEMS = Object.freeze([
  {
    label: 'QB64 (Recommended)',
    detail: 'Native compilation through an external QB64 installation',
    value: CONFIG.MODE_QB64,
  },
  {
    label: 'Qbasic Nexus',
    detail: 'Internal transpiler and packaged executable flow',
    value: CONFIG.MODE_INTERNAL,
  },
  {
    label: 'Qbasic Nexus + WASM',
    detail: 'Internal transpiler with an embedded WebAssembly runtime accelerator',
    value: CONFIG.MODE_INTERNAL_WASM,
  },
]);

const COMPILER_ARGS_PRESETS = Object.freeze([
  {
    label: 'None',
    detail: 'No extra QB64 flags',
    value: '',
  },
  {
    label: 'Warnings',
    detail: 'Pass -w to show QB64 warnings',
    value: '-w',
  },
  {
    label: 'Warnings + Debug',
    detail: 'Pass -w -g for warnings and debug information',
    value: '-w -g',
  },
  {
    label: 'Warnings as Errors',
    detail: 'Pass -w -e for stricter builds',
    value: '-w -e',
  },
]);

const LINT_DELAY_PRESETS = Object.freeze([250, 500, 1000, 2000]);

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

function getWorkspacePath() {
  const activeUri = vscode.window.activeTextEditor?.document?.uri;
  const activeFolder = activeUri
    ? vscode.workspace.getWorkspaceFolder(activeUri)
    : null;
  return (activeFolder || vscode.workspace.workspaceFolders?.[0])?.uri.fsPath || '';
}

async function updateSetting(key, value, target = getPreferredConfigTarget()) {
  await vscode.workspace.getConfiguration(CONFIG.SECTION).update(key, value, target);
  getStatusBarModule().updateStatusBar();
}

function normalizePositiveInteger(value, fallback, minimum = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

async function showSystemQuickActions() {
  const picked = await vscode.window.showQuickPick(
    getSystemQuickActionItems({
      compilerMode: getConfig(CONFIG.COMPILER_MODE, CONFIG.MODE_QB64),
      compilerPath: getConfig(CONFIG.COMPILER_PATH, null),
      autoDetectedCompilerPath: state.autoDetectedCompilerPath,
      compilerArgs: getConfig(CONFIG.COMPILER_ARGS, ''),
      internalTargets: getConfig(CONFIG.INTERNAL_TARGETS, 'host'),
      internalOutputDir: getConfig(CONFIG.INTERNAL_OUTPUT_DIR, ''),
      workspacePath: getWorkspacePath(),
      compileWorkerMaxQueueSize: getConfig(
        CONFIG.COMPILE_WORKER_MAX_QUEUE_SIZE,
        64,
      ),
      compileWorkerRequestTimeoutMs: getConfig(
        CONFIG.COMPILE_WORKER_REQUEST_TIMEOUT_MS,
        30_000,
      ),
      lintWorkerMaxQueueSize: getConfig(CONFIG.LINT_WORKER_MAX_QUEUE_SIZE, 96),
      lintWorkerRequestTimeoutMs: getConfig(
        CONFIG.LINT_WORKER_REQUEST_TIMEOUT_MS,
        15_000,
      ),
      enableLinting: getConfig(CONFIG.ENABLE_LINT, true),
      lintDelay: getConfig(CONFIG.LINT_DELAY, 500),
      autoFormatOnSave: getConfig(CONFIG.AUTO_FORMAT, true),
      lineNumberStart: getConfig(CONFIG.LINE_NUMBER_START, 1),
      lineNumberStep: getConfig(CONFIG.LINE_NUMBER_STEP, 1),
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

async function selectCompilerMode() {
  const currentMode = getConfig(CONFIG.COMPILER_MODE, CONFIG.MODE_QB64);
  const picked = await vscode.window.showQuickPick(
    COMPILER_MODE_ITEMS.map((item) => ({
      ...item,
      description: item.value === currentMode ? 'Current' : '',
    })),
    {
      title: 'QBasic Nexus: Compiler Mode',
      placeHolder: 'Choose the active compilation mode',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  await updateSetting(CONFIG.COMPILER_MODE, picked.value);
  vscode.window.showInformationMessage(`Compiler mode set to ${picked.value}`);
}

async function selectCompilerPath() {
  const currentPath = String(getConfig(CONFIG.COMPILER_PATH, '') || '').trim();
  const autoDetectedPath = state.autoDetectedCompilerPath;
  const quickPickItems = [];

  if (autoDetectedPath) {
    quickPickItems.push({
      label: 'Save Auto-Detected QB64',
      detail: autoDetectedPath,
      value: '__save_detected__',
    });
  }

  quickPickItems.push(
    {
      label: 'Auto-Detect QB64 Now',
      detail: 'Search common install locations and PATH',
      value: '__detect__',
    },
    {
      label: 'Choose Executable…',
      detail: 'Pick qb64.exe / qb64 from disk',
      value: '__pick__',
    },
    {
      label: 'Custom Path…',
      detail: 'Type a full path or ~/ home-relative path',
      value: '__custom__',
    },
    {
      label: 'Clear Saved Path',
      detail: 'Return to on-demand auto-detection',
      value: '__clear__',
    },
  );

  const picked = await vscode.window.showQuickPick(quickPickItems, {
    title: 'QBasic Nexus: QB64 Compiler Path',
    placeHolder: 'Choose how to configure QB64',
    ignoreFocusOut: true,
  });

  if (!picked) return;

  if (picked.value === '__clear__') {
    await updateSetting(CONFIG.COMPILER_PATH, null, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('Cleared saved QB64 compiler path.');
    return;
  }

  let nextPath = null;

  if (picked.value === '__save_detected__') {
    nextPath = autoDetectedPath;
  } else if (picked.value === '__detect__') {
    nextPath = await findQB64();
    if (!nextPath) {
      vscode.window.showWarningMessage(
        'QB64 was not found. Choose the executable manually or install QB64 first.',
      );
      return;
    }
  } else if (picked.value === '__pick__') {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: 'Use QB64 Executable',
    });
    nextPath = selected?.[0]?.fsPath || null;
  } else if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: QB64 Compiler Path',
      prompt: 'Enter the full path to qb64.exe / qb64',
      value: currentPath || autoDetectedPath || '',
      ignoreFocusOut: true,
      async validateInput(value) {
        const normalizedPath = expandHomePath(value);
        if (!normalizedPath) {
          return 'Path is required.';
        }
        return (await verifyQB64(normalizedPath))
          ? null
          : 'That path does not look like a valid QB64 executable.';
      },
    });
    if (input === undefined) return;
    nextPath = expandHomePath(input);
  }

  nextPath = expandHomePath(nextPath);
  if (!nextPath || !(await verifyQB64(nextPath))) {
    vscode.window.showErrorMessage('The selected QB64 path is invalid or not executable.');
    return;
  }

  state.autoDetectedCompilerPath = null;
  await updateSetting(CONFIG.COMPILER_PATH, nextPath, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`QB64 compiler path set to ${nextPath}`);
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
        label: 'Custom…',
        detail: 'Enter your own QB64 flags',
        value: '__custom__',
      },
    ],
    {
      title: 'QBasic Nexus: QB64 Compiler Args',
      placeHolder: 'Choose a preset or enter custom arguments',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextArgs = picked.value;
  if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: QB64 Compiler Args',
      prompt: 'Enter extra QB64 command-line arguments',
      value: currentArgs,
      ignoreFocusOut: true,
    });
    if (input === undefined) return;
    nextArgs = String(input).trim();
  }

  await updateSetting(CONFIG.COMPILER_ARGS, nextArgs);
  const label = nextArgs || 'none';
  vscode.window.showInformationMessage(`QB64 compiler args set to ${label}`);
}

async function selectEnableLinting() {
  const currentValue = !!getConfig(CONFIG.ENABLE_LINT, true);
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Enabled',
        detail: 'Real-time syntax diagnostics stay on',
        value: true,
      },
      {
        label: 'Disabled',
        detail: 'Turn off editor lint diagnostics',
        value: false,
      },
    ].map((item) => ({
      ...item,
      description: item.value === currentValue ? 'Current' : '',
    })),
    {
      title: 'QBasic Nexus: Enable Linting',
      placeHolder: 'Choose whether linting should run in the editor',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  await updateSetting(CONFIG.ENABLE_LINT, picked.value);
  vscode.window.showInformationMessage(
    `Linting ${picked.value ? 'enabled' : 'disabled'}.`,
  );
}

async function selectLintDelay() {
  const currentDelay = normalizePositiveInteger(
    getConfig(CONFIG.LINT_DELAY, 500),
    500,
    100,
  );
  const picked = await vscode.window.showQuickPick(
    [
      ...LINT_DELAY_PRESETS.map((value) => ({
        label: `${value}ms`,
        detail:
          value === 250
            ? 'Fast feedback'
            : value === 500
              ? 'Balanced default'
              : value === 1000
                ? 'Lower CPU usage'
                : 'Large-file friendly',
        description: value === currentDelay ? 'Current' : '',
        value,
      })),
      {
        label: 'Custom…',
        detail: 'Choose any value from 100 to 3000 ms',
        value: '__custom__',
      },
    ],
    {
      title: 'QBasic Nexus: Lint Delay',
      placeHolder: 'Choose how long the editor waits before linting',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextDelay = picked.value;
  if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Lint Delay',
      prompt: 'Enter a delay in milliseconds (100-3000)',
      value: String(currentDelay),
      ignoreFocusOut: true,
      validateInput(value) {
        const parsed = normalizePositiveInteger(value, -1, 100);
        return parsed >= 100 && parsed <= 3000
          ? null
          : 'Lint delay must be an integer between 100 and 3000.';
      },
    });
    if (input === undefined) return;
    nextDelay = normalizePositiveInteger(input, currentDelay, 100);
  }

  await updateSetting(CONFIG.LINT_DELAY, nextDelay);
  vscode.window.showInformationMessage(`Lint delay set to ${nextDelay}ms`);
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
  showSystemQuickActions,
  selectAutoFormat,
  selectCompilerArgs,
  selectCompilerMode,
  selectCompilerPath,
  selectEnableLinting,
  selectLineNumberSettings,
  selectLintDelay,
};
