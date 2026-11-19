'use strict';

let vscode = null;
try {
  vscode = require('vscode');
} catch (_error) {
  vscode = null;
}
const { CONFIG } = require('./constants');

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
  require('./utils').invalidateConfigCache();

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
  formatWorkerResilienceLabel,
  getPreferredConfigTarget,
  getWorkerResiliencePresetItems,
  selectCompileWorkerResilience,
  selectLintWorkerResilience,
};
