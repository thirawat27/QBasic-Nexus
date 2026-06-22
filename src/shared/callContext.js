'use strict';

const IDENTIFIER_CHAR_RE = /[a-zA-Z0-9_$%!#&]/;
const IDENTIFIER_START_RE = /[a-zA-Z_]/;

function findCallNameBeforeParen(text, parenIndex) {
  let end = parenIndex - 1;
  while (end >= 0 && /\s/.test(text[end])) {
    end--;
  }

  if (end < 0 || !IDENTIFIER_CHAR_RE.test(text[end])) {
    return null;
  }

  let start = end;
  while (start >= 0 && IDENTIFIER_CHAR_RE.test(text[start])) {
    start--;
  }
  start++;

  return IDENTIFIER_START_RE.test(text[start])
    ? text.slice(start, end + 1)
    : null;
}

function findActiveCall(textBefore = '') {
  if (typeof textBefore !== 'string' || textBefore.length === 0) {
    return null;
  }

  const stack = [];
  let inString = false;

  for (let index = 0; index < textBefore.length; index++) {
    const char = textBefore[index];

    if (char === '"') {
      const isEscapedQuote = textBefore[index + 1] === '"';
      if (isEscapedQuote) {
        index++;
        continue;
      }

      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '(') {
      stack.push({
        name: findCallNameBeforeParen(textBefore, index),
        activeParameter: 0,
      });
      continue;
    }

    if (char === ')') {
      stack.pop();
      continue;
    }

    if (char === ',' && stack.length > 0) {
      stack[stack.length - 1].activeParameter++;
    }
  }

  for (let index = stack.length - 1; index >= 0; index--) {
    if (stack[index].name) {
      return stack[index];
    }
  }

  return null;
}

module.exports = { findActiveCall };
