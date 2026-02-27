/**
 * QBasic Nexus - Compiler Performance Benchmark
 * ==============================================
 * Tests compiler performance improvements with detailed metrics
 *
 * Usage:
 *   node test/benchmark-compiler.js [--json] [--iterations=N] [--warmup]
 *
 * Options:
 *   --json          Export results as JSON
 *   --iterations=N  Set number of iterations (default: 100)
 *   --warmup        Perform warmup runs before benchmarking
 */

"use strict"

const fs = require("fs")
const path = require("path")

// Check if running in CLI mode
const isCLI = require.main === module

// Parse command line arguments
const args = isCLI ? process.argv.slice(2) : []
const shouldExportJSON = args.includes("--json")
const warmupRuns = args.includes("--warmup") ? 10 : 0
const iterationsArg = args.find((arg) => arg.startsWith("--iterations="))
const DEFAULT_ITERATIONS = iterationsArg
  ? parseInt(iterationsArg.split("=")[1], 10)
  : 100

// Try to load compiler modules
let Lexer, InternalTranspiler

try {
  Lexer = require("../src/compiler/lexer")
  InternalTranspiler = require("../src/compiler/transpiler")
} catch (error) {
  console.error("❌ Error loading compiler modules:", error.message)
  console.error("   Make sure you are running from the project root directory.")
  process.exit(1)
}

// Sample QBasic programs for benchmarking
const testPrograms = {
  small: {
    name: "Small Program",
    description: "Basic PRINT and FOR loop",
    code: `
      CLS
      PRINT "Hello, World!"
      FOR i = 1 TO 10
        PRINT i
      NEXT i
    `,
  },

  medium: {
    name: "Medium Program",
    description: "Arrays and SUB calls",
    code: `
      CLS
      DIM arr(100)
      FOR i = 0 TO 100
        arr(i) = i * 2
      NEXT i
      
      SUB Calculate(x, y)
        result = x + y
        PRINT result
      END SUB
      
      FOR i = 0 TO 100
        CALL Calculate(arr(i), i)
      NEXT i
    `,
  },

  large: {
    name: "Large Program",
    description: "Complex graphics simulation",
    code: `
      ' Complex QBasic program
      CLS
      SCREEN 12
      
      DIM SHARED points(1000, 2)
      DIM colors(16)
      
      ' Initialize data
      FOR i = 0 TO 1000
        points(i, 0) = RND * 640
        points(i, 1) = RND * 480
      NEXT i
      
      FOR i = 0 TO 15
        colors(i) = i
      NEXT i
      
      ' Main loop
      FOR frame = 1 TO 100
        CLS
        
        FOR i = 0 TO 1000
          x = points(i, 0)
          y = points(i, 1)
          c = colors(i MOD 16)
          
          PSET (x, y), c
          
          ' Update position
          points(i, 0) = points(i, 0) + (RND - 0.5) * 5
          points(i, 1) = points(i, 1) + (RND - 0.5) * 5
          
          ' Wrap around
          IF points(i, 0) < 0 THEN points(i, 0) = 640
          IF points(i, 0) > 640 THEN points(i, 0) = 0
          IF points(i, 1) < 0 THEN points(i, 1) = 480
          IF points(i, 1) > 480 THEN points(i, 1) = 0
        NEXT i
        
        _LIMIT 60
      NEXT frame
      
      SUB DrawCircle(cx, cy, radius, col)
        FOR angle = 0 TO 360 STEP 5
          x = cx + radius * COS(angle * 3.14159 / 180)
          y = cy + radius * SIN(angle * 3.14159 / 180)
          PSET (x, y), col
        NEXT angle
      END SUB
      
      FUNCTION Distance(x1, y1, x2, y2)
        dx = x2 - x1
        dy = y2 - y1
        Distance = SQR(dx * dx + dy * dy)
      END FUNCTION
    `,
  },

  stress: {
    name: "Stress Test",
    description: "Maximum complexity with nested structures",
    code: `
      ' Stress test with deeply nested structures
      DIM SHARED globalArray(100, 100)
      
      FOR i = 0 TO 100
        FOR j = 0 TO 100
          globalArray(i, j) = i * j
        NEXT j
      NEXT i
      
      FOR outer = 1 TO 50
        IF outer MOD 2 = 0 THEN
          FOR inner = 1 TO 20
            SELECT CASE inner MOD 3
              CASE 0
                GOSUB Subroutine1
              CASE 1
                GOSUB Subroutine2
              CASE ELSE
                GOSUB Subroutine3
            END SELECT
          NEXT inner
        ELSE
          WHILE counter < 100
            counter = counter + 1
            result = Factorial(counter MOD 10)
          WEND
        END IF
      NEXT outer
      
      Subroutine1:
        RETURN
      
      Subroutine2:
        RETURN
      
      Subroutine3:
        RETURN
      
      FUNCTION Factorial(n)
        IF n <= 1 THEN
          Factorial = 1
        ELSE
          Factorial = n * Factorial(n - 1)
        END IF
      END FUNCTION
      
      FUNCTION Fibonacci(n)
        IF n <= 1 THEN
          Fibonacci = n
        ELSE
          Fibonacci = Fibonacci(n - 1) + Fibonacci(n - 2)
        END IF
      END FUNCTION
    `,
  },
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (!isFinite(bytes) || bytes === 0) return "0 B"
  const abs = Math.abs(bytes)
  const sign = bytes < 0 ? "-" : ""
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(abs) / Math.log(k))
  return sign + parseFloat((abs / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values, mean) {
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length
  return Math.sqrt(variance)
}

/**
 * Progress bar helper
 */
function _createProgressBar(total, width = 30) {
  return (current) => {
    const percentage = Math.round((current / total) * 100)
    const filled = Math.round((width * current) / total)
    const empty = width - filled
    const bar = "█".repeat(filled) + "░".repeat(empty)
    process.stdout.write(`\r  [${bar}] ${percentage}%`)
  }
}

/**
 * Benchmark a single compilation
 */
function benchmarkCompile(source, iterations = 100, warmup = 0) {
  const times = {
    lexer: [],
    parser: [],
    total: [],
  }

  // Perform warmup runs
  if (warmup > 0) {
    for (let i = 0; i < warmup; i++) {
      const lexer = new Lexer(source)
      lexer.tokenize()
      const transpiler = new InternalTranspiler()
      transpiler.transpile(source, "web")
    }
  }

  // Track memory usage
  const memBefore = process.memoryUsage()

  // Main benchmark loop
  for (let i = 0; i < iterations; i++) {
    // Lexer benchmark
    const lexerStart = process.hrtime.bigint()
    const lexer = new Lexer(source)
    const _tokens = lexer.tokenize()
    const lexerEnd = process.hrtime.bigint()
    times.lexer.push(Number(lexerEnd - lexerStart) / 1000000) // Convert to ms

    // Parser benchmark (full transpilation)
    const parserStart = process.hrtime.bigint()
    const transpiler = new InternalTranspiler()
    const _code = transpiler.transpile(source, "web")
    const parserEnd = process.hrtime.bigint()
    times.parser.push(Number(parserEnd - parserStart) / 1000000)

    times.total.push(times.lexer[i] + times.parser[i])
  }

  const memAfter = process.memoryUsage()

  // Calculate statistics
  const stats = {}
  for (const [phase, values] of Object.entries(times)) {
    const sorted = [...values].sort((a, b) => a - b)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    stats[phase] = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      mean: mean,
      stdDev: calculateStdDev(values, mean),
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  // Memory stats
  stats.memory = {
    heapUsed: memAfter.heapUsed - memBefore.heapUsed,
    heapTotal: memAfter.heapTotal - memBefore.heapTotal,
    external: memAfter.external - memBefore.external,
  }

  return stats
}

/**
 * Run all benchmarks
 */
function runBenchmarks(options = {}) {
  const {
    iterations = DEFAULT_ITERATIONS,
    warmup = warmupRuns,
    exportJSON = shouldExportJSON,
    silent = false,
  } = options

  const results = []
  const startTime = Date.now()

  if (!silent) {
    console.log("\n🚀 QBasic Nexus Compiler Performance Benchmark\n")
    console.log("=".repeat(70))
    console.log(
      `Configuration: ${iterations} iterations${warmup > 0 ? `, ${warmup} warmup runs` : ""}`,
    )
    console.log("=".repeat(70))
  }

  for (const [key, program] of Object.entries(testPrograms)) {
    if (!silent) {
      console.log(`\n📊 Testing ${program.name} (${program.description})`)
      console.log(`   Source size: ${program.code.length} characters`)
      console.log("-".repeat(70))
    }

    const stats = benchmarkCompile(program.code, iterations, warmup)

    if (!silent) {
      // Display results in a table-like format
      console.log(
        "\n  Phase         │   Mean    │  Median   │   Min    │   Max    │  StdDev  │",
      )
      console.log(
        "  ──────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤",
      )

      for (const phase of ["lexer", "parser", "total"]) {
        const s = stats[phase]
        const phaseName =
          phase.charAt(0).toUpperCase() + phase.slice(1).padEnd(9)
        console.log(
          `  ${phaseName} │ ${s.mean.toFixed(3).padStart(7)}ms │ ${s.median.toFixed(3).padStart(7)}ms │ ${s.min.toFixed(3).padStart(6)}ms │ ${s.max.toFixed(3).padStart(6)}ms │ ${s.stdDev.toFixed(3).padStart(6)}ms │`,
        )
      }

      // Percentile info
      console.log("\n  Percentiles (Total):")
      console.log(
        `    P95: ${stats.total.p95.toFixed(3)}ms | P99: ${stats.total.p99.toFixed(3)}ms`,
      )

      // Throughput
      const throughput = (program.code.length / stats.total.mean) * 1000 // chars/sec
      console.log(`\n  ⚡ Throughput: ${(throughput / 1000).toFixed(2)} KB/s`)
      console.log(
        `  📈 Compilation rate: ${(1000 / stats.total.mean).toFixed(0)} compiles/sec`,
      )

      // Memory
      console.log(`  💾 Memory used: ${formatBytes(stats.memory.heapUsed)}`)
    }

    results.push({
      name: program.name,
      key: key,
      sourceSize: program.code.length,
      stats: stats,
    })
  }

  const totalTime = Date.now() - startTime

  if (!silent) {
    console.log("\n" + "=".repeat(70))
    console.log(`✅ Benchmark complete in ${(totalTime / 1000).toFixed(2)}s`)

    if (exportJSON) {
      const outputPath = path.join(process.cwd(), "benchmark-results.json")
      const jsonOutput = {
        timestamp: new Date().toISOString(),
        configuration: {
          iterations,
          warmup,
          nodeVersion: process.version,
          platform: process.platform,
        },
        results: results,
        totalTime: totalTime,
      }
      fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2))
      console.log(`\n📄 Results exported to: ${outputPath}`)
    }
    console.log("")
  }

  return results
}

// Run benchmarks if executed directly
if (isCLI) {
  runBenchmarks()
}

module.exports = { benchmarkCompile, runBenchmarks, testPrograms }
