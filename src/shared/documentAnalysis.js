'use strict';

const { isReservedWord } = require('./languageRegistry');
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
const DIM_PREFIX_RE = /^\s*DIM\s+(?:SHARED\s+)?/i;

function registerDefinition(definitions, name, definition) {
  const key = name.toUpperCase();
  if (!definitions.has(key)) {
    definitions.set(key, definition);
  }
}

function getCaptureRange(match, groupValue) {
  if (!match || typeof groupValue !== 'string') {
    return { start: 0, end: 0 };
  }

  const fullMatch = match[0] || '';
  const relativeStart = fullMatch.toUpperCase().lastIndexOf(groupValue.toUpperCase());
  const start =
    (match.index ?? 0) + (relativeStart >= 0 ? relativeStart : 0);

  return {
    start,
    end: start + groupValue.length,
  };
}

function extractDimDeclarations(line = '') {
  const prefixMatch = DIM_PREFIX_RE.exec(line);
  if (!prefixMatch) return [];

  const declarations = [];
  const bodyStart = prefixMatch[0].length;
  const body = line.slice(bodyStart);

  let segmentStart = 0;
  let depth = 0;

  const pushSegment = (segmentEnd) => {
    const rawSegment = body.slice(segmentStart, segmentEnd);
    const leadingWhitespace = rawSegment.match(/^\s*/)?.[0].length || 0;
    const trimmedSegment = rawSegment.slice(leadingWhitespace);
    const nameMatch = /^([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/.exec(trimmedSegment);

    if (nameMatch) {
      const start = bodyStart + segmentStart + leadingWhitespace;
      declarations.push({
        name: nameMatch[1],
        start,
        end: start + nameMatch[1].length,
      });
    }

    segmentStart = segmentEnd + 1;
  };

  for (let index = 0; index < body.length; index++) {
    const char = body[index];

    if (char === '(') {
      depth++;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === ',' && depth === 0) {
      pushSegment(index);
    }
  }

  pushSegment(body.length);
  return declarations;
}

function analyzeQBasicText(text = '') {
  if (typeof text !== 'string') {
    text = String(text ?? '');
  }

  const lines = text.split(/\r?\n/);
  const dimRe = makeDimRegex();
  const assignRe = makeAssignRegex();
  const variables = new Set();
  const symbols = [];
  const definitions = new Map();

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
    const dimDeclarations = extractDimDeclarations(line);
    if (dimDeclarations.length > 0) {
      dimCount++;
      for (const declaration of dimDeclarations) {
        variables.add(declaration.name);
        registerDefinition(definitions, declaration.name, {
          line: index,
          start: declaration.start,
          end: declaration.end,
          detail: 'DIM',
          kind: 'variable',
        });
      }
    } else {
      while ((match = dimRe.exec(line)) !== null) {
        dimCount++;
        variables.add(match[1]);
        const range = getCaptureRange(match, match[1]);
        registerDefinition(definitions, match[1], {
          line: index,
          start: range.start,
          end: range.end,
          detail: 'DIM',
          kind: 'variable',
        });
      }
    }

    assignRe.lastIndex = 0;
    while ((match = assignRe.exec(line)) !== null) {
      const variableName = match[1];
      if (!isReservedWord(variableName)) {
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
      const range = getCaptureRange(match, match[2]);
      registerDefinition(definitions, match[2], {
        line: index,
        start: range.start,
        end: range.end,
        detail: match[1].toUpperCase(),
        kind,
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
      const range = getCaptureRange(match, match[1]);
      registerDefinition(definitions, match[1], {
        line: index,
        start: range.start,
        end: range.end,
        detail: 'TYPE',
        kind: SYMBOL_KIND.STRUCT,
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
      const range = getCaptureRange(match, match[1]);
      registerDefinition(definitions, match[1], {
        line: index,
        start: range.start,
        end: range.end,
        detail: 'CONST',
        kind: SYMBOL_KIND.CONSTANT,
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
      const range = getCaptureRange(match, match[1]);
      registerDefinition(definitions, match[1], {
        line: index,
        start: range.start,
        end: range.end,
        detail: 'Label',
        kind: SYMBOL_KIND.EVENT,
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
    definitions,
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

function findDefinitionInAnalysis(analysis, identifier) {
  if (!analysis?.definitions || !identifier) {
    return null;
  }

  return analysis.definitions.get(identifier.toUpperCase()) || null;
}

function findIdentifierMatchesInAnalysis(analysis, identifier, options = {}) {
  if (!analysis || !Array.isArray(analysis.lines) || !identifier) {
    return [];
  }

  const includeDeclaration = options.includeDeclaration !== false;
  const definition = includeDeclaration
    ? null
    : findDefinitionInAnalysis(analysis, identifier);
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
        const isDefinitionMatch =
          definition &&
          definition.line === lineNumber &&
          definition.start === match.index &&
          definition.end === match.index + match[0].length;

        if (isDefinitionMatch) {
          continue;
        }

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
  extractDimDeclarations,
  findDefinitionInAnalysis,
  findIdentifierMatchesInAnalysis,
  findDocumentIdentifierMatches,
};
