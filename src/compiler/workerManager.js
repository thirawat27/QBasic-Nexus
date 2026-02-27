const { Worker } = require("worker_threads")
const path = require("path")
const os = require("os")

// ==========================================
// QBASIC NEXUS NATIVE SYSTEM ARCHITECTURE
// HIGH-PERFORMANCE WORKER THREAD POOL
// ==========================================

class CompilerWorkerManager {
  constructor() {
    // Create an optimal thread pool matching the machine's native CPU cores
    // This is a zero-latency parallel processing architecture often seen in Native C++ systems.
    this.maxWorkers = Math.max(1, os.cpus().length - 1)
    this.workers = []
    this.idleWorkers = []
    this.taskQueue = []

    this.callbacks = new Map()
    this.messageId = 0

    // Initialize Native Thread Pool
    for (let i = 0; i < this.maxWorkers; i++) {
      this._spawnWorker()
    }
  }

  _spawnWorker() {
    const worker = new Worker(path.join(__dirname, "worker.js"), {
      resourceLimits: { maxOldGenerationSizeMb: 128 }, // Optimal memory constraints
    })

    worker.on("message", (message) => {
      const { id, success, result, error } = message
      const callback = this.callbacks.get(id)

      if (callback) {
        this.callbacks.delete(id)
        if (success) {
          callback.resolve(result)
        } else {
          callback.reject(new Error(error))
        }
      }

      // Re-queue the worker or process the next waiting task
      this._processNextTask(worker)
    })

    worker.on("error", (err) => {
      console.error("[Compiler Thread Pool] Native Worker Fault:", err)
      this._replaceWorker(worker)
    })

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(
          `[Compiler Thread Pool] Native Worker crashed with code ${code}`,
        )
        this._replaceWorker(worker)
      }
    })

    this.workers.push(worker)
    this.idleWorkers.push(worker)
  }

  _replaceWorker(worker) {
    this.workers = this.workers.filter((w) => w !== worker)
    this.idleWorkers = this.idleWorkers.filter((w) => w !== worker)
    this._spawnWorker()
  }

  _processNextTask(worker) {
    if (this.taskQueue.length > 0) {
      // Immediately execute next task (Native Zero-Wait-State simulation)
      const task = this.taskQueue.shift()
      worker.postMessage(task.payload)
    } else {
      // Worker goes idle
      this.idleWorkers.push(worker)
    }
  }

  async transpileAsync(source, target = "node") {
    return this._dispatch("transpile", { source, target })
  }

  async lintAsync(source) {
    return this._dispatch("lint", { source })
  }

  _dispatch(type, data) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++
      this.callbacks.set(id, { resolve, reject })

      const payload = { id, type, ...data }

      // Find an idle native thread
      if (this.idleWorkers.length > 0) {
        const worker = this.idleWorkers.pop()
        worker.postMessage(payload)
      } else {
        // Enqueue if all CPU cores are busy
        this.taskQueue.push({ payload, resolve, reject })
      }
    })
  }

  dispose() {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.idleWorkers = []
    this.taskQueue = []
    this.callbacks.clear()
  }
}

// Export a robust singleton instance, preserving standard Native process management.
module.exports = new CompilerWorkerManager()
