/**
 * QBasic Nexus - Core Transpiler / Parser Assembled
 */

"use strict"

const { TokenType, BUILTIN_FUNCS } = require("../constants")
const Lexer = require("../lexer")
const { TokenPool } = require("../lexer")

class Parser {
  constructor(tokens, target = "node") {
    // Call the initialized method that we mapped from core.js
    if (this._init) {
      this._init(tokens, target)
    }
  }
}

function mixin(target, ...sources) {
  for (const source of sources) {
    Object.defineProperties(target, Object.getOwnPropertyDescriptors(source))
  }
}

mixin(
  Parser.prototype,
  require("./core"),
  require("./expressions"),
  require("./io"),
  require("./graphics"),
  require("./system"),
  require("./types"),
  require("./statements"),
)

class InternalTranspiler {
  /**
   * Transpiles QBasic source code to JavaScript.
   * @param {string} source - QBasic source code.
   * @param {string} target - 'node' or 'web'.
   * @returns {string} Generated JavaScript code.
   */
  transpile(source, target = "node") {
    // Input validation
    if (source === null || source === undefined) {
      return "// Empty source"
    }
    if (typeof source !== "string") {
      source = String(source)
    }
    if (source.trim().length === 0) {
      return "// Empty source"
    }

    // Validate target
    if (target !== "node" && target !== "web") {
      target = "web"
    }

    let tokens = null

    try {
      const lexer = new Lexer(source)
      tokens = lexer.tokenize()

      // Safety check for token array
      if (!Array.isArray(tokens) || tokens.length === 0) {
        return "// No tokens generated"
      }

      const parser = new Parser(tokens, target)
      const result = parser.parse()

      return result
    } catch (e) {
      console.error("[Transpiler] Compilation error:", e.message)
      return `// Compilation error: ${e.message}\nconsole.error("Compilation failed: ${e.message.replace(/"/g, '\\"')}");`
    } finally {
      if (tokens && typeof TokenPool?.releaseAll === "function") {
        TokenPool.releaseAll(tokens)
      }
    }
  }

  /**
   * Transpiles from a pre-tokenized array (zero-copy — used by Compiler).
   * Eliminates redundant tokenization when the caller already holds tokens.
   * @param {Array} tokens - Pre-built token array from Lexer.tokenize().
   * @param {string} target - 'node' or 'web'.
   * @returns {{ code: string, errors: Array }} Result object.
   */
  transpileTokens(tokens, target = "web") {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { code: "// No tokens generated", errors: [] }
    }
    if (target !== "node" && target !== "web") target = "web"
    try {
      const parser = new Parser(tokens, target)
      const code = parser.parse()
      return { code, errors: parser.errors || [] }
    } catch (e) {
      console.error(e.stack)
      return {
        code: `// Compilation error: ${e.message}`,
        errors: [{ line: 0, message: e.message, column: 0 }],
      }
    }
  }

  /**
   * Lints from a pre-tokenized array (zero-copy — used by IncrementalLinter).
   * @param {Array} tokens - Pre-built token array from Lexer.tokenize().
   * @returns {Array<{line: number, message: string, column: number}>}
   */
  lintTokens(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) return []
    try {
      const parser = new Parser(tokens, "node")
      parser.parse()
      return parser.errors || []
    } catch (e) {
      return [{ line: 0, message: `Parser error: ${e.message}`, column: 0 }]
    }
  }

  /**
   * Lints the QBasic source code for syntax errors.
   * @param {string} source - QBasic source code.
   * @returns {Array<{line: number, message: string, column: number}>} Array of errors.
   */
  lint(source) {
    // Input validation
    if (!source || typeof source !== "string" || source.trim().length === 0) {
      return []
    }
    let tokens = null

    try {
      const lexer = new Lexer(source)
      tokens = lexer.tokenize()
      // Delegate to lintTokens to avoid code duplication
      return this.lintTokens(tokens)
    } catch (e) {
      return [
        {
          line: 0,
          message: `Lexer/Parser error: ${e.message}`,
          column: 0,
        },
      ]
    } finally {
      if (tokens && typeof TokenPool?.releaseAll === "function") {
        TokenPool.releaseAll(tokens)
      }
    }
  }
}

module.exports = InternalTranspiler
