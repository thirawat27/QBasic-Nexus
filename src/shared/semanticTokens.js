'use strict';

const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { PATTERNS } = require('../providers/patterns');

const BUILTIN_NAMES = new Set(
  [...Object.keys(KEYWORDS), ...Object.keys(FUNCTIONS)].map((name) =>
    name.toUpperCase(),
  ),
);

const PROCEDURE_HEADER_RE =
  /^\s*(?:DECLARE\s+)?(SUB|FUNCTION)\s+([a-zA-Z_][a-zA-Z0-9_$%!#&]*)(?:\s*\(([^)]*)\))?/i;
const TYPE_HEADER_RE = /^\s*TYPE\s+([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/i;
const CONST_RE = /^\s*CONST\s+([a-zA-Z_][a-zA-z0-9_$%!#&]*)\b/i;
const DEF_FN_RE =
  /^\s*DEF\s+FN([a-zA-Z_][a-zA-Z0-9_$%!#&]*)\s*\(([^)]*)\)\s*=/i;
const TYPE_FIELD_RE = /^\s*([a-zA-Z_][a-zA-Z0-9_$%!#&]*)\s+AS\b/i;
const PARAM_RE = /([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/g;
const WORD_RE = /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/g;

function getCommentStart(line = '') {
  let inString = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      if (inString && line[index + 1] === '"') {
        index++;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "'") {
      return index;
    }

    if (
      (index === 0 || /[\s:]/.test(line[index - 1])) &&
      line.slice(index, index + 3).toUpperCase() === 'REM' &&
      (index + 3 >= line.length || /[\s:]/.test(line[index + 3]))
    ) {
      return index;
    }
  }

  return -1;
}

function maskNonCode(line = '') {
  const chars = line.split('');
  let inString = false;

  for (let index = 0; index < chars.length; index++) {
    const char = chars[index];

    if (char === '"') {
      if (inString && chars[index + 1] === '"') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        index++;
        continue;
      }
      inString = !inString;
      chars[index] = ' ';
      continue;
    }

    if (inString) {
      chars[index] = ' ';
    }
  }

  const masked = chars.join('');
  const commentStart = getCommentStart(line);
  if (commentStart < 0) return masked;
  return masked.slice(0, commentStart).padEnd(line.length, ' ');
}

function extractDimEntries(line = '') {
  const dimMatch = /^\s*DIM\s+(?:SHARED\s+)?(.+)$/i.exec(line);
  if (!dimMatch) return [];

  const entries = [];
  const body = dimMatch[1];
  const bodyStart = line.length - body.length;

  let segmentStart = 0;
  let depth = 0;

  const pushSegment = (segmentEnd) => {
    const segment = body.slice(segmentStart, segmentEnd);
    const leadingWhitespace = segment.match(/^\s*/)?.[0].length || 0;
    const trimmed = segment.slice(leadingWhitespace);
    const nameMatch = /^([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/.exec(trimmed);
    if (!nameMatch) {
      segmentStart = segmentEnd + 1;
      return;
    }

    const name = nameMatch[1];
    const start = bodyStart + segmentStart + leadingWhitespace;
    const afterName = trimmed.slice(name.length);
    entries.push({
      name,
      start,
      end: start + name.length,
      isArray: /^\s*\(/.test(afterName),
    });

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
  return entries;
}

function parseParameters(rawParams = '', line = '', offset = 0) {
  const params = [];
  let match;

  PARAM_RE.lastIndex = 0;
  while ((match = PARAM_RE.exec(rawParams)) !== null) {
    const upper = match[1].toUpperCase();
    if (
      upper === 'BYVAL' ||
      upper === 'BYREF' ||
      upper === 'AS' ||
      upper === 'OPTIONAL'
    ) {
      continue;
    }

    const start = offset + match.index;
    params.push({
      name: match[1],
      line,
      start,
      end: start + match[1].length,
    });
  }

  return params;
}

function registerDefinition(map, name, definition) {
  if (!name || !definition) return;
  map.set(name.toUpperCase(), definition);
}

function findScope(scopes, line) {
  return (
    scopes.find(
      (scope) => line >= scope.startLine && line <= scope.endLine,
    ) || null
  );
}

function buildSemanticTokenSpans(text = '') {
  const lines = String(text ?? '').split(/\r?\n/);
  const globalVars = new Map();
  const globalFunctions = new Map();
  const globalTypes = new Map();
  const globalLabels = new Map();
  const scopes = [];
  const typeMembers = [];

  let currentScope = null;
  let currentTypeBlock = null;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber];
    const codeOnly = maskNonCode(line);
    const trimmed = codeOnly.trim();

    if (!trimmed) {
      continue;
    }

    const procedureMatch = PROCEDURE_HEADER_RE.exec(codeOnly);
    if (procedureMatch) {
      const type = procedureMatch[1].toUpperCase();
      const name = procedureMatch[2];
      const nameStart = codeOnly.toUpperCase().indexOf(name.toUpperCase());
      const paramsText = procedureMatch[3] || '';
      const paramsOffset =
        paramsText.length > 0
          ? codeOnly.indexOf(paramsText, nameStart + name.length)
          : -1;

      currentScope = {
        name,
        type,
        startLine: lineNumber,
        endLine: lines.length - 1,
        locals: new Map(),
        params: new Map(),
      };
      scopes.push(currentScope);

      registerDefinition(globalFunctions, name, {
        name,
        line: lineNumber,
        start: nameStart,
        end: nameStart + name.length,
        kind: 'function',
      });

      for (const param of parseParameters(
        paramsText,
        lineNumber,
        paramsOffset >= 0 ? paramsOffset : 0,
      )) {
        registerDefinition(currentScope.params, param.name, {
          ...param,
          kind: 'parameter',
        });
      }
      continue;
    }

    if (currentScope && /^\s*END\s+(?:SUB|FUNCTION)\b/i.test(trimmed)) {
      currentScope.endLine = lineNumber;
      currentScope = null;
      continue;
    }

    const typeMatch = TYPE_HEADER_RE.exec(codeOnly);
    if (typeMatch) {
      const name = typeMatch[1];
      const nameStart = codeOnly.toUpperCase().indexOf(name.toUpperCase());
      registerDefinition(globalTypes, name, {
        name,
        line: lineNumber,
        start: nameStart,
        end: nameStart + name.length,
        kind: 'struct',
      });
      currentTypeBlock = {
        name,
        startLine: lineNumber,
      };
      continue;
    }

    if (currentTypeBlock && /^\s*END\s+TYPE\b/i.test(trimmed)) {
      currentTypeBlock = null;
      continue;
    }

    if (currentTypeBlock) {
      const fieldMatch = TYPE_FIELD_RE.exec(codeOnly);
      if (fieldMatch) {
        const name = fieldMatch[1];
        const start = codeOnly.toUpperCase().indexOf(name.toUpperCase());
        typeMembers.push({
          name: name.toUpperCase(),
          line: lineNumber,
          start,
          end: start + name.length,
        });
      }
      continue;
    }

    const constMatch = CONST_RE.exec(codeOnly);
    if (constMatch) {
      const name = constMatch[1];
      const start = codeOnly.toUpperCase().indexOf(name.toUpperCase());
      registerDefinition(currentScope ? currentScope.locals : globalVars, name, {
        name,
        line: lineNumber,
        start,
        end: start + name.length,
        kind: 'const',
        isReadonly: true,
      });
      continue;
    }

    const defFnMatch = DEF_FN_RE.exec(codeOnly);
    if (defFnMatch) {
      const name = `FN${defFnMatch[1]}`;
      const start = codeOnly.toUpperCase().indexOf(name.toUpperCase());
      registerDefinition(globalFunctions, name, {
        name,
        line: lineNumber,
        start,
        end: start + name.length,
        kind: 'function',
      });
      continue;
    }

    for (const entry of extractDimEntries(codeOnly)) {
      registerDefinition(currentScope ? currentScope.locals : globalVars, entry.name, {
        ...entry,
        line: lineNumber,
        kind: 'variable',
        isArray: entry.isArray,
      });
    }

    const labelMatch = PATTERNS.LABEL.exec(codeOnly.trimStart());
    if (labelMatch) {
      const name = labelMatch[1];
      const start = codeOnly.indexOf(name);
      registerDefinition(globalLabels, name, {
        name,
        line: lineNumber,
        start,
        end: start + name.length,
        kind: 'label',
      });
    }
  }

  const spans = [];

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber];
    const codeOnly = maskNonCode(line);
    const activeScope = findScope(scopes, lineNumber);
    let match;

    WORD_RE.lastIndex = 0;
    while ((match = WORD_RE.exec(codeOnly)) !== null) {
      const name = match[0];
      const upperName = name.toUpperCase();

      if (BUILTIN_NAMES.has(upperName)) {
        continue;
      }

      const range = {
        line: lineNumber,
        start: match.index,
        length: name.length,
      };

      const typeMember = typeMembers.find(
        (entry) =>
          entry.line === lineNumber &&
          entry.start === range.start &&
          entry.end === range.start + range.length,
      );
      if (typeMember) {
        spans.push({
          ...range,
          type: 'property',
          modifiers: ['declaration', 'typeMember'],
        });
        continue;
      }

      const localParam = activeScope?.params.get(upperName);
      if (localParam) {
        spans.push({
          ...range,
          type: 'parameter',
          modifiers: [
            'local',
            ...(localParam.line === lineNumber &&
            localParam.start === range.start
              ? ['declaration']
              : []),
          ],
        });
        continue;
      }

      const localDef = activeScope?.locals.get(upperName);
      if (localDef) {
        spans.push({
          ...range,
          type: localDef.kind === 'const' ? 'variable' : 'variable',
          modifiers: [
            'local',
            ...(localDef.isArray ? ['array'] : []),
            ...(localDef.isReadonly ? ['readonly'] : []),
            ...(localDef.line === lineNumber && localDef.start === range.start
              ? ['declaration']
              : []),
          ],
        });
        continue;
      }

      const globalFunction = globalFunctions.get(upperName);
      if (globalFunction) {
        spans.push({
          ...range,
          type: 'function',
          modifiers:
            globalFunction.line === lineNumber && globalFunction.start === range.start
              ? ['declaration']
              : [],
        });
        continue;
      }

      const globalType = globalTypes.get(upperName);
      if (globalType) {
        spans.push({
          ...range,
          type: 'struct',
          modifiers:
            globalType.line === lineNumber && globalType.start === range.start
              ? ['declaration']
              : [],
        });
        continue;
      }

      const globalLabel = globalLabels.get(upperName);
      if (globalLabel) {
        spans.push({
          ...range,
          type: 'label',
          modifiers:
            globalLabel.line === lineNumber && globalLabel.start === range.start
              ? ['declaration']
              : [],
        });
        continue;
      }

      const globalDef = globalVars.get(upperName);
      if (globalDef) {
        spans.push({
          ...range,
          type: 'variable',
          modifiers: [
            'global',
            ...(globalDef.isArray ? ['array'] : []),
            ...(globalDef.isReadonly ? ['readonly'] : []),
            ...(globalDef.line === lineNumber && globalDef.start === range.start
              ? ['declaration']
              : []),
          ],
        });
      }
    }
  }

  return spans;
}

module.exports = {
  buildSemanticTokenSpans,
  extractDimEntries,
  getCommentStart,
  maskNonCode,
  parseParameters,
};
