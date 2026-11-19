/**
 * On-device n-gram model for completion ranking.
 *
 * Learns from the user's own QBasic files which word tends to follow which:
 * - inside a statement, the next word after the previous word
 *   (`OPEN f$ FOR` → INPUT / OUTPUT / BINARY),
 * - at the start of a statement, the first word of the next statement after
 *   the first word of the previous one (`SCREEN 12` → CLS).
 *
 * Counts are kept per analysis object (one per file version) in a WeakMap,
 * so the model updates as files change and is garbage-collected with them.
 * Nothing leaves the machine. Pure functions, no VS Code dependency.
 */

import { maskCode, makeIdentifierScanner } from './sourceText';

/** @typedef {Map<string, Map<string, number>>} Counts */

const LINE_START = '<BOS>';

/** @type {WeakMap<object, Counts>} */
const countsCache = new WeakMap();

function bump(counts, context, next) {
  let row = counts.get(context);
  if (!row) {
    row = new Map();
    counts.set(context, row);
  }
  row.set(next, (row.get(next) || 0) + 1);
}

/**
 * Upper-cased words of a masked statement (identifiers and keywords only).
 * @param {string} text
 */
function wordsOf(text) {
  const words = [];
  const scanner = makeIdentifierScanner();
  let match;
  while ((match = scanner.exec(text)) !== null) words.push(match[0].toUpperCase());
  return words;
}

/**
 * Count bigrams in source lines.
 * @param {string[]} lines
 * @returns {Counts}
 */
function countLines(lines) {
  /** @type {Counts} */
  const counts = new Map();
  let previousHead = LINE_START;

  for (const line of lines) {
    const masked = maskCode(line);
    if (!masked.trim() || /^\s*\$/.test(masked)) continue;

    for (const statement of masked.split(':')) {
      const words = wordsOf(statement);
      if (words.length === 0) continue;
      bump(counts, `S:${previousHead}`, words[0]);
      for (let i = 1; i < words.length; i++) bump(counts, `T:${words[i - 1]}`, words[i]);
      previousHead = words[0];
    }
  }
  return counts;
}

/**
 * Memoized counts for an analysis object.
 * @param {{lines: string[]}} analysis
 * @returns {Counts}
 */
function getCounts(analysis) {
  let counts = countsCache.get(analysis);
  if (!counts) {
    counts = countLines(analysis.lines || []);
    countsCache.set(analysis, counts);
  }
  return counts;
}

/**
 * The context key for the cursor position.
 * @param {string[]} lines - document lines
 * @param {number} lineNumber
 * @param {string} textBefore - text of the current line before the word being typed
 * @returns {string|null}
 */
function contextAt(lines, lineNumber, textBefore) {
  const masked = maskCode(textBefore);
  const statement = masked.slice(masked.lastIndexOf(':') + 1);
  const words = wordsOf(statement);

  if (words.length > 0) return `T:${words[words.length - 1]}`;

  // Start of a statement: use the head of the previous statement.
  const beforeStatement = masked.slice(0, masked.lastIndexOf(':') + 1);
  const sameLine = beforeStatement.split(':').map(wordsOf).filter((w) => w.length);
  if (sameLine.length) return `S:${sameLine[sameLine.length - 1][0]}`;

  for (let i = lineNumber - 1; i >= 0; i--) {
    const previous = maskCode(lines[i]);
    if (!previous.trim() || /^\s*\$/.test(previous)) continue;
    const heads = previous.split(':').map(wordsOf).filter((w) => w.length);
    if (heads.length) return `S:${heads[heads.length - 1][0]}`;
  }
  return `S:${LINE_START}`;
}

/**
 * Most likely next words for a context, summed over several files.
 * @param {Array<{analysis: {lines: string[]}}>} fileAnalyses
 * @param {string|null} context
 * @param {number} [limit]
 * @returns {Array<{word: string, count: number, probability: number}>}
 */
function predict(fileAnalyses, context, limit = 5) {
  if (!context) return [];
  /** @type {Map<string, number>} */
  const totals = new Map();
  let sum = 0;
  for (const { analysis } of fileAnalyses) {
    const row = getCounts(analysis).get(context);
    if (!row) continue;
    for (const [word, count] of row) {
      totals.set(word, (totals.get(word) || 0) + count);
      sum += count;
    }
  }
  return [...totals]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    // A single observation is noise; require the pattern to repeat.
    .filter(([, count]) => count >= 2)
    .map(([word, count]) => ({ word, count, probability: count / sum }));
}

export {
  countLines,
  getCounts,
  contextAt,
  predict,
  LINE_START,
};
