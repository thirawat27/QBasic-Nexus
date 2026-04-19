'use strict';

const { parentPort } = require('worker_threads');
const InternalTranspiler = require('../compiler/parser');

const transpiler = new InternalTranspiler();

if (!parentPort) {
  throw new Error('Lint worker requires a parent port');
}

parentPort.postMessage({ type: 'ready' });

parentPort.on('message', (message = {}) => {
  if (message.type === 'warmup') {
    parentPort.postMessage({ type: 'ready' });
    return;
  }

  const { id, source, options } = message;

  try {
    const errors = transpiler.lint(source, options);
    parentPort.postMessage({
      id,
      errors,
    });
  } catch (error) {
    parentPort.postMessage({
      id,
      error: error?.message || String(error),
    });
  }
});
