/**
 * QBasic Nexus - Linting
 * Linting support using the IncrementalLinter singleton
 */

import { getIncrementalLinter } from '../managers/IncrementalLinter';
import { CONFIG } from './constants';
import { state } from './state';
import { getConfig } from './utils';

/**
 * Schedule a lint for a QBasic document using the incremental linter.
 * Replaces the old per-call transpiler creation with a shared singleton.
 */
function lintDocument(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return;
  if (!getConfig(CONFIG.ENABLE_LINT, true)) return;

  const delay = getConfig(CONFIG.LINT_DELAY, 500);
  getIncrementalLinter().schedule(document, state.diagnosticCollection, delay);
}

export {
  lintDocument,
};
