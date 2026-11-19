/**
 * QBasic Nexus - Provider: Code Action
 * Quick-fix and refactor actions (DIM suggestion, THEN/END IF insertion,
 * "did you mean" typo fixes, GOTO loop → DO...LOOP)
 */

import vscode = require('vscode');
import { findGotoLoops } from '../shared/gotoLoops';
import { getDocumentAnalysis } from '../shared/documentAnalysis';

const TYPO_CODE = 'possible-typo';
const GOTO_LOOP_CODE = 'goto-loop';
const DID_YOU_MEAN_RE = /Did you mean '([^']+)'\?/;

/** Quick fix that replaces a misspelled word with the suggested one. */
function typoFixes(
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[],
): vscode.CodeAction[] {
  const actions: vscode.CodeAction[] = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== TYPO_CODE) continue;
    const suggestion = DID_YOU_MEAN_RE.exec(diagnostic.message)?.[1];
    if (!suggestion) continue;
    const action = new vscode.CodeAction(
      `Change to '${suggestion}'`,
      vscode.CodeActionKind.QuickFix,
    );
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, suggestion);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    actions.push(action);
  }
  return actions;
}

/** Rewrite a backward GOTO loop touching the selection as DO...LOOP. */
function gotoLoopRefactors(
  document: vscode.TextDocument,
  range: vscode.Range,
  diagnostics: readonly vscode.Diagnostic[],
): vscode.CodeAction[] {
  const lines = getDocumentAnalysis(document).lines;
  const actions: vscode.CodeAction[] = [];
  for (const loop of findGotoLoops(lines)) {
    const touches =
      (range.start.line <= loop.jumpLine && range.end.line >= loop.jumpLine) ||
      (range.start.line <= loop.labelLine && range.end.line >= loop.labelLine);
    if (!touches) continue;

    const action = new vscode.CodeAction(
      `Rewrite GOTO ${loop.label} loop as DO...LOOP`,
      vscode.CodeActionKind.RefactorRewrite,
    );
    action.edit = new vscode.WorkspaceEdit();
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    for (const change of loop.edits) {
      action.edit.replace(
        document.uri,
        document.lineAt(change.line).range,
        change.text.replace(/\n/g, eol),
      );
    }
    action.diagnostics = diagnostics.filter(
      (diagnostic) =>
        diagnostic.code === GOTO_LOOP_CODE && diagnostic.range.start.line === loop.jumpLine,
    );
    actions.push(action);
  }
  return actions;
}

class QBasicCodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
  ) {
    const actions: vscode.CodeAction[] = [
      ...typoFixes(document, context.diagnostics),
      ...gotoLoopRefactors(document, range, context.diagnostics),
    ];

    for (const diagnostic of context.diagnostics) {
      const message = diagnostic.message.toLowerCase();

      // Suggest fixes based on error messages
      if (message.includes('undefined') || message.includes('not defined')) {
        const word = this._extractIdentifier(diagnostic.message);
        if (word) {
          // Suggest DIM declaration
          const dimAction = new vscode.CodeAction(
            `Add 'DIM ${word}'`,
            vscode.CodeActionKind.QuickFix,
          );
          dimAction.edit = new vscode.WorkspaceEdit();
          dimAction.edit.insert(
            document.uri,
            new vscode.Position(0, 0),
            `DIM ${word}\n`,
          );
          dimAction.diagnostics = [diagnostic];
          actions.push(dimAction);
        }
      }

      // Suggest THEN for IF without THEN
      if (
        message.includes('then expected') ||
        message.includes('missing then')
      ) {
        const line = document.lineAt(diagnostic.range.start.line);
        if (/\bIF\b/i.test(line.text) && !/\bTHEN\b/i.test(line.text)) {
          const thenAction = new vscode.CodeAction(
            "Add 'THEN'",
            vscode.CodeActionKind.QuickFix,
          );
          thenAction.edit = new vscode.WorkspaceEdit();
          thenAction.edit.insert(
            document.uri,
            new vscode.Position(diagnostic.range.start.line, line.text.length),
            ' THEN',
          );
          thenAction.diagnostics = [diagnostic];
          actions.push(thenAction);
        }
      }

      // Suggest END IF for unclosed IF
      if (message.includes('end if') || message.includes('unclosed if')) {
        const endIfAction = new vscode.CodeAction(
          "Add 'END IF'",
          vscode.CodeActionKind.QuickFix,
        );
        endIfAction.edit = new vscode.WorkspaceEdit();
        endIfAction.edit.insert(
          document.uri,
          new vscode.Position(diagnostic.range.end.line + 1, 0),
          'END IF\n',
        );
        endIfAction.diagnostics = [diagnostic];
        actions.push(endIfAction);
      }
    }

    return actions;
  }

  _extractIdentifier(message) {
    const match = message.match(/['"']?([a-zA-Z_][a-zA-Z0-9_$%!#&]*)['"']?/);
    return match ? match[1] : null;
  }
}

export {
  QBasicCodeActionProvider,
};
