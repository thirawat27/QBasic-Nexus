'use strict';

const TODO_COMMENT_REGEX =
  /(?:'|\bREM\b)[^\r\n]*?\b(TODO|FIXME|FIXIT|HACK|BUG|NOTE)\b[^\r\n]*/gi;

const KEYWORD_RANK = Object.freeze({
  BUG: 1,
  FIXME: 1,
  FIXIT: 1,
  HACK: 1,
  TODO: 2,
  NOTE: 3,
});

function mightContainTodoKeyword(text = '') {
  const upperText = String(text ?? '').toUpperCase();
  return (
    upperText.includes('TODO') ||
    upperText.includes('FIX') ||
    upperText.includes('HACK') ||
    upperText.includes('BUG') ||
    upperText.includes('NOTE')
  );
}

function scanTodoComments(text = '') {
  const source = String(text ?? '');
  if (!mightContainTodoKeyword(source)) {
    return [];
  }

  const matches = [];
  const lines = source.split(/\r?\n/);

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber];

    if (!mightContainTodoKeyword(line)) {
      continue;
    }

    let match;
    TODO_COMMENT_REGEX.lastIndex = 0;

    while ((match = TODO_COMMENT_REGEX.exec(line)) !== null) {
      matches.push({
        keyword: match[1].toUpperCase(),
        label: match[0].replace(/^('|REM)\s*/i, '').trim(),
        line: lineNumber,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return matches;
}

module.exports = {
  KEYWORD_RANK,
  mightContainTodoKeyword,
  scanTodoComments,
};
