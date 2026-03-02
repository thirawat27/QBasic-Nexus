"use strict"

const { KEYWORDS, FUNCTIONS } = require("../../languageData")

const PATTERNS = {
  SUB_DEF: /^\s*(?:DECLARE\s+)?(SUB|FUNCTION)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
  TYPE_DEF: /^\s*TYPE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
  CONST_DEF: /^\s*CONST\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/i,
  LABEL: /^([a-zA-Z_][a-zA-Z0-9_]*):/,
  DIM: /\bDIM\s+(?:SHARED\s+)?([a-zA-Z_][a-zA-Z0-9_$%!#&]*)/gi,
  ASSIGN: /\b([a-zA-Z_][a-zA-Z0-9_$%!#&]*)\s*=/g,
  COMMENT: /^\s*(?:'|REM\b)/i,
  DECLARE: /^\s*DECLARE\s+/i,
  BLOCK_START:
    /^\s*(?:SUB|FUNCTION|TYPE|IF\b.+\bTHEN\s*$|DO|FOR|SELECT|WHILE)\b/i,
  BLOCK_END: /^\s*(?:END\s+(?:SUB|FUNCTION|TYPE|IF|SELECT)|LOOP|NEXT|WEND)\b/i,
  BLOCK_MID: /^\s*(?:ELSE|ELSEIF|CASE)\b/i,
  WORD: /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/g,
  IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_]*/,
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const symbolCache = new Map()
const variableCache = new Map()
const CACHE_TTL = 5000

let cachedKeywordItems = null
let cachedFunctionItems = null

function getKeywordCompletionItems() {
  if (cachedKeywordItems) return cachedKeywordItems

  const vscode = require("vscode")
  cachedKeywordItems = []

  for (const [key, data] of Object.entries(KEYWORDS)) {
    const item = new vscode.CompletionItem(
      data.label,
      vscode.CompletionItemKind.Keyword,
    )
    item.detail = data.detail
    item.sortText = `0_${key}`
    cachedKeywordItems.push(item)
  }
  return cachedKeywordItems
}

function getFunctionCompletionItems() {
  if (cachedFunctionItems) return cachedFunctionItems

  const vscode = require("vscode")
  cachedFunctionItems = []

  for (const [key, data] of Object.entries(FUNCTIONS)) {
    const item = new vscode.CompletionItem(
      key,
      vscode.CompletionItemKind.Function,
    )
    item.detail = data.detail
    item.documentation = new vscode.MarkdownString(data.documentation)
    if (data.params && data.params.length > 0) {
      const placeholders = data.params
        .map((p, i) => `\${${i + 1}:${p}}`)
        .join(", ")
      item.insertText = new vscode.SnippetString(`${key}(${placeholders})`)
    }
    item.sortText = `1_${key}`
    cachedFunctionItems.push(item)
  }
  return cachedFunctionItems
}

function getCachedSymbols(document) {
  const key = document.uri.toString()
  const cached = symbolCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedSymbols(document, data) {
  symbolCache.set(document.uri.toString(), {
    data,
    timestamp: Date.now(),
  })
}

function getCachedVariables(document) {
  const key = document.uri.toString()
  const cached = variableCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedVariables(document, data) {
  variableCache.set(document.uri.toString(), {
    data,
    timestamp: Date.now(),
  })
}

function invalidateCache(uri) {
  const key = uri.toString()
  symbolCache.delete(key)
  variableCache.delete(key)
}

/**
 * Clear completion item caches (keyword & function).
 * Call this when language data changes or on extension deactivation.
 */
function clearCompletionCache() {
  cachedKeywordItems = null
  cachedFunctionItems = null
}

module.exports = {
  PATTERNS,
  escapeRegex,
  getKeywordCompletionItems,
  getFunctionCompletionItems,
  getCachedSymbols,
  setCachedSymbols,
  getCachedVariables,
  setCachedVariables,
  invalidateCache,
  clearCompletionCache,
}
