/**
 * QBasic Nexus - Compiler output parser
 *
 * Turns the console output of QBNex 2.x and QB64 / QB64-PE into a flat list of
 * diagnostics. Pure: no VS Code dependency, so it is unit-tested directly.
 *
 * Formats understood:
 *
 *   QBNex 2.x block (one per diagnostic):
 *     [!!] QBNex :: Fatal [E0000]  Expected variable/value after '+'
 *       [@] C:\src\prog.bas(2,7)
 *       [.] detail   Label '99' not defined
 *
 *   gcc-style lines (QBNex and QB64-PE warnings, optional column):
 *     prog.bas:12: warning: unused variable
 *         unusedvar%   INTEGER
 *
 *   QB64 / QB64-PE errors:
 *     Expected = or (
 *     Caused by (or after): X = 1 +
 *     LINE 2:X = 1 +
 */

'use strict';

const path = require('path');

// eslint-disable-next-line no-control-regex -- ESC starts every ANSI colour sequence
const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const QBNEX_HEAD =
  /^\[(?:!!|x|~|i)\]\s+QBNex\s+::\s+(Fatal|Error|Warning|Info)\s+\[([A-Za-z]*\d+)\]\s+(.*)$/;
const QBNEX_LOCATION = /^\s*\[@\]\s+(.+?)\((\d+)(?:,(\d+))?\)\s*$/;
const QBNEX_DETAIL = /^\s*\[\.\]\s+detail\s+(.*)$/;
const GCC_LINE =
  /^(.+?\.(?:bas|bi|bm|inc)):(\d+)(?::(\d+))?:\s*(warning|error|note|info):\s*(.*)$/i;
const QB64_LINE = /^LINE\s+(\d+)\s*:(.*)$/;
const QB64_CAUSED_BY = /^Caused by \(or after\):/i;
const INCLUDED_IN = /\s+in line (\d+) of (.+?) included\s*$/i;

/**
 * @typedef {object} CompilerDiagnostic
 * @property {string} file      absolute path of the file the diagnostic is in
 * @property {number} line      0-based line
 * @property {number|null} column 0-based column, null when the compiler gave none
 * @property {'error'|'warning'|'info'} severity
 * @property {string} message
 * @property {string|null} code compiler diagnostic code (QBNex E-codes)
 * @property {string|null} sourceText the offending source text, when reported
 * @property {'QBNex'|'QB64'} source
 */

function stripAnsi(text) {
  return String(text || '').replace(ANSI_PATTERN, '');
}

function resolveFile(file, baseDir) {
  const trimmed = String(file || '').trim();
  if (!trimmed) return '';
  return path.resolve(baseDir || process.cwd(), trimmed);
}

function toSeverity(word) {
  const value = String(word || '').toLowerCase();
  if (value === 'warning') return 'warning';
  if (value === 'info' || value === 'note') return 'info';
  return 'error';
}

function toLineIndex(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;
}

function toColumnIndex(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : null;
}

/**
 * Parses compiler output.
 * @param {string} output combined stdout and stderr
 * @param {{ sourcePath: string, compiler?: 'qbnex'|'qb64' }} options
 * @returns {CompilerDiagnostic[]}
 */
function parseCompilerOutput(output, options) {
  const sourcePath = path.resolve(options.sourcePath);
  const baseDir = path.dirname(sourcePath);
  const sourceLabel = options.compiler === 'qb64' ? 'QB64' : 'QBNex';
  const lines = stripAnsi(output).split(/\r?\n/);
  const results = [];
  const seen = new Set();

  const push = (diagnostic) => {
    // QB64 embeds control characters in messages (CHR$(1) before " in line n of").
    // eslint-disable-next-line no-control-regex
    diagnostic.message = diagnostic.message.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '').trim();
    const key = [
      diagnostic.file.toLowerCase(),
      diagnostic.line,
      diagnostic.column,
      diagnostic.severity,
      diagnostic.message,
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    results.push(diagnostic);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const head = QBNEX_HEAD.exec(line);
    if (head) {
      const [, title, code, headline] = head;
      let file = sourcePath;
      let lineIndex = 0;
      let column = null;
      let sourceText = null;
      const details = [];
      let j = i + 1;
      for (; j < lines.length && lines[j].trim() !== ''; j++) {
        const location = QBNEX_LOCATION.exec(lines[j]);
        if (location) {
          file = resolveFile(location[1], baseDir);
          lineIndex = toLineIndex(location[2]);
          column = toColumnIndex(location[3]);
          continue;
        }
        const detail = QBNEX_DETAIL.exec(lines[j]);
        if (detail) {
          details.push(detail[1].trim());
          continue;
        }
        const snippet = /^\s+\d+\s+\|\s?(.*)$/.exec(lines[j]);
        if (snippet && sourceText === null) sourceText = snippet[1];
      }
      i = j - 1;

      let message = headline.replace(INCLUDED_IN, '').trim();
      for (const detail of details) {
        if (detail && !message.includes(detail)) message += `\n${detail}`;
      }
      push({
        file,
        line: lineIndex,
        column,
        severity: toSeverity(title === 'Fatal' ? 'error' : title),
        message,
        code,
        sourceText,
        source: 'QBNex',
      });
      continue;
    }

    const gcc = GCC_LINE.exec(line);
    if (gcc) {
      const [, file, lineNumber, columnNumber, level, text] = gcc;
      const extra = [];
      let j = i + 1;
      while (j < lines.length && /^\s{2,}\S/.test(lines[j])) {
        extra.push(lines[j].trim());
        j++;
      }
      i = j - 1;
      const message = [text.trim(), ...extra].filter(Boolean).join('\n');
      push({
        file: resolveFile(file, baseDir),
        line: toLineIndex(lineNumber),
        column: toColumnIndex(columnNumber),
        severity: toSeverity(level),
        message: message || level,
        code: null,
        sourceText: null,
        source: sourceLabel,
      });
      continue;
    }

    const qb64 = QB64_LINE.exec(line);
    if (qb64) {
      let message = '';
      for (let k = i - 1; k >= 0 && k >= i - 4; k--) {
        const candidate = lines[k].trim();
        if (!candidate || QB64_CAUSED_BY.test(candidate)) continue;
        if (candidate.startsWith('[') || QB64_LINE.test(candidate)) break;
        message = candidate;
        break;
      }
      if (!message) continue;

      let file = sourcePath;
      let lineIndex = toLineIndex(qb64[1]);
      const included = INCLUDED_IN.exec(message);
      if (included) {
        lineIndex = toLineIndex(included[1]);
        file = resolveFile(included[2], baseDir);
        message = message.replace(INCLUDED_IN, '').trim();
      }
      push({
        file,
        line: lineIndex,
        column: null,
        severity: 'error',
        message,
        code: null,
        sourceText: qb64[2].trim() || null,
        source: 'QB64',
      });
    }
  }

  return results;
}

/**
 * Picks a 0-based [start, end) column span on a source line for a diagnostic:
 * the word at the reported column, else the reported source text, else the
 * whole line without its indentation.
 * @param {string} lineText
 * @param {{ column: number|null, sourceText?: string|null }} diagnostic
 * @returns {[number, number]}
 */
function diagnosticSpan(lineText, diagnostic) {
  const text = String(lineText || '');
  const indent = text.length - text.trimStart().length;
  const fullLine = [indent, Math.max(indent, text.trimEnd().length)];

  if (diagnostic.column !== null && diagnostic.column !== undefined) {
    const start = Math.min(diagnostic.column, text.length);
    const word = /^[A-Za-z_][\w.]*[$%&!#~`]*|^\S/.exec(text.slice(start));
    return [start, start + (word ? word[0].length : 1)];
  }

  const snippet = String(diagnostic.sourceText || '').trim();
  if (snippet) {
    const at = text.toUpperCase().indexOf(snippet.toUpperCase());
    if (at >= 0) return [at, at + snippet.length];
  }

  return fullLine[1] > fullLine[0] ? fullLine : [0, text.length];
}

module.exports = { parseCompilerOutput, diagnosticSpan, stripAnsi };
