/**
 * QBasic Nexus - Provider: Completion
 * IntelliSense completions for keywords, built-in functions, and user-defined symbols
 */

import vscode = require('vscode');
import { getStaticCompletionItems } from './cache';
import { SYMBOL_KIND } from '../shared/documentAnalysis';
import { workspaceAnalyzer } from '../shared/workspaceAnalysis';
import { contextAt, predict } from '../shared/ngramModel';
import { PATTERNS } from './patterns';
import { CONFIG } from '../extension/constants';
import { getConfig } from '../extension/utils';

const SYMBOL_COMPLETION_KIND_MAP = Object.freeze({
  [SYMBOL_KIND.FUNCTION]: vscode.CompletionItemKind.Function,
  [SYMBOL_KIND.METHOD]: vscode.CompletionItemKind.Method,
  [SYMBOL_KIND.STRUCT]: vscode.CompletionItemKind.Struct,
  [SYMBOL_KIND.CONSTANT]: vscode.CompletionItemKind.Constant,
});

function getDynamicCompletionItems(analysis) {
  if (analysis.dynamicCompletionItems) {
    return analysis.dynamicCompletionItems;
  }

  const items = [];

  for (const variableName of analysis.variables) {
    const item = new vscode.CompletionItem(
      variableName,
      vscode.CompletionItemKind.Variable,
    );
    item.detail = 'Variable';
    item.sortText = `2_${variableName}`;
    items.push(item);
  }

  for (const symbol of analysis.symbols) {
    const kind = SYMBOL_COMPLETION_KIND_MAP[symbol.kind];
    if (!kind) continue;

    const item = new vscode.CompletionItem(symbol.name, kind);
    item.detail = symbol.detail;
    item.sortText = `3_${symbol.name}`;
    items.push(item);
  }

  analysis.dynamicCompletionItems = items;
  return items;
}

/** Copy a completion item so the cached original is never mutated. */
function cloneItem(item: vscode.CompletionItem, rank: number): vscode.CompletionItem {
  const label = typeof item.label === 'string' ? item.label : item.label.label;
  const copy = new vscode.CompletionItem(
    { label, description: '★ often used here' },
    item.kind,
  );
  copy.detail = item.detail;
  copy.documentation = item.documentation;
  copy.insertText = item.insertText ?? label;
  copy.filterText = item.filterText ?? label;
  copy.commitCharacters = item.commitCharacters;
  copy.sortText = `!${rank}_${label}`;
  copy.preselect = rank === 0;
  return copy;
}

function itemKey(item: vscode.CompletionItem): string {
  return (typeof item.label === 'string' ? item.label : item.label.label).toUpperCase();
}

class QBasicCompletionItemProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[]> {
    // Use pre-cached static items for keywords and functions
    const analysis = await workspaceAnalyzer.getWorkspaceAnalysis(document, {
      awaitWorkspace: false,
    });
    const items: vscode.CompletionItem[] = getStaticCompletionItems().concat(
      getDynamicCompletionItems(analysis),
    );

    if (!getConfig(CONFIG.COMPLETION_LEARNED_RANKING, true)) return items;
    return rankByLearnedUsage(document, position, items);
  }
}

/**
 * Move the words the n-gram model predicts for this position to the top.
 * The model is trained on the workspace's own QBasic files, on this machine.
 */
async function rankByLearnedUsage(
  document: vscode.TextDocument,
  position: vscode.Position,
  items: vscode.CompletionItem[],
): Promise<vscode.CompletionItem[]> {
  const fileAnalyses = await workspaceAnalyzer.getFileAnalyses(document, {
    awaitWorkspace: false,
  });
  const lines = fileAnalyses[0]?.analysis.lines ?? [];
  const wordRange = document.getWordRangeAtPosition(position, PATTERNS.IDENTIFIER);
  const textBefore = document
    .lineAt(position.line)
    .text.slice(0, (wordRange ?? new vscode.Range(position, position)).start.character);

  const predictions = predict(fileAnalyses, contextAt(lines, position.line, textBefore));
  if (predictions.length === 0) return items;

  const byKey = new Map<string, vscode.CompletionItem>();
  for (const item of items) {
    const key = itemKey(item);
    if (!byKey.has(key)) byKey.set(key, item);
  }

  const promoted: vscode.CompletionItem[] = [];
  const promotedKeys = new Set<string>();
  predictions.forEach((prediction, rank) => {
    const item = byKey.get(prediction.word);
    if (!item) return;
    promoted.push(cloneItem(item, rank));
    promotedKeys.add(prediction.word);
  });

  return [...promoted, ...items.filter((item) => !promotedKeys.has(itemKey(item)))];
}

export {
  QBasicCompletionItemProvider,
};
