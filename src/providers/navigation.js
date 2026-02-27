"use strict"

const vscode = require("vscode")
const {
  PATTERNS,
  escapeRegex,
  getCachedSymbols,
  setCachedSymbols,
} = require("./providerUtils")

// Provides document outline and symbol navigation
class QBasicDocumentSymbolProvider {
  provideDocumentSymbols(document) {
    const cached = getCachedSymbols(document)
    if (cached) return cached

    const symbols = []

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const text = line.text

      if (PATTERNS.COMMENT.test(text) || PATTERNS.DECLARE.test(text)) continue

      let match

      if ((match = PATTERNS.SUB_DEF.exec(text))) {
        const kind =
          match[1].toUpperCase() === "FUNCTION"
            ? vscode.SymbolKind.Function
            : vscode.SymbolKind.Method
        symbols.push(
          new vscode.DocumentSymbol(
            match[2],
            match[1].toUpperCase(),
            kind,
            line.range,
            line.range,
          ),
        )
      } else if ((match = PATTERNS.TYPE_DEF.exec(text))) {
        symbols.push(
          new vscode.DocumentSymbol(
            match[1],
            "TYPE",
            vscode.SymbolKind.Struct,
            line.range,
            line.range,
          ),
        )
      } else if ((match = PATTERNS.CONST_DEF.exec(text))) {
        symbols.push(
          new vscode.DocumentSymbol(
            match[1],
            "CONST",
            vscode.SymbolKind.Constant,
            line.range,
            line.range,
          ),
        )
      } else if ((match = PATTERNS.LABEL.exec(text))) {
        symbols.push(
          new vscode.DocumentSymbol(
            match[1],
            "Label",
            vscode.SymbolKind.Event,
            line.range,
            line.range,
          ),
        )
      }
    }

    setCachedSymbols(document, symbols)
    return symbols
  }
}

// Provides go-to-definition functionality
class QBasicDefinitionProvider {
  provideDefinition(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    )
    if (!wordRange) return null

    const word = document.getText(wordRange)
    const patterns = [
      new RegExp(`^\\s*(?:SUB|FUNCTION|TYPE)\\s+${word}\\b`, "i"),
      new RegExp(`^${word}:`, "i"),
      new RegExp(`^\\s*CONST\\s+${word}\\b`, "i"),
      new RegExp(`\\bDIM\\s+(?:SHARED\\s+)?${word}\\b`, "i"),
    ]

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text
      if (PATTERNS.DECLARE.test(lineText)) continue

      for (const pattern of patterns) {
        if (pattern.test(lineText)) {
          return new vscode.Location(document.uri, new vscode.Position(i, 0))
        }
      }
    }

    return null
  }
}

// Provides code folding ranges
class QBasicFoldingRangeProvider {
  provideFoldingRanges(document) {
    const ranges = []
    const stack = []

    const foldPatterns = {
      start:
        /^\s*(?:SUB|FUNCTION|TYPE|IF\b.+\bTHEN\s*$|DO|FOR|SELECT|WHILE)\b/i,
      end: /^\s*(?:END\s+(?:SUB|FUNCTION|TYPE|IF|SELECT)|LOOP|NEXT|WEND)\b/i,
    }

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text

      if (foldPatterns.start.test(line)) {
        stack.push(i)
      } else if (foldPatterns.end.test(line)) {
        if (stack.length > 0) {
          const startLine = stack.pop()
          if (i > startLine) {
            ranges.push(new vscode.FoldingRange(startLine, i))
          }
        }
      }
    }

    let commentStart = -1
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      const isComment = PATTERNS.COMMENT.test(line)

      if (isComment && commentStart === -1) {
        commentStart = i
      } else if (!isComment && commentStart !== -1) {
        if (i - 1 > commentStart) {
          ranges.push(
            new vscode.FoldingRange(
              commentStart,
              i - 1,
              vscode.FoldingRangeKind.Comment,
            ),
          )
        }
        commentStart = -1
      }
    }

    return ranges
  }
}

// Highlights all occurrences of a symbol
class QBasicDocumentHighlightProvider {
  provideDocumentHighlights(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    )
    if (!wordRange) return null

    const word = document.getText(wordRange)
    const highlights = []
    const wordPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi")

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      let match

      while ((match = wordPattern.exec(line)) !== null) {
        const range = new vscode.Range(
          i,
          match.index,
          i,
          match.index + word.length,
        )

        const lineText = line.substring(0, match.index + word.length)
        const isWrite =
          /\s*=\s*$/.test(line.substring(match.index + word.length)) ||
          /\bDIM\s+(?:SHARED\s+)?$/i.test(lineText.substring(0, match.index))

        highlights.push(
          new vscode.DocumentHighlight(
            range,
            isWrite
              ? vscode.DocumentHighlightKind.Write
              : vscode.DocumentHighlightKind.Read,
          ),
        )
      }
    }

    return highlights
  }
}

module.exports = {
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
}
