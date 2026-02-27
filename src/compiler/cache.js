// Compilation cache system using LRU strategy to speed up repeated compilations

'use strict';

const crypto = require('crypto');

// Least Recently Used cache that automatically evicts oldest entries when full
class LRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }
    
    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }
        
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        
        return value;
    }
    
    set(key, value) {
        // Remove if exists (to update position)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        
        this.cache.set(key, value);
        
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    clear() {
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
    
    stats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilization: (this.cache.size / this.maxSize * 100).toFixed(2) + '%'
        };
    }
}

// Main compilation cache that stores tokens and generated code indexed by source hash
class CompilationCache {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.maxSize = options.maxSize || 100;
        this.tokenCache = new LRUCache(this.maxSize);
        this.astCache = new LRUCache(this.maxSize);
        this.codeCache = new LRUCache(this.maxSize);
        
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    
    _hash(source) {
        return crypto.createHash('sha256').update(source).digest('hex').substring(0, 16);
    }
    
    getTokens(source) {
        if (!this.enabled) return null;
        
        const hash = this._hash(source);
        const cached = this.tokenCache.get(hash);
        
        if (cached) {
            this.stats.hits++;
            return cached;
        }
        
        this.stats.misses++;
        return null;
    }
    
    /**
     * Cache tokens
     */
    setTokens(source, tokens) {
        if (!this.enabled) return;
        
        const hash = this._hash(source);
        this.tokenCache.set(hash, tokens);
    }
    
    /**
     * Get cached compiled code
     */
    getCode(source, target = 'web') {
        if (!this.enabled) return null;
        
        const hash = this._hash(source + target);
        const cached = this.codeCache.get(hash);
        
        if (cached) {
            this.stats.hits++;
            return cached;
        }
        
        this.stats.misses++;
        return null;
    }
    
    /**
     * Cache compiled code
     */
    setCode(source, target, code, errors = []) {
        if (!this.enabled) return;
        
        const hash = this._hash(source + target);
        this.codeCache.set(hash, { code, errors, timestamp: Date.now() });
    }
    
    /**
     * Clear all caches
     */
    clear() {
        this.tokenCache.clear();
        this.astCache.clear();
        this.codeCache.clear();
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
        
        return {
            ...this.stats,
            hitRate: hitRate + '%',
            tokenCache: this.tokenCache.stats(),
            codeCache: this.codeCache.stats()
        };
    }
    
    /**
     * Enable/disable cache
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }
}

/**
 * Incremental compilation tracker
 * Tracks which parts of the code have changed for faster recompilation
 */
class IncrementalTracker {
    constructor() {
        this.lastSource = '';
        this.lastTokens = [];
        this.changedLines = new Set();
    }
    
    /**
     * Detect changed lines between old and new source
     */
    detectChanges(newSource) {
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
    
    /**
     * Check if a line has changed
     */
    hasChanged(lineNumber) {
        return this.changedLines.has(lineNumber);
    }
    
    /**
     * Get all changed lines
     */
    getChangedLines() {
        return Array.from(this.changedLines);
    }
    
    /**
     * Reset tracker
     */
    reset() {
        this.lastSource = '';
        this.lastTokens = [];
        this.changedLines.clear();
    }
}

// Global cache instance
let globalCache = null;

/**
 * Get or create global cache instance
 */
function getGlobalCache(options) {
    if (!globalCache) {
        globalCache = new CompilationCache(options);
    }
    return globalCache;
}

/**
 * Reset global cache
 */
function resetGlobalCache() {
    if (globalCache) {
        globalCache.clear();
    }
    globalCache = null;
}

module.exports = {
    LRUCache,
    CompilationCache,
    IncrementalTracker,
    getGlobalCache,
    resetGlobalCache
};
