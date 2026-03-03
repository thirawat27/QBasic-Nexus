/**
 * QBasic Nexus - Provider: Signature Help
 * Displays parameter hints when the user types a function call
 */

"use strict"

const vscode = require("vscode")
const { FUNCTIONS } = require("../../languageData")

class QBasicSignatureHelpProvider {
  provideSignatureHelp(document, position) {
    const lineText = document.lineAt(position).text
    const textBefore = lineText.substring(0, position.character)

    // Find function call
    const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_$]*)\s*\(([^)]*)$/)
    if (!match) return null

    const funcName = match[1].toUpperCase()
    const argsText = match[2]
    const funcData = FUNCTIONS[funcName]

    if (!funcData || !funcData.params) return null

    // Count commas for active parameter
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

module.exports = { QBasicSignatureHelpProvider }
