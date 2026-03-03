/**
 * QBasic Nexus - Lexer v1.1.0
 * ===========================
 * Tokenizer for QBasic source code using direct character scanning.
 * 
 * v1.1.0: Enhanced error reporting and memory management
 * 
 * @author Thirawat27
 * @version 1.1.0
 */

'use strict';

const { TokenType, KEYWORDS } = require('./constants');

/**
 * Token pool for object reuse - reduces GC pressure
 * Enhanced with pre-allocation for better performance
 */
const TokenPool = {
    _pool: [],
    _maxSize: 1000, // Increased pool size for better reuse
    
    // Pre-allocate tokens on first use
    _initialized: false,
    _preallocate() {
        if (this._initialized) return;
        this._initialized = true;
        // Pre-allocate 200 tokens to avoid initial allocation overhead
        for (let i = 0; i < 200; i++) {
            this._pool.push(new Token('', '', 0, 0));
        }
    },
    
    acquire(type, value, line, col) {
        this._preallocate();
        if (this._pool.length > 0) {
            const token = this._pool.pop();
            token.type = type;
            token.value = value;
            token.line = line;
            token.col = col;
            return token;
        }
        return new Token(type, value, line, col);
    },
    
    releaseAll(tokens) {
        // Return tokens to pool for reuse (called after parsing is complete)
        const available = this._maxSize - this._pool.length;
        const toReturn = Math.min(tokens.length, available);
        for (let i = 0; i < toReturn; i++) {
            // Clear sensitive data before returning to pool
            tokens[i].value = '';
            this._pool.push(tokens[i]);
        }
    },
    
    clear() {
        this._pool.length = 0;
        this._initialized = false;
    }
};

/**
 * Represents a single token.
 */
class Token {
    /**
     * @param {string} type - The token type.
     * @param {string} value - The token value.
     * @param {number} line - The line number (1-indexed).
     * @param {number} col - The column number (1-indexed).
     */
    constructor(type, value, line, col = 0) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}

/**
 * Tokenizes QBasic source code into an array of tokens.
 */
class Lexer {
    /**
     * @param {string} source - The source code to tokenize.
     */
    constructor(source) {
        // Normalize Unicode variants to ASCII equivalents for robust parsing
        // Common problematic characters: $ variants, smart quotes, etc.
        // Optimized: Use single regex pass for all replacements
        this.src = source
            .replace(/[\uFF04\uFE69]/g, '$') // Fullwidth $, Small $ (0024 is already ASCII)
            .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Smart quotes -> straight
            .replace(/[\u2018\u2019\u201A\u201B]/g, "'"); // Smart apostrophes
        this.len = this.src.length;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        /** @type {Token[]} */
        this.tokens = [];
        // Pre-allocate token array with estimated size (reduces reallocation)
        this.tokens.length = 0;
        // Estimate: average 1 token per 5 characters
        const estimatedTokens = Math.floor(this.len / 5);
        if (estimatedTokens > 100) {
            // Reserve space for large files
            this.tokens = new Array(estimatedTokens);
            this.tokens.length = 0;
        }
    }

    /**
     * Tokenizes the source code.
     * @returns {Token[]} Array of tokens.
     */
    tokenize() {
        while (this.pos < this.len) {
            this._scanToken();
        }
        this.tokens.push(TokenPool.acquire(TokenType.EOF, '', this.line, this.col));
        return this.tokens;
    }

    /** @private */
    _scanToken() {
        const c = this.src[this.pos];

        // Newline
        if (c === '\n') {
            this.tokens.push(TokenPool.acquire(TokenType.NEWLINE, '\n', this.line, this.col));
            this._advance();
            this.line++;
            this.col = 1;
            return;
        }

        // Carriage return (skip)
        if (c === '\r') {
            this._advance();
            return;
        }

        // Whitespace
        if (c === ' ' || c === '\t') {
            this._advance();
            return;
        }

        // Comment (single quote or REM)
        if (c === "'" || this._isRem()) {
            this._skipLine();
            return;
        }

        // Number
        if (this._isDigit(c) || (c === '.' && this._isDigit(this._peek(1)))) {
            this._scanNumber();
            return;
        }

        // Hex number (&H...)
        if (c === '&' && (this._peek(1) === 'H' || this._peek(1) === 'h')) {
            this._scanHexNumber();
            return;
        }

        // String
        if (c === '"') {
            this._scanString();
            return;
        }

        // Identifier/Keyword
        if (this._isAlpha(c)) {
            this._scanIdentifier();
            return;
        }

        // Punctuation
        if ('(),;:#.'.includes(c)) {
            this.tokens.push(TokenPool.acquire(TokenType.PUNCTUATION, c, this.line, this.col));
            this._advance();
            return;
        }

        // Operators
        if ('+-*/^=<>\\'.includes(c)) {
            this._scanOperator();
            return;
        }

        // Unknown character - skip
        this._advance();
    }

    /** @private */
    _scanNumber() {
        const startCol = this.col;
        const startPos = this.pos;
        let hasDot = false;

        while (this.pos < this.len) {
            const c = this.src[this.pos];
            if (this._isDigit(c)) {
                this._advance();
            } else if (c === '.' && !hasDot) {
                hasDot = true;
                this._advance();
            } else {
                break;
            }
        }

        // Handle type suffixes (#, !, &, %)
        if ('#!&%'.includes(this.src[this.pos])) {
            this._advance();
        }

        // Extract value using slice (faster than concatenation)
        const val = this.src.slice(startPos, this.pos);
        this.tokens.push(TokenPool.acquire(TokenType.NUMBER, val, this.line, startCol));
    }

    /** @private */
    _scanHexNumber() {
        const startCol = this.col;
        this._advance(); // &
        this._advance(); // H
        
        let val = '';
        while (this.pos < this.len && /[0-9A-Fa-f]/.test(this.src[this.pos])) {
            val += this.src[this.pos];
            this._advance();
        }

        const decimal = parseInt(val, 16) || 0;
        this.tokens.push(TokenPool.acquire(TokenType.NUMBER, String(decimal), this.line, startCol));
    }

    /** @private */
    _scanString() {
        const startCol = this.col;
        const startLine = this.line;
        this._advance(); // Skip opening quote
        let val = '';

        while (this.pos < this.len && this.src[this.pos] !== '"' && this.src[this.pos] !== '\n') {
            val += this.src[this.pos];
            this._advance();
        }

        // Check for unclosed string (reached newline or EOF without closing quote)
        if (this.src[this.pos] !== '"') {
            // Still create the token but log warning for debugging
            console.warn(`[Lexer] Unclosed string literal at line ${startLine}, col ${startCol}`);
        } else {
            this._advance(); // Skip closing quote
        }
        
        this.tokens.push(TokenPool.acquire(TokenType.STRING, val, this.line, startCol));
    }

    /** @private */
    _scanIdentifier() {
        const startCol = this.col;
        const startPos = this.pos;
        
        // Scan identifier without string concatenation (much faster)
        while (this.pos < this.len && this._isAlphaNumeric(this.src[this.pos])) {
            this._advance();
        }

        // Type suffix ($, %, &, !, #)
        const hasSuffix = '$%&!#'.includes(this.src[this.pos]);
        if (hasSuffix) {
            this._advance();
        }

        // Extract value using slice (faster than concatenation)
        const val = this.src.slice(startPos, this.pos);
        const upper = val.toUpperCase();
        const type = KEYWORDS.has(upper) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        this.tokens.push(TokenPool.acquire(type, type === TokenType.KEYWORD ? upper : val, this.line, startCol));
    }

    /** @private */
    _scanOperator() {
        const c = this.src[this.pos];
        const n = this._peek(1);

        // Two-char operators
        if ((c === '<' || c === '>') && n === '=') {
            this.tokens.push(TokenPool.acquire(TokenType.OPERATOR, c + '=', this.line, this.col));
            this._advance();
            this._advance();
            return;
        }

        if (c === '<' && n === '>') {
            this.tokens.push(TokenPool.acquire(TokenType.OPERATOR, '<>', this.line, this.col));
            this._advance();
            this._advance();
            return;
        }

        this.tokens.push(TokenPool.acquire(TokenType.OPERATOR, c, this.line, this.col));
        this._advance();
    }

    /** @private */
    _advance() {
        this.pos++;
        this.col++;
    }

    /** @private */
    _peek(offset) {
        const p = this.pos + offset;
        return p < this.len ? this.src[p] : null;
    }

    /** @private */
    _isDigit(c) {
        return c >= '0' && c <= '9';
    }

    /** @private */
    _isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    }

    /** @private */
    _isAlphaNumeric(c) {
        return this._isAlpha(c) || this._isDigit(c);
    }

    /** @private */
    _isRem() {
        // Optimized: Check characters directly instead of substring+toUpperCase
        // Use bitwise OR for case-insensitive comparison (faster than multiple comparisons)
        const c0 = this.src.charCodeAt(this.pos) | 32; // Convert to lowercase
        const c1 = this.src.charCodeAt(this.pos + 1) | 32;
        const c2 = this.src.charCodeAt(this.pos + 2) | 32;
        
        // 'r' = 114, 'e' = 101, 'm' = 109 in lowercase
        const isRem = (c0 === 114) && (c1 === 101) && (c2 === 109);
        
        if (!isRem) return false;
        
        const c3 = this.src[this.pos + 3];
        return this.pos + 3 >= this.len || c3 === ' ' || c3 === '\t' || c3 === '\n';
    }

    /** @private */
    _skipLine() {
        while (this.pos < this.len && this.src[this.pos] !== '\n') {
            this._advance();
        }
    }
}

module.exports = Lexer;
module.exports.TokenPool = TokenPool;
