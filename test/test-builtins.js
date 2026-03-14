'use strict';

const InternalTranspiler = require('../src/compiler/transpiler');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n📦 Built-in Mapping Regression Tests');

test('Compiler emits DIR$ through the internal helper', () => {
  const transpiler = new InternalTranspiler();
  const code = transpiler.transpile('PRINT DIR$("*.txt")\nPRINT DIR$()', 'node');

  if (!code.includes('_dir$(')) {
    throw new Error('Expected transpiled code to call _dir$');
  }
});

test('Compiler keeps QB64 system helpers wired to runtime bindings', () => {
  const transpiler = new InternalTranspiler();
  const code = transpiler.transpile(
    [
      'PRINT _CWD$',
      'PRINT _DIR$',
      'PRINT _STARTDIR$',
      'PRINT _OS$',
      'PRINT _CLIPBOARD$',
    ].join('\n'),
    'web',
  );

  for (const fragment of [
    '_runtime.cwd$',
    '_runtime.dir$',
    '_runtime.startdir$',
    '_runtime.os$',
    '_runtime.clipboard$',
  ]) {
    if (!code.includes(fragment)) {
      throw new Error(`Missing runtime binding: ${fragment}`);
    }
  }
});

test('Compiler keeps binary conversion helpers mapped', () => {
  const transpiler = new InternalTranspiler();
  const code = transpiler.transpile('PRINT BIN$(10)\nPRINT _BIN$(10)', 'node');

  if (!code.includes('toString(2)')) {
    throw new Error('Expected binary helper implementation in output');
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
