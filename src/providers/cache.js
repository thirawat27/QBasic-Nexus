/**
 * QBasic Nexus - Provider: Cache
 * Version-based document caching shared between providers
 */

'use strict';

const vscode = require('vscode');
const { KEYWORDS, FUNCTIONS } = require('../../languageData');
const { invalidateDocumentAnalysis } = require('../shared/documentAnalysis');

// Version-based cache: invalidates when document content changes (more accurate than TTL)
// symbolCache stores { data, version } keyed by URI string
const symbolCache = new Map();

// Pre-built completion items for keywords/functions (immutable, never changes)
let cachedKeywordItems = null;
let cachedFunctionItems = null;
const UPPER_FUNCTION_NAMES = new Set(
  Object.keys(FUNCTIONS).map((name) => name.toUpperCase()),
);

function getKeywordCompletionItems() {
  if (cachedKeywordItems) return cachedKeywordItems;
  cachedKeywordItems = [];
  for (const [key, data] of Object.entries(KEYWORDS)) {
    const label = data.label || key;
    if (UPPER_FUNCTION_NAMES.has(label.toUpperCase())) {
      continue;
    }
    const item = new vscode.CompletionItem(
      label,
      vscode.CompletionItemKind.Keyword,
    );
    item.detail = data.detail;
    if (data.documentation) {
      item.documentation = new vscode.MarkdownString(data.documentation);
    }
    item.sortText = `0_${key}`;
    cachedKeywordItems.push(item);
  }
  return cachedKeywordItems;
}

function getFunctionCompletionItems() {
  if (cachedFunctionItems) return cachedFunctionItems;
  cachedFunctionItems = [];
  for (const [key, data] of Object.entries(FUNCTIONS)) {
    const item = new vscode.CompletionItem(
      key,
      vscode.CompletionItemKind.Function,
    );
    item.detail = data.detail;
    item.documentation = new vscode.MarkdownString(data.documentation);
    if (data.params && data.params.length > 0) {
      const placeholders = data.params
        .map((p, i) => `\${${i + 1}:${p}}`)
        .join(', ');
      item.insertText = new vscode.SnippetString(`${key}(${placeholders})`);
    }
    item.sortText = `1_${key}`;
    cachedFunctionItems.push(item);
  }
  return cachedFunctionItems;
}

function getCachedSymbols(document) {
  const entry = symbolCache.get(document.uri.toString());
  // Valid only if document has not changed since last scan
  if (entry && entry.version === document.version) return entry.data;
  return null;
}

function setCachedSymbols(document, data) {
  symbolCache.set(document.uri.toString(), { data, version: document.version });
}

// Clear cache when document is closed / deleted
function invalidateCache(uri) {
  const key = uri.toString();
  symbolCache.delete(key);
  invalidateDocumentAnalysis(uri);
}

module.exports = {
  getKeywordCompletionItems,
  getFunctionCompletionItems,
  getCachedSymbols,
  setCachedSymbols,
  invalidateCache,
};
