/**
 * QBasic Nexus - Document Analysis
 * Provides comprehensive analysis of QBasic documents including symbols, variables, and statistics
 */

'use strict';

const { KEYWORDS } = require('../../languageData');
const {
  PATTERNS,
  makeAssignRegex,
  makeDimRegex,
  makeIdentifierRegex,
} = require('../providers/patterns');

// O(1) keyword lookup set (avoids object property access overhead)
const KEYWORDS_UPPER_SET = new Set(Object.keys(KEYWORDS).map(k => k.toUpperCase()));

/**
 * Symbol kinds for QBasic code elements
 * @readonly
 * @enum {string}
 */
const SYMBOL_KIND = Object.freeze({
  FUNCTION: 'function',
  METHOD: 'method',
  STRUCT: 'struct',
  CONSTANT: 'constant',
  EVENT: 'event',
});

/**
 * Cache for document analysis results
 * @type {Map<string, {version: number, analysis: DocumentAnalysis}>}
 */
const analysisCache = new Map();

const GOTO_RE = /\bGOTO\b/gi;
const GOSUB_RE = /\bGOSUB\b/gi;
const SELECT_CASE_RE = /^\s*SELECT\s+CASE\b/i;
const DECLARATION_CONTEXT_RE = /\b(?:DIM|SUB|FUNCTION|TYPE|CONST)\s*$/i;
const DIM_PREFIX_RE = /^\s*DIM\s+(?:SHARED\s+)?/i;

/**
 * Register a definition in the definitions map
 * @param {Map<string, Definition>} definitions - Definitions map
 * @param {string} name - Symbol name
 * @param {Definition} definition - Definition object
 */
function registerDefinition(definitions, name, definition) {
  const key = name.toUpperCase();
  if (!definitions.has(key)) {
    definitions.set(key, definition);
  }
}

/**
 * Get the range of a captured group in a regex match
 * @param {RegExpExecArray} match - Regex match result
 * @param {string} groupValue - Captured group value
 * @returns {{start: number, end: number}} Character range
 */
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

/**
 * Extract DIM declarations from a line, handling comma-separated variables
 * @param {string} line - Source code line
 * @returns {Array<{name: string, start: number, end: number}>} Extracted declarations
 */
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

/**
 * Analyze QBasic source code and extract symbols, variables, and statistics
 * @param {string} text - QBasic source code
 * @returns {DocumentAnalysis} Analysis result with symbols, variables, and stats
 */
function analyzeQBasicText(text = '') {
  if (typeof text !== 'string') {
    text = String(text ?? '');
  }

  // Fast split: avoid regex engine overhead by scanning char-codes directly
  const lines = [];
  let lineStart = 0;
  for (let i = 0; i <= text.length; i++) {
    const c = i < text.length ? text.charCodeAt(i) : 10;
    if (c === 10) { // \n
      // If previous char was \r, exclude it
      const end = (i > lineStart && text.charCodeAt(i - 1) === 13) ? i - 1 : i;
      lines.push(text.slice(lineStart, end));
      lineStart = i + 1;
    }
  }

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
      continue;
    }

    const upperTrimmed = trimmed.toUpperCase();
    if (upperTrimmed.startsWith("'") || upperTrimmed.startsWith('REM ') || upperTrimmed === 'REM') {
      commentLines++;
      continue;
    }

    codeLines++;

    if (upperTrimmed.startsWith('DECLARE ')) {
      continue;
    }

    const upperLine = upperTrimmed; // Instead of re-doing it, we already have upperTrimmed which is good enough for inclusion checks. Wait, line.toUpperCase() might have spaces intact but upperTrimmed lacks leading spaces, which is totally fine for includes().
    let match;

    if (upperLine.includes('GOTO')) {
      const gotos = line.match(GOTO_RE);
      if (gotos) gotoCount += gotos.length;
    }

    if (upperLine.includes('GOSUB')) {
      const gosubs = line.match(GOSUB_RE);
      if (gosubs) gosubCount += gosubs.length;
    }
    
    if (upperLine.includes('SELECT CASE')) {
      if (SELECT_CASE_RE.test(line)) selectCount++;
    }

    if (upperLine.includes('DIM')) {
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
        dimRe.lastIndex = 0;
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
    }

    if (line.includes('=')) {
      assignRe.lastIndex = 0;
      while ((match = assignRe.exec(line)) !== null) {
        const variableName = match[1];
        if (!KEYWORDS_UPPER_SET.has(variableName.toUpperCase())) {
          variables.add(variableName);
        }
      }
    }

    if (upperTrimmed.startsWith('SUB ') || upperTrimmed.startsWith('FUNCTION ')) {
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
    }

    if (upperTrimmed.startsWith('TYPE ')) {
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
    }

    if (upperTrimmed.startsWith('CONST ')) {
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
    }

    if (trimmed.includes(':')) {
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
  }

  return {
    lines,
    linesUpper: lines.map(l => l.toUpperCase()), // pre-built for fast identifier search
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

/**
 * Get cached analysis for a VS Code document
 * @param {vscode.TextDocument} document - VS Code document
 * @returns {DocumentAnalysis} Cached or fresh analysis result
 */
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

/**
 * Invalidate cached analysis for a document
 * @param {vscode.Uri | string} uri - Document URI
 */
function invalidateDocumentAnalysis(uri) {
  if (!uri) return;
  const key = typeof uri === 'string' ? uri : uri.toString();
  analysisCache.delete(key);
}

/**
 * Clear all cached document analyses
 */
function clearDocumentAnalysisCache() {
  analysisCache.clear();
}

/**
 * Find definition of an identifier in analysis result
 * @param {DocumentAnalysis} analysis - Document analysis
 * @param {string} identifier - Identifier to find
 * @returns {Definition | null} Definition or null if not found
 */
function findDefinitionInAnalysis(analysis, identifier) {
  if (!analysis?.definitions || !identifier) {
    return null;
  }

  return analysis.definitions.get(identifier.toUpperCase()) || null;
}

/**
 * Find all matches of an identifier in analysis result
 * @param {DocumentAnalysis} analysis - Document analysis
 * @param {string} identifier - Identifier to find
 * @param {{includeDeclaration?: boolean}} options - Search options
 * @returns {Array<{line: number, start: number, end: number}>} Match locations
 */
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

  const identifierUpper = identifier.toUpperCase();
  // Use precomputed uppercase lines if available for fast substring checks
  const linesUpper = analysis.linesUpper;

  for (let lineNumber = 0; lineNumber < analysis.lines.length; lineNumber++) {
    const line = analysis.lines[lineNumber];
    
    // Fast path: skip lines that definitely don't contain the identifier
    const lineU = linesUpper ? linesUpper[lineNumber] : line.toUpperCase();
    if (!lineU.includes(identifierUpper)) {
      continue;
    }

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

/**
 * Find all matches of an identifier in a VS Code document
 * @param {vscode.TextDocument} document - VS Code document
 * @param {string} identifier - Identifier to find
 * @param {{includeDeclaration?: boolean}} options - Search options
 * @returns {Array<{line: number, start: number, end: number}>} Match locations
 */
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
