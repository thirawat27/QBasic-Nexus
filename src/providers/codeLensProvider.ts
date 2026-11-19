/**
 * QBasic Nexus - Provider: CodeLens
 * Above every SUB and FUNCTION: "N references", plus "complexity N" when the
 * procedure's cyclomatic complexity reaches the configured threshold.
 */

import vscode = require('vscode');
import { CONFIG } from '../extension/constants';
import { getConfig } from '../extension/utils';
import { getDocumentAnalysis } from '../shared/documentAnalysis';
import { workspaceAnalyzer } from '../shared/workspaceAnalysis';
import { getProcedures, findIncomingCalls, type Procedure } from '../shared/procedureIndex';
import { cyclomaticComplexity } from '../shared/codeInsights';

/** A CodeLens that remembers which procedure it counts calls for. */
class ReferenceCodeLens extends vscode.CodeLens {
  constructor(
    range: vscode.Range,
    readonly document: vscode.TextDocument,
    readonly proc: Procedure,
  ) {
    super(range);
  }
}

class QBasicCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const showReferences = getConfig(CONFIG.CODE_LENS, true);
    const threshold = Number(getConfig(CONFIG.CODE_LENS_COMPLEXITY_THRESHOLD, 10));
    const analysis = getDocumentAnalysis(document);
    const lenses: vscode.CodeLens[] = [];

    for (const proc of getProcedures(analysis)) {
      const range = new vscode.Range(proc.line, proc.nameStart, proc.line, proc.nameEnd);
      if (showReferences) lenses.push(new ReferenceCodeLens(range, document, proc));

      if (threshold > 0) {
        const complexity = cyclomaticComplexity(analysis.lines, proc);
        if (complexity >= threshold) {
          lenses.push(
            new vscode.CodeLens(range, {
              title: `complexity ${complexity}`,
              tooltip: `Cyclomatic complexity ${complexity}: ${complexity - 1} decision points (IF, CASE, loops, AND/OR). Consider splitting ${proc.name} into smaller procedures.`,
              command: '',
            }),
          );
        }
      }
    }
    return lenses;
  }

  async resolveCodeLens(lens: vscode.CodeLens): Promise<vscode.CodeLens> {
    if (!(lens instanceof ReferenceCodeLens)) return lens;

    const { document, proc } = lens;
    const fileAnalyses = await workspaceAnalyzer.getFileAnalyses(document);
    const locations: vscode.Location[] = [];
    for (const group of findIncomingCalls(fileAnalyses, proc.normName)) {
      const uri = vscode.Uri.file(group.file);
      for (const site of group.sites) {
        locations.push(
          new vscode.Location(uri, new vscode.Range(site.line, site.start, site.line, site.end)),
        );
      }
    }

    const count = locations.length;
    lens.command = {
      title: count === 1 ? '1 reference' : `${count} references`,
      command: count > 0 ? 'editor.action.showReferences' : '',
      arguments: count > 0 ? [document.uri, lens.range.start, locations] : undefined,
    };
    return lens;
  }
}

export { QBasicCodeLensProvider };
