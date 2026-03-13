/**
 * QBasic Nexus - FastLexer
 *
 * Phase 1.1 upgrade:
 *  - Uses `moo` for compiled-regex tokenization (~10-15x faster than manual
 *    character scanning on large files, per ARCHITECTURE_REFACTORING_PLAN.md)
 *  - Lean TokenPool for object reuse (reduces GC pressure)
 *  - Zero-copy string slicing wherever possible
 *  - Pre-compiled regex patterns (compile once, use many)
 *  - Flyweight pattern: keyword strings are interned via KEYWORDS Set
 */

'use strict';

const moo = require('moo');
const { TokenType, KEYWORDS } = require('./constants');

// ─────────────────────────────────────────────────────────────────────────────
// Pre-compiled character-level helpers (used in fallback only)
// ─────────────────────────────────────────────────────────────────────────────
const SMART_QUOTE_RE = /[\u201C\u201D\u201E\u201F]/g;
const SMART_APOS_RE = /[\u2018\u2019\u201A\u201B]/g;
const FULLWIDTH_RE = /[\uFF04\uFE69]/g;

// Normalise Unicode curly quotes / fullwidth chars to ASCII once per compile
function normalise(source) {
  // Reset stateful regex BEFORE .test() call to prevent lastIndex corruption
  SMART_QUOTE_RE.lastIndex = 0;
  SMART_APOS_RE.lastIndex = 0;
  FULLWIDTH_RE.lastIndex = 0;
  
  // Fast path: test once with a combined regex (covers mid-string Unicode too)
  if (
    !SMART_QUOTE_RE.test(source) &&
    !SMART_APOS_RE.test(source) &&
    !FULLWIDTH_RE.test(source)
  ) {
    return source;
  }
  // Reset again after .test() calls
  SMART_QUOTE_RE.lastIndex = 0;
  SMART_APOS_RE.lastIndex = 0;
  FULLWIDTH_RE.lastIndex = 0;
  return source
    .replace(FULLWIDTH_RE, '$')
    .replace(SMART_QUOTE_RE, '"')
    .replace(SMART_APOS_RE, "'");
}

// ─────────────────────────────────────────────────────────────────────────────
// moo lexer rules (compiled once at module load)
// ─────────────────────────────────────────────────────────────────────────────
const MOO_RULES = {
  // Whitespace (skip silently)
  WS: { match: /[ \t]+/, lineBreaks: false },

  // Newline token (important for statement parsing)
  NEWLINE: { match: /\r?\n/, lineBreaks: true },

  // Comments (single-quote or REM keyword – skip body)
  COMMENT: {
    match: /(?:'|(?:[Rr][Ee][Mm](?=[ \t\n]|$)))[^\n]*/,
    lineBreaks: false,
  },

  // Hex literals  &Hxx
  HEX: { match: /&[Hh][0-9A-Fa-f]+/ },

  // Floating / integer numbers with optional type suffixes
  NUMBER: { match: /\d+(?:\.\d*)?(?:[eE][+-]?\d+)?[#!&%]?|\.\d+[#!&%]?/ },

  // String literals (QBasic escapes embedded quotes as "")
  STRING: { match: /"(?:[^"\n]|"")*"?/ },

  // Identifiers & keywords (case-insensitive via post-processing)
  IDENT: { match: /[A-Za-z_][A-Za-z0-9_]*[$%&!#]?/ },

  // Two-char operators first, then single-char
  OPERATOR: { match: /<=|>=|<>|[+\-*/^=<>\\]/ },

  // Punctuation
  PUNCTUATION: { match: /[(),;:#.]/ },

  // Anything else – skip unknown chars without crashing
  UNKNOWN: { match: /[^\s]/ },
};

const mooLexer = moo.compile(MOO_RULES);

// ─────────────────────────────────────────────────────────────────────────────
// Token class & Pool
// ─────────────────────────────────────────────────────────────────────────────
class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

const TokenPool = {
  _pool: [],
  _maxSize: 15000, // v1.5.3: Increased for larger files

  // Pre-allocate a batch to warm the pool
  _preallocated: false,
  _preallocate() {
    if (this._preallocated) return;
    this._preallocated = true;
    // v1.5.3: Reduced initial allocation to save memory
    for (let i = 0; i < 1500; i++) {
      this._pool.push(new Token('', '', 0, 0));
    }
  },

  acquire(type, value, line, col) {
    if (!this._preallocated) this._preallocate();
    if (this._pool.length > 0) {
      const t = this._pool.pop();
      t.type = type;
      t.value = value;
      t.line = line;
      t.col = col;
      return t;
    }
    return new Token(type, value, line, col);
  },

  releaseAll(tokens) {
    const free = this._maxSize - this._pool.length;
    const n = Math.min(tokens.length, free);
    for (let i = 0; i < n; i++) {
      tokens[i].value = '';
      this._pool.push(tokens[i]);
    }
  },

  clear() {
    this._pool.length = 0;
    this._preallocated = false;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FastLexer – public API (drop-in replacement for the old Lexer)
// ─────────────────────────────────────────────────────────────────────────────
class Lexer {
  /**
   * @param {string} source - QBasic source code
   */
  constructor(source) {
    this.src = normalise(source);
  }

  /**
   * Tokenise the source and return an array of Token objects.
   * @returns {Token[]}
   */
  tokenize() {
    mooLexer.reset(this.src);

    // Pre-allocate with a rough estimate (avg ~1 token per 6 chars)
    const estimated = Math.max(64, Math.floor(this.src.length / 6));
    const tokens = new Array(estimated);
    let count = 0;

    for (const mTok of mooLexer) {
      let type, value;
      const raw = mTok.value;
      const line = mTok.line;
      const col = mTok.col;

      switch (mTok.type) {
        case 'WS':
        case 'UNKNOWN':
          // Silently skip whitespace and unknown chars
          continue;

        case 'COMMENT':
          // Skip comments entirely
          continue;

        case 'NEWLINE':
          type = TokenType.NEWLINE;
          value = '\n';
          break;

        case 'NUMBER':
          type = TokenType.NUMBER;
          value = raw;
          break;

        case 'HEX': {
          // Convert &Hxx → decimal string
          type = TokenType.NUMBER;
          const hexDigits = raw.slice(2); // strip &H
          value = String(parseInt(hexDigits, 16) || 0);
          break;
        }

        case 'STRING':
          // Strip surrounding quotes (moo includes them)
          type = TokenType.STRING;
          value = raw.startsWith('"')
            ? raw
              .slice(1, raw.endsWith('"') ? -1 : undefined)
              .replace(/""/g, '"')
            : raw;
          break;

        case 'IDENT': {
          // Flyweight: uppercase keywords are interned in KEYWORDS Set
          const upper = raw.toUpperCase();
          if (KEYWORDS.has(upper)) {
            type = TokenType.KEYWORD;
            value = upper; // interned canonical form
          } else {
            type = TokenType.IDENTIFIER;
            value = raw;
          }
          break;
        }

        case 'OPERATOR':
          type = TokenType.OPERATOR;
          value = raw;
          break;

        case 'PUNCTUATION':
          type = TokenType.PUNCTUATION;
          value = raw;
          break;

        default:
          // Safety net – should not happen
          continue;
      }

      // Grow array only when needed (rare)
      if (count >= tokens.length) tokens.length = count * 2;
      tokens[count++] = TokenPool.acquire(type, value, line, col);
    }

    // Append EOF sentinel
    if (count >= tokens.length) tokens.length = count + 1;
    tokens[count++] = TokenPool.acquire(
      TokenType.EOF,
      '',
      mooLexer.line,
      mooLexer.col,
    );

    tokens.length = count;
    return tokens;
  }
}

module.exports = Lexer;
module.exports.TokenPool = TokenPool;
