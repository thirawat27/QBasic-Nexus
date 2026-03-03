/**
 * QBasic Nexus - Provider: Rename
 * Rename a symbol across the entire document
 */

"use strict"

const vscode = require("vscode")
const { KEYWORDS, FUNCTIONS } = require("../../languageData")
const { escapeRegex } = require("./patterns")

class QBasicRenameProvider {
  provideRenameEdits(document, position, newName) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    )
    if (!wordRange) return null

    const oldName = document.getText(wordRange)

    // Validate new name
    if (!/^[a-zA-Z_][a-zA-Z0-9_$%!#&]*$/.test(newName)) {
      throw new Error("Invalid identifier name")
    }

    // Check if it's a keyword
    if (KEYWORDS[oldName.toUpperCase()] || KEYWORDS[newName.toUpperCase()]) {
      throw new Error("Cannot rename keywords")
    }

    const edits = new vscode.WorkspaceEdit()
    const wordPattern = new RegExp(`\\b${escapeRegex(oldName)}\\b`, "gi")

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      let match

      while ((match = wordPattern.exec(line)) !== null) {
        const range = new vscode.Range(
          i,
          match.index,
          i,
          match.index + oldName.length,
        )
        edits.replace(document.uri, range, newName)
      }
    }

    return edits
  }

  prepareRename(document, position) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    )
    if (!wordRange) {
      throw new Error("Cannot rename this element")
    }

    const word = document.getText(wordRange)

    // Check if it's a keyword or built-in function
    if (KEYWORDS[word.toUpperCase()] || FUNCTIONS[word.toUpperCase()]) {
      throw new Error("Cannot rename keywords or built-in functions")
    }

    return { range: wordRange, placeholder: word }
  }
}

module.exports = { QBasicRenameProvider }
