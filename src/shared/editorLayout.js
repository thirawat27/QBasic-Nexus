'use strict';

const { RESERVED_WORDS } = require('./languageRegistry');
const { PATTERNS } = require('../providers/patterns');

const UPPER_KEYWORDS = new Set(
  [
    ...Array.from(RESERVED_WORDS),
    'AS',
    'TO',
    'STEP',
    'UNTIL',
    'IS',
    'AND',
    'OR',
    'NOT',
    'MOD',
    'XOR',
    'EQV',
    'IMP',
    'SHARED',
    'PRESERVE',
    'ANY',
    'APPEND',
    'BINARY',
    'OUTPUT',
    'INPUT',
    'RANDOM',
    'BEEP',
  ].map((keyword) => keyword.toUpperCase()),
);

const FORMAT_TOKEN_RE = /("(?:[^"]|"")*"|'.*|\bREM\b.*)|([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/gi;
const BLOCK_STARTERS = Object.freeze([
  /^IF\b.+\bTHEN\s*$/i,
  /^FOR\b/i,
  /^DO\b/i,
  /^WHILE\b/i,
  /^SELECT\s+CASE\b/i,
  /^SUB\b/i,
  /^FUNCTION\b/i,
  /^TYPE\b/i,
]);
const BLOCK_MID_RE = /^(?:ELSE|ELSEIF|CASE)\b/i;
const BLOCK_ENDERS_RE =
  /^(?:END\s+(?:IF|SUB|FUNCTION|TYPE|SELECT)|NEXT|LOOP|WEND)\b/i;

function capitalizeQBasicLine(text = '') {
  return text.replace(FORMAT_TOKEN_RE, (match, literal, word) => {
    if (literal) return literal;
    if (word && UPPER_KEYWORDS.has(word.toUpperCase())) {
      return word.toUpperCase();
    }
    return match;
  });
}

function formatQBasicLines(lines = [], options = {}) {
  const insertSpaces = options.insertSpaces !== false;
  const tabSize = Number.isInteger(options.tabSize) ? options.tabSize : 4;
  const indentUnit = insertSpaces ? ' '.repeat(tabSize) : '\t';
  const formattedLines = [];
  let level = 0;

  for (const originalLine of lines) {
    const text = typeof originalLine === 'string' ? originalLine : '';
    const trimmed = text.trim();

    if (!trimmed) {
      formattedLines.push(text);
      continue;
    }

    if (PATTERNS.BLOCK_END.test(trimmed) || PATTERNS.BLOCK_MID.test(trimmed)) {
      level = Math.max(0, level - 1);
    }

    const expectedIndent = indentUnit.repeat(level);
    const formattedLine =
      expectedIndent + capitalizeQBasicLine(text).trimStart();
    formattedLines.push(formattedLine);

    if (PATTERNS.BLOCK_START.test(trimmed)) {
      if (!/^\s*IF\b/i.test(trimmed) || /\bTHEN\s*$/i.test(trimmed)) {
        level++;
      }
    } else if (PATTERNS.BLOCK_MID.test(trimmed)) {
      level++;
    }
  }

  return formattedLines;
}

function collectQBasicFoldingRanges(lines = []) {
  const ranges = [];
  const stack = [];

  for (let index = 0; index < lines.length; index++) {
    const line = typeof lines[index] === 'string' ? lines[index] : '';

    if (PATTERNS.BLOCK_START.test(line)) {
      stack.push(index);
    } else if (PATTERNS.BLOCK_END.test(line) && stack.length > 0) {
      const start = stack.pop();
      if (index > start) {
        ranges.push({ start, end: index, kind: undefined });
      }
    }
  }

  let commentStart = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = typeof lines[index] === 'string' ? lines[index] : '';
    const isComment = PATTERNS.COMMENT.test(line);

    if (isComment && commentStart === -1) {
      commentStart = index;
      continue;
    }

    if (!isComment && commentStart !== -1) {
      if (index - 1 > commentStart) {
        ranges.push({ start: commentStart, end: index - 1, kind: 'comment' });
      }
      commentStart = -1;
    }
  }

  if (commentStart !== -1 && lines.length - 1 > commentStart) {
    ranges.push({
      start: commentStart,
      end: lines.length - 1,
      kind: 'comment',
    });
  }

  return ranges;
}

function getOnTypeIndentText(prevLine = '', tabUnit = '    ') {
  if (typeof prevLine !== 'string') {
    prevLine = String(prevLine ?? '');
  }

  const prevTrimmed = prevLine.trim().toUpperCase();
  const indent = prevLine.match(/^\s*/)?.[0] || '';

  if (!prevTrimmed) {
    return null;
  }

  for (const pattern of BLOCK_STARTERS) {
    if (pattern.test(prevTrimmed)) {
      return indent + tabUnit;
    }
  }

  if (BLOCK_MID_RE.test(prevTrimmed)) {
    return indent + tabUnit;
  }

  if (BLOCK_ENDERS_RE.test(prevTrimmed)) {
    return indent;
  }

  return null;
}

module.exports = {
  capitalizeQBasicLine,
  collectQBasicFoldingRanges,
  formatQBasicLines,
  getOnTypeIndentText,
};
