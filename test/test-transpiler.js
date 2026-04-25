/**
 * Test script for QBasic Nexus Transpiler
 */

'use strict';

const Transpiler = require('../src/compiler/transpiler.js');

console.log('='.repeat(60));
console.log('QBasic Nexus - Transpiler Test Suite');
console.log('='.repeat(60));

const tests = [
    { name: 'Simple PRINT', code: 'PRINT "Hello World"' },
    { name: 'Variables', code: 'DIM x AS INTEGER\nx = 10\nPRINT x' },
    { name: 'FOR Loop', code: 'FOR i = 1 TO 5\n  PRINT i\nNEXT i' },
    { name: 'IF Statement', code: 'IF x > 5 THEN PRINT "Big" ELSE PRINT "Small"' },
    { name: 'SUB Definition', code: 'SUB Test\n  PRINT "In Test"\nEND SUB' },
    { name: 'FUNCTION', code: 'FUNCTION Add(a, b)\n  Add = a + b\nEND FUNCTION' },
    { name: 'Graphics', code: 'SCREEN 12\nCIRCLE (100, 100), 50, 4' },
    { name: 'Sound', code: 'SOUND 440, 18\nPLAY "CDE"' },
    { name: 'Array', code: 'DIM arr(10) AS INTEGER\narr(1) = 5\nPRINT arr(1)' },
    { name: 'String Functions', code: 'a$ = "Hello"\nPRINT LEFT$(a$, 2)' },
    { name: 'WASM Accelerator Target', code: 'PRINT (7 AND 3) MOD 2', target: 'web-wasm' },
    { name: 'Expanded QB64 Intrinsics', code: 'PRINT _SHL(1, 3)\nPRINT _STRICMP("QB64", "qb64")' },
    { name: 'QB64 raw sound compatibility', code: 'sid = _SNDOPENRAW(44100)\n_SNDRAW 0.1, 0.1\nPRINT _SNDRAWLEN(sid)' },
    { name: 'QB64 key string helper', code: 'PRINT _KEYTOSTR$(13)\nPRINT _KEYTOSTR$(65)' }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
    try {
        const t = new Transpiler();
        const result = t.transpile(test.code, test.target || 'web');

        if (result && result.length > 0) {
            if (test.target && !result.includes('_qbWasmAcceleratorEnabled = true')) {
                throw new Error('Expected WASM accelerator bootstrap in generated code');
            }
            console.log(`✅ ${test.name}: OK (${result.length} chars)`);
            passed++;
        } else {
            console.log(`❌ ${test.name}: Empty output`);
            failed++;
        }
    } catch (err) {
        console.log(`❌ ${test.name}: ${err.message}`);
        failed++;
    }
}

console.log('');
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

// Test resource cleanup scenario
console.log('');
console.log('Testing multiple transpile calls (memory stability)...');
try {
    const t = new Transpiler();
    for (let i = 0; i < 100; i++) {
        t.transpile('PRINT "Loop ' + i + '"', 'web');
    }
    console.log('✅ 100 consecutive transpile calls: OK');
} catch (err) {
    console.log(`❌ Memory test failed: ${err.message}`);
}

console.log('');
console.log('All tests completed!');
