/**
 * QBasic Nexus - Lexer
 * ====================
 * Tokenizes QBasic source code.
 * 
 * @author Thirawat27
 * @version 1.0.6
 */

'use strict';

const { TokenType, KEYWORDS } = require('./constants');

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
        this.src = source;
        this.len = source.length;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        /** @type {Token[]} */
        this.tokens = [];
    }

    /**
     * Tokenizes the source code.
     * @returns {Token[]} Array of tokens.
     */
    tokenize() {
        while (this.pos < this.len) {
            this._scanToken();
        }
        this.tokens.push(new Token(TokenType.EOF, '', this.line, this.col));
        return this.tokens;
    }

    /** @private */
    _scanToken() {
        const c = this.src[this.pos];

        // Newline
        if (c === '\n') {
            this.tokens.push(new Token(TokenType.NEWLINE, '\n', this.line, this.col));
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
            this.tokens.push(new Token(TokenType.PUNCTUATION, c, this.line, this.col));
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
        let val = '';
        let hasDot = false;

        while (this.pos < this.len) {
            const c = this.src[this.pos];
            if (this._isDigit(c)) {
                val += c;
                this._advance();
            } else if (c === '.' && !hasDot) {
                hasDot = true;
                val += c;
                this._advance();
            } else {
                break;
            }
        }

        // Handle type suffixes (#, !, &, %)
        if ('#!&%'.includes(this.src[this.pos])) {
            this._advance();
        }

        this.tokens.push(new Token(TokenType.NUMBER, val, this.line, startCol));
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
        this.tokens.push(new Token(TokenType.NUMBER, String(decimal), this.line, startCol));
    }

    /** @private */
    _scanString() {
        const startCol = this.col;
        this._advance(); // Skip opening quote
        let val = '';

        while (this.pos < this.len && this.src[this.pos] !== '"' && this.src[this.pos] !== '\n') {
            val += this.src[this.pos];
            this._advance();
        }

        if (this.src[this.pos] === '"') this._advance();
        this.tokens.push(new Token(TokenType.STRING, val, this.line, startCol));
    }

    /** @private */
    _scanIdentifier() {
        const startCol = this.col;
        let val = '';

        while (this.pos < this.len && this._isAlphaNumeric(this.src[this.pos])) {
            val += this.src[this.pos];
            this._advance();
        }

        // Type suffix ($, %, &, !, #)
        if ('$%&!#'.includes(this.src[this.pos])) {
            val += this.src[this.pos];
            this._advance();
        }

        const upper = val.toUpperCase();
        const type = KEYWORDS.has(upper) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        this.tokens.push(new Token(type, type === TokenType.KEYWORD ? upper : val, this.line, startCol));
    }

    /** @private */
    _scanOperator() {
        const c = this.src[this.pos];
        const n = this._peek(1);

        // Two-char operators
        if ((c === '<' || c === '>') && n === '=') {
            this.tokens.push(new Token(TokenType.OPERATOR, c + '=', this.line, this.col));
            this._advance();
            this._advance();
            return;
        }

        if (c === '<' && n === '>') {
            this.tokens.push(new Token(TokenType.OPERATOR, '<>', this.line, this.col));
            this._advance();
            this._advance();
            return;
        }

        this.tokens.push(new Token(TokenType.OPERATOR, c, this.line, this.col));
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
        const c0 = this.src[this.pos];
        const c1 = this.src[this.pos + 1];
        const c2 = this.src[this.pos + 2];
        const c3 = this.src[this.pos + 3];
        
        const isRem = (c0 === 'R' || c0 === 'r') &&
                       (c1 === 'E' || c1 === 'e') &&
                       (c2 === 'M' || c2 === 'm');
        
        return isRem && (this.pos + 3 >= this.len || c3 === ' ' || c3 === '\t' || c3 === '\n');
    }

    /** @private */
    _skipLine() {
        while (this.pos < this.len && this.src[this.pos] !== '\n') {
            this._advance();
        }
    }
}

module.exports = Lexer;
