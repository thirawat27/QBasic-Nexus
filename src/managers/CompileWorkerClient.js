'use strict';

const path = require('path');

const {
  Compiler,
  CompilationResult,
  DEFAULT_OPTIONS,
} = require('../compiler/compiler');
const {
  DiagnosticCollector,
  ErrorCategory,
} = require('../compiler/error-recovery');
const {
  PooledWorkerClient,
  detectDefaultWorkerCount,
} = require('./PooledWorkerClient');

function hydrateCompilationResult(payload = {}) {
  const diagnostics = new DiagnosticCollector();
  const allDiagnostics = Array.isArray(payload.diagnostics)
    ? payload.diagnostics
    : [];

  for (const diag of allDiagnostics) {
    const severity = diag?.severity || 'error';
    const category = diag?.category || ErrorCategory.RUNTIME;
    const message = diag?.message || 'Compilation failed';
    const line = Number(diag?.line) || 1;
    const column = Number(diag?.column) || 0;
    const length = Number(diag?.length) || 1;

    switch (severity) {
      case 'warning':
        diagnostics.warning(category, message, line, column, length);
        break;
      case 'info':
        diagnostics.info(category, message, line, column, length);
        break;
      default:
        diagnostics.error(category, message, line, column, length);
        break;
    }
  }

  return new CompilationResult(
    String(payload.code || ''),
    diagnostics,
    payload.metadata && typeof payload.metadata === 'object'
      ? payload.metadata
      : {},
  );
}

class CompileWorkerClient extends PooledWorkerClient {
  constructor(options = {}) {
    super({
      ...options,
      workerPath:
        options.workerPath ||
        path.join(__dirname, '..', 'workers', 'compileWorker.js'),
      maxWorkers: Math.max(
        1,
        Math.trunc(Number(options.maxWorkers) || detectDefaultWorkerCount(4)),
      ),
    });

    this._fallbackCompilers = new Map();
  }

  compile(source, compileOptions = {}, compilerOptions = {}) {
    const priority = Number(
      compileOptions.priority ?? compilerOptions.priority ?? 0,
    ) || 0;
    return this._dispatch(
      {
        type: 'compile',
        source,
        compileOptions,
        compilerOptions,
      },
      {
        source,
        compileOptions,
        compilerOptions,
        priority,
      },
    );
  }

  dispose() {
    super.dispose();
    this._fallbackCompilers.clear();
  }

  _resolveWorkerMessage(_pending, message) {
    if (message.error) {
      return { useFallback: true };
    }

    return {
      value: hydrateCompilationResult(message.result),
    };
  }

  _runFallbackForPending(pending) {
    const normalizedCompilerOptions = {
      ...DEFAULT_OPTIONS,
      ...pending.compilerOptions,
    };
    const cacheKey = JSON.stringify({
      target: normalizedCompilerOptions.target,
      cache: normalizedCompilerOptions.cache,
      strictMode: normalizedCompilerOptions.strictMode,
      optimizationLevel: normalizedCompilerOptions.optimizationLevel,
      sourceMap: normalizedCompilerOptions.sourceMap,
      maxErrors: normalizedCompilerOptions.maxErrors,
      cwd: normalizedCompilerOptions.cwd,
    });

    let compiler = this._fallbackCompilers.get(cacheKey);
    if (!compiler) {
      compiler = new Compiler(normalizedCompilerOptions);
      this._fallbackCompilers.set(cacheKey, compiler);
    }

    return compiler.compile(pending.source, pending.compileOptions);
  }
}

let _instance = null;

function getCompileWorkerClient() {
  if (!_instance || _instance._disposed) {
    _instance = new CompileWorkerClient();
  }

  return _instance;
}

module.exports = {
  CompileWorkerClient,
  detectDefaultWorkerCount,
  getCompileWorkerClient,
  hydrateCompilationResult,
};
