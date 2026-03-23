/**
 * QBasic Nexus - Tiered Compilation Cache System
 *
 * Architecture (Phase 1.3 - Tiered Cache):
 *  L1 Hot  : plain Map, last 10 entries, O(1) lookup
 *  L2 Warm : flru LRU cache, up to 100 entries
 *  Hash    : FNV-1a (100x faster than SHA-256)
 *
 * Replaces: crypto.sha256  →  FNV-1a
 * Replaces: single LRU    →  L1 + L2 tiered cache
 */

'use strict';

// flru: blazing-fast LRU cache, zero dependencies
const flru = require('flru');

// ─────────────────────────────────────────────────────────────────────────────
// FNV-1a 32-bit hash – ~100x faster than SHA-256 for short strings
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Compute FNV-1a 32-bit hash of a string.
 * @param {string} str
 * @returns {string} hex hash string
 */
function fnv1a(str) {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0, len = str.length; i < len; i++) {
    hash ^= str.charCodeAt(i);
    // V8 highly optimizes Math.imul for 32-bit integer multiplication
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 Hot Cache – tiny Map that holds only the last N entries
// Designed for the most recently accessed items (repeated typing scenario)
// ─────────────────────────────────────────────────────────────────────────────
class L1Cache {
  /**
   * @param {number} maxSize – number of entries to keep (default 32)
   *   Optimized: increased to 32 to reduce cache misses
   *   in multi-file projects with frequent file switching.
   */
  constructor(maxSize = 32) {
    this._max = maxSize;
    this._map = new Map();
  }

  get(key) {
    return this._map.get(key) ?? null;
  }

  set(key, value) {
    // Evict oldest if full
    if (this._map.size >= this._max && !this._map.has(key)) {
      // Map preserves insertion order; first key is oldest
      this._map.delete(this._map.keys().next().value);
    }
    this._map.set(key, value);
  }

  has(key) {
    return this._map.has(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TieredCache – main cache class used by CompilationCache
// ─────────────────────────────────────────────────────────────────────────────
class TieredCache {
  /**
   * @param {number} l2Size – L2 LRU max size (default 300)
   *   Optimized: increased to 300 for better multi-file support
   *   while maintaining low memory footprint (~15MB max).
   */
  constructor(l2Size = 300) {
    this._l2Size = l2Size; // keep for clear() re-creation
    this.l1 = new L1Cache(32);
    this.l2 = flru(l2Size);
    this._hits = { l1: 0, l2: 0 };
    this._misses = 0;
  }

  get(key) {
    // Try L1 first (hot path)
    const l1val = this.l1.get(key);
    if (l1val !== null) {
      this._hits.l1++;
      return l1val;
    }

    // Try L2 (warm path)
    const l2val = this.l2.get(key);
    if (l2val !== undefined) {
      this._hits.l2++;
      // Promote to L1
      this.l1.set(key, l2val);
      return l2val;
    }

    this._misses++;
    return null;
  }

  set(key, value) {
    this.l1.set(key, value);
    this.l2.set(key, value);
  }

  has(key) {
    return this.l1.has(key) || this.l2.get(key) !== undefined;
  }

  clear() {
    this.l1.clear();
    // flru has no bulk-clear API; recreate the instance.
    // Use the stored _l2Size (this.l2._max is an internal flru detail
    // that may not be reliable across versions).
    this.l2 = flru(this._l2Size);
    this._hits = { l1: 0, l2: 0 };
    this._misses = 0;
  }

  stats() {
    const hits = this._hits.l1 + this._hits.l2;
    const total = hits + this._misses;
    return {
      l1Hits: this._hits.l1,
      l2Hits: this._hits.l2,
      misses: this._misses,
      hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0.00%',
      l1Size: this.l1.size,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CompilationCache – public API (backward-compatible with old cache.js)
// ─────────────────────────────────────────────────────────────────────────────
class CompilationCache {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    // Default raised to 300 for better performance
    const l2Size = options.maxSize || 300;
    this.tokenCache = new TieredCache(l2Size);
    this.codeCache = new TieredCache(l2Size);

    // Aggregate stats
    this._stats = { hits: 0, misses: 0 };
  }

  /** Fast FNV-1a hash (replaces SHA-256) */
  _hash(source) {
    return fnv1a(source);
  }

  // ── Token cache ──────────────────────────────────────────────────────────

  getTokens(source) {
    if (!this.enabled) return null;
    const key = this._hash(source);
    const val = this.tokenCache.get(key);
    if (val !== null) {
      this._stats.hits++;
      return val;
    }
    this._stats.misses++;
    return null;
  }

  setTokens(source, tokens) {
    if (!this.enabled) return;
    this.tokenCache.set(this._hash(source), tokens);
  }

  // ── Code cache ───────────────────────────────────────────────────────────

  getCode(source, target = 'web') {
    if (!this.enabled) return null;
    const key = this._hash(source + '\x00' + target);
    const val = this.codeCache.get(key);
    if (val !== null) {
      this._stats.hits++;
      return val;
    }
    this._stats.misses++;
    return null;
  }

  setCode(source, target, code, errors = []) {
    if (!this.enabled) return;
    const key = this._hash(source + '\x00' + target);
    this.codeCache.set(key, { code, errors, timestamp: Date.now() });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  clear() {
    this.tokenCache.clear();
    this.codeCache.clear();
    this._stats = { hits: 0, misses: 0 };
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  getStats() {
    const { hits, misses } = this._stats;
    const total = hits + misses;
    return {
      ...this._stats,
      hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0.00%',
      tokenCache: this.tokenCache.stats(),
      codeCache: this.codeCache.stats(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IncrementalTracker – unchanged public API
// ─────────────────────────────────────────────────────────────────────────────
class IncrementalTracker {
  constructor() {
    this.lastSource = '';
    this.lastTokens = [];
    this.changedLines = new Set();
  }

  detectChanges(newSource) {
    // Fast path: no change at all
    if (newSource === this.lastSource) {
      this.changedLines.clear();
      return this.changedLines;
    }

    const oldLines = this.lastSource.split('\n');
    const newLines = newSource.split('\n');
    this.changedLines.clear();

    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (oldLines[i] !== newLines[i]) {
        this.changedLines.add(i + 1); // 1-indexed
      }
    }

    this.lastSource = newSource;
    return this.changedLines;
  }

  hasChanged(lineNumber) {
    return this.changedLines.has(lineNumber);
  }
  getChangedLines() {
    return Array.from(this.changedLines);
  }

  reset() {
    this.lastSource = '';
    this.lastTokens = [];
    this.changedLines.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton helpers (backward compatible)
// ─────────────────────────────────────────────────────────────────────────────
let globalCache = null;

function getGlobalCache(options) {
  if (!globalCache) {
    globalCache = new CompilationCache(options);
  }
  return globalCache;
}

function resetGlobalCache() {
  if (globalCache) globalCache.clear();
  globalCache = null;
}

module.exports = {
  // New exports
  TieredCache,
  L1Cache,
  fnv1a,
  // Backward-compatible exports
  LRUCache: TieredCache, // alias so old require('./cache').LRUCache still works
  CompilationCache,
  IncrementalTracker,
  getGlobalCache,
  resetGlobalCache,
};
