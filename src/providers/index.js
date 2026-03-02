"use strict"

const { invalidateCache, clearCompletionCache } = require("./providerUtils")
const {
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
} = require("./navigation")

const {
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
} = require("./intellisense")

const {
  QBasicDocumentFormattingEditProvider,
  QBasicOnTypeFormattingEditProvider,
} = require("./formatting")

const {
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
} = require("./codeActions")

module.exports = {
  QBasicDocumentSymbolProvider,
  QBasicDefinitionProvider,
  QBasicCompletionItemProvider,
  QBasicHoverProvider,
  QBasicSignatureHelpProvider,
  QBasicDocumentFormattingEditProvider,
  QBasicFoldingRangeProvider,
  QBasicDocumentHighlightProvider,
  QBasicRenameProvider,
  QBasicCodeActionProvider,
  QBasicReferenceProvider,
  QBasicOnTypeFormattingEditProvider,
  invalidateCache,
  clearCompletionCache,
}
