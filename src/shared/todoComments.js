'use strict';

const TODO_COMMENT_REGEX =
  /(?:'|\bREM\b)[^\r\n]*?\b(TODO|FIXME|FIXIT|HACK|BUG|NOTE)\b[^\r\n]*/gi;
const TODO_HINT_REGEX = /TODO|FIX|HACK|BUG|NOTE/i;

const KEYWORD_RANK = Object.freeze({
  BUG: 1,
  FIXME: 1,
  FIXIT: 1,
  HACK: 1,
  TODO: 2,
  NOTE: 3,
});

function mightContainTodoKeyword(text = '') {
  TODO_HINT_REGEX.lastIndex = 0;
  return TODO_HINT_REGEX.test(String(text ?? ''));
}

function scanTodoComments(text = '') {
  const source = String(text ?? '');
  if (!mightContainTodoKeyword(source)) {
    return [];
  }

  const matches = [];
  let lineNumber = 0;
  let lineStart = 0;
  let scannedTo = 0;
  let match;

  TODO_COMMENT_REGEX.lastIndex = 0;
  while ((match = TODO_COMMENT_REGEX.exec(source)) !== null) {
    for (let index = scannedTo; index < match.index; index++) {
      const code = source.charCodeAt(index);
      if (code === 13 || code === 10) {
        if (code === 13 && source.charCodeAt(index + 1) === 10) {
          index++;
        }
        lineNumber++;
        lineStart = index + 1;
      }
    }
    scannedTo = match.index + match[0].length;

    const start = match.index - lineStart;
    matches.push({
      keyword: match[1].toUpperCase(),
      label: match[0].replace(/^('|REM)\s*/i, '').trim(),
      line: lineNumber,
      start,
      end: start + match[0].length,
    });
  }

  return matches;
}

module.exports = {
  KEYWORD_RANK,
  mightContainTodoKeyword,
  scanTodoComments,
};
