/**
 * QBasic Nexus - QB64 safe defaults
 *
 * QB64 must get exactly the command line 1.x used unless the user asks for
 * more: no `-w` by default (older QB64 releases reject it).
 */

'use strict';

const Module = require('module');

console.log('\n🛡️  QB64 Default Flags Tests\n');

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

/** Loads problems.js with a vscode mock whose settings come from `user`. */
function loadProblems(user = {}) {
  const section = 'qbasic-nexus';
  const vscodeMock = new Proxy(
    {
      workspace: {
        getConfiguration() {
          return {
            get: (key) => user[key],
            inspect: (key) => (key in user ? { key: `${section}.${key}`, globalValue: user[key] } : { key: `${section}.${key}` }),
          };
        },
        textDocuments: [],
      },
      window: { createOutputChannel: () => ({ appendLine() {} }), createTerminal: () => ({}) },
      languages: {},
      DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2 },
      ThemeIcon: class {},
    },
    { get: (target, prop) => (prop in target ? target[prop] : {}) },
  );

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${require('path').sep}src${require('path').sep}`)) delete require.cache[key];
  }
  try {
    return {
      problems: require('../src/toolchain/problems'),
      build: require('../src/toolchain/build'),
    };
  } finally {
    Module._load = originalLoad;
  }
}

test('QB64 build with default settings is the 1.x command line', () => {
  const { problems, build } = loadProblems({});
  const args = build.buildCompileArgs('qb64', 'a.bas', 'a.exe', problems.compilerFlagOptions('qb64'));
  assert(JSON.stringify(args) === JSON.stringify(['-x', '-c', 'a.bas', '-o', 'a.exe']), JSON.stringify(args));
});

test('QB64 gets -w when the user turns showWarnings on', () => {
  const { problems } = loadProblems({ showWarnings: true });
  assert(problems.compilerFlagOptions('qb64').warnings === true, 'expected -w');
});

test('QBNex gets -w by default', () => {
  const { problems } = loadProblems({});
  assert(problems.compilerFlagOptions('qbnex').warnings === true, 'expected -w for QBNex');
});

test('showWarnings off turns -w off for QBNex too', () => {
  const { problems } = loadProblems({ showWarnings: false });
  assert(problems.compilerFlagOptions('qbnex').warnings === false, 'expected no -w');
  assert(problems.compilerFlagOptions('qb64').warnings === false, 'expected no -w');
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
