/**
 * QBasic Nexus - Code Stats Command
 * Show detailed code statistics for the active QBasic file
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const { CONFIG } = require('./constants');
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
  const text = doc.getText();

  // ── Single-pass line analysis ──────────────────────────────────────────────
  // Split once, iterate once — avoid calling text.split() multiple times
  const lines = text.split('\n');
  let codeLines = 0,
    commentLines = 0,
    blankLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blankLines++;
    } else if (
      trimmed.startsWith("'") ||
      trimmed.toUpperCase().startsWith('REM ')
    ) {
      commentLines++;
    } else {
      codeLines++;
    }
  }

  // ── Regex stats (use local instances to avoid shared-state issues) ─────────
  const subCount = (text.match(/^\s*SUB\s+\w+/gim) || []).length;
  const funcCount = (text.match(/^\s*FUNCTION\s+\w+/gim) || []).length;
  const typeCount = (text.match(/^\s*TYPE\s+\w+/gim) || []).length;
  const constCount = (text.match(/^\s*CONST\s+\w+/gim) || []).length;
  const dimCount = (text.match(/^\s*DIM\s+/gim) || []).length;
  const labelCount = (text.match(/^[a-zA-Z_]\w*:/gm) || []).length;
  const gotoCount = (text.match(/\bGOTO\b/gim) || []).length;
  const gosubCount = (text.match(/\bGOSUB\b/gim) || []).length;
  const selectCount = (text.match(/^\s*SELECT\s+CASE\b/gim) || []).length;

  const fileSizeKb = (text.length / 1024).toFixed(2);
  const totalLines = doc.lineCount;
  const density =
    totalLines > 0 ? ((codeLines / totalLines) * 100).toFixed(1) : '0.0';

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
  ch.appendLine(`    Total      : ${String(totalLines).padStart(6)}`);
  ch.appendLine(
    `    Code       : ${String(codeLines).padStart(6)}  (${density}%)`,
  );
  ch.appendLine(`    Comments   : ${String(commentLines).padStart(6)}`);
  ch.appendLine(`    Blank      : ${String(blankLines).padStart(6)}`);
  ch.appendLine('');
  ch.appendLine('─────────────────────────────────────────────────────');
  ch.appendLine('  Declarations');
  ch.appendLine(`    SUBs       : ${String(subCount).padStart(6)}`);
  ch.appendLine(`    FUNCTIONs  : ${String(funcCount).padStart(6)}`);
  ch.appendLine(`    TYPEs      : ${String(typeCount).padStart(6)}`);
  ch.appendLine(`    CONSTs     : ${String(constCount).padStart(6)}`);
  ch.appendLine(`    DIMs       : ${String(dimCount).padStart(6)}`);
  ch.appendLine(`    Labels     : ${String(labelCount).padStart(6)}`);
  ch.appendLine('');
  ch.appendLine('─────────────────────────────────────────────────────');
  ch.appendLine('  Control Flow');
  ch.appendLine(`    GOTO       : ${String(gotoCount).padStart(6)}`);
  ch.appendLine(`    GOSUB      : ${String(gosubCount).padStart(6)}`);
  ch.appendLine(`    SELECT CASE: ${String(selectCount).padStart(6)}`);
  ch.appendLine('');
  ch.appendLine('═════════════════════════════════════════════════════');
}

module.exports = { showCodeStatsDetail };
