/**
 * QBasic Nexus - Providers Index
 * Re-exports all language providers and the cache invalidation helper
 */

'use strict';

const { invalidateCache } = require('./cache');
const { QBasicDocumentSymbolProvider } = require('./symbolProvider');
const { QBasicDefinitionProvider } = require('./definitionProvider');
const { QBasicCompletionItemProvider } = require('./completionProvider');
const { QBasicHoverProvider } = require('./hoverProvider');
const { QBasicSignatureHelpProvider } = require('./signatureHelpProvider');
const {
  QBasicDocumentSemanticTokenProvider,
  QBasicSemanticTokensLegend,
  invalidateSemanticTokenCache,
} = require('./semanticTokenProvider');
const { QBasicDocumentFormattingEditProvider } = require('./formattingProvider');
const { QBasicFoldingRangeProvider } = require('./foldingProvider');
const { QBasicDocumentHighlightProvider } = require('./highlightProvider');
const { QBasicRenameProvider } = require('./renameProvider');
const { QBasicCodeActionProvider } = require('./codeActionProvider');
const { QBasicReferenceProvider } = require('./referenceProvider');
const {
  QBasicOnTypeFormattingEditProvider,
} = require('./onTypeFormattingProvider');
const {
  QBasicColorProvider,
  activateDecorators,
} = require('./decorators');
const { QBasicTodoProvider } = require('./todoProvider');
const { QBasicDocumentLinkProvider } = require('./documentLinkProvider');
const { QBasicWorkspaceSymbolProvider } = require('./workspaceSymbolProvider');
const { QBasicCodeLensProvider } = require('./codeLensProvider');
const { QBasicCallHierarchyProvider } = require('./callHierarchyProvider');
const { QBasicInlayHintsProvider } = require('./inlayHintsProvider');

module.exports = {
  invalidateCache,
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
  QBasicDocumentSemanticTokenProvider,
  QBasicSemanticTokensLegend,
  invalidateSemanticTokenCache,
  QBasicDocumentFormattingEditProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
  QBasicOnTypeFormattingEditProvider,
  QBasicColorProvider,
  activateDecorators,
  QBasicTodoProvider,
  QBasicDocumentLinkProvider,
  QBasicWorkspaceSymbolProvider,
  QBasicCodeLensProvider,
  QBasicCallHierarchyProvider,
  QBasicInlayHintsProvider,
};
