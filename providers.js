/**
 * QBasic Nexus - providers.js (backward-compat re-export)
 *
 * This file now merely re-exports every provider from the modular
 * src/providers/ folder.  It exists so that any external tooling or
 * tests that still import from "./providers" continue to work without
 * modification.
 *
 * All actual provider logic lives in src/providers/*.js
 */

'use strict';

module.exports = require('./src/providers/index');
