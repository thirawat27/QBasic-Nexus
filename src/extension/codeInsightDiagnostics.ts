/**
 * QBasic Nexus - Code Insight Diagnostics
 *
 * Runs the lightweight analyses in src/shared/codeInsights.ts and
 * src/shared/gotoLoops.ts on the active document and publishes them in their
 * own diagnostic collection:
 * - possible typos ("did you mean"), with a quick fix,
 * - SUBs / FUNCTIONs that nothing calls (faded out),
 * - blocks of code duplicated elsewhere in the workspace,
 * - backward GOTO loops that can be rewritten as DO...LOOP, with a refactor.
 */

import vscode = require('vscode');
import path = require('path');
import { CONFIG } from './constants';
import { state } from './state';
import { getConfig } from './utils';
import { workspaceAnalyzer } from '../shared/workspaceAnalysis';
import { getProcedures } from '../shared/procedureIndex';
import {
  findTypos,
  findUnusedProcedures,
  findDuplicateBlocks,
} from '../shared/codeInsights';
import { findGotoLoops } from '../shared/gotoLoops';

export const INSIGHT_CODES = Object.freeze({
  TYPO: 'possible-typo',
  UNUSED: 'unused-procedure',
  DUPLICATE: 'duplicate-code',
  GOTO_LOOP: 'goto-loop',
});

const SOURCE = 'QBasic Nexus';
const INSIGHT_DELAY_MS = 600;
const timers = new Map<string, NodeJS.Timeout>();
/** Version of the document each pending run was scheduled for. */
const runVersions = new Map<string, number>();

function diagnostic(
  range: vscode.Range,
  message: string,
  severity: vscode.DiagnosticSeverity,
  code: string,
): vscode.Diagnostic {
  const result = new vscode.Diagnostic(range, message, severity);
  result.source = SOURCE;
  result.code = code;
  return result;
}

/**
 * Compute every enabled insight for a document.
 */
export async function computeInsightDiagnostics(
  document: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> {
  const fileAnalyses = await workspaceAnalyzer.getFileAnalyses(document, {
    awaitWorkspace: true,
  });
  const file = document.uri.fsPath;
  const current = fileAnalyses[0];
  if (!current) return [];
  const lines = current.analysis.lines;
  const diagnostics: vscode.Diagnostic[] = [];

  if (getConfig(CONFIG.ANALYSIS_TYPOS, true)) {
    const procedures = fileAnalyses.flatMap((entry) =>
      getProcedures(entry.analysis).map((proc) => proc.name),
    );
    const variables = fileAnalyses.flatMap((entry) => entry.analysis.variables);
    for (const typo of findTypos(lines, { procedures, variables })) {
      diagnostics.push(
        diagnostic(
          new vscode.Range(typo.line, typo.start, typo.line, typo.end),
          `Unknown name '${typo.word}'. Did you mean '${typo.suggestion}'?`,
          vscode.DiagnosticSeverity.Warning,
          INSIGHT_CODES.TYPO,
        ),
      );
    }
  }

  if (getConfig(CONFIG.ANALYSIS_UNUSED_PROCEDURES, true)) {
    for (const proc of findUnusedProcedures(fileAnalyses, file)) {
      const item = diagnostic(
        new vscode.Range(proc.line, proc.nameStart, proc.line, proc.nameEnd),
        `${proc.kind} ${proc.name} is never called in this workspace.`,
        vscode.DiagnosticSeverity.Hint,
        INSIGHT_CODES.UNUSED,
      );
      item.tags = [vscode.DiagnosticTag.Unnecessary];
      diagnostics.push(item);
    }
  }

  if (getConfig(CONFIG.ANALYSIS_DUPLICATE_CODE, true)) {
    const minLines = Math.max(3, Number(getConfig(CONFIG.ANALYSIS_DUPLICATE_MIN_LINES, 6)) || 6);
    for (const block of findDuplicateBlocks(fileAnalyses, file, minLines)) {
      const sameFile = block.other.file === file;
      const where = sameFile
        ? `line ${block.other.startLine + 1}`
        : `${path.basename(block.other.file)}:${block.other.startLine + 1}`;
      const item = diagnostic(
        new vscode.Range(block.startLine, 0, block.endLine, lines[block.endLine]?.length ?? 0),
        `These ${block.endLine - block.startLine + 1} lines are duplicated at ${where}. Consider moving them into a SUB.`,
        vscode.DiagnosticSeverity.Information,
        INSIGHT_CODES.DUPLICATE,
      );
      item.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(
            vscode.Uri.file(block.other.file),
            new vscode.Range(block.other.startLine, 0, block.other.endLine, 0),
          ),
          'Other copy',
        ),
      ];
      diagnostics.push(item);
    }
  }

  if (getConfig(CONFIG.ANALYSIS_GOTO_LOOPS, true)) {
    for (const loop of findGotoLoops(lines)) {
      diagnostics.push(
        diagnostic(
          new vscode.Range(loop.jumpLine, 0, loop.jumpLine, lines[loop.jumpLine].length),
          `This GOTO ${loop.label} loop can be written as DO...LOOP.`,
          vscode.DiagnosticSeverity.Hint,
          INSIGHT_CODES.GOTO_LOOP,
        ),
      );
    }
  }

  return diagnostics;
}

/**
 * Recompute insights for one document after a short pause in typing.
 */
export function updateInsightDiagnostics(document: vscode.TextDocument): void {
  if (!document || document.languageId !== CONFIG.LANGUAGE_ID) return;
  if (!state.insightDiagnosticCollection) return;

  const key = document.uri.toString();
  clearTimeout(timers.get(key));
  const version = document.version;
  runVersions.set(key, version);

  timers.set(
    key,
    setTimeout(async () => {
      timers.delete(key);
      try {
        const diagnostics = await computeInsightDiagnostics(document);
        // Drop results for an older version or a closed document.
        if (document.isClosed || runVersions.get(key) !== version) return;
        state.insightDiagnosticCollection?.set(document.uri, diagnostics);
      } catch (error) {
        console.error('[QBasic Nexus] Code insights failed:', error);
      }
    }, INSIGHT_DELAY_MS),
  );
}

export function removeInsightDiagnostics(uri: vscode.Uri): void {
  const key = uri.toString();
  clearTimeout(timers.get(key));
  timers.delete(key);
  runVersions.delete(key);
  state.insightDiagnosticCollection?.delete(uri);
}

export function disposeInsightDiagnostics(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  runVersions.clear();
}
