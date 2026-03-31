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
const { printStats, runBenchmarkTasks } = require('./benchmarkHarness');

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

async function benchmarkScenario(source, identifier, time = 150) {
  const document = createMockDocument('bench', source);
  invalidateDocumentAnalysis(document.uri);
  cachedDocumentCycle(document, identifier);

  const tasks = await runBenchmarkTasks(
    'editor',
    [
      {
        name: 'Legacy rescans',
        fn: () => legacyEditorCycle(source, identifier),
      },
      {
        name: 'Shared analysis (cold)',
        fn: () => sharedAnalysisCycle(source, identifier),
      },
      {
        name: 'Shared analysis cache (warm)',
        fn: () => cachedDocumentCycle(document, identifier),
      },
    ],
    { time },
  );

  invalidateDocumentAnalysis(document.uri);
  return {
    legacy: tasks.find((task) => task.name === 'Legacy rescans'),
    shared: tasks.find((task) => task.name === 'Shared analysis (cold)'),
    cached: tasks.find((task) => task.name === 'Shared analysis cache (warm)'),
  };
}

async function runBenchmarks() {
  console.log('🚀 QBasic Nexus Editor Performance Benchmark\n');
  console.log('='.repeat(70));

  const targetIdentifier = 'counter';

  for (const [name, source] of Object.entries(testPrograms)) {
    console.log(`\n📊 Testing ${name.toUpperCase()} editor workload (${source.length} chars)`);
    console.log('-'.repeat(70));

    const stats = await benchmarkScenario(source, targetIdentifier, 150);

    printStats('\nLegacy Rescans:', stats.legacy);
    printStats('\nShared Analysis (cold):', stats.shared);
    printStats('\nShared Analysis Cache (warm):', stats.cached);

    const coldSpeedup = stats.legacy.mean / stats.shared.mean;
    const warmSpeedup = stats.legacy.mean / stats.cached.mean;
    console.log(`\n⚡ Cold-path speedup: ${coldSpeedup.toFixed(2)}x`);
    console.log(`⚡ Warm-path speedup: ${warmSpeedup.toFixed(2)}x`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Benchmark complete!\n');
}

if (require.main === module) {
  runBenchmarks().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { benchmarkScenario, runBenchmarks };
