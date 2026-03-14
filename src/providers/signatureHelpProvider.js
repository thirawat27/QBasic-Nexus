/**
 * QBasic Nexus - Provider: Signature Help
 * Displays parameter hints when the user types a function call
 */

'use strict';

const vscode = require('vscode');
const { FUNCTIONS } = require('../shared/languageRegistry');
const { findActiveCall } = require('../shared/callContext');

class QBasicSignatureHelpProvider {
  provideSignatureHelp(document, position) {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);

    const callContext = findActiveCall(textBefore);
    if (!callContext) return null;

    const funcName = callContext.name.toUpperCase();
    const funcData = FUNCTIONS[funcName];

    if (!funcData || !Array.isArray(funcData.params)) return null;

    const sig = new vscode.SignatureInformation(
      `${funcName}(${funcData.params.join(', ')})`,
    );
    sig.parameters = funcData.params.map(
      (p) => new vscode.ParameterInformation(p),
    );
    sig.documentation = new vscode.MarkdownString(funcData.documentation);

    const help = new vscode.SignatureHelp();
    help.signatures = [sig];
    help.activeSignature = 0;
    help.activeParameter =
      funcData.params.length > 0
        ? Math.min(callContext.activeParameter, funcData.params.length - 1)
        : 0;

    return help;
  }
}

module.exports = { QBasicSignatureHelpProvider };
