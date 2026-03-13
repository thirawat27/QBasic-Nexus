/**
 * Test script for QBasic Nexus Transpiler v1.1.0
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
    { name: 'Mouse Input', code: 'x = _MOUSEX\ny = _MOUSEY\nIF _MOUSEBUTTON(1) THEN PRINT "Left Click"' },
    { name: 'Mouse Wheel', code: 'wheel = _MOUSEWHEEL\nPRINT "Wheel: "; wheel' },
    { name: 'Mouse Show/Hide', code: '_MOUSEHIDE\n_MOUSESHOW' },
    { name: 'Keyboard Input', code: 'k = _KEYHIT\nIF _KEYDOWN(32) THEN PRINT "Space pressed"' },
    { name: 'Keyboard Type', code: 't = _KEYBOARDTYPE\nPRINT "Keyboard type: "; t' },
    { name: 'System Functions', code: 'IF _FILEEXISTS("test.bas") THEN PRINT "File exists" ELSE PRINT "File not found"' },
    { name: 'Window Functions', code: '_TITLE "Test Window"\n_FULLSCREEN 1\nx = _WIDTH\ny = _HEIGHT\nPRINT "Size: "; x; ","; y\n_SYSTEM' },
    { name: 'Console Functions', code: '_CONSOLE OFF\n_CONSOLETITLE "Debug"\nINPUT "Enter name: ", name$\nPRINT "Hello "; name$' },
    { name: 'QB4.5 CLEAR', code: 'CLEAR\nx = 5\nPRINT x' },
    { name: 'QB4.5 OFF ERROR', code: 'ON ERROR GOTO Handler\nERROR 5\nHandler: RESUME NEXT\nOFF ERROR\nPRINT "After OFF"' },
    { name: 'QB4.5 FRE', code: 'PRINT FRE(0)\nPRINT FRE("")' }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
    try {
        const t = new Transpiler();
        const result = t.transpile(test.code, 'web');
        
        if (result && result.length > 0) {
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
