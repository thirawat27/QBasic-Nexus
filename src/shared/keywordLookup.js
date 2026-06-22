'use strict';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const IDENT_BOUNDARY = '[A-Za-z0-9_$%!#&]';
const LABEL_TOKEN_RE = /[A-Z_$][A-Z0-9_$%!#&]*/g;
const IDENTIFIER_CHAR_RE = /[A-Za-z0-9_$%!#&]/;

function getTokenAtPosition(lineText = '', character = 0) {
  if (!lineText) return '';

  let cursor = Math.max(0, Math.min(character, lineText.length));
  if (
    cursor === lineText.length ||
    !IDENTIFIER_CHAR_RE.test(lineText[cursor])
  ) {
    cursor--;
  }

  if (cursor < 0 || !IDENTIFIER_CHAR_RE.test(lineText[cursor])) {
    return '';
  }

  let start = cursor;
  while (start > 0 && IDENTIFIER_CHAR_RE.test(lineText[start - 1])) {
    start--;
  }

  let end = cursor + 1;
  while (end < lineText.length && IDENTIFIER_CHAR_RE.test(lineText[end])) {
    end++;
  }

  return lineText.slice(start, end).toUpperCase();
}

function addTokenBuckets(entries) {
  const tokenBuckets = new Map();

  for (const entry of entries) {
    const seenTokens = new Set();
    const labelUpper = entry.label.toUpperCase();
    let match;

    LABEL_TOKEN_RE.lastIndex = 0;
    while ((match = LABEL_TOKEN_RE.exec(labelUpper)) !== null) {
      seenTokens.add(match[0]);
    }

    for (const token of seenTokens) {
      const bucket = tokenBuckets.get(token);
      if (bucket) {
        bucket.push(entry);
      } else {
        tokenBuckets.set(token, [entry]);
      }
    }
  }

  Object.defineProperty(entries, 'tokenBuckets', {
    value: tokenBuckets,
    enumerable: false,
  });

  return entries;
}

function buildKeywordSearchEntries(keywords = {}) {
  return addTokenBuckets(Object.entries(keywords)
    .map(([key, entry]) => {
      const label = entry?.label || key;
      // Pre-compile regex ONCE, reused on every hover/signature call
      const re = new RegExp(
        `(?<!${IDENT_BOUNDARY})${escapeRegex(label)}(?!${IDENT_BOUNDARY})`,
        'gi',
      );
      return { key, label, entry, re };
    })
    .sort((left, right) => right.label.length - left.label.length));
}

function findKeywordEntryAtPosition(
  lineText = '',
  character = 0,
  searchEntries = [],
) {
  const token = getTokenAtPosition(lineText, character);
  const candidates =
    token && searchEntries.tokenBuckets instanceof Map
      ? searchEntries.tokenBuckets.get(token) || []
      : searchEntries;

  for (const item of candidates) {
    // Reuse pre-compiled regex; reset lastIndex before each search
    item.re.lastIndex = 0;
    let match;
    while ((match = item.re.exec(lineText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (character >= start && character <= end) {
        return {
          key: item.key,
          label: item.label,
          entry: item.entry,
          start,
          end,
        };
      }
      // Early exit: cursor is before this match, no need to scan further
      if (start > character) break;
    }
  }

  return null;
}

module.exports = {
  buildKeywordSearchEntries,
  findKeywordEntryAtPosition,
  getTokenAtPosition,
};
