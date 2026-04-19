'use strict';

const path = require('path');

const InternalTranspiler = require('../compiler/parser');
const {
  PooledWorkerClient,
  detectDefaultWorkerCount,
} = require('./PooledWorkerClient');

class LintWorkerClient extends PooledWorkerClient {
  constructor(options = {}) {
    super({
      ...options,
      workerPath:
        options.workerPath ||
        path.join(__dirname, '..', 'workers', 'lintWorker.js'),
      maxWorkers: Math.max(
        1,
        Math.trunc(Number(options.maxWorkers) || detectDefaultWorkerCount(6)),
      ),
    });

    this._fallbackTranspiler = options.fallbackTranspiler || null;
  }

  lint(source, options = {}) {
    const cancelKey =
      options.cancelKey || options.sourcePath || null;
    const priority = Number(options.priority) || 0;
    return this._dispatch(
      { source, options },
      { source, options, cancelKey, priority },
    );
  }

  _beforeDispatch(pendingData) {
    if (!pendingData?.cancelKey) {
      return;
    }

    this._restartWorkersForPending(
      (pending) => pending.cancelKey === pendingData.cancelKey,
      (pending, isDirectMatch) =>
        isDirectMatch ? [] : this._runFallbackForPending(pending),
    );
  }

  _resolveWorkerMessage(pending, message) {
    if (message.error) {
      return { useFallback: true, pending };
    }

    return {
      value: Array.isArray(message.errors) ? message.errors : [],
    };
  }

  _runFallbackForPending(pending) {
    if (!this._fallbackTranspiler) {
      this._fallbackTranspiler = new InternalTranspiler();
    }

    return this._fallbackTranspiler.lint(pending.source, pending.options);
  }
}

let _instance = null;

function getLintWorkerClient() {
  if (!_instance || _instance._disposed) {
    _instance = new LintWorkerClient();
  }

  return _instance;
}

module.exports = {
  LintWorkerClient,
  detectDefaultWorkerCount,
  getLintWorkerClient,
};
