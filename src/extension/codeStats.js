/**
 * QBasic Nexus - Code Stats Command
 * Show detailed code statistics for the active QBasic file
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const { CONFIG } = require('./constants');
const { getDocumentAnalysis } = require('../shared/documentAnalysis');
const { getOutputChannel } = require('./utils');

/**
 * Show detailed code statistics in the Output Channel
 */
async function showCodeStatsDetail() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage('📄 Please open a QBasic file first.');
    return;
  }

  const doc = editor.document;
  const analysis = getDocumentAnalysis(doc);
  const fileSizeKb = (analysis.textLength / 1024).toFixed(2);
  const density =
    analysis.totalLines > 0
      ? ((analysis.codeLines / analysis.totalLines) * 100).toFixed(1)
      : '0.0';

  // ── Print to Output Channel ────────────────────────────────────────────────
  const ch = getOutputChannel();
  ch.clear();
  ch.show(true); // show without stealing focus

  const fileName = path.basename(doc.fileName);

  ch.appendLine('╔══════════════════════════════════════════════════╗');
  ch.appendLine('║          📊 QBasic Nexus — Code Statistics        ║');
  ch.appendLine('╚══════════════════════════════════════════════════╝');
  ch.appendLine('');
  ch.appendLine(`  📄 File:    ${fileName}`);
  ch.appendLine(`  💾 Size:    ${fileSizeKb} KB`);
  ch.appendLine('');
  ch.appendLine('─────────────────────────────────────────────────────');
  ch.appendLine('  Lines');
  ch.appendLine(`    Total      : ${String(analysis.totalLines).padStart(6)}`);
  ch.appendLine(
    `    Code       : ${String(analysis.codeLines).padStart(6)}  (${density}%)`,
  );
  ch.appendLine(`    Comments   : ${String(analysis.commentLines).padStart(6)}`);
  ch.appendLine(`    Blank      : ${String(analysis.blankLines).padStart(6)}`);
  ch.appendLine('');
  ch.appendLine('─────────────────────────────────────────────────────');
  ch.appendLine('  Declarations');
  ch.appendLine(`    SUBs       : ${String(analysis.subCount).padStart(6)}`);
  ch.appendLine(`    FUNCTIONs  : ${String(analysis.funcCount).padStart(6)}`);
  ch.appendLine(`    TYPEs      : ${String(analysis.typeCount).padStart(6)}`);
  ch.appendLine(`    CONSTs     : ${String(analysis.constCount).padStart(6)}`);
  ch.appendLine(`    DIMs       : ${String(analysis.dimCount).padStart(6)}`);
  ch.appendLine(`    Labels     : ${String(analysis.labelCount).padStart(6)}`);
  ch.appendLine('');
  ch.appendLine('─────────────────────────────────────────────────────');
  ch.appendLine('  Control Flow');
  ch.appendLine(`    GOTO       : ${String(analysis.gotoCount).padStart(6)}`);
  ch.appendLine(`    GOSUB      : ${String(analysis.gosubCount).padStart(6)}`);
  ch.appendLine(`    SELECT CASE: ${String(analysis.selectCount).padStart(6)}`);
  ch.appendLine('');
  ch.appendLine('═════════════════════════════════════════════════════');
}

module.exports = { showCodeStatsDetail };
