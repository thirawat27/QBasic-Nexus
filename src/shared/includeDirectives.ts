/**
 * `$INCLUDE` metacommand parsing and path resolution.
 * QB64 accepts `'$INCLUDE: 'file.bi'`, `REM $INCLUDE: 'file.bi'` and the bare
 * `$INCLUDE: 'file.bi'` form. Pure functions, no VS Code dependency.
 */

import fs = require('fs');
import path = require('path');

const INCLUDE_RE = /^(\s*(?:(?:'|REM\b)\s*)?\$INCLUDE\s*:\s*)(['"])(.+?)\2/i;

/**
 * Parse an `$INCLUDE` directive on one line.
 * @param {string} line
 * @returns {{path: string, start: number, end: number}|null} start/end cover
 *   the file name without its quotes
 */
function parseIncludeDirective(line = '') {
  const match = INCLUDE_RE.exec(String(line));
  if (!match) return null;
  const start = match[1].length + 1;
  return { path: match[3], start, end: start + match[3].length };
}

/**
 * All `$INCLUDE` directives in a document.
 * @param {string[]} lines
 * @returns {Array<{line: number, path: string, start: number, end: number}>}
 */
function findIncludeDirectives(lines = []) {
  const directives = [];
  for (let line = 0; line < lines.length; line++) {
    if (!/\$INCLUDE/i.test(lines[line])) continue;
    const directive = parseIncludeDirective(lines[line]);
    if (directive) directives.push({ line, ...directive });
  }
  return directives;
}

/**
 * Resolve an include path the way QB64 does for a source file: relative to the
 * including file first, then to the workspace folder.
 * @param {string} includePath
 * @param {{documentDir: string, workspaceDir?: string|null,
 *   exists?: (p: string) => boolean}} options
 * @returns {string|null} absolute path, or null when it does not exist
 */
function resolveIncludePath(includePath, options) {
  const exists = options.exists || fs.existsSync;
  if (!includePath) return null;

  if (path.isAbsolute(includePath)) {
    return exists(includePath) ? includePath : null;
  }

  const candidates = [path.resolve(options.documentDir, includePath)];
  if (options.workspaceDir) {
    candidates.push(path.resolve(options.workspaceDir, includePath));
  }
  return candidates.find((candidate) => exists(candidate)) || null;
}

export {
  INCLUDE_RE,
  parseIncludeDirective,
  findIncludeDirectives,
  resolveIncludePath,
};
