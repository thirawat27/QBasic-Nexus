/**
 * QBasic Nexus - Linting
 * Linting support using the IncrementalLinter singleton
 */

'use strict';

const { getIncrementalLinter } = require('../managers/IncrementalLinter');
const { CONFIG } = require('./constants');
const { state } = require('./state');
const { getConfig } = require('./utils');

function getLintRuntimeMode() {
  return getConfig(CONFIG.COMPILER_MODE) === CONFIG.MODE_INTERNAL
    ? 'internal-node'
    : 'qb64';
}

/**
 * Schedule a lint for a QBasic document using the incremental linter.
 * Replaces the old per-call transpiler creation with a shared singleton.
 */
function lintDocument(document) {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return;
  if (!getConfig(CONFIG.ENABLE_LINT, true)) return;

  const delay = getConfig(CONFIG.LINT_DELAY, 500);
  getIncrementalLinter().schedule(
    document,
    state.diagnosticCollection,
    delay,
    {
      target: 'node',
      runtimeMode: getLintRuntimeMode(),
    },
  );
}

module.exports = { lintDocument };
