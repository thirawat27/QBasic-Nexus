/**
 * QBasic Nexus - Core Transpiler / Parser Assembled
 */

'use strict';

const Lexer = require('../lexer');
const { TokenPool } = require('../lexer');
const {
  formatPreprocessorErrors,
  preprocessSource,
} = require('../preprocessor');

class Parser {
  constructor(tokens, target = 'node', options = {}) {
    // Call the initialized method that we mapped from core.js
    if (this._init) {
      this._init(tokens, target, options);
    }
  }
}

function normalizeTranspileTarget(target = 'web') {
  const normalized = String(target || 'web').toLowerCase();
  if (normalized === 'node-wasm' || normalized === 'web-wasm') {
    return {
      parserTarget: normalized.startsWith('web') ? 'web' : 'node',
      wasmAccelerator: true,
      cacheTarget: normalized,
    };
  }

  return {
    parserTarget: normalized === 'node' ? 'node' : 'web',
    wasmAccelerator: false,
    cacheTarget: normalized === 'node' ? 'node' : 'web',
  };
}

function formatParserErrors(errors) {
  return errors
    .slice(0, 3)
    .map((error) => {
      const line = Number.isInteger(error.line) ? error.line + 1 : '?';
      const column = Number.isInteger(error.column) ? error.column : 0;
      return `line ${line}:${column} ${error.message}`;
    })
    .join('; ');
}

function getBlockingParserErrors(errors) {
  return (errors || []).filter(
    (error) => (error?.severity || 'error') === 'error',
  );
}

function mixin(target, ...sources) {
  for (const source of sources) {
    Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
  }
}

mixin(
  Parser.prototype,
  require('./core'),
  require('./ast'),
  require('./expressions'),
  require('./io'),
  require('./graphics'),
  require('./system'),
  require('./types'),
  require('./statements'),
);

class InternalTranspiler {
  /**
   * Transpiles QBasic source code to JavaScript.
   * @param {string} source - QBasic source code.
   * @param {string} target - 'node' or 'web'.
   * @returns {string} Generated JavaScript code.
   */
  transpile(source, target = 'node', options = {}) {
    // Input validation
    if (source === null || source === undefined) {
      return '// Empty source';
    }
    if (typeof source !== 'string') {
      source = String(source);
    }
    if (source.trim().length === 0) {
      return '// Empty source';
    }

    const targetInfo = normalizeTranspileTarget(target);

    let tokens = null;

    try {
      const preprocessResult = preprocessSource(source, options);
      if (preprocessResult.diagnostics.hasErrors()) {
        throw new Error(
          formatPreprocessorErrors(preprocessResult.diagnostics),
        );
      }

      const lexer = new Lexer(preprocessResult.source);
      tokens = lexer.tokenize();

      // Safety check for token array
      if (!Array.isArray(tokens) || tokens.length === 0) {
        return '// No tokens generated';
      }

      const parser = new Parser(tokens, targetInfo.parserTarget, {
        ...options,
        wasmAccelerator: options.wasmAccelerator || targetInfo.wasmAccelerator,
      });
      const result = parser.parse();
      const blockingErrors = getBlockingParserErrors(parser.errors);
      if (blockingErrors.length > 0) {
        throw new Error(formatParserErrors(blockingErrors));
      }

      return result;
    } catch (e) {
      console.error('[Transpiler] Compilation error:', e.message);
      throw e;
    } finally {
      if (tokens && typeof TokenPool?.releaseAll === 'function') {
        TokenPool.releaseAll(tokens);
      }
    }
  }

  /**
   * Transpiles from a pre-tokenized array (zero-copy — used by Compiler).
   * Eliminates redundant tokenization when the caller already holds tokens.
   * @param {Array} tokens - Pre-built token array from Lexer.tokenize().
   * @param {string} target - 'node' or 'web'.
   * @returns {{ code: string, errors: Array }} Result object.
   */
  transpileTokens(tokens, target = 'web', options = {}) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { code: '// No tokens generated', errors: [] };
    }
    const targetInfo = normalizeTranspileTarget(target);
    try {
      const parser = new Parser(tokens, targetInfo.parserTarget, {
        ...options,
        wasmAccelerator: options.wasmAccelerator || targetInfo.wasmAccelerator,
      });
      const code = parser.parse();
      return { code, errors: parser.errors || [] };
    } catch (e) {
      console.error(e.stack);
      return {
        code: `// Compilation error: ${e.message}`,
        errors: [{ line: 0, message: e.message, column: 0 }],
      };
    }
  }

  /**
   * Lints from a pre-tokenized array (zero-copy — used by IncrementalLinter).
   * @param {Array} tokens - Pre-built token array from Lexer.tokenize().
   * @returns {Array<{line: number, message: string, column: number}>}
   */
  lintTokens(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) return [];
    try {
      const parser = new Parser(tokens, 'node');
      parser.parse();
      return parser.errors || [];
    } catch (e) {
      return [{ line: 0, message: `Parser error: ${e.message}`, column: 0 }];
    }
  }

  /**
   * Lints the QBasic source code for syntax errors.
   * @param {string} source - QBasic source code.
   * @returns {Array<{line: number, message: string, column: number}>} Array of errors.
   */
  lint(source, options = {}) {
    // Input validation
    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return [];
    }
    let tokens = null;

    try {
      const preprocessResult = preprocessSource(source, options);
      const preprocessErrors = preprocessResult.diagnostics.getAll();

      if (preprocessResult.diagnostics.hasErrors()) {
        return preprocessErrors.map((diag) => ({
          line: diag.line,
          message: diag.message,
          column: diag.column,
          severity: diag.severity,
          category: diag.category,
        }));
      }

      const lexer = new Lexer(preprocessResult.source);
      tokens = lexer.tokenize();
      // Delegate to lintTokens to avoid code duplication
      return this.lintTokens(tokens);
    } catch (e) {
      return [
        {
          line: 0,
          message: `Lexer/Parser error: ${e.message}`,
          column: 0,
        },
      ];
    } finally {
      if (tokens && typeof TokenPool?.releaseAll === 'function') {
        TokenPool.releaseAll(tokens);
      }
    }
  }
}

module.exports = InternalTranspiler;
