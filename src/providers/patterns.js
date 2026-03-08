/**
 * QBasic Nexus - Provider: Regex Patterns
 * Shared regex patterns used across all providers.
 *
 * IMPORTANT — Global regex (/g or /gi) are NOT stored here as live RegExp
 * objects because global regex maintains stateful `lastIndex`. Storing a shared
 * stateful regex in a module-level singleton causes inter-call corruption when
 * multiple providers use the same pattern.
 *
 * Rule:
 *  - Non-global patterns (no /g):  stored as RegExp → safe to share (no state).
 *  - Global patterns (/g or /gi):  stored as SOURCE strings → callers must call
 *    `new RegExp(PATTERN_SRC.xxx, flags)` to get an independent instance.
 */

'use strict';

// ── Non-global patterns — safe to share directly ─────────────────────────────
const PATTERNS = Object.freeze({
  SUB_DEF: /^\s*(?:DECLARE\s+)?(SUB|FUNCTION)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
  TYPE_DEF: /^\s*TYPE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
  CONST_DEF: /^\s*CONST\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/i,
  LABEL: /^([a-zA-Z_][a-zA-Z0-9_]*):/,
  COMMENT: /^\s*(?:'|REM\b)/i,
  DECLARE: /^\s*DECLARE\s+/i,
  BLOCK_START:
    /^\s*(?:SUB|FUNCTION|TYPE|IF\b.+\bTHEN\s*$|DO|FOR|SELECT|WHILE)\b/i,
  BLOCK_END: /^\s*(?:END\s+(?:SUB|FUNCTION|TYPE|IF|SELECT)|LOOP|NEXT|WEND)\b/i,
  BLOCK_MID: /^\s*(?:ELSE|ELSEIF|CASE)\b/i,
  IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_$%!#&]*/,
});

const IDENTIFIER_CHAR_CLASS = 'A-Za-z0-9_$%!#&';

// ── Global pattern SOURCES — callers must create `new RegExp(src, flags)` ────
// Keeping only the source prevents lastIndex state from leaking across calls.
const PATTERN_SRC = Object.freeze({
  DIM: String.raw`\bDIM\s+(?:SHARED\s+)?([a-zA-Z_][a-zA-Z0-9_$%!#&]*)`,
  ASSIGN: String.raw`\b([a-zA-Z_][a-zA-Z0-9_$%!#&]*)\s*=`,
  WORD: String.raw`[a-zA-Z_][a-zA-Z0-9_$%!#&]*`,
});

// Convenience factory helpers ─────────────────────────────────────────────────
/**
 * Create a fresh DIM-scanning regex.
 * @returns {RegExp}  global, case-insensitive
 */
function makeDimRegex() {
  return new RegExp(PATTERN_SRC.DIM, 'gi');
}

/**
 * Create a fresh assignment-scanning regex.
 * @returns {RegExp}  global
 */
function makeAssignRegex() {
  return new RegExp(PATTERN_SRC.ASSIGN, 'g');
}

/**
 * Create a fresh word-scanning regex.
 * @returns {RegExp}  global
 */
function makeWordRegex() {
  return new RegExp(PATTERN_SRC.WORD, 'g');
}

// Shared utility: escape special regex characters in a string
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeIdentifierRegex(identifier, flags = 'g') {
  return new RegExp(
    `(?<![${IDENTIFIER_CHAR_CLASS}])${escapeRegex(identifier)}(?![${IDENTIFIER_CHAR_CLASS}])`,
    flags,
  );
}

module.exports = {
  PATTERNS,
  PATTERN_SRC,
  IDENTIFIER_CHAR_CLASS,
  escapeRegex,
  makeDimRegex,
  makeAssignRegex,
  makeIdentifierRegex,
  makeWordRegex,
};
