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

function getInternalBuildQuickActionItems(currentTargets, currentOutputDir, workspaceDir = '') {
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

module.exports = {
  formatInternalOutputDirLabel,
  getInternalBuildQuickActionItems,
  TARGET_PRESETS,
  getInternalTargetPresetItems,
  normalizeOutputDirSettingValue,
  showInternalBuildQuickActions,
  selectInternalTargets,
  selectInternalOutputDir,
};
