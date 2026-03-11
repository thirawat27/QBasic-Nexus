/**
 * QBasic Nexus - CRT Runner
 * Runs QBasic code in the Retro CRT Webview
 *
 * Performance 
 *  - Routes through the high-level Compiler wrapper which uses the tiered
 *    L1/L2 compilation cache (FNV-1a keyed).
 *  - Repeated runs on the same source skip re-tokenisation entirely.
 *  - Falls back to direct transpile() if Compiler is unavailable.
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const { CONFIG } = require('./constants');
const { state } = require('./state');
const { log } = require('./utils');
const { getInternalTranspiler, getWebviewManager } = require('./lazyModules');

// Lazily required so we don't pay the require() cost on every activate()
let _CompilerClass = null;
function _getCompilerClass() {
  if (_CompilerClass === undefined) return null;
  if (_CompilerClass) return _CompilerClass;
  try {
    _CompilerClass = require('../compiler/compiler').Compiler;
  } catch (_) {
    _CompilerClass = undefined; // mark unavailable
  }
  return _CompilerClass || null;
}

// Module-level cached compiler instance (singleton per extension lifetime)
let _crtCompiler = null;
function _getCrtCompiler() {
  const Compiler = _getCompilerClass();
  if (!Compiler) return null;
  if (!_crtCompiler) {
    _crtCompiler = new Compiler({ target: 'web', cache: true, optimizationLevel: 2 });
  }
  return _crtCompiler;
}

async function runInCrt() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== CONFIG.LANGUAGE_ID) {
    vscode.window.showWarningMessage('📄 Please open a QBasic file first.');
    return;
  }

  const document = editor.document;
  const sourceCode = document.getText();
  const fileName = path.basename(document.uri.fsPath);

  // Save if dirty
  if (document.isDirty) await document.save();

  try {
    log('Transpiling for CRT Webview...', 'info');

    let jsCode;

    // ── Fast path: use cached Compiler (L1/L2 hit for repeated runs) ─────────
    const compiler = _getCrtCompiler();
    if (compiler) {
      const result = compiler.compile(sourceCode, {
        sourcePath: document.uri.fsPath,
      });

      if (!result.isSuccess()) {
        const msg = result.getErrors().map((e) => e.message).join('; ');
        throw new Error(msg || 'Compilation failed');
      }

      jsCode = result.getCode();
      const meta = result.getMetadata();
      if (meta.cached) {
        log(`CRT: cache hit (age ${meta.cacheAge}ms)`, 'info');
      } else {
        log(`CRT: compiled in ${(meta.totalTime || 0).toFixed(1)}ms`, 'info');
      }
    } else {
      // ── Fallback: direct transpile (no cache, legacy behaviour) ───────────
      const InternalTranspiler = getInternalTranspiler();
      const transpiler = new InternalTranspiler();
      jsCode = transpiler.transpile(sourceCode, 'web', {
        sourcePath: document.uri.fsPath,
      });
    }

    // Launch Webview
    await getWebviewManager().runCode(
      jsCode,
      fileName,
      state.extensionContext.extensionUri,
    );

    log('Launched Retro CRT 📺', 'success');
  } catch (error) {
    vscode.window.showErrorMessage(`❌ Failed to run in CRT: ${error.message}`);
    log(`CRT Error: ${error.message}`, 'error');
  }
}

module.exports = { runInCrt };
