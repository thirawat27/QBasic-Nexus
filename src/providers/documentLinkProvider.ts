/**
 * QBasic Nexus - Provider: Document Link
 * Makes the file name in `$INCLUDE: 'file.bi'` Ctrl+clickable
 */

import vscode = require('vscode');
import path = require('path');
import { getDocumentAnalysis } from '../shared/documentAnalysis';
import { findIncludeDirectives, resolveIncludePath } from '../shared/includeDirectives';

class QBasicDocumentLinkProvider {
  provideDocumentLinks(document) {
    if (document.uri.scheme !== 'file') return [];

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const documentDir = path.dirname(document.uri.fsPath);
    const links = [];

    for (const directive of findIncludeDirectives(
      getDocumentAnalysis(document).lines,
    )) {
      const target = resolveIncludePath(directive.path, {
        documentDir,
        workspaceDir: workspaceFolder ? workspaceFolder.uri.fsPath : null,
      });
      if (!target) continue;

      const link = new vscode.DocumentLink(
        new vscode.Range(
          directive.line,
          directive.start,
          directive.line,
          directive.end,
        ),
        vscode.Uri.file(target),
      );
      link.tooltip = `Open ${target}`;
      links.push(link);
    }

    return links;
  }
}

export {
  QBasicDocumentLinkProvider,
};
