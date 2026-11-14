'use strict';

const path = require('path');
const { COMMANDS, CONFIG, normalizeCompilerMode } = require('./constants');

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

function formatOutputDirectoryLabel(outputDir, workspacePath = '') {
  const value = String(outputDir || '').trim();
  if (!value) return 'Beside the source file';
  if (!path.isAbsolute(value) && workspacePath) {
    return `${value} (in ${path.basename(workspacePath)})`;
  }
  return value;
}

function formatDiagnosticFlagsLabel(options = {}) {
  const flags = [];
  if (options.showWarnings) flags.push('warnings');
  if (options.warningsAsErrors) flags.push('warnings as errors');
  if (options.optionExplicit) flags.push('OPTION _EXPLICIT');
  return flags.length > 0 ? flags.join(', ') : 'None';
}

function formatToolchainLabel(toolchain) {
  if (toolchain === undefined) return 'Detecting...';
  if (!toolchain) return 'None found';
  return `${toolchain.label} (${toolchain.path})`;
}

function getSystemQuickActionItems(options = {}) {
  const mode = normalizeCompilerMode(options.compilerMode);
  const workspacePath = options.workspacePath || '';

  return [
    {
      label: 'Toolchain Info',
      detail: `Active: ${formatToolchainLabel(options.activeToolchain)}`,
      command: COMMANDS.SHOW_TOOLCHAIN_INFO,
    },
    {
      label: 'Compiler Mode',
      detail: `Current: ${mode}`,
      command: COMMANDS.SELECT_COMPILER_MODE,
    },
    {
      label: 'QBNex Compiler Path',
      detail: `Current: ${formatCompilerPathLabel(options.qbnexPath)}`,
      description: mode === CONFIG.MODE_QB64 ? 'Unused in QB64 mode' : '',
      command: COMMANDS.SELECT_QBNEX_PATH,
    },
    {
      label: 'QB64 Compiler Path',
      detail: `Current: ${formatCompilerPathLabel(
        options.compilerPath,
        options.autoDetectedCompilerPath,
      )}`,
      description: mode === CONFIG.MODE_QBNEX ? 'Unused in QBNex mode' : '',
      command: COMMANDS.SELECT_COMPILER_PATH,
    },
    {
      label: 'Diagnostics Flags',
      detail: `Current: ${formatDiagnosticFlagsLabel(options)}`,
      command: COMMANDS.SELECT_DIAGNOSTIC_FLAGS,
    },
    {
      label: 'Extra Compiler Args',
      detail: `Current: ${formatCompilerArgsLabel(options.compilerArgs)}`,
      command: COMMANDS.SELECT_COMPILER_ARGS,
    },
    {
      label: 'Output Folder',
      detail: `Current: ${formatOutputDirectoryLabel(options.outputDirectory, workspacePath)}`,
      command: COMMANDS.SELECT_OUTPUT_DIRECTORY,
    },
    {
      label: 'Check On Save',
      detail: `Current: ${formatBooleanLabel(options.enableLinting)}`,
      command: COMMANDS.SELECT_ENABLE_LINTING,
    },
    {
      label: 'Formatter',
      detail: `Current: ${options.formatter === CONFIG.FORMATTER_QB_FMT ? 'qb-fmt (QBNex)' : 'Built-in'}`,
      command: COMMANDS.SELECT_FORMATTER,
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
    {
      label: 'Restart Language Server',
      detail: `qb-lsp: ${options.languageServerRunning ? 'running' : 'not running'}`,
      command: COMMANDS.RESTART_LANGUAGE_SERVER,
    },
  ];
}

module.exports = {
  formatBooleanLabel,
  formatCompilerArgsLabel,
  formatCompilerPathLabel,
  formatDiagnosticFlagsLabel,
  formatLineNumberSettingsLabel,
  formatOutputDirectoryLabel,
  formatToolchainLabel,
  getSystemQuickActionItems,
};
