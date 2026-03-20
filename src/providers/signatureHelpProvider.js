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
const {
  findActiveSignature,
  getSignatureEntry,
} = require('../shared/signatureCatalog');

// Cache SignatureInformation objects — they are immutable (label/params/docs
// never change at runtime) so we build them once and reuse.
const _sigCache = new Map();

function _getOrBuildSig(cacheKey, signatureName, signatureData) {
  if (_sigCache.has(cacheKey)) return _sigCache.get(cacheKey);

  const sig = new vscode.SignatureInformation(
    signatureData.label || `${signatureName}(${signatureData.params.join(', ')})`,
  );
  sig.parameters = signatureData.params.map(
    (p) => new vscode.ParameterInformation(p),
  );
  sig.documentation = new vscode.MarkdownString(signatureData.documentation);
  _sigCache.set(cacheKey, sig);
  return sig;
}

class QBasicSignatureHelpProvider {
  provideSignatureHelp(document, position) {
    const lineText = document.lineAt(position).text;
    const textBefore = lineText.substring(0, position.character);

    const signatureContext = findActiveSignature(textBefore);
    if (!signatureContext) return null;

    const signatureData = getSignatureEntry(
      signatureContext.name,
      signatureContext.kind,
    );

    if (!signatureData || !Array.isArray(signatureData.params)) return null;

    const help = new vscode.SignatureHelp();
    help.signatures = [
      _getOrBuildSig(
        `${signatureContext.kind}:${signatureContext.name}`,
        signatureContext.name,
        signatureData,
      ),
    ];
    help.activeSignature = 0;
    help.activeParameter = Math.min(
      signatureContext.activeParameter,
      Math.max(0, signatureData.params.length - 1),
    );

    return help;
  }
}

module.exports = { QBasicSignatureHelpProvider };
