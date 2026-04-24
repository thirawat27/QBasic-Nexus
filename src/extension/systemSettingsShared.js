'use strict';

const {
  formatInternalOutputDirLabel,
  formatWorkerResilienceLabel,
} = require('./internalBuildSettings');
const { COMMANDS, CONFIG } = require('./constants');
const { validatePackagerTargets } = require('./executableUtils');

function formatCompilerPathLabel(compilerPath, autoDetectedCompilerPath = null) {
  const configuredPath = String(compilerPath || '').trim();
  if (configuredPath) return configuredPath;
  if (autoDetectedCompilerPath) return `Auto-detected: ${autoDetectedCompilerPath}`;
  return 'Auto-detect on demand';
}

function formatCompilerArgsLabel(compilerArgs) {
  const normalizedArgs = String(compilerArgs || '').trim();
  return normalizedArgs || 'None';
}

function formatBooleanLabel(value, enabledLabel = 'Enabled', disabledLabel = 'Disabled') {
  return value ? enabledLabel : disabledLabel;
}

function formatLineNumberSettingsLabel(start, step) {
  return `Start ${start} | Step ${step}`;
}

function formatInternalTargetsLabel(targets) {
  try {
    return validatePackagerTargets(targets || 'host').join(', ');
  } catch (error) {
    return `Invalid (${error.message})`;
  }
}

function getSystemQuickActionItems(options = {}) {
  const mode = options.compilerMode || CONFIG.MODE_QB64;
  const isInternalMode =
    mode === CONFIG.MODE_INTERNAL || mode === CONFIG.MODE_INTERNAL_WASM;
  const workspacePath = options.workspacePath || '';

  return [
    {
      label: 'Compiler Mode',
      detail: `Current: ${mode}`,
      command: COMMANDS.SELECT_COMPILER_MODE,
    },
    {
      label: 'QB64 Compiler Path',
      detail: `Current: ${formatCompilerPathLabel(
        options.compilerPath,
        options.autoDetectedCompilerPath,
      )}`,
      command: COMMANDS.SELECT_COMPILER_PATH,
    },
    {
      label: 'QB64 Compiler Args',
      detail: `Current: ${formatCompilerArgsLabel(options.compilerArgs)}`,
      command: COMMANDS.SELECT_COMPILER_ARGS,
    },
    {
      label: 'Internal Build Targets',
      detail: `Current: ${formatInternalTargetsLabel(options.internalTargets)}`,
      description:
        isInternalMode ? 'Active in internal mode' : 'Used when internal mode is selected',
      command: COMMANDS.SELECT_INTERNAL_TARGETS,
    },
    {
      label: 'Internal Output Folder',
      detail: `Current: ${formatInternalOutputDirLabel(
        options.internalOutputDir,
        workspacePath,
      )}`,
      description:
        isInternalMode ? 'Active in internal mode' : 'Used when internal mode is selected',
      command: COMMANDS.SELECT_INTERNAL_OUTPUT_DIR,
    },
    {
      label: 'Compile Worker Resilience',
      detail: `Current: ${formatWorkerResilienceLabel(
        options.compileWorkerMaxQueueSize,
        options.compileWorkerRequestTimeoutMs,
      )}`,
      command: COMMANDS.SELECT_COMPILE_WORKER_RESILIENCE,
    },
    {
      label: 'Lint Worker Resilience',
      detail: `Current: ${formatWorkerResilienceLabel(
        options.lintWorkerMaxQueueSize,
        options.lintWorkerRequestTimeoutMs,
      )}`,
      command: COMMANDS.SELECT_LINT_WORKER_RESILIENCE,
    },
    {
      label: 'Enable Linting',
      detail: `Current: ${formatBooleanLabel(options.enableLinting)}`,
      command: COMMANDS.SELECT_ENABLE_LINTING,
    },
    {
      label: 'Lint Delay',
      detail: `Current: ${options.lintDelay}ms`,
      command: COMMANDS.SELECT_LINT_DELAY,
    },
    {
      label: 'Auto Format On Save',
      detail: `Current: ${formatBooleanLabel(options.autoFormatOnSave)}`,
      command: COMMANDS.SELECT_AUTO_FORMAT,
    },
    {
      label: 'Line Number Defaults',
      detail: `Current: ${formatLineNumberSettingsLabel(
        options.lineNumberStart,
        options.lineNumberStep,
      )}`,
      command: COMMANDS.SELECT_LINE_NUMBER_SETTINGS,
    },
  ];
}

module.exports = {
  formatBooleanLabel,
  formatCompilerArgsLabel,
  formatCompilerPathLabel,
  formatInternalTargetsLabel,
  formatLineNumberSettingsLabel,
  getSystemQuickActionItems,
};
