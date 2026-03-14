'use strict';

const {
  KEYWORDS: LANGUAGE_KEYWORDS,
  FUNCTIONS: LANGUAGE_FUNCTIONS,
} = require('../../languageData');
const {
  KEYWORDS: COMPILER_KEYWORDS,
  BUILTIN_FUNCS,
} = require('../compiler/constants');

function normalizeName(name) {
  return String(name ?? '').toUpperCase();
}

function createKeywordMetadata(name) {
  return {
    label: name,
    detail: 'Reserved QBasic/QB64 keyword',
  };
}

function createFunctionMetadata(name) {
  return {
    detail: 'Built-in QBasic/QB64 function',
    documentation: `**${name}** *(built-in)*\n\nBuilt-in QBasic/QB64 function supported by the compiler/runtime.`,
  };
}

const FUNCTIONS = Object.create(null);
for (const [name, data] of Object.entries(LANGUAGE_FUNCTIONS || {})) {
  FUNCTIONS[normalizeName(name)] = {
    detail: data?.detail || 'Built-in QBasic/QB64 function',
    documentation:
      data?.documentation ||
      createFunctionMetadata(normalizeName(name)).documentation,
    ...(Array.isArray(data?.params) ? { params: data.params } : {}),
  };
}

for (const name of Object.keys(BUILTIN_FUNCS || {})) {
  const normalizedName = normalizeName(name);
  if (!FUNCTIONS[normalizedName]) {
    FUNCTIONS[normalizedName] = createFunctionMetadata(normalizedName);
  }
}

const KEYWORDS = Object.create(null);
for (const [name, data] of Object.entries(LANGUAGE_KEYWORDS || {})) {
  KEYWORDS[normalizeName(name)] = {
    label: data?.label || normalizeName(name),
    detail: data?.detail || createKeywordMetadata(normalizeName(name)).detail,
  };
}

for (const name of Array.from(COMPILER_KEYWORDS || [])) {
  const normalizedName = normalizeName(name);
  if (!KEYWORDS[normalizedName] && !FUNCTIONS[normalizedName]) {
    KEYWORDS[normalizedName] = createKeywordMetadata(normalizedName);
  }
}

const RESERVED_WORDS = new Set([
  ...Array.from(COMPILER_KEYWORDS || [], normalizeName),
  ...Object.keys(KEYWORDS),
  ...Object.keys(FUNCTIONS),
]);

function isReservedWord(name) {
  return RESERVED_WORDS.has(normalizeName(name));
}

function isBuiltInFunction(name) {
  return Object.prototype.hasOwnProperty.call(FUNCTIONS, normalizeName(name));
}

module.exports = {
  KEYWORDS: Object.freeze(KEYWORDS),
  FUNCTIONS: Object.freeze(FUNCTIONS),
  RESERVED_WORDS,
  isReservedWord,
  isBuiltInFunction,
};
