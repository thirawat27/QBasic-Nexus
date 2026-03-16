'use strict';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordSearchEntries(keywords = {}) {
  return Object.entries(keywords)
    .map(([key, entry]) => ({
      key,
      label: entry?.label || key,
      entry,
    }))
    .sort((left, right) => right.label.length - left.label.length);
}

function findKeywordEntryAtPosition(
  lineText = '',
  character = 0,
  searchEntries = [],
) {
  for (const item of searchEntries) {
    const re = new RegExp(
      `(?<![A-Za-z0-9_$%!#&])${escapeRegex(item.label)}(?![A-Za-z0-9_$%!#&])`,
      'gi',
    );

    let match;
    while ((match = re.exec(lineText)) !== null) {
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
    }
  }

  return null;
}

module.exports = {
  buildKeywordSearchEntries,
  findKeywordEntryAtPosition,
};
