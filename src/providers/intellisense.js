"use strict"

const vscode = require("vscode")
const { KEYWORDS, FUNCTIONS } = require("../../languageData")
const {
  PATTERNS,
  getKeywordCompletionItems,
  getFunctionCompletionItems,
  getCachedVariables,
  setCachedVariables,
} = require("./providerUtils")
const { QBasicDocumentSymbolProvider } = require("./navigation")

// Provides auto-completion suggestions
class QBasicCompletionItemProvider {
  provideCompletionItems(document, _position) {
    const items = [
      ...getKeywordCompletionItems(),
      ...getFunctionCompletionItems(),
    ]

    const vars = this._scanVariables(document)
    for (const v of vars) {
      const item = new vscode.CompletionItem(
        v,
        vscode.CompletionItemKind.Variable,
      )
      item.detail = "Variable"
      item.sortText = `2_${v}`
      items.push(item)
    }

    const symbols = new QBasicDocumentSymbolProvider().provideDocumentSymbols(
      document,
    )
    for (const sym of symbols) {
      if (
        sym.kind === vscode.SymbolKind.Function ||
        sym.kind === vscode.SymbolKind.Method
      ) {
        const item = new vscode.CompletionItem(
          sym.name,
          sym.kind === vscode.SymbolKind.Function
            ? vscode.CompletionItemKind.Function
            : vscode.CompletionItemKind.Method,
        )
        item.detail = sym.detail
        item.sortText = `3_${sym.name}`
        items.push(item)
      }
    }

    return items
  }

  _createSnippet(name, params) {
    if (!params || params.length === 0) return name
    const placeholders = params.map((p, i) => `\${${i + 1}:${p}}`).join(", ")
    return `${name}(${placeholders})`
  }

  _scanVariables(document) {
    const cached = getCachedVariables(document)
    if (cached) return cached

    const text = document.getText()
    const vars = new Set()

    PATTERNS.DIM.lastIndex = 0
    PATTERNS.ASSIGN.lastIndex = 0

    let m
    while ((m = PATTERNS.DIM.exec(text))) vars.add(m[1])
    while ((m = PATTERNS.ASSIGN.exec(text))) {
      if (!KEYWORDS[m[1].toUpperCase()]) vars.add(m[1])
    }

    setCachedVariables(document, vars)
    return vars
  }
}

// Provides hover information for symbols
class QBasicHoverProvider {
  provideHover(document, position) {
    const range = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$]*/,
    )
    if (!range) return null

    const word = document.getText(range).toUpperCase()

    if (KEYWORDS[word]) {
      const k = KEYWORDS[word]
      return new vscode.Hover(
        new vscode.MarkdownString(`**${k.label}** *(keyword)*\n\n${k.detail}`),
      )
    }

    if (FUNCTIONS[word]) {
      const f = FUNCTIONS[word]
      return new vscode.Hover(
        new vscode.MarkdownString(
          `**${word}** *(function)*\n\n${f.documentation}`,
        ),
      )
    }

    const originalWord = document.getText(range)

    // Performance improvement: Use cached O(1) symbols lookup instead of O(N) regex scan
    const symbols = new QBasicDocumentSymbolProvider().provideDocumentSymbols(
      document,
    )
    const symbol = symbols.find(
      (s) =>
        s.name.toUpperCase() === word &&
        (s.detail === "SUB" || s.detail === "FUNCTION"),
    )

    if (symbol) {
      return new vscode.Hover(
        new vscode.MarkdownString(
          `**${originalWord}** *(${symbol.detail.toLowerCase()})*\n\nDefined at line ${symbol.range.start.line + 1}`,
        ),
      )
    }

    return null
  }
}

// Provides signature help for function calls
class QBasicSignatureHelpProvider {
  provideSignatureHelp(document, position) {
    const lineText = document.lineAt(position).text
    const textBefore = lineText.substring(0, position.character)

    const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_$]*)\s*\(([^)]*)$/)
    if (!match) return null

    const funcName = match[1].toUpperCase()
    const argsText = match[2]
    const funcData = FUNCTIONS[funcName]

    if (!funcData || !funcData.params) return null

    const commaCount = (argsText.match(/,/g) || []).length

    const sig = new vscode.SignatureInformation(
      `${funcName}(${funcData.params.join(", ")})`,
    )
    sig.parameters = funcData.params.map(
      (p) => new vscode.ParameterInformation(p),
    )
    sig.documentation = new vscode.MarkdownString(funcData.documentation)

    const help = new vscode.SignatureHelp()
    help.signatures = [sig]
    help.activeSignature = 0
    help.activeParameter = Math.min(commaCount, funcData.params.length - 1)

    return help
  }
}

module.exports = {
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
}
