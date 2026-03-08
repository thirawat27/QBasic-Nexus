'use strict';

const CALL_NAME_RE = /([a-zA-Z_][a-zA-Z0-9_$%!#&]*)\s*$/;

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
      const prefix = textBefore.slice(0, index).match(CALL_NAME_RE);
      stack.push({
        name: prefix ? prefix[1] : null,
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
