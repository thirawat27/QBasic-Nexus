/**
 * Test Variable Declaration Issues
 * Tests that all variables are properly declared before use
 */

'use strict';

const InternalTranspiler = require('../src/compiler/transpiler');

function makeProgramRunnable(code) {
    const marker = '\n(async () => {';
    const markerIndex = code.lastIndexOf(marker);

    if (markerIndex === -1) {
        throw new Error('Could not locate generated program entrypoint');
    }

    return (
        code.slice(0, markerIndex + 1) +
        'return ' +
        code.slice(markerIndex + 1)
    );
}

async function runWebProgram(sourceCode, options = {}) {
    const transpiler = new InternalTranspiler();
    const code = transpiler.transpile(sourceCode, 'web');
    const runnableCode = makeProgramRunnable(code);
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const output = [];

    globalThis.runtime = {
        print(text) {
            output.push(String(text));
            return text;
        },
        input() {
            return Promise.resolve(options.userInput ?? '0');
        },
        cls() {},
        error(message) {
            throw new Error(message);
        },
        printFile() {
            return Promise.resolve();
        },
        inputFile() {
            return Promise.resolve(options.fileInput ?? '0');
        },
    };

    try {
        await new AsyncFunction(runnableCode)();
    } finally {
        delete globalThis.runtime;
    }

    return { code, output };
}

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
    },
    {
        name: 'FOR loop variable remains accessible after NEXT',
        code: `
            FOR x = 1 TO 3
            NEXT x
            PRINT x
        `,
        shouldWork: true
    },
    {
        name: 'Variable assigned inside IF remains accessible after block',
        code: `
            IF 1 THEN
                x = 10
            END IF
            PRINT x
        `,
        shouldWork: true
    },
    {
        name: 'User-defined FUNCTION call resolves awaited value in web runtime',
        code: `
            FUNCTION Add(a, b)
                Add = a + b
            END FUNCTION
            PRINT Add(1, 2)
        `,
        shouldWork: true,
        expectedOutput: ['3']
    },
    {
        name: 'Recursive FUNCTION calls still work inside function bodies',
        code: `
            FUNCTION Fact(n)
                IF n <= 1 THEN
                    Fact = 1
                ELSE
                    Fact = n * Fact(n - 1)
                END IF
            END FUNCTION
            PRINT Fact(5)
        `,
        shouldWork: true,
        expectedOutput: ['120']
    },
    {
        name: 'GOSUB shares variable updates with caller scope',
        code: `
            x = 1
            GOSUB test
            PRINT x
            END
            test:
            x = 2
            RETURN
        `,
        shouldWork: true,
        expectedOutput: ['2']
    },
    {
        name: 'Multi-dimensional array assignment writes the addressed element',
        code: `
            DIM matrix(1, 1)
            matrix(0, 1) = 2
            PRINT matrix(0, 1)
        `,
        shouldWork: true,
        expectedOutput: ['2']
    },
    {
        name: 'INPUT # preserves read value for undeclared variables',
        code: `
            INPUT #1, x
            PRINT x
        `,
        shouldWork: true,
        expectedOutput: ['42'],
        fileInput: '42'
    }
];

async function testVariableDeclaration() {
    console.log('🧪 Testing Variable Declaration\n');
    console.log('='.repeat(70));
    
    let passed = 0;
    let failed = 0;
    
    for (const test of testCases) {
        try {
            // Execute generated web code to catch CRT-style runtime scope errors
            let generatedCode = '';
            try {
                const { code, output } = await runWebProgram(test.code, {
                    fileInput: test.fileInput,
                    userInput: test.userInput,
                });
                generatedCode = code;

                if (test.expectedOutput) {
                    const actual = JSON.stringify(output);
                    const expected = JSON.stringify(test.expectedOutput);
                    if (actual !== expected) {
                        throw new Error(`Expected output ${expected}, got ${actual}`);
                    }
                }

                console.log(`✅ ${test.name}`);
                passed++;
                
            } catch (evalError) {
                if (evalError.message.includes('is not defined')) {
                    console.log(`❌ ${test.name}`);
                    console.log(`   Error: ${evalError.message}`);
                    console.log(
                        `   Generated code:\n${generatedCode.split('\n').slice(0, 20).join('\n')}`,
                    );
                    failed++;
                } else {
                    throw evalError;
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
    testVariableDeclaration()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error(`❌ Test runner crashed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { testVariableDeclaration };
