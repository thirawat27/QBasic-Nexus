'use strict';

const path = require('path');
let vscode = null;
try {
  vscode = require('vscode');
} catch (_error) {
  vscode = null;
}
const { CONFIG, COMMANDS } = require('./constants');
const { validatePackagerTargets } = require('./executableUtils');

const TARGET_PRESETS = Object.freeze([
  {
    label: 'Host Only',
    detail: 'Build only for the current machine',
    value: 'host',
  },
  {
    label: 'Host + Linux x64',
    detail: 'Build the host target plus a portable Linux x64 binary',
    value: 'host,linux-x64',
  },
  {
    label: 'Host + Windows x64',
    detail: 'Build the host target plus a Windows x64 binary',
    value: 'host,win-x64',
  },
  {
    label: 'Host + macOS arm64',
    detail: 'Build the host target plus a macOS arm64 binary',
    value: 'host,macos-arm64',
  },
  {
    label: 'Cross-Platform Trio',
    detail: 'Build Windows, Linux, and macOS targets together',
    value: 'win-x64,linux-x64,macos-arm64',
  },
]);

const COMPILE_WORKER_PRESETS = Object.freeze([
  {
    label: 'Balanced (Default)',
    detail: 'Queue 64, Timeout 30000ms',
    maxQueueSize: 64,
    requestTimeoutMs: 30_000,
  },
  {
    label: 'High Throughput',
    detail: 'Queue 256, Timeout 45000ms',
    maxQueueSize: 256,
    requestTimeoutMs: 45_000,
  },
  {
    label: 'Low-Latency Guard',
    detail: 'Queue 32, Timeout 10000ms',
    maxQueueSize: 32,
    requestTimeoutMs: 10_000,
  },
]);

const LINT_WORKER_PRESETS = Object.freeze([
  {
    label: 'Balanced (Default)',
    detail: 'Queue 96, Timeout 15000ms',
    maxQueueSize: 96,
    requestTimeoutMs: 15_000,
  },
  {
    label: 'Large Workspace',
    detail: 'Queue 256, Timeout 25000ms',
    maxQueueSize: 256,
    requestTimeoutMs: 25_000,
  },
  {
    label: 'Aggressive Recovery',
    detail: 'Queue 64, Timeout 5000ms',
    maxQueueSize: 64,
    requestTimeoutMs: 5_000,
  },
]);

function normalizeIntegerSetting(value, fallback, minimum = 0) {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized < minimum) {
    return fallback;
  }

  return normalized;
}

function formatWorkerResilienceLabel(maxQueueSize, requestTimeoutMs) {
  const timeoutLabel =
    requestTimeoutMs === 0 ? 'Off' : `${requestTimeoutMs}ms`;
  return `Queue ${maxQueueSize} | Timeout ${timeoutLabel}`;
}

function getWorkerResiliencePresetItems(
  presets,
  currentMaxQueueSize,
  currentRequestTimeoutMs,
) {
  return presets.map((preset) => ({
    label: preset.label,
    detail: preset.detail,
    description:
      preset.maxQueueSize === currentMaxQueueSize &&
      preset.requestTimeoutMs === currentRequestTimeoutMs
        ? 'Current'
        : '',
    maxQueueSize: preset.maxQueueSize,
    requestTimeoutMs: preset.requestTimeoutMs,
    value: '__preset__',
  }));
}

function getPreferredWorkspaceFolder() {
  if (!vscode?.window || !vscode?.workspace) {
    return null;
  }
  const activeUri = vscode.window.activeTextEditor?.document?.uri;
  if (activeUri) {
    const activeFolder = vscode.workspace.getWorkspaceFolder(activeUri);
    if (activeFolder) return activeFolder;
  }
  return vscode.workspace.workspaceFolders?.[0] || null;
}

function getPreferredConfigTarget() {
  if (!vscode) {
    return null;
  }
  return getPreferredWorkspaceFolder()
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Global;
}

function normalizeOutputDirSettingValue(selectedDir, workspaceDir) {
  const normalizedSelected = path.normalize(String(selectedDir || '').trim());
  if (!normalizedSelected) return '';

  const normalizedWorkspace = workspaceDir
    ? path.normalize(String(workspaceDir))
    : '';
  if (normalizedWorkspace) {
    const relativePath = path.relative(normalizedWorkspace, normalizedSelected);
    if (relativePath === '') {
      return '.';
    }
    if (
      relativePath &&
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath)
    ) {
      return relativePath.replace(/\\/g, '/');
    }
  }

  return normalizedSelected;
}

function formatInternalOutputDirLabel(currentValue, workspaceDir = '') {
  const normalizedValue = String(currentValue || '').trim();
  if (!normalizedValue) {
    return 'Beside source file';
  }

  if (normalizedValue === '.') {
    return workspaceDir
      ? path.basename(workspaceDir) || workspaceDir
      : 'Workspace root';
  }

  if (!path.isAbsolute(normalizedValue) && workspaceDir) {
    return path.join(workspaceDir, normalizedValue);
  }

  return normalizedValue;
}

function getInternalTargetPresetItems(currentValue) {
  let normalizedCurrent = '';
  try {
    normalizedCurrent = validatePackagerTargets(currentValue).join(',');
  } catch {
    normalizedCurrent = '';
  }

  return TARGET_PRESETS.map((preset) => ({
    label: preset.label,
    detail: preset.detail,
    description: preset.value === normalizedCurrent ? 'Current' : '',
    value: preset.value,
  }));
}

function getInternalBuildQuickActionItems(
  currentTargets,
  currentOutputDir,
  workspaceDir = '',
  compileWorkerMaxQueueSize = 64,
  compileWorkerRequestTimeoutMs = 30_000,
  lintWorkerMaxQueueSize = 96,
  lintWorkerRequestTimeoutMs = 15_000,
) {
  let targetLabel;
  try {
    targetLabel = validatePackagerTargets(currentTargets || 'host').join(', ');
  } catch (error) {
    targetLabel = `Invalid target (${error.message})`;
  }

  return [
    {
      label: 'Build Targets',
      detail: `Current: ${targetLabel}`,
      command: COMMANDS.SELECT_INTERNAL_TARGETS,
    },
    {
      label: 'Output Folder',
      detail: `Current: ${formatInternalOutputDirLabel(currentOutputDir, workspaceDir)}`,
      command: COMMANDS.SELECT_INTERNAL_OUTPUT_DIR,
    },
    {
      label: 'Compile Worker Resilience',
      detail: `Current: ${formatWorkerResilienceLabel(compileWorkerMaxQueueSize, compileWorkerRequestTimeoutMs)}`,
      command: COMMANDS.SELECT_COMPILE_WORKER_RESILIENCE,
    },
    {
      label: 'Lint Worker Resilience',
      detail: `Current: ${formatWorkerResilienceLabel(lintWorkerMaxQueueSize, lintWorkerRequestTimeoutMs)}`,
      command: COMMANDS.SELECT_LINT_WORKER_RESILIENCE,
    },
  ];
}

async function showInternalBuildQuickActions() {
  if (!vscode?.window || !vscode?.workspace) {
    throw new Error('VS Code API is not available.');
  }

  const { getConfig } = require('./utils');
  const workspaceFolder = getPreferredWorkspaceFolder();
  const workspacePath = workspaceFolder?.uri.fsPath || '';
  const picked = await vscode.window.showQuickPick(
    getInternalBuildQuickActionItems(
      getConfig(CONFIG.INTERNAL_TARGETS, 'host'),
      getConfig(CONFIG.INTERNAL_OUTPUT_DIR, ''),
      workspacePath,
      normalizeIntegerSetting(
        getConfig(CONFIG.COMPILE_WORKER_MAX_QUEUE_SIZE, 64),
        64,
        1,
      ),
      normalizeIntegerSetting(
        getConfig(CONFIG.COMPILE_WORKER_REQUEST_TIMEOUT_MS, 30_000),
        30_000,
        0,
      ),
      normalizeIntegerSetting(
        getConfig(CONFIG.LINT_WORKER_MAX_QUEUE_SIZE, 96),
        96,
        1,
      ),
      normalizeIntegerSetting(
        getConfig(CONFIG.LINT_WORKER_REQUEST_TIMEOUT_MS, 15_000),
        15_000,
        0,
      ),
    ),
    {
      title: 'QBasic Nexus: Internal Build Quick Actions',
      placeHolder: 'Choose which internal build setting to edit',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;
  await vscode.commands.executeCommand(picked.command);
}

async function selectInternalTargets() {
  if (!vscode?.window || !vscode?.workspace) {
    throw new Error('VS Code API is not available.');
  }
  const { getConfig } = require('./utils');
  const { updateStatusBar } = require('./statusBar');
  const currentValue = getConfig(CONFIG.INTERNAL_TARGETS, 'host');
  const presetItems = getInternalTargetPresetItems(currentValue);
  const picked = await vscode.window.showQuickPick(
    [
      ...presetItems,
      {
        label: 'Custom…',
        detail: 'Enter a custom comma-separated pkg target list',
        value: '__custom__',
      },
    ],
    {
      title: 'QBasic Nexus: Internal Build Targets',
      placeHolder: 'Choose a target preset or enter a custom pkg target list',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextValue = picked.value;
  if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Internal Build Targets',
      prompt: 'Enter one or more pkg targets (comma-separated)',
      value: currentValue,
      ignoreFocusOut: true,
      validateInput(value) {
        try {
          validatePackagerTargets(value);
          return null;
        } catch (error) {
          return error.message;
        }
      },
    });
    if (input === undefined) return;
    nextValue = validatePackagerTargets(input).join(',');
  }

  await vscode.workspace
    .getConfiguration(CONFIG.SECTION)
    .update(
      CONFIG.INTERNAL_TARGETS,
      nextValue,
      getPreferredConfigTarget(),
    );
  updateStatusBar();
  vscode.window.showInformationMessage(`Internal build targets set to ${nextValue}`);
}

async function selectInternalOutputDir() {
  if (!vscode?.window || !vscode?.workspace) {
    throw new Error('VS Code API is not available.');
  }
  const { getConfig } = require('./utils');
  const { updateStatusBar } = require('./statusBar');
  const workspaceFolder = getPreferredWorkspaceFolder();
  const workspacePath = workspaceFolder?.uri.fsPath || '';
  const currentValue = getConfig(CONFIG.INTERNAL_OUTPUT_DIR, '');
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Beside Source File',
        detail: 'Write packaged binaries next to the current .bas source',
        value: '',
      },
      {
        label: 'Workspace dist/',
        detail: workspacePath
          ? path.join(workspacePath, 'dist')
          : 'Use ./dist inside the active workspace',
        value: 'dist',
      },
      {
        label: 'Workspace build/artifacts/',
        detail: workspacePath
          ? path.join(workspacePath, 'build', 'artifacts')
          : 'Use ./build/artifacts inside the active workspace',
        value: 'build/artifacts',
      },
      {
        label: 'Choose Folder…',
        detail: 'Pick a folder from the file system',
        value: '__pick__',
      },
      {
        label: 'Custom Path…',
        detail: 'Enter a relative, absolute, or ~/ home-relative path',
        value: '__custom__',
      },
    ],
    {
      title: 'QBasic Nexus: Internal Build Output Folder',
      placeHolder: 'Choose where internal build artifacts should be written',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextValue = picked.value;
  if (picked.value === '__pick__') {
    const folder = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: workspaceFolder?.uri,
      openLabel: 'Use Output Folder',
    });
    if (!folder?.[0]) return;
    nextValue = normalizeOutputDirSettingValue(
      folder[0].fsPath,
      workspacePath,
    );
  } else if (picked.value === '__custom__') {
    const input = await vscode.window.showInputBox({
      title: 'QBasic Nexus: Internal Build Output Folder',
      prompt:
        'Enter an output folder. Leave empty to write beside the source file.',
      value: currentValue,
      ignoreFocusOut: true,
    });
    if (input === undefined) return;
    nextValue = String(input).trim();
  }

  await vscode.workspace
    .getConfiguration(CONFIG.SECTION)
    .update(
      CONFIG.INTERNAL_OUTPUT_DIR,
      nextValue,
      getPreferredConfigTarget(),
    );
  updateStatusBar();
  const label = nextValue || 'beside the source file';
  vscode.window.showInformationMessage(`Internal output folder set to ${label}`);
}

async function selectWorkerResilienceSetting(options = {}) {
  if (!vscode?.window || !vscode?.workspace) {
    throw new Error('VS Code API is not available.');
  }

  const {
    title,
    maxQueueConfigKey,
    timeoutConfigKey,
    defaultMaxQueue,
    defaultTimeout,
    presets,
    successPrefix,
  } = options;

  const { getConfig } = require('./utils');
  const { updateStatusBar } = require('./statusBar');

  const currentMaxQueue = normalizeIntegerSetting(
    getConfig(maxQueueConfigKey, defaultMaxQueue),
    defaultMaxQueue,
    1,
  );
  const currentTimeout = normalizeIntegerSetting(
    getConfig(timeoutConfigKey, defaultTimeout),
    defaultTimeout,
    0,
  );

  const picked = await vscode.window.showQuickPick(
    [
      ...getWorkerResiliencePresetItems(
        presets,
        currentMaxQueue,
        currentTimeout,
      ),
      {
        label: 'Custom…',
        detail: 'Set queue and timeout manually',
        value: '__custom__',
      },
    ],
    {
      title,
      placeHolder: 'Choose a preset or enter custom values',
      ignoreFocusOut: true,
    },
  );

  if (!picked) return;

  let nextMaxQueue;
  let nextTimeout;

  if (picked.value === '__custom__') {
    const queueInput = await vscode.window.showInputBox({
      title,
      prompt: 'Maximum queue size (integer >= 1)',
      value: String(currentMaxQueue),
      ignoreFocusOut: true,
      validateInput(value) {
        const normalized = normalizeIntegerSetting(value, -1, 1);
        return normalized < 1
          ? 'Queue size must be an integer greater than or equal to 1.'
          : null;
      },
    });
    if (queueInput === undefined) return;

    const timeoutInput = await vscode.window.showInputBox({
      title,
      prompt: 'Request timeout in milliseconds (integer >= 0, 0 disables timeout)',
      value: String(currentTimeout),
      ignoreFocusOut: true,
      validateInput(value) {
        const normalized = normalizeIntegerSetting(value, -1, 0);
        return normalized < 0
          ? 'Timeout must be an integer greater than or equal to 0.'
          : null;
      },
    });
    if (timeoutInput === undefined) return;

    nextMaxQueue = normalizeIntegerSetting(queueInput, currentMaxQueue, 1);
    nextTimeout = normalizeIntegerSetting(timeoutInput, currentTimeout, 0);
  } else {
    nextMaxQueue = normalizeIntegerSetting(
      picked.maxQueueSize,
      currentMaxQueue,
      1,
    );
    nextTimeout = normalizeIntegerSetting(
      picked.requestTimeoutMs,
      currentTimeout,
      0,
    );
  }

  const target = getPreferredConfigTarget();
  const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
  await config.update(maxQueueConfigKey, nextMaxQueue, target);
  await config.update(timeoutConfigKey, nextTimeout, target);

  updateStatusBar();
  vscode.window.showInformationMessage(
    `${successPrefix} set to ${formatWorkerResilienceLabel(nextMaxQueue, nextTimeout)}`,
  );
}

async function selectCompileWorkerResilience() {
  return selectWorkerResilienceSetting({
    title: 'QBasic Nexus: Compile Worker Resilience',
    maxQueueConfigKey: CONFIG.COMPILE_WORKER_MAX_QUEUE_SIZE,
    timeoutConfigKey: CONFIG.COMPILE_WORKER_REQUEST_TIMEOUT_MS,
    defaultMaxQueue: 64,
    defaultTimeout: 30_000,
    presets: COMPILE_WORKER_PRESETS,
    successPrefix: 'Compile worker resilience',
  });
}

async function selectLintWorkerResilience() {
  return selectWorkerResilienceSetting({
    title: 'QBasic Nexus: Lint Worker Resilience',
    maxQueueConfigKey: CONFIG.LINT_WORKER_MAX_QUEUE_SIZE,
    timeoutConfigKey: CONFIG.LINT_WORKER_REQUEST_TIMEOUT_MS,
    defaultMaxQueue: 96,
    defaultTimeout: 15_000,
    presets: LINT_WORKER_PRESETS,
    successPrefix: 'Lint worker resilience',
  });
}

module.exports = {
  COMPILE_WORKER_PRESETS,
  LINT_WORKER_PRESETS,
  formatInternalOutputDirLabel,
  formatWorkerResilienceLabel,
  getInternalBuildQuickActionItems,
  TARGET_PRESETS,
  getInternalTargetPresetItems,
  getWorkerResiliencePresetItems,
  normalizeOutputDirSettingValue,
  showInternalBuildQuickActions,
  selectCompileWorkerResilience,
  selectLintWorkerResilience,
  selectInternalTargets,
  selectInternalOutputDir,
};
