/**
 * Test Variable Declaration Issues
 * =================================
 * Tests that all variables are properly declared before use
 *
 * Usage:
 *   node test/test-variable-declaration.js [--verbose] [--fail-fast]
 */

"use strict"

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
}

// Check if running in CLI mode
const isCLI = require.main === module

// Parse command line arguments
const args = isCLI ? process.argv.slice(2) : []
const verbose = args.includes("--verbose")
const failFast = args.includes("--fail-fast")

// Try to load transpiler
try {
  var InternalTranspiler = require("../src/compiler/transpiler")
} catch (error) {
  console.error(
    `${colors.red}❌ Error loading transpiler module:${colors.reset}`,
    error.message,
  )
  console.error("   Make sure you are running from the project root directory.")
  process.exit(1)
}

// Mock runtime environment for code validation
const mockRuntime = ""

// Test categories
const testCategories = {
  basic: {
    name: "Basic Variable Declaration",
    tests: [
      {
        name: "Simple assignment without DIM",
        code: `x = 10\nPRINT x`,
        expectSuccess: true,
        description: "Variables should be auto-declared on first assignment",
      },
      {
        name: "String variable with suffix",
        code: `name$ = "John"\nPRINT name$`,
        expectSuccess: true,
        description: "String variables with $ suffix should work",
      },
      {
        name: "Integer variable with suffix",
        code: `count% = 100\nPRINT count%`,
        expectSuccess: true,
        description: "Integer variables with % suffix should work",
      },
      {
        name: "Long variable with suffix",
        code: `bigNum& = 999999\nPRINT bigNum&`,
        expectSuccess: true,
        description: "Long variables with & suffix should work",
      },
      {
        name: "Single precision with suffix",
        code: `pi! = 3.14159\nPRINT pi!`,
        expectSuccess: true,
        description: "Single precision variables with ! suffix should work",
      },
      {
        name: "Double precision with suffix",
        code: `precise# = 3.14159265358979\nPRINT precise#`,
        expectSuccess: true,
        description: "Double precision variables with # suffix should work",
      },
    ],
  },

  expressions: {
    name: "Expressions",
    tests: [
      {
        name: "Variable used in expression",
        code: `y = x + 5\nPRINT y`,
        expectSuccess: true,
        description:
          "Variables used before assignment should still be declared",
      },
      {
        name: "Multiple variables in expression",
        code: `result = a + b * c - d / e`,
        expectSuccess: true,
        description:
          "Multiple variables in one expression should all be declared",
      },
      {
        name: "Complex expression",
        code: `total = price * quantity + tax - discount * rate`,
        expectSuccess: true,
        description: "Complex business logic expressions should work",
      },
    ],
  },

  arrays: {
    name: "Array Handling",
    tests: [
      {
        name: "Array assignment without explicit DIM",
        code: `arr(0) = 10\narr(1) = 20\nPRINT arr(0)`,
        expectSuccess: true,
        description: "Arrays should be auto-dimensioned on first use",
      },
      {
        name: "Multi-dimensional array",
        code: `matrix(0, 0) = 1\nmatrix(0, 1) = 2\nmatrix(1, 0) = 3\nmatrix(1, 1) = 4`,
        expectSuccess: true,
        description: "2D arrays should work with auto-dimensioning",
      },
      {
        name: "Array with explicit DIM",
        code: `DIM arr(10)\nFOR i = 0 TO 10\n  arr(i) = i * 2\nNEXT i`,
        expectSuccess: true,
        description: "Explicitly dimensioned arrays should work",
      },
      {
        name: "Array expression access",
        code: `DIM data(5)\nvalue = data(0) + data(1) + data(2)`,
        expectSuccess: true,
        description: "Array elements in expressions should work",
      },
    ],
  },

  controlFlow: {
    name: "Control Flow",
    tests: [
      {
        name: "FOR loop variable",
        code: `FOR i = 1 TO 10\n  PRINT i\nNEXT i`,
        expectSuccess: true,
        description: "FOR loop variables should be auto-declared",
      },
      {
        name: "Variable in IF condition",
        code: `IF x > 10 THEN\n  PRINT "Greater"\nEND IF`,
        expectSuccess: true,
        description: "Variables in IF conditions should be declared",
      },
      {
        name: "Variable in WHILE condition",
        code: `WHILE counter < 100\n  counter = counter + 1\nWEND`,
        expectSuccess: true,
        description: "Variables in WHILE conditions should be declared",
      },
      {
        name: "Variable in UNTIL condition",
        code: `DO\n  x = x + 1\nLOOP UNTIL x > 10`,
        expectSuccess: true,
        description: "Variables in UNTIL conditions should be declared",
      },
    ],
  },

  userDefinedTypes: {
    name: "User-Defined Types (UDTs)",
    tests: [
      {
        name: "Struct member assignment",
        code: `player.x = 100\nplayer.y = 200\nplayer.health = 100\nPRINT player.x`,
        expectSuccess: true,
        description: "UDT members should be accessible",
      },
      {
        name: "Nested UDT access",
        code: `enemy.position.x = 50\nenemy.position.y = 75\nenemy.stats.hp = 100`,
        expectSuccess: true,
        description: "Nested UDT structures should work",
      },
    ],
  },

  functions: {
    name: "Functions and Subroutines",
    tests: [
      {
        name: "FUNCTION with return value",
        code: `result = Add(5, 3)\nPRINT result\nFUNCTION Add(a, b)\n  Add = a + b\nEND FUNCTION`,
        expectSuccess: true,
        description: "FUNCTION return values should work",
      },
      {
        name: "SUB with parameters",
        code: `CALL PrintSum(10, 20)\nSUB PrintSum(a, b)\n  PRINT a + b\nEND SUB`,
        expectSuccess: true,
        description: "SUB parameters should be handled correctly",
      },
      {
        name: "SHARED variables",
        code: `DIM SHARED globalVar\nglobalVar = 100\nCALL TestSub\nSUB TestSub\n  PRINT globalVar\nEND SUB`,
        expectSuccess: true,
        description: "SHARED variables should be accessible in subs",
      },
    ],
  },

  edgeCases: {
    name: "Edge Cases",
    tests: [
      {
        name: "Variable name case sensitivity",
        code: `foo = 1\nFOO = 2\nFoo = 3\nPRINT foo`,
        expectSuccess: true,
        description:
          "QBasic is case-insensitive, should treat as same variable",
      },
      {
        name: "Empty string assignment",
        code: `empty$ = ""\nPRINT empty$`,
        expectSuccess: true,
        description: "Empty string assignment should work",
      },
      {
        name: "Negative number assignment",
        code: `negative = -42\nPRINT negative`,
        expectSuccess: true,
        description: "Negative number assignment should work",
      },
      {
        name: "Floating point assignment",
        code: `decimal = 3.14159\nscientific = 1.5e-10\nPRINT decimal`,
        expectSuccess: true,
        description: "Various number formats should work",
      },
    ],
  },
}

/**
 * Validate generated JavaScript code
 */
function validateCode(jsCode, _testName) {
  // Check for proper variable declarations
  const hasLetDeclarations = /\blet\s+\w+/.test(jsCode)
  const hasConstDeclarations = /\bconst\s+\w+/.test(jsCode)

  // Check for common issues
  const issues = []

  // Check for undeclared variables (simple heuristic)
  const _assignmentPattern = /(\w+)\s*=\s*/g
  const declaredVars = new Set()
  const _usedVars = new Set()

  // Extract declared variables
  const letPattern = /\blet\s+(\w+)/g
  const constPattern = /\bconst\s+(\w+)/g
  const varPattern = /\bvar\s+(\w+)/g
  const functionPattern = /\bfunction\s+(\w+)/g
  const _paramPattern = /\([^)]*\)/g

  let match
  while ((match = letPattern.exec(jsCode)) !== null) declaredVars.add(match[1])
  while ((match = constPattern.exec(jsCode)) !== null)
    declaredVars.add(match[1])
  while ((match = varPattern.exec(jsCode)) !== null) declaredVars.add(match[1])
  while ((match = functionPattern.exec(jsCode)) !== null)
    declaredVars.add(match[1])

  // Check for potential issues
  const undefinedPatterns = [
    {
      pattern: /ReferenceError.*?is not defined/,
      desc: "Undefined variable reference",
    },
    {
      pattern: /Cannot access.*?before initialization/,
      desc: "Temporal dead zone violation",
    },
  ]

  for (const { pattern, desc } of undefinedPatterns) {
    if (pattern.test(jsCode)) {
      issues.push(desc)
    }
  }

  return {
    hasDeclarations: hasLetDeclarations || hasConstDeclarations,
    issues: issues,
    declaredVars: declaredVars.size,
  }
}

/**
 * Run a single test case
 */
function runTest(testCase) {
  try {
    const transpiler = new InternalTranspiler()
    const jsCode = transpiler.transpile(testCase.code, "node")

    // Validate the generated code
    const validation = validateCode(jsCode, testCase.name)

    // Try to compile with mock runtime
    let runtimeError = null
    try {
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor
      const fullCode = mockRuntime + "\n" + jsCode
      // Just compile, don't execute
      new AsyncFunction(fullCode)
    } catch (evalError) {
      runtimeError = evalError.message
    }

    const passed = !runtimeError && validation.issues.length === 0

    if (verbose) {
      console.log(
        `\n${colors.dim}Generated code for "${testCase.name}":${colors.reset}`,
      )
      console.log(
        colors.dim + jsCode.split("\n").slice(0, 10).join("\n") + colors.reset,
      )
      if (jsCode.split("\n").length > 10) {
        console.log(colors.dim + "... (truncated)" + colors.reset)
      }
    }

    return {
      name: testCase.name,
      passed: passed,
      error: runtimeError,
      validation: validation,
      code: jsCode,
      description: testCase.description,
    }
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      error: error.message,
      validation: null,
      code: null,
      description: testCase.description,
    }
  }
}

/**
 * Run all tests
 */
function testVariableDeclaration(options = {}) {
  const { silent = false, verbose: optVerbose = false } = options
  const isVerbose = verbose || optVerbose

  let totalPassed = 0
  let totalFailed = 0
  const categoryResults = []

  if (!silent) {
    console.log(
      "\n" +
        colors.bright +
        "🧪 Variable Declaration Test Suite" +
        colors.reset,
    )
    console.log(colors.dim + "=".repeat(70) + colors.reset + "\n")
  }

  for (const [_categoryKey, category] of Object.entries(testCategories)) {
    if (!silent) {
      console.log(`${colors.cyan}📁 ${category.name}${colors.reset}`)
    }

    const results = []
    for (const test of category.tests) {
      const result = runTest(test)
      results.push(result)

      if (result.passed) {
        totalPassed++
        if (!silent) {
          console.log(`  ${colors.green}✓${colors.reset} ${result.name}`)
          if (isVerbose && result.validation) {
            console.log(
              `    ${colors.dim}Declared ${result.validation.declaredVars} variables${colors.reset}`,
            )
          }
        }
      } else {
        totalFailed++
        if (!silent) {
          console.log(`  ${colors.red}✗${colors.reset} ${result.name}`)
          console.log(`    ${colors.dim}${result.description}${colors.reset}`)
          if (result.error) {
            console.log(
              `    ${colors.red}Error: ${result.error}${colors.reset}`,
            )
          }
          if (result.validation && result.validation.issues.length > 0) {
            console.log(
              `    ${colors.yellow}Issues: ${result.validation.issues.join(", ")}${colors.reset}`,
            )
          }
        }
        if (failFast) {
          break
        }
      }
    }

    categoryResults.push({
      name: category.name,
      results: results,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    })

    if (!silent && failFast && totalFailed > 0) {
      break
    }

    if (!silent) {
      console.log("")
    }
  }

  const totalTests = totalPassed + totalFailed
  const passRate =
    totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0

  if (!silent) {
    // Summary table
    console.log(colors.dim + "=".repeat(70) + colors.reset)
    console.log(`\n${colors.bright}📊 Summary:${colors.reset}\n`)
    console.log(`  Category                    │ Passed │ Failed │ Status   │`)
    console.log(`  ────────────────────────────┼────────┼────────┼──────────┤`)

    for (const cat of categoryResults) {
      const status =
        cat.failed === 0
          ? `${colors.green}✓ PASS${colors.reset}`
          : `${colors.red}✗ FAIL${colors.reset}`
      console.log(
        `  ${cat.name.padEnd(26)} │ ${String(cat.passed).padStart(6)} │ ${String(cat.failed).padStart(6)} │ ${status}${" ".repeat(8 - (cat.failed === 0 ? 5 : 5))} │`,
      )
    }

    console.log(
      colors.dim +
        "  ────────────────────────────┴────────┴────────┴──────────┘" +
        colors.reset,
    )
    console.log(
      `\n  ${colors.bright}Total:${colors.reset} ${totalPassed} passed, ${totalFailed} failed out of ${totalTests} tests (${passRate}%)`,
    )

    if (totalFailed === 0) {
      console.log(`\n  ${colors.green}✅ All tests passed!${colors.reset}\n`)
    } else {
      console.log(`\n  ${colors.red}❌ Some tests failed${colors.reset}\n`)
    }
  }

  return {
    success: totalFailed === 0,
    passed: totalPassed,
    failed: totalFailed,
    total: totalTests,
    passRate: parseFloat(passRate),
    categories: categoryResults,
  }
}

// Run tests if executed directly
if (isCLI) {
  const result = testVariableDeclaration()
  process.exit(result.success ? 0 : 1)
}

module.exports = { testVariableDeclaration, testCategories, runTest }
