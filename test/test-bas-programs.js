'use strict';

/**
 * End-to-end tests over real .bas programs in test/fixtures/programs.
 *
 * Each program lists its expected output in `' EXPECT:` comment lines.
 * For every program:
 *   1. the linter reports no errors,
 *   2. it runs to completion (in a child process, killed after 10 s) and
 *      prints exactly the expected output,
 *   3. the typo checker raises no false alarm on this valid code,
 *   4. every backward GOTO loop the refactor offers is rewritten, and the
 *      rewritten program prints the same output.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const Transpiler = require('../src/compiler/parser');
const { findTypos } = require('../src/shared/codeInsights');
const { findGotoLoops } = require('../src/shared/gotoLoops');
const { collectProcedures } = require('../src/shared/procedureIndex');

// Compiled tests run from out/test; the fixtures stay in test/fixtures.
const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures', 'programs');
const RUNNER = path.join(__dirname, 'run-bas-program.js');
const TIMEOUT_MS = 10000;

console.log('\n📼 QBasic Program Tests (lint, run, typo check, GOTO rewrite)\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function run(source) {
  const result = spawnSync(process.execPath, [RUNNER], {
    input: source,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });
  const spawnError = /** @type {NodeJS.ErrnoException | undefined} */ (result.error);
  if (spawnError && spawnError.code === 'ETIMEDOUT') {
    throw new Error(`did not finish within ${TIMEOUT_MS} ms (endless loop?)`);
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || `exit code ${result.status}`).trim());
  }
  return normalize(result.stdout);
}

function normalize(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function expectedOutput(source) {
  return normalize(
    source
      .split(/\r?\n/)
      .filter((line) => /^' EXPECT:/.test(line))
      .map((line) => line.replace(/^' EXPECT: ?/, ''))
      .join('\n'),
  );
}

function applyEdits(lines, edits) {
  const result = [...lines];
  // Apply bottom-up so earlier line numbers stay valid.
  for (const edit of [...edits].sort((a, b) => b.line - a.line)) {
    result.splice(edit.line, 1, ...edit.text.split('\n'));
  }
  return result;
}

const files = fs.readdirSync(FIXTURES).filter((name) => name.endsWith('.bas')).sort();
assert.ok(files.length >= 10, `expected at least 10 fixture programs, found ${files.length}`);

const linter = new Transpiler();

for (const file of files) {
  const source = fs.readFileSync(path.join(FIXTURES, file), 'utf8');
  const lines = source.split(/\r?\n/);
  const expected = expectedOutput(source);

  test(`${file}: lints clean`, () => {
    const errors = linter
      .lint(source, {})
      .filter((entry) => (/** @type {{severity?: string}} */ (entry).severity || 'error') === 'error');
    assert.deepEqual(errors.map((entry) => `${entry.line + 1}: ${entry.message}`), []);
  });

  let actual = null;
  test(`${file}: runs and prints the expected output`, () => {
    assert.ok(expected, 'the program has no EXPECT lines');
    actual = run(source);
    assert.equal(actual, expected);
  });

  test(`${file}: no false typo warnings`, () => {
    const procedures = collectProcedures(lines).map((proc) => proc.name);
    assert.deepEqual(
      findTypos(lines, { procedures }).map((t) => `${t.line + 1}: ${t.word} -> ${t.suggestion}`),
      [],
    );
  });

  const loops = findGotoLoops(lines);
  for (const loop of loops) {
    test(`${file}: GOTO ${loop.label} rewritten as DO...LOOP prints the same`, () => {
      const rewritten = applyEdits(lines, loop.edits).join('\n');
      assert.match(rewritten, /^\s*DO\s*$/m);
      assert.equal(run(rewritten), expected);
    });
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
