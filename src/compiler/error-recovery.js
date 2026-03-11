/**
 * QBasic Nexus - Enhanced Error Recovery System
 * Provides robust error recovery and detailed diagnostics
 */

'use strict';

/**
 * Error severity levels
 */
const ErrorSeverity = Object.freeze({
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    HINT: 'hint'
});

/**
 * Error categories for better diagnostics
 */
const ErrorCategory = Object.freeze({
    SYNTAX: 'syntax',
    SEMANTIC: 'semantic',
    TYPE: 'type',
    REFERENCE: 'reference',
    RUNTIME: 'runtime'
});

/**
 * Enhanced diagnostic message
 */
class Diagnostic {
    constructor(severity, category, message, line, column, length = 1) {
        this.severity = severity;
        this.category = category;
        this.message = message;
        this.line = line;
        this.column = column;
        this.length = length;
        this.suggestions = [];
    }
    
    /**
     * Add a suggestion for fixing the error
     */
    addSuggestion(suggestion) {
        this.suggestions.push(suggestion);
        return this;
    }
    
    /**
     * Format diagnostic for display
     */
    format() {
        const icon = {
            [ErrorSeverity.ERROR]: '❌',
            [ErrorSeverity.WARNING]: '⚠️',
            [ErrorSeverity.INFO]: 'ℹ️',
            [ErrorSeverity.HINT]: '💡'
        }[this.severity] || '•';
        
        let output = `${icon} [${this.category}] Line ${this.line}:${this.column} - ${this.message}`;
        
        if (this.suggestions.length > 0) {
            output += '\n  Suggestions:';
            for (const suggestion of this.suggestions) {
                output += `\n    • ${suggestion}`;
            }
        }
        
        return output;
    }
}

/**
 * Error recovery strategies
 */
class ErrorRecovery {
    /**
     * Recover from missing semicolon/newline
     */
    static recoverMissingSeparator(parser) {
        // Skip to next statement boundary
        while (!parser._isStmtEnd() && !parser._isEnd()) {
            parser._advance();
        }
    }
    
    /**
     * Recover from unmatched parenthesis
     */
    static recoverUnmatchedParen(parser) {
        let depth = 1;
        while (!parser._isEnd() && depth > 0) {
            const tok = parser._peek();
            if (tok?.value === '(') depth++;
            else if (tok?.value === ')') depth--;
            parser._advance();
        }
    }
    
    /**
     * Recover from invalid expression
     */
    static recoverInvalidExpression(parser) {
        // Skip until we find a statement separator or operator
        while (!parser._isStmtEnd() && !parser._isEnd()) {
            const tok = parser._peek();
            if (tok?.type === 'OPERATOR' || tok?.type === 'PUNCTUATION') {
                break;
            }
            parser._advance();
        }
    }
    
    /**
     * Suggest fixes for common typos
     */
    static suggestTypoFix(word, validWords) {
        const suggestions = [];
        const maxDistance = 2;
        
        for (const valid of validWords) {
            const distance = this._levenshteinDistance(word.toUpperCase(), valid.toUpperCase());
            if (distance <= maxDistance) {
                suggestions.push({ word: valid, distance });
            }
        }
        
        return suggestions
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3)
            .map(s => s.word);
    }
    
    /**
     * Calculate Levenshtein distance between two strings.
     * Uses O(min(m,n)) space via a single rolling row instead of O(m×n)
     * 2D matrix — reduces GC pressure when called repeatedly during
     * error-recovery keyword scanning.
     */
    static _levenshteinDistance(a, b) {
        // Always iterate over the shorter string in the inner loop
        if (a.length < b.length) { const tmp = a; a = b; b = tmp; }
        const bLen = b.length;
        const row = new Int32Array(bLen + 1);
        for (let j = 0; j <= bLen; j++) row[j] = j;

        for (let i = 1; i <= a.length; i++) {
            let diag = i - 1; // diagonal = row[j-1] from previous outer iteration
            row[0] = i;
            for (let j = 1; j <= bLen; j++) {
                const above = row[j];           // row[j] before update = deletion cost
                if (a[i - 1] === b[j - 1]) {
                    row[j] = diag;              // no cost — copy from diagonal
                } else {
                    row[j] = 1 + Math.min(
                        diag,       // substitution
                        above,      // deletion
                        row[j - 1], // insertion
                    );
                }
                diag = above;                   // advance diagonal
            }
        }
        return row[bLen];
    }
}

/**
 * Diagnostic collector with enhanced error reporting
 */
class DiagnosticCollector {
    constructor() {
        this.diagnostics = [];
        this.errorCount = 0;
        this.warningCount = 0;
    }
    
    /**
     * Add a diagnostic
     */
    add(diagnostic) {
        this.diagnostics.push(diagnostic);
        
        if (diagnostic.severity === ErrorSeverity.ERROR) {
            this.errorCount++;
        } else if (diagnostic.severity === ErrorSeverity.WARNING) {
            this.warningCount++;
        }
    }
    
    /**
     * Add an error
     */
    error(category, message, line, column, length = 1) {
        const diag = new Diagnostic(ErrorSeverity.ERROR, category, message, line, column, length);
        this.add(diag);
        return diag;
    }
    
    /**
     * Add a warning
     */
    warning(category, message, line, column, length = 1) {
        const diag = new Diagnostic(ErrorSeverity.WARNING, category, message, line, column, length);
        this.add(diag);
        return diag;
    }
    
    /**
     * Add an info message
     */
    info(category, message, line, column, length = 1) {
        const diag = new Diagnostic(ErrorSeverity.INFO, category, message, line, column, length);
        this.add(diag);
        return diag;
    }
    
    /**
     * Check if there are any errors
     */
    hasErrors() {
        return this.errorCount > 0;
    }
    
    /**
     * Get all diagnostics
     */
    getAll() {
        return this.diagnostics;
    }
    
    /**
     * Get diagnostics by severity
     */
    getBySeverity(severity) {
        return this.diagnostics.filter(d => d.severity === severity);
    }
    
    /**
     * Format all diagnostics
     */
    format() {
        if (this.diagnostics.length === 0) {
            return '✅ No issues found';
        }
        
        let output = `Found ${this.errorCount} error(s) and ${this.warningCount} warning(s):\n\n`;
        
        for (const diag of this.diagnostics) {
            output += diag.format() + '\n\n';
        }
        
        return output;
    }
    
    /**
     * Clear all diagnostics
     */
    clear() {
        this.diagnostics = [];
        this.errorCount = 0;
        this.warningCount = 0;
    }
}

module.exports = {
    ErrorSeverity,
    ErrorCategory,
    Diagnostic,
    ErrorRecovery,
    DiagnosticCollector
};
