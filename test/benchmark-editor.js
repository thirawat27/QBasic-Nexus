'use strict';

const { KEYWORDS } = require('../languageData');
const {
  analyzeQBasicText,
  findIdentifierMatchesInAnalysis,
  getDocumentAnalysis,
  invalidateDocumentAnalysis,
} = require('../src/shared/documentAnalysis');
const {
  PATTERNS,
  makeAssignRegex,
  makeDimRegex,
  makeIdentifierRegex,
} = require('../src/providers/patterns');

const testPrograms = {
  small: `
    CONST LIMIT = 10
    DIM total
    FOR i = 1 TO LIMIT
      total = total + i
    NEXT i
    PRINT total
  `,

  medium: `
    TYPE Point
      x AS INTEGER
      y AS INTEGER
    END TYPE

    DIM SHARED points(64)
    DIM total

    SUB BuildPoints
      FOR i = 0 TO 63
        points(i).x = i * 2
        points(i).y = i * 3
        total = total + points(i).x
      NEXT i
    END SUB

    SUB RenderPoints
      FOR i = 0 TO 63
        PRINT points(i).x; points(i).y
      NEXT i
    END SUB

    CALL BuildPoints
    CALL RenderPoints
  `,

  large: Array.from({ length: 220 }, (_, block) => {
    const section = block + 1;
    return `
      SUB Worker${section}
        DIM sharedValue${section}
        FOR i = 1 TO 40
          counter = counter + i
          sharedValue${section} = counter MOD 7
          IF counter > 200 THEN GOTO done${section}
        NEXT i
      done${section}:
        PRINT sharedValue${section}
      END SUB

      CALL Worker${section}
    `;
  }).join('\n'),
};

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p95: sorted[Math.floor(sorted.length * 0.95)],
  };
}

function benchmark(fn, iterations = 75) {
  const timings = [];
  let checksum = 0;

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    checksum += fn();
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    timings.push(elapsedMs);
  }

  return {
    ...summarize(timings),
    checksum,
  };
}

function legacyStatusBar(text) {
  const codeLines = text.split('\n').filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed &&
      !trimmed.startsWith("'") &&
      !trimmed.toUpperCase().startsWith('REM ')
    );
  }).length;

  return codeLines +
    (text.match(/^\s*SUB\s+/gim) || []).length +
    (text.match(/^\s*FUNCTION\s+/gim) || []).length;
}

function legacyCodeStats(text) {
  const lines = text.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blankLines++;
    } else if (
      trimmed.startsWith("'") ||
      trimmed.toUpperCase().startsWith('REM ')
    ) {
      commentLines++;
    } else {
      codeLines++;
    }
  }

  return (
    codeLines +
    commentLines +
    blankLines +
    (text.match(/^\s*SUB\s+\w+/gim) || []).length +
    (text.match(/^\s*FUNCTION\s+\w+/gim) || []).length +
    (text.match(/^\s*TYPE\s+\w+/gim) || []).length +
    (text.match(/^\s*CONST\s+\w+/gim) || []).length +
    (text.match(/^\s*DIM\s+/gim) || []).length +
    (text.match(/^[a-zA-Z_]\w*:/gm) || []).length +
    (text.match(/\bGOTO\b/gim) || []).length +
    (text.match(/\bGOSUB\b/gim) || []).length +
    (text.match(/^\s*SELECT\s+CASE\b/gim) || []).length
  );
}

function legacySymbols(text) {
  const lines = text.split('\n');
  let symbolCount = 0;

  for (const line of lines) {
    if (PATTERNS.COMMENT.test(line) || PATTERNS.DECLARE.test(line)) continue;
    if (PATTERNS.SUB_DEF.test(line)) symbolCount++;
    else if (PATTERNS.TYPE_DEF.test(line)) symbolCount++;
    else if (PATTERNS.CONST_DEF.test(line)) symbolCount++;
    else if (PATTERNS.LABEL.test(line)) symbolCount++;
  }

  return symbolCount;
}

function legacyVariables(text) {
  const dimRe = makeDimRegex();
  const assignRe = makeAssignRegex();
  const vars = new Set();
  let match;

  while ((match = dimRe.exec(text)) !== null) {
    vars.add(match[1]);
  }

  while ((match = assignRe.exec(text)) !== null) {
    if (!KEYWORDS[match[1].toUpperCase()]) {
      vars.add(match[1]);
    }
  }

  return vars.size;
}

function legacyIdentifierMatches(text, identifier, includeDeclaration = true) {
  const lines = text.split('\n');
  const pattern = makeIdentifierRegex(identifier, 'gi');
  let count = 0;

  for (const line of lines) {
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(line)) !== null) {
      if (!includeDeclaration) {
        const beforeMatch = line.substring(0, match.index);
        if (/\b(?:DIM|SUB|FUNCTION|TYPE|CONST)\s*$/i.test(beforeMatch)) {
          continue;
        }
      }

      count++;
    }
  }

  return count;
}

function legacyEditorCycle(source, identifier) {
  return (
    legacyStatusBar(source) +
    legacyCodeStats(source) +
    legacySymbols(source) +
    legacyVariables(source) +
    legacyIdentifierMatches(source, identifier, false)
  );
}

function sharedAnalysisCycle(source, identifier) {
  const analysis = analyzeQBasicText(source);
  return (
    analysis.codeLines +
    analysis.subCount +
    analysis.funcCount +
    analysis.typeCount +
    analysis.constCount +
    analysis.dimCount +
    analysis.labelCount +
    analysis.gotoCount +
    analysis.gosubCount +
    analysis.selectCount +
    analysis.symbols.length +
    analysis.variables.length +
    findIdentifierMatchesInAnalysis(analysis, identifier, {
      includeDeclaration: false,
    }).length
  );
}

function cachedDocumentCycle(document, identifier) {
  const analysis = getDocumentAnalysis(document);
  return (
    analysis.symbols.length +
    analysis.variables.length +
    findIdentifierMatchesInAnalysis(analysis, identifier, {
      includeDeclaration: false,
    }).length
  );
}

function createMockDocument(name, source) {
  const uri = { toString: () => `benchmark://${name}` };
  return {
    uri,
    version: 1,
    getText: () => source,
  };
}

function printStats(label, stats) {
  console.log(label);
  console.log(`  Mean:   ${stats.mean.toFixed(3)} ms`);
  console.log(`  Median: ${stats.median.toFixed(3)} ms`);
  console.log(`  Min:    ${stats.min.toFixed(3)} ms`);
  console.log(`  Max:    ${stats.max.toFixed(3)} ms`);
  console.log(`  P95:    ${stats.p95.toFixed(3)} ms`);
}

function runBenchmarks() {
  console.log('🚀 QBasic Nexus Editor Performance Benchmark\n');
  console.log('='.repeat(70));

  const targetIdentifier = 'counter';

  for (const [name, source] of Object.entries(testPrograms)) {
    console.log(`\n📊 Testing ${name.toUpperCase()} editor workload (${source.length} chars)`);
    console.log('-'.repeat(70));

    const legacyStats = benchmark(
      () => legacyEditorCycle(source, targetIdentifier),
      75,
    );
    const sharedStats = benchmark(
      () => sharedAnalysisCycle(source, targetIdentifier),
      75,
    );

    const document = createMockDocument(name, source);
    invalidateDocumentAnalysis(document.uri);
    cachedDocumentCycle(document, targetIdentifier);
    const cachedStats = benchmark(
      () => cachedDocumentCycle(document, targetIdentifier),
      150,
    );
    invalidateDocumentAnalysis(document.uri);

    printStats('\nLegacy Rescans:', legacyStats);
    printStats('\nShared Analysis (cold):', sharedStats);
    printStats('\nShared Analysis Cache (warm):', cachedStats);

    const coldSpeedup = legacyStats.mean / sharedStats.mean;
    const warmSpeedup = legacyStats.mean / cachedStats.mean;
    console.log(`\n⚡ Cold-path speedup: ${coldSpeedup.toFixed(2)}x`);
    console.log(`⚡ Warm-path speedup: ${warmSpeedup.toFixed(2)}x`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Benchmark complete!\n');
}

if (require.main === module) {
  runBenchmarks();
}

module.exports = { benchmark, runBenchmarks };
