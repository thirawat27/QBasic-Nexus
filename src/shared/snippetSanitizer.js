'use strict';

const KNOWN_SNIPPET_VARIABLES = new Set([
  'BLOCK_COMMENT_END',
  'BLOCK_COMMENT_START',
  'CLIPBOARD',
  'CURRENT_DATE',
  'CURRENT_DAY_NAME',
  'CURRENT_DAY_NAME_SHORT',
  'CURRENT_HOUR',
  'CURRENT_MINUTE',
  'CURRENT_MONTH',
  'CURRENT_MONTH_NAME',
  'CURRENT_MONTH_NAME_SHORT',
  'CURRENT_SECOND',
  'CURRENT_SECONDS_UNIX',
  'CURRENT_TIMEZONE_OFFSET',
  'CURRENT_YEAR',
  'CURRENT_YEAR_SHORT',
  'CURSOR_INDEX',
  'CURSOR_NUMBER',
  'DIRECTORY',
  'FILEPATH',
  'FILENAME',
  'FILENAME_BASE',
  'LINE_COMMENT',
  'LINE_INDEX',
  'LINE_NUMBER',
  'RANDOM',
  'RANDOM_HEX',
  'RELATIVE_FILEPATH',
  'SELECTED_TEXT',
  'TM_CURRENT_LINE',
  'TM_CURRENT_WORD',
  'TM_DIRECTORY',
  'TM_FILEPATH',
  'TM_FILENAME',
  'TM_FILENAME_BASE',
  'TM_LINE_INDEX',
  'TM_LINE_NUMBER',
  'TM_SELECTED_TEXT',
  'UUID',
  'WORKSPACE_FOLDER',
  'WORKSPACE_NAME',
]);

function isIdentifierStart(char) {
  return /[A-Za-z_]/.test(char || '');
}

function isIdentifierChar(char) {
  return /[A-Za-z0-9_]/.test(char || '');
}

function readIdentifier(text, start) {
  let index = start;
  while (index < text.length && isIdentifierChar(text[index])) {
    index++;
  }
  return {
    value: text.slice(start, index),
    end: index - 1,
  };
}

function readDigits(text, start) {
  let index = start;
  while (index < text.length && /[0-9]/.test(text[index])) {
    index++;
  }
  return {
    value: text.slice(start, index),
    end: index - 1,
  };
}

function readBracedExpression(text, start) {
  let depth = 1;
  let index = start + 2;
  let inner = '';

  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      inner += char;
      if (index + 1 < text.length) {
        inner += text[index + 1];
        index += 2;
        continue;
      }
      index++;
      continue;
    }

    if (char === '{') {
      depth++;
      inner += char;
      index++;
      continue;
    }

    if (char === '}') {
      depth--;
      if (depth === 0) {
        return { inner, end: index };
      }
      inner += char;
      index++;
      continue;
    }

    inner += char;
    index++;
  }

  return null;
}

function sanitizeLiteralText(text, options = {}) {
  const { escapeClosingBrace = false } = options;
  let result = '';

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (char === '\\') {
      result += char;
      if (index + 1 < text.length) {
        result += text[index + 1];
        index++;
      }
      continue;
    }

    if (char === '$') {
      result += '\\$';
      continue;
    }

    if (escapeClosingBrace && char === '}') {
      result += '\\}';
      continue;
    }

    result += char;
  }

  return result;
}

function sanitizeSnippetExpression(expression) {
  const choiceMatch = /^([0-9]+)\|([\s\S]*)\|$/.exec(expression);
  if (choiceMatch) {
    return `${choiceMatch[1]}|${sanitizeLiteralText(choiceMatch[2], {
      escapeClosingBrace: true,
    })}|`;
  }

  const defaultMatch = /^([0-9]+|[A-Za-z_][A-Za-z0-9_]*):(.*)$/s.exec(expression);
  if (defaultMatch) {
    return `${defaultMatch[1]}:${sanitizeSnippetText(defaultMatch[2], {
      escapeClosingBrace: true,
    })}`;
  }

  return expression;
}

function sanitizeSnippetText(text, options = {}) {
  const { escapeClosingBrace = false } = options;
  let result = '';

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (char === '\\') {
      result += char;
      if (index + 1 < text.length) {
        result += text[index + 1];
        index++;
      }
      continue;
    }

    if (char === '$') {
      const next = text[index + 1];

      if (/[0-9]/.test(next || '')) {
        const digits = readDigits(text, index + 1);
        result += `$${digits.value}`;
        index = digits.end;
        continue;
      }

      if (next === '{') {
        const braced = readBracedExpression(text, index);
        if (!braced) {
          result += '\\$';
          continue;
        }

        result += `\${${sanitizeSnippetExpression(braced.inner)}}`;
        index = braced.end;
        continue;
      }

      if (isIdentifierStart(next)) {
        const identifier = readIdentifier(text, index + 1);
        if (KNOWN_SNIPPET_VARIABLES.has(identifier.value)) {
          result += `$${identifier.value}`;
        } else {
          result += `\\$${identifier.value}`;
        }
        index = identifier.end;
        continue;
      }

      result += '\\$';
      continue;
    }

    if (escapeClosingBrace && char === '}') {
      result += '\\}';
      continue;
    }

    result += char;
  }

  return result;
}

function sanitizeSnippetBody(body) {
  if (Array.isArray(body)) {
    return body.map((line) =>
      typeof line === 'string' ? sanitizeSnippetText(line) : line,
    );
  }

  if (typeof body === 'string') {
    return sanitizeSnippetText(body);
  }

  return body;
}

module.exports = {
  sanitizeSnippetBody,
  sanitizeSnippetText,
};
