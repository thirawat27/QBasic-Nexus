/**
 * QBasic Nexus - Compiler Performance Benchmark
 * ==============================================
 * Tests compiler performance improvements
 */

'use strict';

const Lexer = require('../src/compiler/lexer');
const InternalTranspiler = require('../src/compiler/transpiler');

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

/**
 * Benchmark a single compilation
 */
function benchmarkCompile(source, iterations = 100) {
    const times = {
        lexer: [],
        parser: [],
        total: []
    };
    
    for (let i = 0; i < iterations; i++) {
        // Lexer benchmark
        const lexerStart = process.hrtime.bigint();
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const lexerEnd = process.hrtime.bigint();
        times.lexer.push(Number(lexerEnd - lexerStart) / 1000000); // Convert to ms
        
        // Parser benchmark (full transpilation)
        const parserStart = process.hrtime.bigint();
        const transpiler = new InternalTranspiler();
        const code = transpiler.transpile(source, 'web');
        const parserEnd = process.hrtime.bigint();
        times.parser.push(Number(parserEnd - parserStart) / 1000000);
        
        times.total.push(times.lexer[i] + times.parser[i]);
    }
    
    // Calculate statistics
    const stats = {};
    for (const [phase, values] of Object.entries(times)) {
        const sorted = values.sort((a, b) => a - b);
        stats[phase] = {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            mean: values.reduce((a, b) => a + b, 0) / values.length,
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    
    return stats;
}

/**
 * Run all benchmarks
 */
function runBenchmarks() {
    console.log('🚀 QBasic Nexus Compiler Performance Benchmark\n');
    console.log('=' .repeat(70));
    
    for (const [name, source] of Object.entries(testPrograms)) {
        console.log(`\n📊 Testing ${name.toUpperCase()} program (${source.length} chars)`);
        console.log('-'.repeat(70));
        
        const stats = benchmarkCompile(source, 100);
        
        console.log('\nLexer Performance:');
        console.log(`  Mean:   ${stats.lexer.mean.toFixed(3)} ms`);
        console.log(`  Median: ${stats.lexer.median.toFixed(3)} ms`);
        console.log(`  Min:    ${stats.lexer.min.toFixed(3)} ms`);
        console.log(`  Max:    ${stats.lexer.max.toFixed(3)} ms`);
        console.log(`  P95:    ${stats.lexer.p95.toFixed(3)} ms`);
        
        console.log('\nParser Performance:');
        console.log(`  Mean:   ${stats.parser.mean.toFixed(3)} ms`);
        console.log(`  Median: ${stats.parser.median.toFixed(3)} ms`);
        console.log(`  Min:    ${stats.parser.min.toFixed(3)} ms`);
        console.log(`  Max:    ${stats.parser.max.toFixed(3)} ms`);
        console.log(`  P95:    ${stats.parser.p95.toFixed(3)} ms`);
        
        console.log('\nTotal Compilation:');
        console.log(`  Mean:   ${stats.total.mean.toFixed(3)} ms`);
        console.log(`  Median: ${stats.total.median.toFixed(3)} ms`);
        console.log(`  Min:    ${stats.total.min.toFixed(3)} ms`);
        console.log(`  Max:    ${stats.total.max.toFixed(3)} ms`);
        console.log(`  P95:    ${stats.total.p95.toFixed(3)} ms`);
        
        // Calculate throughput
        const throughput = (source.length / stats.total.mean) * 1000; // chars/sec
        console.log(`\n⚡ Throughput: ${(throughput / 1000).toFixed(2)} KB/s`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Benchmark complete!\n');
}

// Run benchmarks if executed directly
if (require.main === module) {
    runBenchmarks();
}

module.exports = { benchmarkCompile, runBenchmarks };
