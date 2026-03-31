'use strict';

const path = require('path');

let Worker = null;
try {
  ({ Worker } = require('worker_threads'));
} catch {
  Worker = null;
}

const InternalTranspiler = require('../compiler/parser');

class LintWorkerClient {
  constructor() {
    this._worker = null;
    this._nextRequestId = 1;
    this._pending = new Map();
    this._fallbackTranspiler = null;
    this._disposed = false;
  }

  async lint(source, options = {}) {
    if (this._disposed) {
      return this._runFallback(source, options);
    }

    if (!Worker) {
      return this._runFallback(source, options);
    }

    try {
      this._ensureWorker();
    } catch (_error) {
      return this._runFallback(source, options);
    }

    const requestId = this._nextRequestId++;

    return new Promise((resolve) => {
      this._pending.set(requestId, {
        resolve,
        source,
        options,
      });

      this._worker.postMessage({
        id: requestId,
        source,
        options,
      });
    });
  }

  dispose() {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    if (this._worker) {
      void this._worker.terminate().catch(() => {});
      this._worker = null;
    }

    for (const pending of this._pending.values()) {
      pending.resolve([]);
    }

    this._pending.clear();
  }

  _ensureWorker() {
    if (this._worker || !Worker) {
      return;
    }

    const workerPath = path.join(__dirname, '..', 'workers', 'lintWorker.js');
    const worker = new Worker(workerPath);

    worker.on('message', (message = {}) => {
      const pending = this._pending.get(message.id);
      if (!pending) {
        return;
      }

      this._pending.delete(message.id);

      if (message.error) {
        pending.resolve(this._runFallback(pending.source, pending.options));
        return;
      }

      pending.resolve(Array.isArray(message.errors) ? message.errors : []);
    });

    worker.on('error', () => {
      this._handleWorkerFailure();
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !this._disposed) {
        this._handleWorkerFailure();
      } else {
        this._worker = null;
      }
    });

    this._worker = worker;
  }

  _handleWorkerFailure() {
    const worker = this._worker;
    this._worker = null;

    if (worker) {
      worker.removeAllListeners();
      void worker.terminate().catch(() => {});
    }

    const pendingEntries = Array.from(this._pending.values());
    this._pending.clear();

    for (const pending of pendingEntries) {
      pending.resolve(this._runFallback(pending.source, pending.options));
    }
  }

  _runFallback(source, options) {
    if (!this._fallbackTranspiler) {
      this._fallbackTranspiler = new InternalTranspiler();
    }

    return this._fallbackTranspiler.lint(source, options);
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
  getLintWorkerClient,
};
