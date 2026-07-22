/**
 * QBasic Nexus - FastLexer
 *
 * Design:
 *  - Single sticky (`y`) master regex drives tokenization directly — one
 *    compiled pattern, no per-token match object (replaced the earlier moo
 *    driver, whose per-token allocation dominated GC time in profiles)
 *  - Lean TokenPool for object reuse (reduces GC pressure)
 *  - Zero-copy string slicing wherever possible
 *  - Identifier classification memoized (no toUpperCase per occurrence)
 *  - Flyweight pattern: keyword strings are interned via KEYWORDS Set
 */

'use strict';

const { TokenType, KEYWORDS } = require('./constants');

// ─────────────────────────────────────────────────────────────────────────────
// Pre-compiled character-level helpers (used in fallback only)
// ─────────────────────────────────────────────────────────────────────────────
const NORMALISE_RE = /[\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B\uFF04\uFE69]/g;

// Normalise Unicode curly quotes / fullwidth chars to ASCII once per compile
function normalise(source) {
  NORMALISE_RE.lastIndex = 0;
  if (!NORMALISE_RE.test(source)) return source;
  NORMALISE_RE.lastIndex = 0;
  return source.replace(NORMALISE_RE, (char) =>
    char === '\uFF04' || char === '\uFE69' ? '$' : char <= '\u201B' ? "'" : '"'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanner
//
// Previously the token stream was driven by `moo`, which allocated a match
// object for every token (and internally re-derived line/column). Profiling put
// moo's dispatch plus that per-token garbage among the hottest costs in the
// compiler. This is a single sticky (`y`) regex whose ordered alternatives are
// exactly the old moo rules, in the same order, so leftmost-longest resolution
// is preserved. Group index → token class; no per-token object is created.
//
// Rule order (group number):
//   1 WS   2 NEWLINE   3 COMMENT   4 HEX   5 NUMBER
//   6 STRING   7 IDENT   8 OPERATOR   9 PUNCTUATION   10 UNKNOWN
// ─────────────────────────────────────────────────────────────────────────────
const SCAN_RE =
  /([ \t]+)|(\r?\n)|((?:'|(?:[Rr][Ee][Mm](?=[ \t\n]|$)))[^\n]*)|(&[Hh][0-9A-Fa-f]+)|(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?[#!&%]?|\.\d+[#!&%]?)|("(?:[^"\n]|"")*"?)|([A-Za-z_][A-Za-z0-9_]*[$%&!#]?)|(<=|>=|<>|[+\-*/^=<>\\])|([(),;:#.])|([^\s])/y;

// Scanner-rule identifiers (match SCAN_RE group order).
const RULE_WS = 1;
const RULE_NEWLINE = 2;
const RULE_COMMENT = 3;
const RULE_HEX = 4;
const RULE_NUMBER = 5;
const RULE_STRING = 6;
const RULE_IDENT = 7;
const RULE_OPERATOR = 8;
const RULE_PUNCTUATION = 9;
const RULE_UNKNOWN = 10;

/** Identify which alternative of SCAN_RE matched. */
function matchedRule(m) {
  if (m[RULE_WS] !== undefined) return RULE_WS;
  if (m[RULE_NEWLINE] !== undefined) return RULE_NEWLINE;
  if (m[RULE_COMMENT] !== undefined) return RULE_COMMENT;
  if (m[RULE_HEX] !== undefined) return RULE_HEX;
  if (m[RULE_NUMBER] !== undefined) return RULE_NUMBER;
  if (m[RULE_STRING] !== undefined) return RULE_STRING;
  if (m[RULE_IDENT] !== undefined) return RULE_IDENT;
  if (m[RULE_OPERATOR] !== undefined) return RULE_OPERATOR;
  if (m[RULE_PUNCTUATION] !== undefined) return RULE_PUNCTUATION;
  return RULE_UNKNOWN;
}

// ─────────────────────────────────────────────────────────────────────────────
// Identifier classification cache
//
// Every IDENT token used to run `raw.toUpperCase()` purely to test keyword
// membership — one string allocation per identifier occurrence, and identifiers
// repeat constantly in real programs. Cache the classification per raw spelling:
// a hit is a single Map lookup and no allocation at all.
// ─────────────────────────────────────────────────────────────────────────────
const IDENT_CACHE = new Map();
const IDENT_CACHE_LIMIT = 8192;

/**
 * @param {string} raw - identifier exactly as it appears in the source
 * @returns {{keyword: boolean, value: string}} classification; `value` is the
 *   interned uppercase form for keywords and the original spelling otherwise
 */
function classifyIdentifier(raw) {
  const cached = IDENT_CACHE.get(raw);
  if (cached !== undefined) return cached;

  const upper = raw.toUpperCase();
  const entry = KEYWORDS.has(upper)
    ? { keyword: true, value: upper }
    : { keyword: false, value: raw };

  if (IDENT_CACHE.size >= IDENT_CACHE_LIMIT) IDENT_CACHE.clear();
  IDENT_CACHE.set(raw, entry);
  return entry;
}

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
  _maxSize: 15000, // Increased for larger files

  // Pre-allocate a batch to warm the pool
  _preallocated: false,
  _preallocate() {
    if (this._preallocated) return;
    this._preallocated = true;
    // Reduced initial allocation to save memory
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
    const src = this.src;
    const srcLength = src.length;

    // Pre-allocate with a rough estimate (avg ~1 token per 6 chars)
    const estimated = Math.max(64, Math.floor(srcLength / 6));
    const tokens = new Array(estimated);
    let count = 0;

    // Line/column tracking mirrors moo's 1-based scheme exactly: a token's
    // reported position is where it starts, and a NEWLINE advances the line.
    let pos = 0;
    let line = 1;
    let col = 1;

    while (pos < srcLength) {
      SCAN_RE.lastIndex = pos;
      const m = SCAN_RE.exec(src);

      // No rule matched at this position (e.g. a lone '\r'): skip the single
      // character and keep scanning. moo would have thrown here; skipping is
      // strictly safer for the extension host and cannot corrupt later tokens.
      if (m === null) {
        pos++;
        col++;
        continue;
      }

      const raw = m[0];
      const rule = matchedRule(m);
      const startLine = line;
      const startCol = col;

      // Advance position bookkeeping before emitting.
      if (rule === RULE_NEWLINE) {
        line++;
        col = 1;
      } else {
        col += raw.length;
      }
      pos = SCAN_RE.lastIndex;

      let type;
      let value;

      switch (rule) {
        case RULE_WS:
        case RULE_COMMENT:
        case RULE_UNKNOWN:
          // Silently skip whitespace, comments, and unknown chars.
          continue;

        case RULE_NEWLINE:
          type = TokenType.NEWLINE;
          value = '\n';
          break;

        case RULE_NUMBER:
          type = TokenType.NUMBER;
          value = raw;
          break;

        case RULE_HEX: {
          // Convert &Hxx → decimal string
          type = TokenType.NUMBER;
          const hexDigits = raw.slice(2); // strip &H
          value = String(parseInt(hexDigits, 16) || 0);
          break;
        }

        case RULE_STRING:
          // Strip surrounding quotes (the match includes them)
          type = TokenType.STRING;
          value = raw.startsWith('"')
            ? raw
              .slice(1, raw.endsWith('"') ? -1 : undefined)
              .replace(/""/g, '"')
            : raw;
          break;

        case RULE_IDENT: {
          // Flyweight: uppercase keywords are interned in KEYWORDS Set
          const classified = classifyIdentifier(raw);
          type = classified.keyword
            ? TokenType.KEYWORD
            : TokenType.IDENTIFIER;
          value = classified.value;
          break;
        }

        case RULE_OPERATOR:
          type = TokenType.OPERATOR;
          value = raw;
          break;

        case RULE_PUNCTUATION:
          type = TokenType.PUNCTUATION;
          value = raw;
          break;

        default:
          // Safety net – should not happen
          continue;
      }

      // Grow array only when needed (rare)
      if (count >= tokens.length) tokens.length = count * 2;
      tokens[count++] = TokenPool.acquire(type, value, startLine, startCol);
    }

    // Append EOF sentinel at the final scan position.
    if (count >= tokens.length) tokens.length = count + 1;
    tokens[count++] = TokenPool.acquire(TokenType.EOF, '', line, col);

    tokens.length = count;
    return tokens;
  }
}

module.exports = Lexer;
module.exports.TokenPool = TokenPool;
