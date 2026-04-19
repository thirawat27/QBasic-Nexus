'use strict';

const { parentPort } = require('worker_threads');
const { Compiler, DEFAULT_OPTIONS } = require('../compiler/compiler');

if (!parentPort) {
  throw new Error('Compile worker requires a parent port');
}

const compilers = new Map();

function getCompiler(compilerOptions = {}) {
  const normalized = {
    ...DEFAULT_OPTIONS,
    ...compilerOptions,
  };
  const cacheKey = JSON.stringify({
    target: normalized.target,
    cache: normalized.cache,
    strictMode: normalized.strictMode,
    optimizationLevel: normalized.optimizationLevel,
    sourceMap: normalized.sourceMap,
    maxErrors: normalized.maxErrors,
    cwd: normalized.cwd,
  });

  let compiler = compilers.get(cacheKey);
  if (!compiler) {
    compiler = new Compiler(normalized);
    compilers.set(cacheKey, compiler);
  }

  return compiler;
}

parentPort.postMessage({ type: 'ready' });

parentPort.on('message', (message = {}) => {
  if (message.type === 'warmup') {
    parentPort.postMessage({ type: 'ready' });
    return;
  }

  if (message.type !== 'compile') {
    return;
  }

  const { id, source, compileOptions, compilerOptions } = message;

  try {
    const compiler = getCompiler(compilerOptions);
    const result = compiler.compile(source, compileOptions);
    parentPort.postMessage({
      id,
      result: {
        code: result.getCode(),
        diagnostics: result.getDiagnostics(),
        metadata: result.getMetadata(),
        success: result.isSuccess(),
      },
    });
  } catch (error) {
    parentPort.postMessage({
      id,
      error: error?.message || String(error),
    });
  }
});
