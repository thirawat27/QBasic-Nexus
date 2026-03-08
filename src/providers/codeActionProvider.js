/**
 * QBasic Nexus - Provider: Code Action
 * Quick-fix and refactor actions (DIM suggestion, THEN/END IF insertion)
 */

'use strict';

const vscode = require('vscode');

class QBasicCodeActionProvider {
  provideCodeActions(document, range, context) {
    const actions = [];

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

module.exports = { QBasicCodeActionProvider };
