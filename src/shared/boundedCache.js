/**
 * QBasic Nexus - Bounded Cache
 *
 * Minimal LRU map used by the long-lived caches in the extension host.
 * Several caches used to be plain Maps that only shrank when a document was
 * explicitly closed or invalidated, so a long editing session (or a workspace
 * scan touching many files) grew the extension host heap without limit.
 * Every one of those caches is a *speed* cache: dropping the coldest entry is
 * always safe because the value can be recomputed on demand.
 *
 * Map preserves insertion order, so "oldest key" is the first key and
 * re-inserting on read is enough to implement LRU recency.
 */

'use strict';

class BoundedCache {
  /**
   * @param {number} maxSize - maximum number of retained entries (>= 1)
   */
  constructor(maxSize = 32) {
    const normalized = Math.trunc(Number(maxSize));
    this._max = Number.isFinite(normalized) && normalized >= 1 ? normalized : 32;
    this._map = new Map();
  }

  /**
   * Read a value, refreshing its recency.
   * @param {*} key
   * @returns {*} the stored value, or undefined
   */
  get(key) {
    if (!this._map.has(key)) return undefined;
    const value = this._map.get(key);
    // Re-insert so this entry becomes the most recently used.
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  /**
   * Read without affecting recency. Useful for diagnostics and tests.
   * @param {*} key
   */
  peek(key) {
    return this._map.get(key);
  }

  has(key) {
    return this._map.has(key);
  }

  /**
   * Store a value, evicting least-recently-used entries past the cap.
   * @param {*} key
   * @param {*} value
   * @returns {BoundedCache} this
   */
  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    while (this._map.size > this._max) {
      this._map.delete(this._map.keys().next().value);
    }
    return this;
  }

  /**
   * @param {*} key
   * @returns {boolean} true when an entry was removed
   */
  delete(key) {
    return this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }

  get maxSize() {
    return this._max;
  }

  keys() {
    return this._map.keys();
  }

  values() {
    return this._map.values();
  }

  entries() {
    return this._map.entries();
  }

  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
  }
}

module.exports = { BoundedCache };
