'use strict';

const os = require('os');

let Worker = null;
try {
  ({ Worker } = require('worker_threads'));
} catch {
  Worker = null;
}

function normalizeInteger(value, fallback, minimum = 0) {
  const normalized = Math.trunc(Number(value));
  if (!Number.isFinite(normalized) || normalized < minimum) {
    return fallback;
  }

  return normalized;
}

function detectDefaultWorkerCount(limit = 4) {
  const available =
    typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : (Array.isArray(os.cpus?.()) ? os.cpus().length : 1);
  return Math.max(1, Math.min(limit, Math.max(1, available - 1)));
}

class PooledWorkerClient {
  constructor(options = {}) {
    this._WorkerClass =
      options.WorkerClass === undefined ? Worker : options.WorkerClass;
    this._workerFactory =
      typeof options.workerFactory === 'function'
        ? options.workerFactory
        : (workerPath) => new this._WorkerClass(workerPath);
    this._workerPath = options.workerPath || '';
    this._maxWorkers = normalizeInteger(options.maxWorkers, 1, 1);
    this._maxQueueSize = normalizeInteger(
      options.maxQueueSize,
      Math.max(32, this._maxWorkers * 16),
      1,
    );
    this._now = typeof options.now === 'function' ? options.now : Date.now;
    this._agingIntervalMs = normalizeInteger(options.agingIntervalMs, 250, 1);
    this._requestTimeoutMs = normalizeInteger(
      options.requestTimeoutMs,
      30_000,
      0,
    );
    this._maintenanceIntervalMs = normalizeInteger(
      options.maintenanceIntervalMs,
      250,
      25,
    );
    this._agingBoostPerInterval = Math.max(
      0,
      Number(options.agingBoostPerInterval) || 1,
    );
    this._workers = [];
    this._nextWorkerId = 1;
    this._nextRequestId = 1;
    this._dispatchSequence = 1;
    this._pending = new Map();
    this._queued = [];
    this._maintenanceTimer = null;
    this._disposed = false;
    this._metrics = {
      dispatchedRequests: 0,
      completedRequests: 0,
      fallbackRequests: 0,
      canceledRequests: 0,
      timedOutRequests: 0,
      queueOverflowRequests: 0,
      totalQueueWaitMs: 0,
      totalRunTimeMs: 0,
      longestQueueWaitMs: 0,
      longestRunTimeMs: 0,
    };
  }

  prepare() {
    if (this._disposed || !this._WorkerClass) {
      return false;
    }

    try {
      this._ensureWorkerCapacity(1);
      return this._workers.length > 0;
    } catch {
      return false;
    }
  }

  dispose() {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    this._stopMaintenanceLoop();

    for (const entry of this._workers) {
      entry.worker.removeAllListeners();
      void entry.worker.terminate().catch(() => {});
    }

    this._workers = [];

    for (const pending of this._pending.values()) {
      this._finalizePendingResolution(pending, { useFallback: true });
    }

    this._pending.clear();
    this._queued = [];
  }

  getStats() {
    const now = this._now();
    let oldestQueuedAgeMs = 0;
    for (const pending of this._queued) {
      const ageMs = Math.max(0, now - (pending?.queuedAt || now));
      if (ageMs > oldestQueuedAgeMs) {
        oldestQueuedAgeMs = ageMs;
      }
    }
    const averageQueueWaitMs =
      this._metrics.completedRequests > 0
        ? this._metrics.totalQueueWaitMs / this._metrics.completedRequests
        : 0;
    const averageRunTimeMs =
      this._metrics.completedRequests > 0
        ? this._metrics.totalRunTimeMs / this._metrics.completedRequests
        : 0;
    return {
      maxWorkers: this._maxWorkers,
      maxQueueSize: this._maxQueueSize,
      requestTimeoutMs: this._requestTimeoutMs,
      activeWorkers: this._workers.length,
      pendingRequests: this._pending.size,
      queuedRequests: this._queued.length,
      workerLoads: this._workers.map((entry) => entry.pendingCount),
      metrics: {
        ...this._metrics,
        averageQueueWaitMs,
        averageRunTimeMs,
        oldestQueuedAgeMs,
      },
    };
  }

  _dispatch(workerMessage, pendingData = {}) {
    if (this._disposed || !this._WorkerClass) {
      return this._resolveImmediatelyWithFallback(pendingData);
    }

    this._expireTimedOutRequests();
    this._beforeDispatch(pendingData);

    if (this._queued.length >= this._maxQueueSize) {
      this._metrics.queueOverflowRequests++;
      return this._resolveImmediatelyWithFallback({
        ...pendingData,
        overflowed: true,
      });
    }

    const requestId = this._nextRequestId++;

    return new Promise((resolve) => {
      const queuedAt = this._now();
      const pending = {
        id: requestId,
        resolve,
        workerId: null,
        workerMessage,
        priority: Number(pendingData?.priority) || 0,
        sequence: this._dispatchSequence++,
        queuedAt,
        deadlineAt:
          this._requestTimeoutMs > 0 ? queuedAt + this._requestTimeoutMs : 0,
        startedAt: 0,
        ...pendingData,
      };

      this._pending.set(requestId, pending);
      this._queued.push(pending);
      this._syncMaintenanceLoop();

      try {
        this._ensureWorkerCapacity(this._pending.size);
      } catch (_error) {
        this._pending.delete(requestId);
        this._removeQueuedPending(requestId);
        this._finalizePendingResolution(pending, { useFallback: true });
        return;
      }

      this._drainQueue();
    });
  }

  _ensureWorkerCapacity(targetPending = 1) {
    if (!this._WorkerClass) {
      return;
    }

    if (this._workers.length === 0) {
      this._spawnWorker();
    }

    while (
      this._workers.length < this._maxWorkers &&
      this._workers.every((entry) => entry.pendingCount > 0) &&
      this._workers.length < targetPending
    ) {
      this._spawnWorker();
    }
  }

  _spawnWorker() {
    const worker = this._workerFactory(this._workerPath);
    const entry = {
      id: this._nextWorkerId++,
      worker,
      pendingCount: 0,
      ready: false,
      activeRequestId: null,
    };

    worker.on('message', (message = {}) => {
      if (this._isReadyMessage(message)) {
        entry.ready = true;
        this._handleReadyMessage(entry, message);
        return;
      }

      const pending = this._pending.get(message.id);
      if (!pending) {
        return;
      }

      this._pending.delete(message.id);
      entry.pendingCount = 0;
      entry.activeRequestId = null;

      let resolution;
      try {
        resolution = this._resolveWorkerMessage(pending, message);
      } catch {
        resolution = { useFallback: true };
      }

      this._finalizePendingResolution(pending, resolution);

      this._drainQueue();
    });

    worker.on('error', () => {
      this._handleWorkerFailure(entry, { timedOut: false });
    });

    worker.on('exit', (code) => {
      if (this._disposed) {
        this._workers = this._workers.filter((candidate) => candidate !== entry);
        return;
      }

      const lostInFlightWork =
        entry.activeRequestId !== null || entry.pendingCount > 0;
      if (code !== 0 || lostInFlightWork) {
        this._handleWorkerFailure(entry, { timedOut: false });
        return;
      }

      this._workers = this._workers.filter((candidate) => candidate !== entry);
    });

    this._workers.push(entry);
    worker.postMessage(this._createWarmupMessage());
    return entry;
  }

  _handleWorkerFailure(entry, options = {}) {
    if (!entry) {
      return;
    }

    this._workers = this._workers.filter((candidate) => candidate !== entry);
    entry.pendingCount = 0;
    entry.activeRequestId = null;

    try {
      entry.worker.removeAllListeners();
      void entry.worker.terminate().catch(() => {});
    } catch {
      // Ignore teardown failures and fall back locally.
    }

    const affected = [];
    for (const pending of this._pending.values()) {
      if (pending.workerId === entry.id) {
        affected.push(pending);
      }
    }

    for (const pending of affected) {
      this._pending.delete(pending.id);
      if (options.timedOut) {
        this._metrics.timedOutRequests++;
      }
      this._finalizePendingResolution(pending, { useFallback: true });
    }

    this._drainQueue();
  }

  _restartWorkersForPending(predicate, resolver) {
    if (typeof predicate !== 'function') {
      return;
    }

    const matchedPendings = [];
    for (const pending of this._pending.values()) {
      if (predicate(pending)) {
        matchedPendings.push(pending);
      }
    }

    if (matchedPendings.length === 0) {
      return;
    }

    for (const pending of matchedPendings) {
      if (pending.workerId) continue;
      this._pending.delete(pending.id);
      this._removeQueuedPending(pending.id);
      this._metrics.canceledRequests++;
      const resolution =
        typeof resolver === 'function'
          ? { value: resolver(pending, true) }
          : { useFallback: true };
      this._finalizePendingResolution(pending, resolution);
    }

    const affectedWorkerIds = new Set(
      matchedPendings.map((pending) => pending.workerId).filter(Boolean),
    );

    for (const workerId of affectedWorkerIds) {
      const entry = this._workers.find((candidate) => candidate.id === workerId);
      if (!entry) {
        continue;
      }

      this._workers = this._workers.filter((candidate) => candidate !== entry);

      const affectedPendings = [];
      for (const pending of this._pending.values()) {
        if (pending.workerId === workerId) {
          affectedPendings.push(pending);
        }
      }

      try {
        entry.worker.removeAllListeners();
        void entry.worker.terminate().catch(() => {});
      } catch {
        // Ignore worker shutdown errors and resolve affected requests below.
      }

      entry.pendingCount = 0;
      entry.activeRequestId = null;

      for (const pending of affectedPendings) {
        this._pending.delete(pending.id);
        const isDirectMatch = predicate(pending);
        if (isDirectMatch) {
          this._metrics.canceledRequests++;
        }
        const resolution =
          typeof resolver === 'function'
            ? { value: resolver(pending, isDirectMatch) }
            : { useFallback: true };
        this._finalizePendingResolution(pending, resolution);
      }
    }

    this._ensureWorkerCapacity(this._pending.size);
    this._drainQueue();
  }

  _expireTimedOutRequests() {
    if (
      this._disposed ||
      this._requestTimeoutMs <= 0 ||
      this._pending.size === 0
    ) {
      return;
    }

    const now = this._now();
    const timedOutQueued = [];
    const timedOutWorkerIds = new Set();

    for (const pending of this._pending.values()) {
      if (!pending.deadlineAt || pending.deadlineAt > now) {
        continue;
      }

      if (pending.workerId) {
        timedOutWorkerIds.add(pending.workerId);
      } else {
        timedOutQueued.push(pending);
      }
    }

    for (const pending of timedOutQueued) {
      if (!this._pending.has(pending.id)) {
        continue;
      }

      this._pending.delete(pending.id);
      this._removeQueuedPending(pending.id);
      this._metrics.timedOutRequests++;
      this._finalizePendingResolution(pending, { useFallback: true });
    }

    for (const workerId of timedOutWorkerIds) {
      const entry = this._workers.find((candidate) => candidate.id === workerId);
      if (entry) {
        this._handleWorkerFailure(entry, { timedOut: true });
        continue;
      }

      const orphaned = [];
      for (const pending of this._pending.values()) {
        if (pending.workerId === workerId) {
          orphaned.push(pending);
        }
      }

      for (const pending of orphaned) {
        this._pending.delete(pending.id);
        this._metrics.timedOutRequests++;
        this._finalizePendingResolution(pending, { useFallback: true });
      }
    }
  }

  _ensureMaintenanceLoop() {
    if (
      this._maintenanceTimer ||
      this._disposed ||
      this._requestTimeoutMs <= 0
    ) {
      return;
    }

    this._maintenanceTimer = setInterval(() => {
      if (this._disposed) {
        this._stopMaintenanceLoop();
        return;
      }

      this._expireTimedOutRequests();
    }, this._maintenanceIntervalMs);

    if (typeof this._maintenanceTimer.unref === 'function') {
      this._maintenanceTimer.unref();
    }
  }

  _stopMaintenanceLoop() {
    if (!this._maintenanceTimer) {
      return;
    }

    clearInterval(this._maintenanceTimer);
    this._maintenanceTimer = null;
  }

  _syncMaintenanceLoop() {
    if (this._pending.size > 0) {
      this._ensureMaintenanceLoop();
      return;
    }

    this._stopMaintenanceLoop();
  }

  _selectNextQueuedIndex() {
    if (this._queued.length === 0) {
      return -1;
    }

    const now = this._now();

    let bestIndex = 0;
    for (let index = 1; index < this._queued.length; index++) {
      const current = this._queued[index];
      const best = this._queued[bestIndex];
      const currentEffectivePriority = this._getEffectivePriority(current, now);
      const bestEffectivePriority = this._getEffectivePriority(best, now);
      if (
        currentEffectivePriority > bestEffectivePriority ||
        (currentEffectivePriority === bestEffectivePriority &&
          current.sequence < best.sequence)
      ) {
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  _removeQueuedPending(requestId) {
    const index = this._queued.findIndex((pending) => pending.id === requestId);
    if (index >= 0) {
      this._queued.splice(index, 1);
    }
  }

  _findIdleReadyWorker() {
    return this._workers.find(
      (entry) => entry.ready && entry.pendingCount === 0,
    );
  }

  _drainQueue() {
    if (this._disposed) {
      return;
    }

    while (this._queued.length > 0) {
      this._expireTimedOutRequests();
      if (this._queued.length === 0) {
        return;
      }

      this._ensureWorkerCapacity(this._pending.size);

      const entry = this._findIdleReadyWorker();
      if (!entry) {
        return;
      }

      const nextIndex = this._selectNextQueuedIndex();
      if (nextIndex < 0) {
        return;
      }

      const pending = this._queued.splice(nextIndex, 1)[0];
      if (!pending || !this._pending.has(pending.id)) {
        continue;
      }

      pending.startedAt = this._now();
      this._metrics.dispatchedRequests++;
      entry.pendingCount = 1;
      entry.activeRequestId = pending.id;
      pending.workerId = entry.id;
      entry.worker.postMessage({
        ...pending.workerMessage,
        id: pending.id,
      });
    }
  }

  _createWarmupMessage() {
    return { type: 'warmup' };
  }

  _beforeDispatch(_pendingData) {}

  _isReadyMessage(message) {
    return message?.type === 'ready';
  }

  _handleReadyMessage(_entry, _message) {
    this._drainQueue();
  }

  _getEffectivePriority(pending, nowOverride) {
    const now = Number.isFinite(nowOverride) ? nowOverride : this._now();
    const waitMs = Math.max(0, now - (pending?.queuedAt || now));
    const agingBoost = Math.floor(waitMs / this._agingIntervalMs) * this._agingBoostPerInterval;
    return (Number(pending?.priority) || 0) + agingBoost;
  }

  _resolveWorkerMessage(_pending, _message) {
    return { value: undefined };
  }

  _runFallbackForPending(_pending) {
    this._metrics.fallbackRequests++;
    return undefined;
  }

  _resolveImmediatelyWithFallback(pending = {}) {
    this._metrics.completedRequests++;
    return this._runFallbackForPending(pending);
  }

  _finalizePendingResolution(pending, resolution) {
    this._syncMaintenanceLoop();

    const finishedAt = this._now();
    const queueWaitMs = Math.max(
      0,
      (pending?.startedAt || finishedAt) - (pending?.queuedAt || finishedAt),
    );
    const runTimeMs = Math.max(
      0,
      finishedAt - (pending?.startedAt || finishedAt),
    );

    this._metrics.completedRequests++;
    this._metrics.totalQueueWaitMs += queueWaitMs;
    this._metrics.totalRunTimeMs += runTimeMs;
    this._metrics.longestQueueWaitMs = Math.max(
      this._metrics.longestQueueWaitMs,
      queueWaitMs,
    );
    this._metrics.longestRunTimeMs = Math.max(
      this._metrics.longestRunTimeMs,
      runTimeMs,
    );

    if (resolution?.useFallback) {
      pending.resolve(this._runFallbackForPending(pending));
      return;
    }

    pending.resolve(resolution?.value);
  }
}

module.exports = {
  PooledWorkerClient,
  detectDefaultWorkerCount,
};
