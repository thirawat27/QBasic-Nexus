/**
 * Compiler wrapper that provides a unified interface for QBasic compilation
 * Integrates lexer, transpiler, caching, and error recovery systems
 */

"use strict"

const Lexer = require("./lexer")
const workerManager = require("./WorkerManager")
const { getGlobalCache } = require("./cache")
const { DiagnosticCollector, ErrorCategory } = require("./diagnostics")
const vm = require("vm")

// Default compilation options
const DEFAULT_OPTIONS = {
  target: "web",
  cache: true,
  strictMode: false,
  optimizationLevel: 2,
  sourceMap: false,
  maxErrors: 100,
}

// Encapsulates the result of a compilation including code, diagnostics, and metadata
class CompilationResult {
  constructor(code, diagnostics, metadata = {}) {
    this.code = code
    this.diagnostics = diagnostics
    this.metadata = metadata
    this.success = !diagnostics.hasErrors()
  }

  isSuccess() {
    return this.success
  }

  getCode() {
    return this.code
  }

  getDiagnostics() {
    return this.diagnostics.getAll()
  }

  getErrors() {
    return this.diagnostics.getBySeverity("error")
  }

  getWarnings() {
    return this.diagnostics.getBySeverity("warning")
  }

  formatDiagnostics() {
    return this.diagnostics.format()
  }

  getMetadata() {
    return this.metadata
  }
}

// Main compiler class that orchestrates lexing, parsing, and code generation
class Compiler {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.cache = this.options.cache ? getGlobalCache() : null
    this.stats = {
      compilations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTime: 0,
      avgTime: 0,
    }
  }

  // Compiles QBasic source code to JavaScript, using cache when available
  async compile(source) {
    const startTime = process.hrtime.bigint()

    if (this.cache) {
      const cached = this.cache.getCode(source, this.options.target)
      if (cached) {
        this.stats.cacheHits++
        this.stats.compilations++

        const diagnostics = new DiagnosticCollector()
        for (const err of cached.errors || []) {
          diagnostics.add(err)
        }

        return new CompilationResult(cached.code, diagnostics, {
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
        })
      }
      this.stats.cacheMisses++
    }

    const diagnostics = new DiagnosticCollector()

    try {
      const lexerStart = process.hrtime.bigint()
      const lexer = new Lexer(source)
      const tokens = lexer.tokenize()
      const lexerTime = Number(process.hrtime.bigint() - lexerStart) / 1000000

      const parserStart = process.hrtime.bigint()
      const code = await workerManager.transpileAsync(
        source,
        this.options.target,
      )
      const parserTime = Number(process.hrtime.bigint() - parserStart) / 1000000

      // Add Acorn Validation to catch Transpiler bugs
      try {
        const acorn = require("acorn")
        acorn.parse(code, {
          ecmaVersion: 2022,
          sourceType: "script",
          locations: true,
          ranges: true,
          allowReturnOutsideFunction: true,
        })
      } catch (acornErr) {
        diagnostics.error(
          ErrorCategory.RUNTIME,
          `Transpiler generated invalid JavaScript: ${acornErr.message}`,
          acornErr.loc?.line || 1,
          acornErr.loc?.column || 0,
        )
      }

      const errors = await workerManager.lintAsync(source)
      for (const err of errors) {
        diagnostics.error(
          ErrorCategory.SYNTAX,
          err.message,
          err.line,
          err.column,
        )
      }

      // Step 2: Use SWC for ultra-fast transpilation, optimization, and minification
      let finalCode = code
      if (!diagnostics.hasErrors()) {
        try {
          const swc = require("@swc/core")
          const swcResult = await swc.transform(code, {
            jsc: {
              parser: { syntax: "ecmascript" },
              target: "es2022",
              minify: {
                compress: { unused: true, drop_console: false },
                mangle: true,
              },
            },
            minify: true,
            sourceMaps: false,
          })

          let optimizedCode = swcResult.code

          // Step 3: Bundle with esbuild (In-Memory)
          const esbuild = require("esbuild")
          const bundled = await esbuild.build({
            stdin: {
              contents: optimizedCode,
              loader: "js",
              resolveDir: process.cwd(),
            },
            bundle: true,
            minify: true,
            write: false,
            outfile: "out.js",
            target: "es2022",
            format: this.options.target === "node" ? "cjs" : "iife",
          })

          finalCode = bundled.outputFiles[0].text
        } catch (optimizeErr) {
          // Fallback to original code if optimization pipeline fails and log issue
          console.warn(
            "[QBasic Nexus] Optimization Pipeline failed",
            optimizeErr,
          )
        }
      }

      if (this.cache && !diagnostics.hasErrors()) {
        this.cache.setCode(
          source,
          this.options.target,
          finalCode,
          diagnostics.getAll(),
        )
      }

      const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000
      this.stats.compilations++
      this.stats.totalTime += totalTime
      this.stats.avgTime = this.stats.totalTime / this.stats.compilations

      return new CompilationResult(finalCode, diagnostics, {
        cached: false,
        lexerTime,
        parserTime,
        totalTime,
        tokenCount: tokens.length,
        lineCount: source.split("\n").length,
        sourceSize: source.length,
      })
    } catch (error) {
      diagnostics.error(
        ErrorCategory.RUNTIME,
        `Internal compiler error: ${error.message}`,
        1,
        0,
      )

      return new CompilationResult("", diagnostics, {
        cached: false,
        error: error.message,
      })
    }
  }

  // Compiles and immediately executes code (Node.js target only)
  async compileAndRun(source) {
    const result = await this.compile(source)

    if (!result.isSuccess()) {
      throw new Error("Compilation failed:\n" + result.formatDiagnostics())
    }

    if (this.options.target !== "node") {
      throw new Error("compileAndRun is only available for Node.js target")
    }

    // --- NATIVE V8 JIT EXECUTION ENGINE ---
    // Encapsulating the Javascript execution using V8's native Virtual Machine framework
    // This pre-compiles and optimizes the code akin to real native C++ runtime behavior
    const context = vm.createContext({
      require: require,
      console: console,
      process: process,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval,
      Buffer: Buffer,
      __dirname: __dirname,
      Error: Error,
      Math: Math,
      Date: Date,
    })

    const script = new vm.Script(result.getCode(), {
      filename: "QBasicNativeRuntime.js",
      produceCachedData: true,
      displayErrors: true,
    })

    // Execute directly in the native V8 Sandbox execution layer
    return await script.runInContext(context)
  }

  getStats() {
    const stats = { ...this.stats }

    if (this.cache) {
      stats.cache = this.cache.getStats()
    }

    return stats
  }

  clearCache() {
    if (this.cache) {
      this.cache.clear()
    }
  }

  resetStats() {
    this.stats = {
      compilations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTime: 0,
      avgTime: 0,
    }
  }

  formatStats() {
    const stats = this.getStats()
    const hitRate =
      stats.compilations > 0
        ? ((stats.cacheHits / stats.compilations) * 100).toFixed(2)
        : "0.00"

    return `
Compiler Statistics:
  Total Compilations: ${stats.compilations}
  Cache Hits: ${stats.cacheHits} (${hitRate}%)
  Cache Misses: ${stats.cacheMisses}
  Average Time: ${stats.avgTime.toFixed(3)} ms
  Total Time: ${stats.totalTime.toFixed(3)} ms
${
  stats.cache
    ? `
Cache Statistics:
  Hit Rate: ${stats.cache.hitRate}
  Token Cache: ${stats.cache.tokenCache.utilization}
  Code Cache: ${stats.cache.codeCache.utilization}
`
    : ""
}
        `.trim()
  }
}

// Convenience function for one-off compilation
async function compile(source, options = {}) {
  const compiler = new Compiler(options)
  return await compiler.compile(source)
}

// Convenience function for compile and execute in one step
async function compileAndRun(source, options = {}) {
  const compiler = new Compiler({ ...options, target: "node" })
  return await compiler.compileAndRun(source)
}

module.exports = {
  Compiler,
  CompilationResult,
  compile,
  compileAndRun,
  DEFAULT_OPTIONS,
}
