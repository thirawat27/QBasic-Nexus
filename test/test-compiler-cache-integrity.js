/**
 * QBasic Nexus - Compilation Cache Integrity Tests
 *
 * The compilation cache keys generated code by a hash of the source. A hash
 * collision therefore does not merely waste a lookup — it hands back a
 * *different program's* generated JavaScript, silently and with no diagnostic.
 *
 * The pair below is a real FNV-1a 32-bit collision found by brute force over
 * short QBasic programs; it is the exact input that used to miscompile.
 */

'use strict';

const {
  CompilationCache,
  fnv1a,
  fingerprint,
} = require('../src/compiler/cache');
const { Compiler } = require('../src/compiler/compiler');

console.log('\n🔐 Compilation Cache Integrity Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// A genuine 32-bit FNV-1a collision between two distinct QBasic programs.
const COLLIDING_A = 'PRINT "v44114"\nX44114 = 308798\n';
const COLLIDING_B = 'PRINT "v48530"\nX48530 = 339710\n';

test('The regression fixture really is an FNV-1a collision', () => {
  assert(COLLIDING_A !== COLLIDING_B, 'Fixture programs must differ');
  assert(
    fnv1a(COLLIDING_A) === fnv1a(COLLIDING_B),
    'Fixture must actually collide under the narrow hash',
  );
});

test('The cache fingerprint separates the colliding pair', () => {
  assert(
    fingerprint(COLLIDING_A) !== fingerprint(COLLIDING_B),
    'Wide fingerprint must distinguish sources that collide under FNV-1a',
  );
});

test('Colliding sources compile to their own code, not each other s', () => {
  const compiler = new Compiler({ cache: true, target: 'web' });

  const codeA = compiler.compile(COLLIDING_A).getCode();
  const codeB = compiler.compile(COLLIDING_B).getCode();

  assert(codeA !== codeB, 'Distinct programs must produce distinct output');
  assert(codeA.includes('v44114'), 'First program must keep its own literal');
  assert(codeB.includes('v48530'), 'Second program must keep its own literal');
  assert(
    !codeB.includes('v44114'),
    'Second program must not inherit the first program s cached code',
  );
});

test('A cache hit returns the same code as a cold compile', () => {
  const cold = new Compiler({ cache: false, target: 'web' }).compile(
    COLLIDING_B,
  );
  const warm = new Compiler({ cache: true, target: 'web' });
  warm.compile(COLLIDING_B);
  const hit = warm.compile(COLLIDING_B);

  assert(hit.getMetadata().cached === true, 'Second compile should hit cache');
  assert(
    hit.getCode() === cold.getCode(),
    'Cached code must equal a freshly compiled result',
  );
});

test('The same source compiled for different targets does not share an entry', () => {
  const cache = new CompilationCache();
  const source = 'PRINT "target check"\n';

  cache.setCode(source, 'web', '// web build');
  cache.setCode(source, 'node', '// node build');

  assert(
    cache.getCode(source, 'web').code === '// web build',
    'Web entry must survive the node write',
  );
  assert(
    cache.getCode(source, 'node').code === '// node build',
    'Node entry must be stored separately',
  );
  assert(
    cache.getCode(source, 'web-wasm') === null,
    'An unwritten target must miss',
  );
});

test('Fingerprint is deterministic and length-sensitive', () => {
  assert(
    fingerprint('abc') === fingerprint('abc'),
    'Fingerprint must be deterministic',
  );
  assert(
    fingerprint('abc') !== fingerprint('abcd'),
    'Different lengths must not share a fingerprint',
  );
  assert(fingerprint('') === fingerprint(''), 'Empty source must be stable');
});

test('Fingerprint has no collisions across a large realistic sample', () => {
  const seen = new Map();
  let collisions = 0;

  for (let i = 0; i < 100000; i++) {
    const source = `PRINT "v${i}"\nX${i} = ${i * 7}\n`;
    const key = fingerprint(source);
    const previous = seen.get(key);
    if (previous !== undefined && previous !== source) collisions++;
    else seen.set(key, source);
  }

  assert(collisions === 0, `Expected 0 collisions, got ${collisions}`);
});

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

console.log('\n════════════════════════════════════════');
console.log(`Results: ${passed} PASSED, ${failed} FAILED\n`);

process.exit(failed > 0 ? 1 : 0);
