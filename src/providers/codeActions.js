"use strict"

const vscode = require("vscode")
const { escapeRegex, KEYWORDS, FUNCTIONS } = require("./providerUtils")

// Provides symbol renaming across the document and workspace
class QBasicRenameProvider {
  async provideRenameEdits(document, position, newName) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    )
    if (!wordRange) return null

    const oldName = document.getText(wordRange)

    if (!/^[a-zA-Z_][a-zA-Z0-9_$%!#&]*$/.test(newName)) {
      throw new Error("Invalid identifier name")
    }

    if (KEYWORDS[oldName.toUpperCase()] || KEYWORDS[newName.toUpperCase()]) {
      throw new Error("Cannot rename keywords")
    }

    const edits = new vscode.WorkspaceEdit()
    const wordPattern = new RegExp(`\\b${escapeRegex(oldName)}\\b`, "gi")

    // Process current document
    this._addRenameEditsForDocument(
      document,
      wordPattern,
      newName,
      oldName.length,
      edits,
    )

    // Discover and process other files in the workspace
    const files = await vscode.workspace.findFiles(
      "**/*.{bas,bi,bm}",
      "**/node_modules/**",
    )
    for (const file of files) {
      if (file.toString() === document.uri.toString()) continue
      try {
        const fileDoc = await vscode.workspace.openTextDocument(file)
        this._addRenameEditsForDocument(
          fileDoc,
          wordPattern,
          newName,
          oldName.length,
          edits,
        )
      } catch (_e) {
        // Ignore read errors
      }
    }

    return edits
  }

  _addRenameEditsForDocument(
    document,
    wordPattern,
    newName,
    oldNameLength,
    edits,
  ) {
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      let match
      wordPattern.lastIndex = 0

      while ((match = wordPattern.exec(line)) !== null) {
        const range = new vscode.Range(
          i,
          match.index,
          i,
          match.index + oldNameLength,
        )
        edits.replace(document.uri, range, newName)
      }
    }
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

    if (KEYWORDS[word.toUpperCase()] || FUNCTIONS[word.toUpperCase()]) {
      throw new Error("Cannot rename keywords or built-in functions")
    }

    return { range: wordRange, placeholder: word }
  }
}

// Provides quick fixes and refactoring actions
class QBasicCodeActionProvider {
  provideCodeActions(document, range, context) {
    const actions = []

    for (const diagnostic of context.diagnostics) {
      const message = diagnostic.message.toLowerCase()

      if (message.includes("undefined") || message.includes("not defined")) {
        const word = this._extractIdentifier(diagnostic.message)
        if (word) {
          const dimAction = new vscode.CodeAction(
            `Add 'DIM ${word}'`,
            vscode.CodeActionKind.QuickFix,
          )
          dimAction.edit = new vscode.WorkspaceEdit()
          dimAction.edit.insert(
            document.uri,
            new vscode.Position(0, 0),
            `DIM ${word}\n`,
          )
          dimAction.diagnostics = [diagnostic]
          actions.push(dimAction)
        }
      }

      if (
        message.includes("then expected") ||
        message.includes("missing then")
      ) {
        const line = document.lineAt(diagnostic.range.start.line)
        if (/\bIF\b/i.test(line.text) && !/\bTHEN\b/i.test(line.text)) {
          const thenAction = new vscode.CodeAction(
            "Add 'THEN'",
            vscode.CodeActionKind.QuickFix,
          )
          thenAction.edit = new vscode.WorkspaceEdit()
          thenAction.edit.insert(
            document.uri,
            new vscode.Position(diagnostic.range.start.line, line.text.length),
            " THEN",
          )
          thenAction.diagnostics = [diagnostic]
          actions.push(thenAction)
        }
      }

      if (message.includes("end if") || message.includes("unclosed if")) {
        const endIfAction = new vscode.CodeAction(
          "Add 'END IF'",
          vscode.CodeActionKind.QuickFix,
        )
        endIfAction.edit = new vscode.WorkspaceEdit()
        endIfAction.edit.insert(
          document.uri,
          new vscode.Position(diagnostic.range.end.line + 1, 0),
          "END IF\n",
        )
        endIfAction.diagnostics = [diagnostic]
        actions.push(endIfAction)
      }
    }

    const selectedText = document.getText(range)
    if (selectedText.trim().length > 0 && range.start.line !== range.end.line) {
      const extractSubAction = new vscode.CodeAction(
        "Extract to SUB",
        vscode.CodeActionKind.RefactorExtract,
      )
      extractSubAction.command = {
        command: "qbasic-nexus.extractToSub",
        title: "Extract to SUB",
        arguments: [document, range],
      }
      actions.push(extractSubAction)
    }

    return actions
  }

  _extractIdentifier(message) {
    const match = message.match(/['"]?([a-zA-Z_][a-zA-Z0-9_$%!#&]*)['"]?/)
    return match ? match[1] : null
  }
}

// Finds all references to a symbol across the workspace
class QBasicReferenceProvider {
  async provideReferences(document, position, context, token) {
    const wordRange = document.getWordRangeAtPosition(
      position,
      /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
    )
    if (!wordRange) return null

    const word = document.getText(wordRange)
    const references = []
    const wordPattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi")

    this._findReferencesInDocument(
      document,
      wordPattern,
      word.length,
      context,
      references,
    )

    const files = await vscode.workspace.findFiles(
      "**/*.{bas,bi,bm}",
      "**/node_modules/**",
    )
    for (const file of files) {
      if (token.isCancellationRequested) break
      if (file.toString() === document.uri.toString()) continue

      try {
        const fileDoc = await vscode.workspace.openTextDocument(file)
        this._findReferencesInDocument(
          fileDoc,
          wordPattern,
          word.length,
          context,
          references,
        )
      } catch (_e) {
        // Ignore read errors
      }
    }

    return references
  }

  _findReferencesInDocument(
    document,
    wordPattern,
    wordLength,
    context,
    references,
  ) {
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text
      let match

      wordPattern.lastIndex = 0
      while ((match = wordPattern.exec(line)) !== null) {
        if (!context.includeDeclaration) {
          const beforeMatch = line.substring(0, match.index)
          if (/\b(?:DIM|SUB|FUNCTION|TYPE|CONST)\s*$/i.test(beforeMatch)) {
            continue
          }
        }

        references.push(
          new vscode.Location(
            document.uri,
            new vscode.Range(i, match.index, i, match.index + wordLength),
          ),
        )
      }
    }
  }
}

module.exports = {
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
}
