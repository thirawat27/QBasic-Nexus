/**
 * QBasic Nexus - Lazy Module Loader
 * Centralizes all lazy-loaded heavy modules to avoid circular dependencies.
 *
 * Pattern: load on first use, cache reference, never re-require.
 * This is the single source of truth for deferred module access.
 */

'use strict';

let _InternalTranspiler = null;
let _WebviewManager = null;

/**
 * Lazy-load and cache the InternalTranspiler class.
 * @returns {typeof import("../compiler/transpiler")}
 */
function getInternalTranspiler() {
  if (!_InternalTranspiler) _InternalTranspiler = require('../compiler/parser');
  return _InternalTranspiler;
}

/**
 * Lazy-load and cache the WebviewManager class.
 * @returns {typeof import("../managers/WebviewManager")}
 */
function getWebviewManager() {
  if (!_WebviewManager) _WebviewManager = require('../managers/WebviewManager');
  return _WebviewManager;
}

module.exports = { getInternalTranspiler, getWebviewManager };
