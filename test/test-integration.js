"use strict"
/**
 * Final integration test - all Phase 1-3 components
 */
const { performance } = require("perf_hooks")
let passed = 0,
  failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

// ─── Phase 1: Lexer (moo-based) ──────────────────────────────────────────────
console.log("\n📦 Phase 1: Lexer (moo) Tests")
const Lexer = require("../src/compiler/lexer")

test("Lexer tokenizes PRINT", () => {
  const l = new Lexer('PRINT "Hello"')
  const t = l.tokenize()
  if (!t.some((tk) => tk.type === "KEYWORD" && tk.value === "PRINT"))
    throw new Error("Missing PRINT keyword token")
})

test("Lexer handles strings", () => {
  const l = new Lexer('PRINT "Hello, World!"')
  const t = l.tokenize()
  const strTok = t.find((tk) => tk.type === "STRING")
  if (!strTok || strTok.value !== "Hello, World!")
    throw new Error(`Bad string token: ${JSON.stringify(strTok)}`)
})

test("Lexer handles numbers", () => {
  const l = new Lexer("x = 3.14")
  const t = l.tokenize()
  if (!t.some((tk) => tk.type === "NUMBER" && tk.value === "3.14"))
    throw new Error("Missing numeric token")
})

test("Lexer handles HEX (&HFF)", () => {
  const l = new Lexer("x = &HFF")
  const t = l.tokenize()
  if (!t.some((tk) => tk.type === "NUMBER" && tk.value === "255"))
    throw new Error("HEX conversion failed")
})

test("Lexer strips comments", () => {
  const l = new Lexer("' comment\nPRINT 1")
  const t = l.tokenize()
  const hasComment = t.some((tk) => tk.value && tk.value.includes("comment"))
  if (hasComment) throw new Error("Comment was not stripped")
})

test("Lexer handles line tracking", () => {
  const l = new Lexer("PRINT 1\nPRINT 2")
  const t = l.tokenize()
  const line2Token = t.find((tk) => tk.line === 2 && tk.type === "KEYWORD")
  if (!line2Token) throw new Error("Line tracking broken")
})

// ─── Phase 1.3: Cache (TieredCache + FNV-1a) ────────────────────────────────
console.log("\n📦 Phase 1.3: Cache (TieredCache + FNV-1a) Tests")
const {
  CompilationCache,
  TieredCache,
  fnv1a,
  getGlobalCache,
} = require("../src/compiler/cache")

test("FNV-1a deterministic", () => {
  if (fnv1a("test") !== fnv1a("test")) throw new Error("Non-deterministic")
})

test("FNV-1a differentiates inputs", () => {
  if (fnv1a("abc") === fnv1a("def"))
    throw new Error("Hash collision on simple strings")
})

test("TieredCache L1 stores and retrieves", () => {
  const c = new TieredCache(5)
  c.set("k", "v")
  if (c.get("k") !== "v") throw new Error("L1 retrieval failed")
})

test("TieredCache returns null for missing", () => {
  const c = new TieredCache(5)
  if (c.get("missing") !== null) throw new Error("Should return null for miss")
})

test("TieredCache L2 promotion on L2 hit", () => {
  const c = new TieredCache(10)
  // Fill L1 past capacity (10 slots)
  for (let i = 0; i < 12; i++) c.set(`k${i}`, `v${i}`)
  // k0 should have been evicted from L1 but still in L2
  const val = c.get("k0")
  if (val === null) throw new Error("L2 miss: key should survive in L2")
})

test("CompilationCache getCode/setCode round-trip", () => {
  const cc = new CompilationCache({ maxSize: 10 })
  cc.setCode("SRC", "web", "JS_CODE", [])
  const res = cc.getCode("SRC", "web")
  if (!res || res.code !== "JS_CODE")
    throw new Error("Code cache round-trip failed")
})

test("CompilationCache respects enabled=false", () => {
  const cc = new CompilationCache({ enabled: false })
  cc.setCode("SRC", "web", "JS", [])
  if (cc.getCode("SRC", "web") !== null)
    throw new Error("Should return null when disabled")
})

// ─── Phase 2: Transpiler pipeline ────────────────────────────────────────────
console.log("\n📦 Phase 2: Transpiler Pipeline Tests")
const InternalTranspiler = require("../src/compiler/transpiler")
const { makeIdentifierRegex } = require("../src/providers/patterns")

test('Transpile PRINT "Hello"', () => {
  const t = new InternalTranspiler()
  const code = t.transpile('PRINT "Hello"', "node")
  if (!code || code.length === 0) throw new Error("Empty output")
})

test("Transpile FOR loop", () => {
  const t = new InternalTranspiler()
  const code = t.transpile("FOR i = 1 TO 3\nNEXT i", "node")
  if (!code.includes("for")) throw new Error("No for loop in output")
})

test("Lint returns array", () => {
  const t = new InternalTranspiler()
  const errors = t.lint('PRINT "OK"')
  if (!Array.isArray(errors)) throw new Error("Lint did not return array")
})

test("Identifier regex matches QBasic suffix variables", () => {
  const pattern = makeIdentifierRegex("player$", "gi")
  const matches = []

  for (const line of ['PRINT player$', 'player$ = "ok"']) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(line)) !== null) {
      matches.push(match[0])
    }
  }

  if (matches.length !== 2) {
    throw new Error(`Expected 2 matches, got ${matches.length}`)
  }

  pattern.lastIndex = 0
  if (pattern.test("player$Extra = 1")) {
    throw new Error("Identifier regex should not match partial identifiers")
  }
})

// ─── Phase 1.2: Compiler wrapper ─────────────────────────────────────────────
console.log("\n📦 Phase 1.2: Compiler Wrapper Tests")
const { Compiler } = require("../src/compiler/compiler")

test("Compiler compiles successfully", () => {
  const c = new Compiler({ target: "web", cache: true })
  const r = c.compile('PRINT "test"')
  if (!r.isSuccess()) throw new Error("Compilation failed")
})

test("Compiler cache hit on second call", () => {
  const c = new Compiler({ target: "web", cache: true })
  c.compile('PRINT "cached"')
  const r2 = c.compile('PRINT "cached"')
  if (!r2.getMetadata().cached) throw new Error("Second call should be cached")
})

test("Compiler tracks stats", () => {
  const c = new Compiler({ target: "web", cache: true })
  c.compile('PRINT "a"')
  c.compile('PRINT "a"')
  const stats = c.getStats()
  if (stats.compilations !== 2)
    throw new Error(`Expected 2 compilations, got ${stats.compilations}`)
  if (stats.cacheHits !== 1)
    throw new Error(`Expected 1 cache hit, got ${stats.cacheHits}`)
})

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n════════════════════════════════════════")
console.log(`Results: ${passed} PASSED, ${failed} FAILED`)
if (failed === 0) {
  console.log("🎉 All tests PASSED! System is stable and ready.")
} else {
  console.log("⚠️  Some tests failed. Review above.")
  process.exit(1)
}
