/**
 * QBasic Nexus - Settings migration from 1.x
 *
 * 1.x had an internal JavaScript compiler with its own modes and settings.
 * On activation, old compiler modes are mapped to the current ones,
 * internalOutputDir becomes outputDirectory, and the settings of the removed
 * internal compiler are deleted, at every level where they are set.
 */

'use strict';

const vscode = require('vscode');
const { CONFIG, LEGACY_COMPILER_MODES, REMOVED_SETTINGS } = require('./constants');

const LEVELS = [
  ['globalValue', vscode.ConfigurationTarget.Global],
  ['workspaceValue', vscode.ConfigurationTarget.Workspace],
  ['workspaceFolderValue', vscode.ConfigurationTarget.WorkspaceFolder],
];

async function migrateScope(configuration, isFolder) {
  const changes = [];
  for (const [field, target] of LEVELS) {
    if (isFolder !== (target === vscode.ConfigurationTarget.WorkspaceFolder)) continue;

    const mode = configuration.inspect(CONFIG.COMPILER_MODE)?.[field];
    if (typeof mode === 'string' && LEGACY_COMPILER_MODES[mode]) {
      changes.push(configuration.update(CONFIG.COMPILER_MODE, LEGACY_COMPILER_MODES[mode], target));
    }

    const oldOutput = configuration.inspect('internalOutputDir')?.[field];
    if (oldOutput !== undefined) {
      const current = configuration.inspect(CONFIG.OUTPUT_DIRECTORY)?.[field];
      if (current === undefined && oldOutput) {
        changes.push(configuration.update(CONFIG.OUTPUT_DIRECTORY, oldOutput, target));
      }
      changes.push(configuration.update('internalOutputDir', undefined, target));
    }

    for (const key of REMOVED_SETTINGS) {
      if (configuration.inspect(key)?.[field] !== undefined) {
        changes.push(configuration.update(key, undefined, target));
      }
    }
  }
  await Promise.all(changes.map((change) => Promise.resolve(change).catch(() => undefined)));
  return changes.length;
}

/** Migrates 1.x settings; resolves the number of settings changed. */
async function migrateLegacySettings() {
  let changed = 0;
  try {
    changed += await migrateScope(vscode.workspace.getConfiguration(CONFIG.SECTION), false);
    for (const folder of vscode.workspace.workspaceFolders || []) {
      changed += await migrateScope(
        vscode.workspace.getConfiguration(CONFIG.SECTION, folder.uri),
        true,
      );
    }
  } catch (error) {
    console.error('[QBasic Nexus] settings migration failed:', error);
  }
  return changed;
}

module.exports = { migrateLegacySettings };
