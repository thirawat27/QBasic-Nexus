/**
 * QBasic Nexus - High-Performance Compiler Wrapper
 * =================================================
 * Unified compiler interface with caching and error recovery
 * 
 * @author Thirawat27
 * @version 1.2.0
 */

'use strict';

const Lexer = require('./lexer');
const InternalTranspiler = require('./transpiler');
const { getGlobalCache } = require('./cache');
const { DiagnosticCollector, ErrorCategory, ErrorRecovery } = require('./error-recovery');

/**
 * Compiler options
 */
const DEFAULT_OPTIONS = {
    target: 'web',           // 'web' or 'node'
    cache: true,             // Enable compilation cache
    strictMode: false,       // Strict error checking
    optimizationLevel: 2,    // 0=none, 1=basic, 2=aggressive
    sourceMap: false,        // Generate source maps
    maxErrors: 100           // Maximum errors before stopping
};

/**
 * Compilation result
 */
class CompilationResult {
    constructor(code, diagnostics, metadata = {}) {
        this.code = code;
        this.diagnostics = diagnostics;
        this.metadata = metadata;
        this.success = !diagnostics.hasErrors();
    }
    
    /**
     * Check if compilation was successful
     */
    isSuccess() {
        return this.success;
    }
    
    /**
     * Get generated code
     */
    getCode() {
        return this.code;
    }
    
    /**
     * Get all diagnostics
     */
    getDiagnostics() {
        return this.diagnostics.getAll();
    }
    
    /**
     * Get errors only
     */
    getErrors() {
        return this.diagnostics.getBySeverity('error');
    }
    
    /**
     * Get warnings only
     */
    getWarnings() {
        return this.diagnostics.getBySeverity('warning');
    }
    
    /**
     * Format diagnostics for display
     */
    formatDiagnostics() {
        return this.diagnostics.format();
    }
    
    /**
     * Get compilation metadata
     */
    getMetadata() {
        return this.metadata;
    }
}

/**
 * High-performance QBasic compiler
 */
class Compiler {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.cache = this.options.cache ? getGlobalCache() : null;
        this.stats = {
            compilations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalTime: 0,
            avgTime: 0
        };
    }
    
    /**
     * Compile QBasic source code
     */
    compile(source) {
        const startTime = process.hrtime.bigint();
        
        // Check cache first
        if (this.cache) {
            const cached = this.cache.getCode(source, this.options.target);
            if (cached) {
                this.stats.cacheHits++;
                this.stats.compilations++;
                
                const diagnostics = new DiagnosticCollector();
                for (const err of cached.errors || []) {
                    diagnostics.add(err);
                }
                
                return new CompilationResult(cached.code, diagnostics, {
                    cached: true,
                    cacheAge: Date.now() - cached.timestamp
                });
            }
            this.stats.cacheMisses++;
        }
        
        // Initialize diagnostic collector
        const diagnostics = new DiagnosticCollector();
        
        try {
            // Lexical analysis
            const lexerStart = process.hrtime.bigint();
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            const lexerTime = Number(process.hrtime.bigint() - lexerStart) / 1000000;
            
            // Syntax analysis and code generation
            const parserStart = process.hrtime.bigint();
            const transpiler = new InternalTranspiler();
            const code = transpiler.transpile(source, this.options.target);
            const parserTime = Number(process.hrtime.bigint() - parserStart) / 1000000;
            
            // Get errors using lint method
            const errors = transpiler.lint(source);
            for (const err of errors) {
                diagnostics.error(
                    ErrorCategory.SYNTAX,
                    err.message,
                    err.line,
                    err.column
                );
            }
            
            // Cache result if enabled
            if (this.cache && !diagnostics.hasErrors()) {
                this.cache.setCode(source, this.options.target, code, diagnostics.getAll());
            }
            
            // Update statistics
            const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
            this.stats.compilations++;
            this.stats.totalTime += totalTime;
            this.stats.avgTime = this.stats.totalTime / this.stats.compilations;
            
            return new CompilationResult(code, diagnostics, {
                cached: false,
                lexerTime,
                parserTime,
                totalTime,
                tokenCount: tokens.length,
                lineCount: source.split('\n').length,
                sourceSize: source.length
            });
            
        } catch (error) {
            // Handle unexpected errors
            diagnostics.error(
                ErrorCategory.RUNTIME,
                `Internal compiler error: ${error.message}`,
                1,
                0
            );
            
            return new CompilationResult('', diagnostics, {
                cached: false,
                error: error.message
            });
        }
    }
    
    /**
     * Compile and run (for Node.js target)
     */
    async compileAndRun(source) {
        const result = this.compile(source);
        
        if (!result.isSuccess()) {
            throw new Error('Compilation failed:\n' + result.formatDiagnostics());
        }
        
        if (this.options.target !== 'node') {
            throw new Error('compileAndRun is only available for Node.js target');
        }
        
        // Execute the generated code
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(result.getCode());
        return await fn();
    }
    
    /**
     * Get compiler statistics
     */
    getStats() {
        const stats = { ...this.stats };
        
        if (this.cache) {
            stats.cache = this.cache.getStats();
        }
        
        return stats;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        if (this.cache) {
            this.cache.clear();
        }
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            compilations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalTime: 0,
            avgTime: 0
        };
    }
    
    /**
     * Format statistics for display
     */
    formatStats() {
        const stats = this.getStats();
        const hitRate = stats.compilations > 0 
            ? ((stats.cacheHits / stats.compilations) * 100).toFixed(2)
            : '0.00';
        
        return `
Compiler Statistics:
  Total Compilations: ${stats.compilations}
  Cache Hits: ${stats.cacheHits} (${hitRate}%)
  Cache Misses: ${stats.cacheMisses}
  Average Time: ${stats.avgTime.toFixed(3)} ms
  Total Time: ${stats.totalTime.toFixed(3)} ms
${stats.cache ? `
Cache Statistics:
  Hit Rate: ${stats.cache.hitRate}
  Token Cache: ${stats.cache.tokenCache.utilization}
  Code Cache: ${stats.cache.codeCache.utilization}
` : ''}
        `.trim();
    }
}

/**
 * Quick compile function for simple use cases
 */
function compile(source, options = {}) {
    const compiler = new Compiler(options);
    return compiler.compile(source);
}

/**
 * Quick compile and run function
 */
async function compileAndRun(source, options = {}) {
    const compiler = new Compiler({ ...options, target: 'node' });
    return await compiler.compileAndRun(source);
}

module.exports = {
    Compiler,
    CompilationResult,
    compile,
    compileAndRun,
    DEFAULT_OPTIONS
};
