/**
 * QBasic Nexus - Compiler Performance Benchmark
 * ==============================================
 * Tests compiler performance improvements
 */

'use strict';

const Lexer = require('../src/compiler/lexer');
const InternalTranspiler = require('../src/compiler/transpiler');
const { printStats, runBenchmarkTasks } = require('./benchmarkHarness');

// Sample QBasic programs for benchmarking
const testPrograms = {
    small: `
        CLS
        PRINT "Hello, World!"
        FOR i = 1 TO 10
            PRINT i
        NEXT i
    `,
    
    medium: `
        CLS
        DIM arr(100)
        FOR i = 0 TO 100
            arr(i) = i * 2
        NEXT i
        
        SUB Calculate(x, y)
            result = x + y
            PRINT result
        END SUB
        
        FOR i = 0 TO 100
            CALL Calculate(arr(i), i)
        NEXT i
    `,
    
    large: `
        ' Complex QBasic program
        CLS
        SCREEN 12
        
        DIM SHARED points(1000, 2)
        DIM colors(16)
        
        ' Initialize data
        FOR i = 0 TO 1000
            points(i, 0) = RND * 640
            points(i, 1) = RND * 480
        NEXT i
        
        FOR i = 0 TO 15
            colors(i) = i
        NEXT i
        
        ' Main loop
        FOR frame = 1 TO 100
            CLS
            
            FOR i = 0 TO 1000
                x = points(i, 0)
                y = points(i, 1)
                c = colors(i MOD 16)
                
                PSET (x, y), c
                
                ' Update position
                points(i, 0) = points(i, 0) + (RND - 0.5) * 5
                points(i, 1) = points(i, 1) + (RND - 0.5) * 5
                
                ' Wrap around
                IF points(i, 0) < 0 THEN points(i, 0) = 640
                IF points(i, 0) > 640 THEN points(i, 0) = 0
                IF points(i, 1) < 0 THEN points(i, 1) = 480
                IF points(i, 1) > 480 THEN points(i, 1) = 0
            NEXT i
            
            _LIMIT 60
        NEXT frame
        
        SUB DrawCircle(cx, cy, radius, col)
            FOR angle = 0 TO 360 STEP 5
                x = cx + radius * COS(angle * 3.14159 / 180)
                y = cy + radius * SIN(angle * 3.14159 / 180)
                PSET (x, y), col
            NEXT angle
        END SUB
        
        FUNCTION Distance(x1, y1, x2, y2)
            dx = x2 - x1
            dy = y2 - y1
            Distance = SQR(dx * dx + dy * dy)
        END FUNCTION
    `
};

async function benchmarkCompile(source, time = 150) {
    const tasks = await runBenchmarkTasks(
        'compiler',
        [
            {
                name: 'Lexer tokenize',
                fn: () => {
                    const lexer = new Lexer(source);
                    return lexer.tokenize().length;
                }
            },
            {
                name: 'End-to-end transpile',
                fn: () => {
                    const transpiler = new InternalTranspiler();
                    return transpiler.transpile(source, 'web').length;
                }
            }
        ],
        { time }
    );

    return {
        lexer: tasks.find((task) => task.name === 'Lexer tokenize'),
        transpile: tasks.find((task) => task.name === 'End-to-end transpile')
    };
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
    console.log('🚀 QBasic Nexus Compiler Performance Benchmark\n');
    console.log('=' .repeat(70));
    
    for (const [name, source] of Object.entries(testPrograms)) {
        console.log(`\n📊 Testing ${name.toUpperCase()} program (${source.length} chars)`);
        console.log('-'.repeat(70));
        
        const stats = await benchmarkCompile(source, 150);

        printStats('\nLexer Performance:', stats.lexer);
        printStats('\nEnd-to-End Compilation:', stats.transpile);

        const throughputKilobytes = (source.length * stats.transpile.opsPerSecond) / 1024;
        console.log(`\n⚡ Compiler throughput: ${throughputKilobytes.toFixed(2)} KB/s`);
        console.log(`   Relative margin of error: ${stats.transpile.relativeMarginOfError.toFixed(2)}%`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Benchmark complete!\n');
}

// Run benchmarks if executed directly
if (require.main === module) {
    runBenchmarks().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = { benchmarkCompile, runBenchmarks };
