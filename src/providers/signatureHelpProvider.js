/**
 * QBasic Nexus - Provider: Signature Help
 * Displays parameter hints when the user types a function call
 */

/**
 * QBasic Nexus - Provider: Signature Help
 * Displays parameter hints when the user types a function call
 */

'use strict';

const vscode = require('vscode');
const { FUNCTIONS } = require('../../languageData');
const { findActiveCall } = require('../shared/callContext');

// Cache SignatureInformation objects — they are immutable (label/params/docs
// never change at runtime) so we build them once and reuse.
const _sigCache = new Map();

function _getOrBuildSig(funcName, funcData) {
  if (_sigCache.has(funcName)) return _sigCache.get(funcName);

  const sig = new vscode.SignatureInformation(
    `${funcName}(${funcData.params.join(', ')})`,
  );
  sig.parameters = funcData.params.map(
    (p) => new vscode.ParameterInformation(p),
  );
  sig.documentation = new vscode.MarkdownString(funcData.documentation);
  _sigCache.set(funcName, sig);
  return sig;
}

class QBasicSignatureHelpProvider {
  provideSignatureHelp(document, position) {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);

    const callContext = findActiveCall(textBefore);
    if (!callContext) return null;

    const funcName = callContext.name.toUpperCase();
    const funcData = FUNCTIONS[funcName];

    if (!funcData || !funcData.params) return null;

    const help = new vscode.SignatureHelp();
    help.signatures = [_getOrBuildSig(funcName, funcData)];
    help.activeSignature = 0;
    help.activeParameter = Math.min(
      callContext.activeParameter,
      funcData.params.length - 1,
    );

    return help;
  }
}

module.exports = { QBasicSignatureHelpProvider };
