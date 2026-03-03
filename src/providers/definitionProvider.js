/**
 * QBasic Nexus - Provider: Definition
 * Go-to-Definition for SUBs, FUNCTIONs, TYPEs, CONSTs, labels, and DIM vars
 */

"use strict"

const vscode = require("vscode")
const { PATTERNS } = require("./patterns")

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

module.exports = { QBasicDefinitionProvider }
