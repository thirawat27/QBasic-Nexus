"use strict"

const vscode = require("vscode")
const { PATTERNS } = require("./providerUtils")

// Provides document formatting
class QBasicDocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document, options) {
    const edits = []
    const indent = options.insertSpaces ? " ".repeat(options.tabSize) : "\t"
    let level = 0

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const trimmed = line.text.trim()

      if (!trimmed) continue

      if (
        PATTERNS.BLOCK_END.test(trimmed) ||
        PATTERNS.BLOCK_MID.test(trimmed)
      ) {
        level = Math.max(0, level - 1)
      }

      const expected = indent.repeat(level)
      const current = line.text.match(/^\s*/)?.[0] || ""

      if (current !== expected) {
        edits.push(
          vscode.TextEdit.replace(
            new vscode.Range(i, 0, i, current.length),
            expected,
          ),
        )
      }

      if (PATTERNS.BLOCK_START.test(trimmed)) {
        if (!/^\s*IF\b/i.test(trimmed) || /\bTHEN\s*$/i.test(trimmed)) {
          level++
        }
      } else if (PATTERNS.BLOCK_MID.test(trimmed)) {
        level++
      }
    }

    return edits
  }
}

// Provides automatic formatting on newline
class QBasicOnTypeFormattingEditProvider {
  provideOnTypeFormattingEdits(document, position, ch) {
    if (ch !== "\n" || position.line === 0) {
      return []
    }

    const prevLine = document.lineAt(position.line - 1).text
    const prevTrimmed = prevLine.trim().toUpperCase()
    const indent = prevLine.match(/^\s*/)?.[0] || ""
    const tabUnit = "    "

    const blockStarters = [
      /^IF\b.+\bTHEN\s*$/, // IF...THEN (multi-line)
      /^FOR\b/, // FOR loop
      /^DO\b/, // DO loop
      /^WHILE\b/, // WHILE loop
      /^SELECT\s+CASE\b/, // SELECT CASE
      /^SUB\b/, // SUB definition
      /^FUNCTION\b/, // FUNCTION definition
      /^TYPE\b/,
    ]

    for (const pattern of blockStarters) {
      if (pattern.test(prevTrimmed)) {
        return [vscode.TextEdit.insert(position, indent + tabUnit)]
      }
    }

    // Maintain indent for CASE statements
    if (/^CASE\b/.test(prevTrimmed)) {
      return [vscode.TextEdit.insert(position, indent + tabUnit)]
    }

    // Decrease indent after END/NEXT/LOOP/WEND
    const blockEnders =
      /^(END\s+(?:IF|SUB|FUNCTION|TYPE|SELECT)|NEXT|LOOP|WEND)\b/
    if (blockEnders.test(prevTrimmed)) {
      // Maintain same indent as the END statement
      return [vscode.TextEdit.insert(position, indent)]
    }

    return []
  }
}

module.exports = {
  QBasicDocumentFormattingEditProvider,
  QBasicOnTypeFormattingEditProvider,
}
