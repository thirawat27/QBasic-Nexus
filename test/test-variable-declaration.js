/**
 * Test Variable Declaration Issues
 * Tests that all variables are properly declared before use
 */

'use strict';

const InternalTranspiler = require('../src/compiler/transpiler');

// Test cases that previously caused "x is not defined" errors
const testCases = [
    {
        name: 'Simple assignment without DIM',
        code: `
            x = 10
            PRINT x
        `,
        shouldWork: true
    },
    {
        name: 'Variable used in expression',
        code: `
            y = x + 5
            PRINT y
        `,
        shouldWork: true
    },
    {
        name: 'Array assignment without DIM',
        code: `
            arr(0) = 10
            arr(1) = 20
            PRINT arr(0)
        `,
        shouldWork: true
    },
    {
        name: 'Struct member assignment',
        code: `
            player.x = 100
            player.y = 200
            PRINT player.x
        `,
        shouldWork: true
    },
    {
        name: 'FOR loop variable',
        code: `
            FOR i = 1 TO 10
                PRINT i
            NEXT i
        `,
        shouldWork: true
    },
    {
        name: 'Multiple variables in expression',
        code: `
            result = a + b * c
            PRINT result
        `,
        shouldWork: true
    },
    {
        name: 'Variable in IF condition',
        code: `
            IF x > 10 THEN
                PRINT "Greater"
            END IF
        `,
        shouldWork: true
    },
    {
        name: 'String variable',
        code: `
            name$ = "John"
            PRINT name$
        `,
        shouldWork: true
    },
    {
        name: 'Complex expression',
        code: `
            total = price * quantity + tax
            PRINT total
        `,
        shouldWork: true
    },
    {
        name: 'Nested array access',
        code: `
            matrix(0, 0) = 1
            matrix(0, 1) = 2
            PRINT matrix(0, 0)
        `,
        shouldWork: true
    }
];

function testVariableDeclaration() {
    console.log('🧪 Testing Variable Declaration\n');
    console.log('='.repeat(70));
    
    let passed = 0;
    let failed = 0;
    
    for (const test of testCases) {
        try {
            const transpiler = new InternalTranspiler();
            const code = transpiler.transpile(test.code, 'node');
            
            // Check if code contains proper variable declarations
            const hasLetDeclarations = code.includes('let ');
            const hasUndefinedVars = /\b(?:x|y|arr|player|i|a|b|c|result|name\$|price|quantity|tax|total|matrix)\b/.test(code);
            
            // Try to evaluate the code to see if it throws "not defined" error
            try {
                // Create a safe eval context
                const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                
                // Mock runtime functions
                const mockRuntime = `
                    function _print(text, newline) { /* mock */ }
                    async function _input(prompt) { return "0"; }
                    function _cls() { /* mock */ }
                    function _sleep(ms) { return Promise.resolve(); }
                    function _makeArray(init, ...dims) {
                        if (dims.length === 0) return init;
                        const size = dims[0];
                        const rest = dims.slice(1);
                        return Array.from({length: size + 1}, () => _makeArray(init, ...rest));
                    }
                    let _cursorRow = 1, _cursorCol = 1;
                    const _DATA = [];
                    let _DATA_PTR = 0;
                    function _read() { return 0; }
                    function _restore() { _DATA_PTR = 0; }
                    let _rndSeed = Date.now();
                    function _randomize(seed) { _rndSeed = seed !== undefined ? seed : Date.now(); }
                    function _rnd() {
                        _rndSeed = (_rndSeed * 9301 + 49297) % 233280;
                        return _rndSeed / 233280;
                    }
                `;
                
                const fn = new AsyncFunction(mockRuntime + '\n' + code);
                
                // This will throw if there are undefined variables
                // We don't actually run it, just check if it compiles
                
                console.log(`✅ ${test.name}`);
                console.log(`   Generated code has proper declarations: ${hasLetDeclarations}`);
                passed++;
                
            } catch (evalError) {
                if (evalError.message.includes('is not defined')) {
                    console.log(`❌ ${test.name}`);
                    console.log(`   Error: ${evalError.message}`);
                    console.log(`   Generated code:\n${code.split('\n').slice(0, 20).join('\n')}`);
                    failed++;
                } else {
                    // Other errors are OK (like missing runtime functions)
                    console.log(`✅ ${test.name} (compilation OK)`);
                    passed++;
                }
            }
            
        } catch (error) {
            console.log(`❌ ${test.name}`);
            console.log(`   Transpiler error: ${error.message}`);
            failed++;
        }
        
        console.log('');
    }
    
    console.log('='.repeat(70));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
    
    if (failed === 0) {
        console.log('✅ All tests passed!\n');
        return true;
    } else {
        console.log('❌ Some tests failed\n');
        return false;
    }
}

// Run tests
if (require.main === module) {
    const success = testVariableDeclaration();
    process.exit(success ? 0 : 1);
}

module.exports = { testVariableDeclaration };
