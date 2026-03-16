/**
 * QBasic Nexus - High-Performance Compiler Wrapper
 * Unified compiler interface with caching and error recovery
 *
 * v1.5.2 optimisations:
 *  - Cache fast-path: skips DiagnosticCollector construction for clean hits
 *  - Module-level compile() uses a shared singleton (avoids repeated ctor cost)
 */

'use strict';

const Lexer = require('./lexer');
const { TokenPool } = require('./lexer');
const InternalTranspiler = require('./parser');
const { getGlobalCache } = require('./cache');
const { preprocessSource } = require('./preprocessor');
const {
  DiagnosticCollector,
  ErrorCategory,
} = require('./error-recovery');

/**
 * Compiler options
 */
const DEFAULT_OPTIONS = {
  target: 'web',          // 'web' or 'node'
  cache: true,            // Enable compilation cache
  strictMode: false,      // Strict error checking
  optimizationLevel: 2,   // 0=none, 1=basic, 2=aggressive
  sourceMap: false,       // Generate source maps
  maxErrors: 100,         // Maximum errors before stopping
  sourcePath: null,
  cwd: process.cwd(),
};

function countLines(source) {
  if (!source) return 0;
  let count = 1;
  const len = source.length;
  for (let i = 0; i < len; i++) {
    if (source.charCodeAt(i) === 10) count++;
  }
  return count;
}

/**
 * Compilation result
 */
class CompilationResult {
  constructor(code, diagnostics, metadata = {}) {
    this.code = code;
    this.diagnostics = diagnostics;
    this.metadata = metadata;
    this.success = !diagnostics.hasErrors();
  }

  /** Check if compilation was successful */
  isSuccess() {
    return this.success;
  }

  /** Get generated code */
  getCode() {
    return this.code;
  }

  /** Get all diagnostics */
  getDiagnostics() {
    return this.diagnostics.getAll();
  }

  /** Get errors only */
  getErrors() {
    return this.diagnostics.getBySeverity('error');
  }

  /** Get warnings only */
  getWarnings() {
    return this.diagnostics.getBySeverity('warning');
  }

  /** Format diagnostics for display */
  formatDiagnostics() {
    return this.diagnostics.format();
  }

  /** Get compilation metadata */
  getMetadata() {
    return this.metadata;
  }
}

/**
 * High-performance QBasic compiler
 */
class Compiler {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.cache = this.options.cache ? getGlobalCache() : null;
    this.stats = {
      compilations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTime: 0,
      avgTime: 0,
    };
  }

  /**
   * Compile QBasic source code
   */
  compile(source, compileOptions = {}) {
    const startTime = process.hrtime.bigint();
    let tokens = null;
    const options = { ...this.options, ...compileOptions };
    const preprocessResult = preprocessSource(source, {
      sourcePath: options.sourcePath,
      cwd: options.cwd,
    });
    const preprocessedSource = preprocessResult.source;

    // ── Check cache first (no tokenisation needed) ────────────────────────
    if (this.cache && !preprocessResult.diagnostics.hasErrors()) {
      const cached = this.cache.getCode(preprocessedSource, options.target);
      if (cached) {
        this.stats.cacheHits++;
        this.stats.compilations++;

        // Fast path: clean cache hit (no errors) — skip DiagnosticCollector
        // construction entirely, which is the common success scenario.
        if (!cached.errors || cached.errors.length === 0) {
          return new CompilationResult(
            cached.code,
            new DiagnosticCollector(),
            { cached: true, cacheAge: Date.now() - cached.timestamp },
          );
        }

        const diagnostics = new DiagnosticCollector();
        for (const err of cached.errors) {
          diagnostics.add(err);
        }
        return new CompilationResult(cached.code, diagnostics, {
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
        });
      }
      this.stats.cacheMisses++;
    }

    const diagnostics = new DiagnosticCollector();
    for (const diag of preprocessResult.diagnostics.getAll()) {
      diagnostics.add(diag);
    }

    try {
      if (diagnostics.hasErrors()) {
        return new CompilationResult('', diagnostics, {
          cached: false,
          lineCount: countLines(source),
          sourceSize: source.length,
          includedFiles: preprocessResult.metadata.includedFiles,
          directives: preprocessResult.metadata.directives,
        });
      }

      // ── Tokenize ONCE ──────────────────────────────────────────────────
      const lexerStart = process.hrtime.bigint();
      const lexer = new Lexer(preprocessedSource);
      tokens = lexer.tokenize();
      const lexerTime = Number(process.hrtime.bigint() - lexerStart) / 1_000_000;

      // ── Parse + codegen (reuse token array — no re-tokenize) ───────────
      const parserStart = process.hrtime.bigint();
      const transpiler = new InternalTranspiler();
      const { code, errors } = transpiler.transpileTokens(tokens, options.target);
      const parserTime = Number(process.hrtime.bigint() - parserStart) / 1_000_000;

      // Collect errors directly from the parse result (no extra lint pass)
      for (const err of errors) {
        const category = err.category || ErrorCategory.SYNTAX;
        const line = err.line;
        const column = err.column;
        const length = err.length || 1;

        switch (err.severity) {
          case 'warning':
            diagnostics.warning(category, err.message, line, column, length);
            break;
          case 'info':
            diagnostics.info(category, err.message, line, column, length);
            break;
          default:
            diagnostics.error(category, err.message, line, column, length);
            break;
        }
      }

      // Cache the result if clean
      if (this.cache && !diagnostics.hasErrors()) {
        this.cache.setCode(
          preprocessedSource,
          options.target,
          code,
          diagnostics.getAll(),
        );
      }

      const totalTime = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      this.stats.compilations++;
      this.stats.totalTime += totalTime;
      this.stats.avgTime = this.stats.totalTime / this.stats.compilations;

      return new CompilationResult(code, diagnostics, {
        cached: false,
        lexerTime,
        parserTime,
        totalTime,
        tokenCount: tokens.length,
        lineCount: countLines(source),
        sourceSize: source.length,
        includedFiles: preprocessResult.metadata.includedFiles,
        directives: preprocessResult.metadata.directives,
      });
    } catch (error) {
      diagnostics.error(
        ErrorCategory.RUNTIME,
        `Internal compiler error: ${error.message}`,
        1,
        0,
      );

      return new CompilationResult('', diagnostics, {
        cached: false,
        error: error.message,
      });
    } finally {
      if (tokens && typeof TokenPool?.releaseAll === 'function') {
        TokenPool.releaseAll(tokens);
      }
    }
  }

  /**
   * Compile and run (for Node.js target)
   */
  async compileAndRun(source) {
    const result = this.compile(source);

    if (!result.isSuccess()) {
      throw new Error('Compilation failed:\n' + result.formatDiagnostics());
    }

    if (this.options.target !== 'node') {
      throw new Error('compileAndRun is only available for Node.js target');
    }

    // Execute the generated code
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    const fn = new AsyncFunction(result.getCode());
    return await fn();
  }

  /**
   * Get compiler statistics
   */
  getStats() {
    const stats = { ...this.stats };
    if (this.cache) {
      stats.cache = this.cache.getStats();
    }
    return stats;
  }

  /**
   * Clear cache
   */
  clearCache() {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      compilations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTime: 0,
      avgTime: 0,
    };
  }

  /**
   * Format statistics for display
   */
  formatStats() {
    const stats = this.getStats();
    const hitRate =
      stats.compilations > 0
        ? ((stats.cacheHits / stats.compilations) * 100).toFixed(2)
        : '0.00';

    return `
Compiler Statistics:
  Total Compilations: ${stats.compilations}
  Cache Hits: ${stats.cacheHits} (${hitRate}%)
  Cache Misses: ${stats.cacheMisses}
  Average Time: ${stats.avgTime.toFixed(3)} ms
  Total Time: ${stats.totalTime.toFixed(3)} ms
${
  stats.cache
    ? `
Cache Statistics:
  Hit Rate: ${stats.cache.hitRate}
  Token Cache: ${stats.cache.tokenCache.utilization || 'n/a'}
  Code Cache: ${stats.cache.codeCache.utilization || 'n/a'}
`
    : ''
}
    `.trim();
  }
}

// ── Module-level helpers ───────────────────────────────────────────────────────

/**
 * Quick compile function for simple use cases.
 *
 * v1.5.2: Uses a lazily-created module-level Compiler singleton when no
 * custom options are provided. This avoids paying the constructor + LRU-cache
 * init cost on every call (relevant for scripts that call compile() in loops).
 */
let _sharedCompiler = null;

function compile(source, options = {}) {
  // If the caller supplies custom options, fall back to a fresh instance so
  // the singleton's settings are never overridden.
  if (Object.keys(options).length > 0) {
    return new Compiler(options).compile(source);
  }
  if (!_sharedCompiler) {
    _sharedCompiler = new Compiler({ ...DEFAULT_OPTIONS, cache: true });
  }
  return _sharedCompiler.compile(source);
}

/**
 * Quick compile and run function
 */
async function compileAndRun(source, options = {}) {
  const compiler = new Compiler({ ...options, target: 'node' });
  return await compiler.compileAndRun(source);
}

module.exports = {
  Compiler,
  CompilationResult,
  compile,
  compileAndRun,
  DEFAULT_OPTIONS,
};
