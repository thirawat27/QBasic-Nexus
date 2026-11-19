/**
 * QBasic Nexus - Provider: Call Hierarchy
 * Show Call Hierarchy (Shift+Alt+H) for SUBs and FUNCTIONs across the workspace
 */

import vscode = require('vscode');
import path = require('path');
import { PATTERNS } from './patterns';
import { workspaceAnalyzer } from '../shared/workspaceAnalysis';
import { normalizeName } from '../shared/sourceText';
import { getProcedures, indexProcedures, findIncomingCalls, findOutgoingCalls } from '../shared/procedureIndex';

const MODULE_PREFIX = '(module) ';

function toRange(site) {
  return new vscode.Range(site.line, site.start, site.line, site.end);
}

function procedureItem(file, proc) {
  const lineEnd = Number.MAX_SAFE_INTEGER;
  return new vscode.CallHierarchyItem(
    proc.kind === 'FUNCTION' ? vscode.SymbolKind.Function : vscode.SymbolKind.Method,
    proc.name,
    `${proc.kind} · ${path.basename(file)}`,
    vscode.Uri.file(file),
    new vscode.Range(proc.line, 0, proc.endLine, lineEnd),
    new vscode.Range(proc.line, proc.nameStart, proc.line, proc.nameEnd),
  );
}

function moduleItem(file) {
  return new vscode.CallHierarchyItem(
    vscode.SymbolKind.Module,
    `${MODULE_PREFIX}${path.basename(file)}`,
    'module-level code',
    vscode.Uri.file(file),
    new vscode.Range(0, 0, 0, 0),
    new vscode.Range(0, 0, 0, 0),
  );
}

async function loadIndex(uri) {
  const document = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.toString() === uri.toString(),
  );
  // A file that is not open is read from the workspace cache.
  const fileAnalyses = await workspaceAnalyzer.getFileAnalyses(document || null, {
    uri,
  });
  return { fileAnalyses, known: indexProcedures(fileAnalyses) };
}

class QBasicCallHierarchyProvider {
  async prepareCallHierarchy(document, position) {
    const wordRange = document.getWordRangeAtPosition(position, PATTERNS.IDENTIFIER);
    if (!wordRange) return null;

    const { known } = await loadIndex(document.uri);
    const entry = known.get(normalizeName(document.getText(wordRange)));
    return entry ? procedureItem(entry.file, entry.proc) : null;
  }

  async provideCallHierarchyIncomingCalls(item) {
    if (item.name.startsWith(MODULE_PREFIX)) return [];

    const { fileAnalyses } = await loadIndex(item.uri);
    return findIncomingCalls(fileAnalyses, normalizeName(item.name)).map(
      (group) =>
        new vscode.CallHierarchyIncomingCall(
          group.caller
            ? procedureItem(group.file, group.caller)
            : moduleItem(group.file),
          group.sites.map(toRange),
        ),
    );
  }

  async provideCallHierarchyOutgoingCalls(item) {
    const { fileAnalyses, known } = await loadIndex(item.uri);
    const fileEntry = fileAnalyses.find(
      (entry) => entry.file === item.uri.fsPath,
    );
    if (!fileEntry) return [];

    const proc = item.name.startsWith(MODULE_PREFIX)
      ? null
      : getProcedures(fileEntry.analysis).find(
          (candidate) => candidate.normName === normalizeName(item.name),
        );
    if (!proc && !item.name.startsWith(MODULE_PREFIX)) return [];

    const calls = [];
    for (const [normName, sites] of findOutgoingCalls(fileEntry.analysis, proc, known)) {
      const callee = known.get(normName);
      if (!callee) continue;
      calls.push(
        new vscode.CallHierarchyOutgoingCall(
          procedureItem(callee.file, callee.proc),
          sites.map(toRange),
        ),
      );
    }
    return calls;
  }
}

export {
  QBasicCallHierarchyProvider,
};
