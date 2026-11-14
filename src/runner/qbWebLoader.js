/**
 * QBasic Nexus - qb-web loader for a classic worker script
 *
 * vendor/qb-web/qbnex.js is an ES module. The Retro CRT worker is created
 * from a Blob, where module imports from the webview's resource origin are
 * not reliable, so the loader's export syntax is removed and it is prepended
 * to the worker code instead. No VS Code dependency.
 */

'use strict';

/** @param {string} source qbnex.js @returns {string} the same code without ES module syntax */
function toClassicScript(source) {
  return String(source)
    .replace(/^export default .*$/m, '')
    .replace(/^export (?=(?:async )?function |const |let |class )/gm, '');
}

module.exports = { toClassicScript };
