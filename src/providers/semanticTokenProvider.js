'use strict';

const vscode = require('vscode');
const { buildSemanticTokenSpans } = require('../shared/semanticTokens');

const TOKEN_TYPES = Object.freeze([
  'variable',
  'function',
  'parameter',
  'struct',
  'label',
  'property',
]);

const TOKEN_MODIFIERS = Object.freeze([
  'declaration',
  'readonly',
  'global',
  'local',
  'array',
  'typeMember',
]);

const MODIFIER_BITS = Object.freeze(
  TOKEN_MODIFIERS.reduce((acc, modifier, index) => {
    acc[modifier] = 1 << index;
    return acc;
  }, {}),
);

const QBasicSemanticTokensLegend = new vscode.SemanticTokensLegend(
  [...TOKEN_TYPES],
  [...TOKEN_MODIFIERS],
);

const semanticTokenCache = new Map();

class QBasicDocumentSemanticTokenProvider {
  provideDocumentSemanticTokens(document) {
    const cacheKey = document.uri.toString();
    const cached = semanticTokenCache.get(cacheKey);
    if (cached && cached.version === document.version) {
      return cached.tokens;
    }

    const builder = new vscode.SemanticTokensBuilder(
      QBasicSemanticTokensLegend,
    );

    for (const span of buildSemanticTokenSpans(document.getText())) {
      const tokenType = TOKEN_TYPES.indexOf(span.type);
      if (tokenType < 0) continue;

      let modifierMask = 0;
      for (const modifier of span.modifiers || []) {
        modifierMask |= MODIFIER_BITS[modifier] || 0;
      }

      builder.push(
        span.line,
        span.start,
        span.length,
        tokenType,
        modifierMask,
      );
    }

    const tokens = builder.build();
    semanticTokenCache.set(cacheKey, {
      version: document.version,
      tokens,
    });
    return tokens;
  }
}

function invalidateSemanticTokenCache(uri) {
  if (!uri) {
    return;
  }

  semanticTokenCache.delete(typeof uri === 'string' ? uri : uri.toString());
}

module.exports = {
  QBasicDocumentSemanticTokenProvider,
  QBasicSemanticTokensLegend,
  invalidateSemanticTokenCache,
};
