/**
 * QBasic Nexus - Providers Index
 * Re-exports all language providers and the cache invalidation helper
 */

import { invalidateCache } from './cache';
import { QBasicDocumentSymbolProvider } from './symbolProvider';
import { QBasicDefinitionProvider } from './definitionProvider';
import { QBasicCompletionItemProvider } from './completionProvider';
import { QBasicHoverProvider } from './hoverProvider';
import { QBasicSignatureHelpProvider } from './signatureHelpProvider';
import { QBasicDocumentSemanticTokenProvider, QBasicSemanticTokensLegend, invalidateSemanticTokenCache } from './semanticTokenProvider';
import { QBasicDocumentFormattingEditProvider } from './formattingProvider';
import { QBasicFoldingRangeProvider } from './foldingProvider';
import { QBasicDocumentHighlightProvider } from './highlightProvider';
import { QBasicRenameProvider } from './renameProvider';
import { QBasicCodeActionProvider } from './codeActionProvider';
import { QBasicReferenceProvider } from './referenceProvider';
import { QBasicOnTypeFormattingEditProvider } from './onTypeFormattingProvider';
import { QBasicColorProvider, activateDecorators } from './decorators';
import { QBasicTodoProvider } from './todoProvider';
import { QBasicDocumentLinkProvider } from './documentLinkProvider';
import { QBasicWorkspaceSymbolProvider } from './workspaceSymbolProvider';
import { QBasicCodeLensProvider } from './codeLensProvider';
import { QBasicCallHierarchyProvider } from './callHierarchyProvider';
import { QBasicInlayHintsProvider } from './inlayHintsProvider';

export {
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
