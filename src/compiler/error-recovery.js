// Error recovery system that provides detailed diagnostics and suggestions for fixing compilation errors

'use strict';

const ErrorSeverity = Object.freeze({
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    HINT: 'hint'
});

const ErrorCategory = Object.freeze({
    SYNTAX: 'syntax',
    SEMANTIC: 'semantic',
    TYPE: 'type',
    REFERENCE: 'reference',
    RUNTIME: 'runtime'
});

// Represents a single diagnostic message with severity, location, and optional fix suggestions
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
    
    addSuggestion(suggestion) {
        this.suggestions.push(suggestion);
        return this;
    }
    
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

// Provides strategies for recovering from parse errors and continuing compilation
class ErrorRecovery {
    static recoverMissingSeparator(parser) {
        // Skip to next statement boundary
        while (!parser._isStmtEnd() && !parser._isEnd()) {
            parser._advance();
        }
    }
    
    static recoverUnmatchedParen(parser) {
        let depth = 1;
        while (!parser._isEnd() && depth > 0) {
            const tok = parser._peek();
            if (tok?.value === '(') depth++;
            else if (tok?.value === ')') depth--;
            parser._advance();
        }
    }
    
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
    
}

// Collects and manages all diagnostics during compilation
class DiagnosticCollector {
    constructor() {
        this.diagnostics = [];
        this.errorCount = 0;
        this.warningCount = 0;
    }
    
    add(diagnostic) {
        this.diagnostics.push(diagnostic);
        
        if (diagnostic.severity === ErrorSeverity.ERROR) {
            this.errorCount++;
        } else if (diagnostic.severity === ErrorSeverity.WARNING) {
            this.warningCount++;
        }
    }
    
    error(category, message, line, column, length = 1) {
        const diag = new Diagnostic(ErrorSeverity.ERROR, category, message, line, column, length);
        this.add(diag);
        return diag;
    }
    
    warning(category, message, line, column, length = 1) {
        const diag = new Diagnostic(ErrorSeverity.WARNING, category, message, line, column, length);
        this.add(diag);
        return diag;
    }
    
    info(category, message, line, column, length = 1) {
        const diag = new Diagnostic(ErrorSeverity.INFO, category, message, line, column, length);
        this.add(diag);
        return diag;
    }
    
    hasErrors() {
        return this.errorCount > 0;
    }
    
    getAll() {
        return this.diagnostics;
    }
    
    getBySeverity(severity) {
        return this.diagnostics.filter(d => d.severity === severity);
    }
    
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
