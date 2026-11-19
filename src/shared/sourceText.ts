/**
 * Helpers for reading QBasic source lines without being fooled by string
 * literals or comments. Pure functions, no VS Code dependency.
 */

const IDENTIFIER_RE_SOURCE = String.raw`[A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|%&|[$%!#&]))?`;
const TYPE_SUFFIX_RE = /(?:~?(?:%%|&&|##|%&|[$%!#&]))$/;

/**
 * Return the line with string-literal contents and comments replaced by
 * spaces. Column positions are preserved, so offsets found in the masked text
 * are valid offsets into the original line.
 * @param {string} line
 * @returns {string}
 */
function maskCode(line = '') {
  const text = String(line);
  let out = '';
  let inString = false;
  let statementStart = true;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (ch === '"') {
        inString = false;
        out += ch;
      } else {
        out += ' ';
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      statementStart = false;
      out += ch;
      continue;
    }

    if (ch === "'") {
      return out + ' '.repeat(text.length - i);
    }

    if (
      statementStart &&
      /^REM(?![A-Za-z0-9_$%!#&])/i.test(text.slice(i, i + 4))
    ) {
      return out + ' '.repeat(text.length - i);
    }

    if (ch === ':') {
      statementStart = true;
    } else if (!/\s/.test(ch)) {
      statementStart = false;
    }
    out += ch;
  }

  return out;
}

/**
 * Upper-case a name and drop its QBasic type suffix, so `Pad$` and `PAD`
 * compare equal.
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name = '') {
  return String(name).replace(TYPE_SUFFIX_RE, '').toUpperCase();
}

/**
 * Create a fresh global regex that finds identifiers (with an optional type
 * suffix) that are not part of a longer identifier or a `.field` access.
 * @returns {RegExp}
 */
function makeIdentifierScanner() {
  return new RegExp(`(?<![A-Za-z0-9_$%!#&~.])${IDENTIFIER_RE_SOURCE}`, 'g');
}

/**
 * Split an argument list on top-level commas.
 * @param {string} text - masked text between the call's delimiters
 * @param {number} offset - column of text[0] in the line
 * @returns {Array<{start: number, end: number, text: string}>} trimmed args
 */
function splitArguments(text, offset = 0) {
  const args = [];
  let depth = 0;
  let segmentStart = 0;

  const push = (end) => {
    const raw = text.slice(segmentStart, end);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) {
      const start = offset + segmentStart + lead;
      args.push({ start, end: start + trimmed.length, text: trimmed });
    }
    segmentStart = end + 1;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) push(i);
  }
  push(text.length);
  return args;
}

export {
  maskCode,
  normalizeName,
  makeIdentifierScanner,
  splitArguments,
  TYPE_SUFFIX_RE,
};
