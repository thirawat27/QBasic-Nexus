/**
 * QBasic Nexus - Provider: On-Type Formatting
 * Auto-indent triggered after pressing Enter inside a QBasic block
 */

"use strict"

const vscode = require("vscode")

class QBasicOnTypeFormattingEditProvider {
  /**
   * Provides on-type formatting edits (triggered after newline)
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {string} ch - The character that triggered formatting
   * @returns {vscode.TextEdit[]}
   */
  provideOnTypeFormattingEdits(document, position, ch) {
    if (ch !== "\n" || position.line === 0) {
      return []
    }

    const prevLine = document.lineAt(position.line - 1).text
    const prevTrimmed = prevLine.trim().toUpperCase()
    const indent = prevLine.match(/^\s*/)?.[0] || ""
    const tabUnit = "    " // 4 spaces

    // Auto-indent after block-starting statements
    const blockStarters = [
      /^IF\b.+\bTHEN\s*$/, // IF...THEN (multi-line)
      /^FOR\b/, // FOR loop
      /^DO\b/, // DO loop
      /^WHILE\b/, // WHILE loop
      /^SELECT\s+CASE\b/, // SELECT CASE
      /^SUB\b/, // SUB definition
      /^FUNCTION\b/, // FUNCTION definition
      /^TYPE\b/, // TYPE definition
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

module.exports = { QBasicOnTypeFormattingEditProvider }
