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

const AUTO_CHOICE_SHOWN = 'qbasic-nexus.autoChoiceShown';

/**
 * Once per machine: when Auto mode picks QBNex although QB64 is installed
 * too, say so and offer to stay on QB64 (what 1.x always used).
 * @param {vscode.ExtensionContext} context
 */
async function announceAutoChoice(context) {
  try {
    if (context.globalState.get(AUTO_CHOICE_SHOWN)) return;
    const { isConfigExplicitlySet } = require('./utils');
    if (isConfigExplicitlySet(CONFIG.COMPILER_MODE)) return;

    const { resolveQB64, resolveQBNex, resolveToolchain } = require('../toolchain/resolve');
    const [active, qb64, qbnex] = await Promise.all([resolveToolchain(), resolveQB64(), resolveQBNex()]);
    if (!active || !qb64 || !qbnex || active.kind !== 'qbnex') return;

    await context.globalState.update(AUTO_CHOICE_SHOWN, true);
    const choice = await vscode.window.showInformationMessage(
      `QBasic Nexus now builds with ${qbnex.label} when it is installed. ${qb64.label} is installed too: keep building with QBNex, or stay on ${qb64.label}?`,
      'Keep QBNex',
      `Use ${qb64.label}`,
    );
    if (choice === `Use ${qb64.label}`) {
      await vscode.workspace
        .getConfiguration(CONFIG.SECTION)
        .update(CONFIG.COMPILER_MODE, CONFIG.MODE_QB64, vscode.ConfigurationTarget.Global);
    }
  } catch (error) {
    console.error('[QBasic Nexus] compiler choice notice failed:', error);
  }
}

module.exports = { announceAutoChoice, migrateLegacySettings };
