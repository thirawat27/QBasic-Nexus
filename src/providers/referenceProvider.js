/**
 * QBasic Nexus - Provider: Reference
 * Find all references to a symbol in the document
 */

"use strict"

const vscode = require("vscode")
const { escapeRegex } = require("./patterns")

class QBasicReferenceProvider {
  provideReferences(document, position, context) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    )
    if (!wordRange) return null

    const word = document.getText(wordRange)
    const references = []
    const wordPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi")

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      let match

      // Reset lastIndex before each line to prevent carry-over from previous line
      wordPattern.lastIndex = 0

      while ((match = wordPattern.exec(line)) !== null) {
        // Skip if includeDeclaration is false and this is a declaration
        if (!context.includeDeclaration) {
          const beforeMatch = line.substring(0, match.index)
          if (/\b(?:DIM|SUB|FUNCTION|TYPE|CONST)\s*$/i.test(beforeMatch)) {
            continue
          }
        }

        references.push(
          new vscode.Location(
            document.uri,
            new vscode.Range(i, match.index, i, match.index + word.length),
          ),
        )
      }
    }

    return references
  }
}

module.exports = { QBasicReferenceProvider }
