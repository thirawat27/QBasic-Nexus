import { formatWorkerResilienceLabel } from './workerSettings';
import { COMMANDS } from './constants';

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

/** Current values shown next to each item of the Configure System picker. */
export interface SystemSettingsSnapshot {
  compilerPath?: string;
  autoDetectedCompilerPath?: string | null;
  compilerArgs?: string;
  compileWorkerMaxQueueSize?: number;
  compileWorkerRequestTimeoutMs?: number;
  lintWorkerMaxQueueSize?: number;
  lintWorkerRequestTimeoutMs?: number;
  enableLinting?: boolean;
  lintDelay?: number;
  autoFormatOnSave?: boolean;
  lineNumberStart?: number;
  lineNumberStep?: number;
}

function getSystemQuickActionItems(options: SystemSettingsSnapshot = {}) {
  return [
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

export {
  formatBooleanLabel,
  formatCompilerArgsLabel,
  formatCompilerPathLabel,
  formatLineNumberSettingsLabel,
  getSystemQuickActionItems,
};
