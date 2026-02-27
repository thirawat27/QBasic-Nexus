/**
 * QBasic Nexus - Native Cross-Platform Worker Thread Manager
 * High-performance compiler worker pool with platform optimizations
 */

"use strict"

const { Worker } = require("worker_threads")
const path = require("path")
const { getRecommendedWorkerCount } = require("../utils/platform")

// ==========================================
// NATIVE SYSTEM ARCHITECTURE
// CROSS-PLATFORM WORKER THREAD POOL
// ==========================================

class CompilerWorkerManager {
  constructor() {
    // Create an optimal thread pool matching the machine's native CPU cores
    this.maxWorkers = getRecommendedWorkerCount()
    this.workers = []
    this.idleWorkers = []
    this.taskQueue = []
    this.isDisposed = false

    this.callbacks = new Map()
    this.messageId = 0

    // Worker script path (cross-platform)
    this.workerScriptPath = path.join(__dirname, "worker.js")

    // Initialize Native Thread Pool
    this._initializePool()
  }

  /**
   * Initialize worker pool with platform-specific optimizations
   * @private
   */
  _initializePool() {
    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        this._spawnWorker()
      }
      console.log(
        `[CompilerWorkerManager] Initialized ${this.maxWorkers} workers`,
      )
    } catch (err) {
      console.error("[CompilerWorkerManager] Failed to initialize pool:", err)
      // Fallback to synchronous mode
      this.maxWorkers = 0
    }
  }

  /**
   * Spawn a new worker thread with platform-specific settings
   * @private
   */
  _spawnWorker() {
    if (this.isDisposed) return

    try {
      // Platform-specific resource limits
      const resourceLimits = {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
      }

      // Windows-specific: Enable better stack traces
      const workerOptions = {
        resourceLimits,
        stderr: true,
        stdout: true,
      }

      const worker = new Worker(this.workerScriptPath, workerOptions)

      worker.on("message", (message) => {
        this._handleWorkerMessage(worker, message)
      })

      worker.on("error", (err) => {
        console.error("[Compiler Thread Pool] Worker Error:", err)
        this._replaceWorker(worker)
      })

      worker.on("exit", (code) => {
        if (code !== 0 && !this.isDisposed) {
          console.error(
            `[Compiler Thread Pool] Worker crashed with code ${code}`,
          )
          this._replaceWorker(worker)
        }
      })

      // Handle stdout/stderr for debugging
      worker.on("messageerror", (err) => {
        console.error("[Compiler Thread Pool] Message Error:", err)
      })

      this.workers.push(worker)
      this.idleWorkers.push(worker)
    } catch (err) {
      console.error("[Compiler Thread Pool] Failed to spawn worker:", err)
    }
  }

  /**
   * Handle messages from workers
   * @private
   */
  _handleWorkerMessage(worker, message) {
    const { id, success, result, error } = message
    const callback = this.callbacks.get(id)

    if (callback) {
      this.callbacks.delete(id)
      if (success) {
        callback.resolve(result)
      } else {
        const errorObj = new Error(error)
        callback.reject(errorObj)
      }
    }

    // Re-queue the worker or process the next waiting task
    this._processNextTask(worker)
  }

  /**
   * Replace a crashed worker
   * @private
   */
  _replaceWorker(worker) {
    // Remove from tracking
    this.workers = this.workers.filter((w) => w !== worker)
    this.idleWorkers = this.idleWorkers.filter((w) => w !== worker)

    // Terminate if still running
    try {
      worker.terminate()
    } catch {
      // Ignore termination errors
    }

    // Spawn replacement if not disposed
    if (!this.isDisposed) {
      this._spawnWorker()
    }
  }

  /**
   * Process next task in queue
   * @private
   */
  _processNextTask(worker) {
    if (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()
      try {
        worker.postMessage(task.payload)
      } catch (err) {
        // Worker might be dead, reject task and replace worker
        const callback = this.callbacks.get(task.payload.id)
        if (callback) {
          this.callbacks.delete(task.payload.id)
          callback.reject(err)
        }
        this._replaceWorker(worker)
      }
    } else {
      // Worker goes idle
      if (!this.idleWorkers.includes(worker)) {
        this.idleWorkers.push(worker)
      }
    }
  }

  /**
   * Transpile QBasic code asynchronously
   * @param {string} source - QBasic source code
   * @param {string} target - Target platform ('node' or 'web')
   * @returns {Promise<string>} Transpiled JavaScript code
   */
  async transpileAsync(source, target = "node") {
    if (this.maxWorkers === 0 || this.workers.length === 0) {
      // Fallback to synchronous transpilation
      return this._transpileSync(source, target)
    }
    return this._dispatch("transpile", { source, target })
  }

  /**
   * Lint QBasic code asynchronously
   * @param {string} source - QBasic source code
   * @returns {Promise<Array>} Array of errors
   */
  async lintAsync(source) {
    if (this.maxWorkers === 0 || this.workers.length === 0) {
      // Fallback to synchronous lint
      return this._lintSync(source)
    }
    return this._dispatch("lint", { source })
  }

  /**
   * Fallback synchronous transpilation
   * @private
   */
  _transpileSync(source, target) {
    try {
      const Transpiler = require("./transpiler")
      const t = new Transpiler()
      return t.transpile(source, target)
    } catch (err) {
      throw new Error(`Synchronous transpilation failed: ${err.message}`, {
        cause: err,
      })
    }
  }

  /**
   * Fallback synchronous lint
   * @private
   */
  _lintSync(source) {
    try {
      const Transpiler = require("./transpiler")
      const t = new Transpiler()
      return t.lint(source)
    } catch (err) {
      return [{ line: 0, message: err.message, severity: "error" }]
    }
  }

  /**
   * Dispatch task to worker
   * @private
   */
  _dispatch(type, data) {
    return new Promise((resolve, reject) => {
      if (this.isDisposed) {
        reject(new Error("Worker manager has been disposed"))
        return
      }

      const id = this.messageId++
      this.callbacks.set(id, { resolve, reject })

      const payload = { id, type, ...data }

      // Find an idle worker
      if (this.idleWorkers.length > 0) {
        const worker = this.idleWorkers.pop()
        try {
          worker.postMessage(payload)
        } catch (_err) {
          // Worker error, try fallback
          this.callbacks.delete(id)
          this._replaceWorker(worker)

          // Fallback to sync
          if (type === "transpile") {
            try {
              const result = this._transpileSync(data.source, data.target)
              resolve(result)
            } catch (err) {
              reject(err)
            }
          } else {
            try {
              const result = this._lintSync(data.source)
              resolve(result)
            } catch (err) {
              reject(err)
            }
          }
        }
      } else {
        // Enqueue if all workers are busy
        this.taskQueue.push({ payload })
      }
    })
  }

  /**
   * Get worker pool statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      idleWorkers: this.idleWorkers.length,
      busyWorkers: this.workers.length - this.idleWorkers.length,
      queuedTasks: this.taskQueue.length,
      pendingCallbacks: this.callbacks.size,
      maxWorkers: this.maxWorkers,
    }
  }

  /**
   * Dispose all workers and clear resources
   */
  dispose() {
    this.isDisposed = true

    // Clear pending callbacks
    for (const [_id, callback] of this.callbacks) {
      callback.reject(new Error("Worker manager disposed"))
    }
    this.callbacks.clear()

    // Terminate all workers
    for (const worker of this.workers) {
      try {
        worker.terminate()
      } catch (_err) {
        // Ignore termination errors
      }
    }

    this.workers = []
    this.idleWorkers = []
    this.taskQueue = []
  }
}

// Export singleton instance
module.exports = new CompilerWorkerManager()
