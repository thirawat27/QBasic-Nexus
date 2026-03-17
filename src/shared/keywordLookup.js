'use strict';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const IDENT_BOUNDARY = '[A-Za-z0-9_$%!#&]';

function buildKeywordSearchEntries(keywords = {}) {
  return Object.entries(keywords)
    .map(([key, entry]) => {
      const label = entry?.label || key;
      // Pre-compile regex ONCE, reused on every hover/signature call
      const re = new RegExp(
        `(?<!${IDENT_BOUNDARY})${escapeRegex(label)}(?!${IDENT_BOUNDARY})`,
        'gi',
      );
      return { key, label, entry, re };
    })
    .sort((left, right) => right.label.length - left.label.length);
}

function findKeywordEntryAtPosition(
  lineText = '',
  character = 0,
  searchEntries = [],
) {
  for (const item of searchEntries) {
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
};
