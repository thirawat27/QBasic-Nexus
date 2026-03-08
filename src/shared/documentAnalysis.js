'use strict';

const { KEYWORDS } = require('../../languageData');
const {
  PATTERNS,
  makeAssignRegex,
  makeDimRegex,
  makeIdentifierRegex,
} = require('../providers/patterns');

const SYMBOL_KIND = Object.freeze({
  FUNCTION: 'function',
  METHOD: 'method',
  STRUCT: 'struct',
  CONSTANT: 'constant',
  EVENT: 'event',
});

const analysisCache = new Map();

const GOTO_RE = /\bGOTO\b/gi;
const GOSUB_RE = /\bGOSUB\b/gi;
const SELECT_CASE_RE = /^\s*SELECT\s+CASE\b/i;
const DECLARATION_CONTEXT_RE = /\b(?:DIM|SUB|FUNCTION|TYPE|CONST)\s*$/i;

function analyzeQBasicText(text = '') {
  if (typeof text !== 'string') {
    text = String(text ?? '');
  }

  const lines = text.split(/\r?\n/);
  const dimRe = makeDimRegex();
  const assignRe = makeAssignRegex();
  const variables = new Set();
  const symbols = [];

  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let subCount = 0;
  let funcCount = 0;
  let typeCount = 0;
  let constCount = 0;
  let dimCount = 0;
  let labelCount = 0;
  let gotoCount = 0;
  let gosubCount = 0;
  let selectCount = 0;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      blankLines++;
    } else if (PATTERNS.COMMENT.test(trimmed)) {
      commentLines++;
    } else {
      codeLines++;
    }

    GOTO_RE.lastIndex = 0;
    while (GOTO_RE.exec(line) !== null) {
      gotoCount++;
    }

    GOSUB_RE.lastIndex = 0;
    while (GOSUB_RE.exec(line) !== null) {
      gosubCount++;
    }
    if (SELECT_CASE_RE.test(line)) selectCount++;

    dimRe.lastIndex = 0;
    let match;
    while ((match = dimRe.exec(line)) !== null) {
      dimCount++;
      variables.add(match[1]);
    }

    assignRe.lastIndex = 0;
    while ((match = assignRe.exec(line)) !== null) {
      const variableName = match[1];
      if (!KEYWORDS[variableName.toUpperCase()]) {
        variables.add(variableName);
      }
    }

    if (PATTERNS.COMMENT.test(line) || PATTERNS.DECLARE.test(line)) {
      continue;
    }

    if ((match = PATTERNS.SUB_DEF.exec(line))) {
      const kind =
        match[1].toUpperCase() === 'FUNCTION'
          ? SYMBOL_KIND.FUNCTION
          : SYMBOL_KIND.METHOD;

      if (kind === SYMBOL_KIND.FUNCTION) {
        funcCount++;
      } else {
        subCount++;
      }

      symbols.push({
        name: match[2],
        detail: match[1].toUpperCase(),
        kind,
        line: index,
      });
      continue;
    }

    if ((match = PATTERNS.TYPE_DEF.exec(line))) {
      typeCount++;
      symbols.push({
        name: match[1],
        detail: 'TYPE',
        kind: SYMBOL_KIND.STRUCT,
        line: index,
      });
      continue;
    }

    if ((match = PATTERNS.CONST_DEF.exec(line))) {
      constCount++;
      symbols.push({
        name: match[1],
        detail: 'CONST',
        kind: SYMBOL_KIND.CONSTANT,
        line: index,
      });
      continue;
    }

    if ((match = PATTERNS.LABEL.exec(line))) {
      labelCount++;
      symbols.push({
        name: match[1],
        detail: 'Label',
        kind: SYMBOL_KIND.EVENT,
        line: index,
      });
    }
  }

  return {
    lines,
    totalLines: lines.length,
    codeLines,
    commentLines,
    blankLines,
    subCount,
    funcCount,
    typeCount,
    constCount,
    dimCount,
    labelCount,
    gotoCount,
    gosubCount,
    selectCount,
    textLength: text.length,
    variables: Array.from(variables),
    symbols,
    identifierMatchCache: new Map(),
  };
}

function getDocumentAnalysis(document) {
  if (!document || typeof document.getText !== 'function' || !document.uri) {
    return analyzeQBasicText('');
  }

  const key = document.uri.toString();
  const cached = analysisCache.get(key);
  if (cached && cached.version === document.version) {
    return cached.analysis;
  }

  const analysis = analyzeQBasicText(document.getText());
  analysisCache.set(key, { version: document.version, analysis });
  return analysis;
}

function invalidateDocumentAnalysis(uri) {
  if (!uri) return;
  const key = typeof uri === 'string' ? uri : uri.toString();
  analysisCache.delete(key);
}

function clearDocumentAnalysisCache() {
  analysisCache.clear();
}

function findIdentifierMatchesInAnalysis(analysis, identifier, options = {}) {
  if (!analysis || !Array.isArray(analysis.lines) || !identifier) {
    return [];
  }

  const includeDeclaration = options.includeDeclaration !== false;
  const cacheKey = `${identifier.toUpperCase()}\x00${includeDeclaration ? '1' : '0'}`;

  if (analysis.identifierMatchCache?.has(cacheKey)) {
    return analysis.identifierMatchCache.get(cacheKey);
  }

  const matches = [];
  const wordPattern = makeIdentifierRegex(identifier, 'gi');

  for (let lineNumber = 0; lineNumber < analysis.lines.length; lineNumber++) {
    const line = analysis.lines[lineNumber];
    let match;

    wordPattern.lastIndex = 0;

    while ((match = wordPattern.exec(line)) !== null) {
      if (!includeDeclaration) {
        const beforeMatch = line.substring(0, match.index);
        if (DECLARATION_CONTEXT_RE.test(beforeMatch)) {
          continue;
        }
      }

      matches.push({
        line: lineNumber,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  analysis.identifierMatchCache?.set(cacheKey, matches);
  return matches;
}

function findDocumentIdentifierMatches(document, identifier, options = {}) {
  return findIdentifierMatchesInAnalysis(
    getDocumentAnalysis(document),
    identifier,
    options,
  );
}

module.exports = {
  SYMBOL_KIND,
  analyzeQBasicText,
  getDocumentAnalysis,
  invalidateDocumentAnalysis,
  clearDocumentAnalysisCache,
  findIdentifierMatchesInAnalysis,
  findDocumentIdentifierMatches,
};
