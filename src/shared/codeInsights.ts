/**
 * Lightweight static analysis: typo detection, unused procedures, cyclomatic
 * complexity and duplicated code. Pure functions over source lines, no VS
 * Code dependency.
 */

import { KEYWORDS, FUNCTIONS } from '../../languageData';
import { maskCode, normalizeName, makeIdentifierScanner } from './sourceText';
import { suggestName } from './fuzzyNames';
import { getProcedures, findIncomingCalls } from './procedureIndex';

/** Words valid at the start of a statement besides catalog keywords. */
const EXTRA_STATEMENT_WORDS = ['LET', 'CALL', 'ELSE', 'ELSEIF', 'CASE', 'LOOP', 'WEND', 'NEXT', 'END', 'REM'];

const KEYWORD_WORDS = [
  ...new Set(
    [...Object.keys(KEYWORDS), ...EXTRA_STATEMENT_WORDS]
      .filter((key) => !key.startsWith('$'))
      .map((key) => key.split(' ')[0].toUpperCase()),
  ),
];
const FUNCTION_WORDS = Object.keys(FUNCTIONS).map((name) => name.toUpperCase());

const NOPREFIX_RE = /^\s*\$NOPREFIX\b/im;

/** A word that is probably a misspelling of `suggestion`. */
export interface TypoMatch {
  line: number;
  start: number;
  end: number;
  word: string;
  suggestion: string;
}
const LABEL_LINE_RE = /^\s*(?:\d+\s|[A-Za-z_][A-Za-z0-9_]*:(?!=))/;

function withNoPrefixVariants(words) {
  const result = new Set(words);
  for (const word of words) {
    if (word.startsWith('_')) result.add(word.slice(1));
  }
  return result;
}

/**
 * Statements in a masked line with their start column.
 * @param {string} masked
 * @returns {Array<{text: string, start: number}>}
 */
function splitStatements(masked) {
  const statements = [];
  let start = 0;
  for (let i = 0; i <= masked.length; i++) {
    if (i === masked.length || masked[i] === ':') {
      statements.push({ text: masked.slice(start, i), start });
      start = i + 1;
    }
  }
  return statements;
}

/**
 * Find likely misspellings of statements, built-in functions and procedures.
 * Only names with a close known match are reported, so calls to procedures
 * from libraries outside the workspace are not flagged.
 * @param {string[]} lines
 * @param {{procedures?: Iterable<string>, variables?: Iterable<string>}} [context]
 *   procedure names (any case) and variable names known in the workspace
 * @returns {Array<{line: number, start: number, end: number, word: string,
 *   suggestion: string}>}
 */
function findTypos(
  lines: string[],
  context: { procedures?: Iterable<string>; variables?: Iterable<string> } = {},
): TypoMatch[] {
  const noPrefix = NOPREFIX_RE.test(lines.join('\n'));
  const procedures = [...(context.procedures || [])];
  const procedureSet = new Set(procedures.map(normalizeName));
  const variableSet = new Set([...(context.variables || [])].map(normalizeName));

  const keywords = noPrefix ? withNoPrefixVariants(KEYWORD_WORDS) : new Set(KEYWORD_WORDS);
  const functions = noPrefix ? withNoPrefixVariants(FUNCTION_WORDS) : new Set(FUNCTION_WORDS);
  const statementCandidates = [...keywords, ...procedures];
  const functionCandidates = [...functions, ...procedures];
  const known = (word) => {
    const upper = word.toUpperCase();
    const norm = normalizeName(word);
    return (
      keywords.has(upper) ||
      functions.has(upper) ||
      procedureSet.has(norm) ||
      variableSet.has(norm)
    );
  };

  // Names assigned or DIMmed anywhere (arrays, implicit variables).
  for (const line of lines) {
    const masked = maskCode(line);
    for (const statement of splitStatements(masked)) {
      const assign = /^\s*(?:LET\s+)?([A-Za-z_][A-Za-z0-9_]*[$%!#&~]*)\s*(?:\([^)]*\))?\s*(?:\.[A-Za-z_][\w.]*)?\s*=/i.exec(statement.text);
      if (assign) variableSet.add(normalizeName(assign[1]));
    }
  }

  const typos: TypoMatch[] = [];
  for (let index = 0; index < lines.length; index++) {
    // Blank out a leading line number or label so it is not read as a word.
    const masked = maskCode(lines[index]).replace(LABEL_LINE_RE, (m) => ' '.repeat(m.length));
    if (!masked.trim() || /^\s*\$/.test(masked)) continue;

    for (const statement of splitStatements(masked)) {
      const text = statement.text;
      const offset = statement.start;

      // Statement-start word: `PIRNT x`, `CALL DrawPlyer`.
      const head = /^(\s*)(?:CALL\s+)?([A-Za-z_][A-Za-z0-9_]*[$%!#&~]*)/i.exec(text);
      if (head) {
        const word = head[2];
        const rest = text.slice(head[0].length);
        const isAssignment = /^\s*(?:\([^)]*\))?\s*(?:\.[\w.]+)?\s*=/.test(rest);
        if (!isAssignment && !known(word)) {
          const suggestion = suggestName(word, statementCandidates);
          if (suggestion) {
            const start = offset + head[0].length - word.length;
            typos.push({ line: index, start, end: start + word.length, word, suggestion });
          }
        }
      }

      // Function-call words inside expressions: `x = Lenn(a$)`.
      const scanner = makeIdentifierScanner();
      let match;
      while ((match = scanner.exec(text)) !== null) {
        if (head && match.index === head[0].length - head[2].length) continue;
        const word = match[0];
        if (!/^\s*\(/.test(text.slice(match.index + word.length))) continue;
        if (known(word)) continue;
        const suggestion = suggestName(word, functionCandidates);
        if (suggestion) {
          const start = offset + match.index;
          typos.push({ line: index, start, end: start + word.length, word, suggestion });
        }
      }
    }
  }
  return typos;
}

/**
 * SUBs and FUNCTIONs of one file that nothing in the workspace calls.
 * @param {Array<{file: string, analysis: {lines: string[]}}>} fileAnalyses
 * @param {string} file - the file to report on
 * @returns {import('./procedureIndex').Procedure[]}
 */
function findUnusedProcedures(fileAnalyses, file) {
  const entry = fileAnalyses.find((candidate) => candidate.file === file);
  if (!entry) return [];
  return getProcedures(entry.analysis).filter(
    (proc) =>
      findIncomingCalls(fileAnalyses, proc.normName).every((group) => group.sites.length === 0),
  );
}

const DECISION_RE =
  /\b(?:IF|ELSEIF|FOR|WHILE|UNTIL|AND|OR|_ANDALSO|_ORELSE)\b|\bCASE\b(?!\s+ELSE\b)/gi;

/**
 * McCabe cyclomatic complexity of a procedure: 1 + decision points.
 * `END IF`, `CASE ELSE` and `SELECT CASE` are not decisions.
 * @param {string[]} lines
 * @param {{line: number, endLine: number}} proc
 */
function cyclomaticComplexity(lines, proc) {
  let complexity = 1;
  for (let index = proc.line + 1; index < proc.endLine; index++) {
    const masked = maskCode(lines[index])
      .replace(/\bEND\s+IF\b/gi, '')
      .replace(/\bSELECT\s+CASE\b/gi, '')
      .replace(/\bEXIT\s+(?:FOR|DO|WHILE)\b/gi, '');
    const matches = masked.match(DECISION_RE);
    if (matches) complexity += matches.length;
  }
  return complexity;
}

/**
 * Normalized code lines for clone detection: comments and string contents
 * removed, whitespace collapsed, upper-cased. Trivial lines are dropped.
 * @param {string[]} lines
 * @returns {Array<{line: number, key: string}>}
 */
function significantLines(lines) {
  const result = [];
  for (let index = 0; index < lines.length; index++) {
    const key = maskCode(lines[index]).replace(/\s+/g, ' ').trim().toUpperCase();
    if (!key || /^(?:END (?:IF|SUB|FUNCTION|SELECT|TYPE)|NEXT\b.*|LOOP|WEND|ELSE|DO|CLS)$/.test(key)) {
      continue;
    }
    result.push({ line: index, key });
  }
  return result;
}

/**
 * Find blocks of at least `minLines` significant lines in `file` that also
 * appear elsewhere (in the same file or another one).
 * @param {Array<{file: string, analysis: {lines: string[]}}>} fileAnalyses
 * @param {string} file
 * @param {number} [minLines]
 * @returns {Array<{startLine: number, endLine: number,
 *   other: {file: string, startLine: number, endLine: number}}>}
 */
function findDuplicateBlocks(fileAnalyses, file, minLines = 6) {
  const target = fileAnalyses.find((entry) => entry.file === file);
  if (!target || minLines < 2) return [];

  const windowKey = (sig, i) => {
    let key = '';
    for (let k = 0; k < minLines; k++) key += `${sig[i + k].key}\n`;
    return key;
  };

  /** @type {Map<string, Array<{file: string, index: number}>>} */
  const index = new Map();
  const sigByFile = new Map();
  for (const entry of fileAnalyses) {
    const sig = significantLines(entry.analysis.lines);
    sigByFile.set(entry.file, sig);
    for (let i = 0; i + minLines <= sig.length; i++) {
      const key = windowKey(sig, i);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ file: entry.file, index: i });
    }
  }

  const targetSig = sigByFile.get(file);
  const blocks = [];
  let i = 0;
  while (i + minLines <= targetSig.length) {
    const hits = index.get(windowKey(targetSig, i)) || [];
    const other = hits.find(
      (hit) => hit.file !== file || Math.abs(hit.index - i) >= minLines,
    );
    if (!other) {
      i++;
      continue;
    }

    // Extend the match as far as both copies keep agreeing.
    const otherSig = sigByFile.get(other.file);
    let length = minLines;
    while (
      i + length < targetSig.length &&
      other.index + length < otherSig.length &&
      targetSig[i + length].key === otherSig[other.index + length].key &&
      (other.file !== file || other.index + length !== i)
    ) {
      length++;
    }

    blocks.push({
      startLine: targetSig[i].line,
      endLine: targetSig[i + length - 1].line,
      other: {
        file: other.file,
        startLine: otherSig[other.index].line,
        endLine: otherSig[other.index + length - 1].line,
      },
    });
    i += length;
  }
  return blocks;
}

export {
  findTypos,
  findUnusedProcedures,
  cyclomaticComplexity,
  findDuplicateBlocks,
  significantLines,
};
