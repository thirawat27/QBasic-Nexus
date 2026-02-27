"use strict"

const assert = require("assert")
const { PATTERNS } = require("../src/providers/providerUtils")

// Minimal test suite for Provider Regex Patterns
console.log("🚀 Testing Provider Patterns...\n")

let passCount = 0
let failCount = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passCount++
  } catch (error) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   ${error.message}`)
    failCount++
  }
}

runTest("SUB_DEF Pattern correctly identifies SUB declarations", () => {
  const match = PATTERNS.SUB_DEF.exec("SUB MyGameLoop")
  assert.ok(match, "Should match 'SUB MyGameLoop'")
  assert.strictEqual(match[1].toUpperCase(), "SUB")
  assert.strictEqual(match[2], "MyGameLoop")
})

runTest("SUB_DEF Pattern correctly identifies FUNCTION declarations", () => {
  const match = PATTERNS.SUB_DEF.exec("FUNCTION CalculateScore (x, y)")
  assert.ok(match, "Should match 'FUNCTION CalculateScore (x, y)'")
  assert.strictEqual(match[1].toUpperCase(), "FUNCTION")
  assert.strictEqual(match[2], "CalculateScore")
})

runTest("DIM Pattern correctly identifies variables", () => {
  // Reset lastIndex for global regex
  PATTERNS.DIM.lastIndex = 0
  const match = PATTERNS.DIM.exec("DIM SHARED playerX AS INTEGER")
  assert.ok(match, "Should match 'DIM SHARED playerX AS INTEGER'")
  assert.strictEqual(match[1], "playerX")
})

runTest("COMMENT Pattern correctly identifies comments", () => {
  assert.ok(
    PATTERNS.COMMENT.test("' This is a comment"),
    "Should match ' prefix",
  )
  assert.ok(
    PATTERNS.COMMENT.test("REM This is also a comment"),
    "Should match REM prefix",
  )
  assert.ok(
    !PATTERNS.COMMENT.test("PRINT 'Hello'"),
    "Should not match inline comment without preceding space constraint or as first in string if it's meant to be block comment",
  )
})

console.log("\n" + "=".repeat(40))
console.log(`🎯 Test Results: ${passCount} Passed, ${failCount} Failed`)

if (failCount > 0) {
  process.exit(1)
}
