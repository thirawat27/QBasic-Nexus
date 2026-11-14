/**
 * QBasic Nexus - Formatting
 *
 * One entry point for Format Document, format on save and the language
 * server's formatting request: the built-in formatter, or qb-fmt (QBNex)
 * when qbasic-nexus.formatter is "qb-fmt". qb-fmt failures fall back to the
 * built-in formatter so a save never loses formatting.
 */

'use strict';

const vscode = require('vscode');
const { spawn } = require('child_process');
const { CONFIG } = require('../extension/constants');
const { getConfig } = require('../extension/utils');
const { QBasicDocumentFormattingEditProvider } = require('../providers/formattingProvider');
const { findCompanionTool } = require('./detect');

const builtin = new QBasicDocumentFormattingEditProvider();
let warnedQbFmt = false;

function qbFmtArgs(options = {}) {
  const args = ['--keyword-case', 'upper'];
  if (options.insertSpaces === false) {
    args.push('--tabs');
  } else {
    const size = Number.parseInt(options.tabSize, 10);
    args.push('--indent', String(Number.isFinite(size) && size > 0 ? size : 4));
  }
  return args;
}

/** Pipes text through qb-fmt; resolves the formatted text. */
function runQbFmt(command, text, options, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, qbFmtArgs(options), { shell: false, windowsHide: true });
    const out = [];
    let err = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('qb-fmt timed out'));
    }, timeoutMs);
    proc.stdout.on('data', (chunk) => out.push(chunk));
    proc.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    proc.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(out).toString('utf8'));
      else reject(new Error(err.trim() || `qb-fmt exited with code ${code}`));
    });
    proc.stdin.end(text, 'utf8');
  });
}

async function qbFmtEdits(document, options) {
  const { resolveQBNex } = require('./resolve');
  const qbnex = await resolveQBNex();
  const command = await findCompanionTool('qb-fmt', {
    configured: getConfig(CONFIG.FORMATTER_PATH),
    compilerPath: qbnex?.path,
  });
  const original = document.getText();
  const formatted = await runQbFmt(command, original, options);
  if (formatted === original) return [];
  const end = document.lineAt(document.lineCount - 1).range.end;
  return [vscode.TextEdit.replace(new vscode.Range(0, 0, end.line, end.character), formatted)];
}

/**
 * @param {vscode.TextDocument} document
 * @param {vscode.FormattingOptions} options
 * @returns {Promise<vscode.TextEdit[]>}
 */
async function formatDocumentEdits(document, options) {
  if (getConfig(CONFIG.FORMATTER) === CONFIG.FORMATTER_QB_FMT) {
    try {
      return await qbFmtEdits(document, options);
    } catch (error) {
      if (!warnedQbFmt) {
        warnedQbFmt = true;
        void vscode.window.showWarningMessage(
          `QBasic Nexus: qb-fmt failed (${error.message}); using the built-in formatter. Set qbasic-nexus.formatterPath if qb-fmt is not next to the QBNex compiler.`,
        );
      }
    }
  }
  return builtin.provideDocumentFormattingEdits(document, options);
}

class QBasicFormattingProvider {
  provideDocumentFormattingEdits(document, options) {
    return formatDocumentEdits(document, options);
  }
}

module.exports = { QBasicFormattingProvider, formatDocumentEdits, qbFmtArgs };
