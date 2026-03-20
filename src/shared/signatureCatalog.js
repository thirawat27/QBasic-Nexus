'use strict';

const { FUNCTIONS } = require('../../languageData');
const { findActiveCall } = require('./callContext');

const STATEMENT_SIGNATURES = Object.freeze({
  CIRCLE: {
    label: 'CIRCLE (x, y), radius, color, startAngle, endAngle, aspect',
    documentation:
      '**CIRCLE (x, y), radius, color, startAngle, endAngle, aspect**\n\nDraws a circle or ellipse in graphics mode. The center coordinate pair is treated as one logical argument, so parameter hints stay stable while you type inside `(x, y)`.',
    params: [
      '(x, y)',
      'radius',
      'color',
      'startAngle',
      'endAngle',
      'aspect',
    ],
    mode: 'parenStatement',
  },
  PAINT: {
    label: 'PAINT (x, y), fillColor, borderColor, pattern$',
    documentation:
      '**PAINT (x, y), fillColor, borderColor, pattern$**\n\nFlood-fills an enclosed area. The coordinate pair is treated as the first logical argument.',
    params: ['(x, y)', 'fillColor', 'borderColor', 'pattern$'],
    mode: 'parenStatement',
  },
  DRAW: {
    label: 'DRAW commandString$',
    documentation:
      '**DRAW commandString$**\n\nExecutes QBasic DRAW macro commands using turtle-style graphics instructions.',
    params: ['commandString$'],
    mode: 'inlineStatement',
  },
  PLAY: {
    label: 'PLAY musicMacro$',
    documentation:
      '**PLAY musicMacro$**\n\nPlays a QBasic/QB64 music macro string. Useful for quick audio previews inside the CRT runtime.',
    params: ['musicMacro$'],
    mode: 'inlineStatement',
  },
  OPEN: {
    label: 'OPEN fileSpec FOR mode [ACCESS access] [LOCK lockMode] AS #fileNum [LEN = recordLength]',
    documentation:
      '**OPEN fileSpec FOR mode [ACCESS access] [LOCK lockMode] AS #fileNum [LEN = recordLength]**\n\nOpens a file using the selected mode and sharing rules.',
    params: [
      'fileSpec',
      'mode',
      'access',
      'lockMode',
      '#fileNum',
      'recordLength',
    ],
    mode: 'inlineStatement',
  },
  'LINE INPUT': {
    label: 'LINE INPUT [#fileNum,] stringVariable$',
    documentation:
      '**LINE INPUT [#fileNum,] stringVariable$**\n\nReads an entire line from the keyboard or an open file handle.',
    params: ['#fileNum', 'stringVariable$'],
    mode: 'inlineStatement',
  },
  'ON ERROR': {
    label: 'ON ERROR GOTO label | ON ERROR RESUME NEXT',
    documentation:
      '**ON ERROR GOTO label | ON ERROR RESUME NEXT**\n\nInstalls or changes the current runtime error handler.',
    params: ['label | RESUME NEXT'],
    mode: 'inlineStatement',
  },
});

const INLINE_SIGNATURE_NAMES = Object.freeze(
  Object.keys(STATEMENT_SIGNATURES)
    .filter((name) => STATEMENT_SIGNATURES[name].mode === 'inlineStatement')
    .sort((left, right) => right.length - left.length),
);
const PAREN_SIGNATURE_NAMES = Object.freeze(
  Object.keys(STATEMENT_SIGNATURES)
    .filter((name) => STATEMENT_SIGNATURES[name].mode === 'parenStatement')
    .sort((left, right) => right.length - left.length),
);

function countTopLevelCommas(text = '') {
  let depth = 0;
  let inString = false;
  let commas = 0;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (char === '"') {
      if (inString && text[index + 1] === '"') {
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
      depth++;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === ',' && depth === 0) {
      commas++;
    }
  }

  return commas;
}

function findInlineStatementSignature(textBefore = '') {
  if (typeof textBefore !== 'string' || textBefore.trim().length === 0) {
    return null;
  }

  for (const name of INLINE_SIGNATURE_NAMES) {
    const pattern = new RegExp(`(?:^|:)\\s*${name.replace(/\s+/g, '\\s+')}\\b([\\s\\S]*)$`, 'i');
    const match = pattern.exec(textBefore);
    if (!match) continue;

    const suffix = match[1] || '';
    if (!/^\s+/.test(suffix)) {
      continue;
    }

    return {
      name,
      activeParameter: Math.min(
        countTopLevelCommas(suffix),
        Math.max(0, STATEMENT_SIGNATURES[name].params.length - 1),
      ),
      kind: 'statement',
    };
  }

  return null;
}

function findParenStatementSignature(textBefore = '') {
  if (typeof textBefore !== 'string' || textBefore.trim().length === 0) {
    return null;
  }

  for (const name of PAREN_SIGNATURE_NAMES) {
    const pattern = new RegExp(`(?:^|:)\\s*${name.replace(/\s+/g, '\\s+')}\\b([\\s\\S]*)$`, 'i');
    const match = pattern.exec(textBefore);
    if (!match) continue;

    const suffix = match[1] || '';
    if (!suffix.includes('(')) {
      continue;
    }

    return {
      name,
      activeParameter: Math.min(
        countTopLevelCommas(suffix),
        Math.max(0, STATEMENT_SIGNATURES[name].params.length - 1),
      ),
      kind: 'statement',
    };
  }

  return null;
}

function findActiveSignature(textBefore = '') {
  const callContext = findActiveCall(textBefore);
  if (callContext?.name) {
    const functionName = callContext.name.toUpperCase();
    if (FUNCTIONS[functionName]) {
      return {
        name: functionName,
        activeParameter: callContext.activeParameter,
        kind: 'function',
      };
    }

    const statementName = functionName;
    if (STATEMENT_SIGNATURES[statementName]?.mode === 'parenStatement') {
      return findParenStatementSignature(textBefore);
    }
  }

  const parenStatementContext = findParenStatementSignature(textBefore);
  if (parenStatementContext) {
    return parenStatementContext;
  }

  return findInlineStatementSignature(textBefore);
}

function getSignatureEntry(name, kind = 'function') {
  if (!name) return null;
  if (kind === 'statement') {
    return STATEMENT_SIGNATURES[name] || null;
  }
  return FUNCTIONS[name] || null;
}

module.exports = {
  STATEMENT_SIGNATURES,
  countTopLevelCommas,
  findActiveSignature,
  findParenStatementSignature,
  findInlineStatementSignature,
  getSignatureEntry,
};
