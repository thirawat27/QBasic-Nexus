/**
 * QBasic Nexus - Toolchain tests: compiler output parsing, command lines,
 * QBNex detection, the process runner and the vendored qb-web VM.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { parseCompilerOutput, diagnosticSpan, stripAnsi } = require('../src/toolchain/diagnostics');
const {
  buildCheckArgs,
  buildCompileArgs,
  buildQirArgs,
  commonFlags,
  runTool,
} = require('../src/toolchain/build');
const {
  VERSION_PATTERN,
  companionToolCandidates,
  qbnexCandidates,
  verifyQBNex,
} = require('../src/toolchain/detect');
const { normalizeCompilerMode, CONFIG } = require('../src/extension/constants');
const { toClassicScript } = require('../src/runner/qbWebLoader');

console.log('\n🧰 Toolchain Tests\n');

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message || 'Mismatch'}\n       got:      ${a}\n       expected: ${e}`);
}

const SRC_DIR = path.resolve(__dirname, 'fixtures', 'project');
const SRC = path.join(SRC_DIR, 'game.bas');

// ── Compiler output parsing ─────────────────────────────────────────────────

test('QBNex fatal block: message, code, line and source text', () => {
  const output = [
    "[!!] QBNex :: Fatal [E0000]  Expected variable/value after '+'",
    `  [@] ${SRC_DIR}/game.bas(2)`,
    '  [#] source',
    '    2 | X = 1 +',
    '  [>] next     Review the syntax and compare with QBasic documentation',
    '',
    '[x] QBNex :: Build Halted   1  blocking diagnostic(s)',
  ].join('\n');
  const [d, ...rest] = parseCompilerOutput(output, { sourcePath: SRC });
  assert(rest.length === 0, 'Build Halted summary must not become a diagnostic');
  assertEqual(
    [path.basename(d.file), d.line, d.column, d.severity, d.code, d.message, d.sourceText, d.source],
    ['game.bas', 1, null, 'error', 'E0000', "Expected variable/value after '+'", 'X = 1 +', 'QBNex'],
  );
});

test('QBNex block with column and detail note', () => {
  const output = [
    "[x] QBNex :: Error [E1201]  '99' is not defined in the current scope",
    `  [@] ${SRC}(3,6)`,
    "  [.] detail   Label '99' not defined",
  ].join('\r\n');
  const [d] = parseCompilerOutput(output, { sourcePath: SRC });
  assertEqual([d.line, d.column, d.code], [2, 5, 'E1201']);
  assert(d.message.endsWith("\nLabel '99' not defined"), 'Expected the detail note on its own line');
});

test('QBNex error inside an included file points at that file', () => {
  const lib = path.join(SRC_DIR, 'lib.bi');
  const output = [
    `[!!] QBNex :: Fatal [E0000]  Expected variable/value after '+' in line 1 of ${lib} included`,
    `  [@] ${lib}(1)`,
  ].join('\n');
  const [d] = parseCompilerOutput(output, { sourcePath: SRC });
  assert(d.file === lib, `Expected ${lib}, got ${d.file}`);
  assert(d.message === "Expected variable/value after '+'", 'Expected the include suffix to be dropped');
});

test('QBNex warnings keep the indented detail line', () => {
  const output = 'game.bas:1: warning: unused variable\n    unusedvar%   INTEGER\n';
  const [d] = parseCompilerOutput(output, { sourcePath: SRC });
  assertEqual([d.file, d.line, d.severity, d.message], [SRC, 0, 'warning', 'unused variable\nunusedvar%   INTEGER']);
});

test('QB64-PE warning with a column', () => {
  const [d] = parseCompilerOutput('game.bas:12:5: warning: unused variable (x)', { sourcePath: SRC, compiler: 'qb64' });
  assertEqual([d.line, d.column, d.severity, d.source], [11, 4, 'warning', 'QB64']);
});

test('QB64 error: message line before LINE n', () => {
  const output = [
    'Beginning C++ output from QB64 code...',
    '[..........]',
    'Expected = or (',
    'Caused by (or after): X = 1 +',
    'LINE 7:X = 1 +',
  ].join('\n');
  const [d] = parseCompilerOutput(output, { sourcePath: SRC, compiler: 'qb64' });
  assertEqual([d.line, d.message, d.sourceText, d.source], [6, 'Expected = or (', 'X = 1 +', 'QB64']);
});

test('QB64 error in an included file', () => {
  const output = 'Syntax error in line 4 of lib.bi included\nLINE 1:\'$INCLUDE:\'lib.bi\'';
  const [d] = parseCompilerOutput(output, { sourcePath: SRC, compiler: 'qb64' });
  assertEqual([path.basename(d.file), d.line, d.message], ['lib.bi', 3, 'Syntax error']);
});

test('QB64-PE 4.7 include error: control character dropped, points at the include', () => {
  // Captured from qb64pe 4.7.0 (-x -c) with an error on line 2 of lib.bi.
  const lib = path.join(SRC_DIR, 'lib.bi');
  const output = [
    '[.............................                     ] 58%',
    '',
    `Expected variable/value after '*'\u0001 in line 2 of ${lib} included`,
    'Caused by (or after):Y = 2 *',
    'LINE 1:y = 2 *',
  ].join('\r\n');
  const [d] = parseCompilerOutput(output, { sourcePath: SRC, compiler: 'qb64' });
  assertEqual([d.file, d.line, d.message], [lib, 1, "Expected variable/value after '*'"]);
});

test('ANSI colour codes are ignored and duplicates collapse', () => {
  const line = `\x1b[38;5;211m[!!]\x1b[0m QBNex :: Fatal [E0000]  Bad\n  [@] ${SRC}(1)\n`;
  assert(stripAnsi('\x1b[1mX\x1b[0m') === 'X', 'stripAnsi');
  const list = parseCompilerOutput(line + '\n' + line, { sourcePath: SRC });
  assert(list.length === 1, `Expected 1 diagnostic, got ${list.length}`);
});

test('Clean output gives no diagnostics', () => {
  assert(parseCompilerOutput('', { sourcePath: SRC }).length === 0, 'empty');
  assert(parseCompilerOutput('QBNex Compiler 2.0.0\nDone.\n', { sourcePath: SRC }).length === 0, 'banner');
});

test('diagnosticSpan picks the word, the snippet, or the line', () => {
  assertEqual(diagnosticSpan('    PRINT foo$', { column: 10 }), [10, 14]);
  assertEqual(diagnosticSpan('  X = 1 +', { column: null, sourceText: 'x = 1 +' }), [2, 9]);
  assertEqual(diagnosticSpan('    GOTO 99   ', { column: null }), [4, 11]);
});

// ── Command lines ───────────────────────────────────────────────────────────

test('QBNex build: quiet, monochrome, all flags', () => {
  assertEqual(
    buildCompileArgs('qbnex', 'a.bas', 'a.exe', { warnings: true, warningsAsErrors: true, explicit: true }),
    ['a.bas', '-o', 'a.exe', '-q', '-m', '-w', '-Werror', '-e'],
  );
});

test('QB64 build keeps -x -c and never gets -Werror', () => {
  assertEqual(
    buildCompileArgs('qb64', 'a.bas', 'a.exe', { warningsAsErrors: true, extraArgs: ['-g'] }),
    ['-x', '-c', 'a.bas', '-o', 'a.exe', '-w', '-g'],
  );
});

test('Check runs: QBNex writes QIR, QB64 generates C only', () => {
  assertEqual(buildCheckArgs('qbnex', 'a.bas', 't.qir'), ['a.bas', '--emit-ir', '-o', 't.qir', '-q', '-m']);
  assertEqual(buildCheckArgs('qb64', 'a.bas', 't.qir'), ['-x', '-z', 'a.bas']);
  assertEqual(buildQirArgs('a.bas', 't.qir', { explicit: true }), ['a.bas', '--emit-ir', '-o', 't.qir', '-q', '-m', '-e']);
});

test('Extra args are not duplicated', () => {
  assertEqual(commonFlags('qbnex', { warnings: true, extraArgs: ['-w', '-k'] }), ['-w', '-k']);
});

test('1.x compiler modes map to the current ones', () => {
  assert(normalizeCompilerMode('QB64 (Recommended)') === CONFIG.MODE_QB64, 'QB64');
  assert(normalizeCompilerMode('Qbasic Nexus') === CONFIG.MODE_QBNEX, 'internal');
  assert(normalizeCompilerMode('Qbasic Nexus + WASM') === CONFIG.MODE_QBNEX, 'internal wasm');
  assert(normalizeCompilerMode('qbnex') === CONFIG.MODE_QBNEX, 'case');
  assert(normalizeCompilerMode(undefined) === CONFIG.MODE_AUTO, 'default');
});

// ── Detection ───────────────────────────────────────────────────────────────

test('Version line of QBNex 2.0 is recognised', () => {
  const m = VERSION_PATTERN.exec('QBNex Compiler 2.0.0-preview');
  assertEqual([m[1], m[2], m[3], m[4]], ['2', '0', '0', '-preview']);
  assert(VERSION_PATTERN.test('QBNex Compiler V1.0.0'), '1.x banner');
  assert(!VERSION_PATTERN.test('QB64-PE Compiler V3.14.1'), 'QB64 is not QBNex');
});

test('Candidates: env hint first, then PATH, then install folders', () => {
  const env = { QBNEX_HOME: '/opt/custom', PATH: '/usr/bin:/bin' };
  const list = qbnexCandidates({ platform: 'linux', env });
  assert(list[0] === path.join('/opt/custom', 'qb'), `first is ${list[0]}`);
  assert(list.includes(path.join('/usr/bin', 'qb')), 'PATH entry');
  assert(list.some((p) => p.includes(path.join('.local', 'bin'))), 'user install');
  const win = qbnexCandidates({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Users\\a\\AppData\\Local', PATH: '' } });
  assert(win.includes(path.join('C:\\Users\\a\\AppData\\Local', 'Programs', 'QBNex', 'qb.exe')), 'Windows setup folder');
});

test('Companion tools: setting, next to the compiler, then PATH', () => {
  assertEqual(
    companionToolCandidates('qb-lsp', { configured: '/x/qb-lsp', compilerPath: '/opt/qbnex/qb', platform: 'linux' }),
    ['/x/qb-lsp', path.join('/opt/qbnex', 'qb-lsp'), path.join('/opt/qbnex', 'bin', 'qb-lsp'), 'qb-lsp'],
  );
});

test('A missing companion tool is reported as null', async () => {
  const { locateCompanionTool, findOnPath } = require('../src/toolchain/detect');
  assert((await locateCompanionTool('qb-no-such-tool', { env: { PATH: '' } })) === null, 'missing tool');
  const nodeName = path.basename(process.execPath);
  const found = await findOnPath(nodeName, { PATH: path.dirname(process.execPath) });
  assert(found === process.execPath, `Expected ${process.execPath}, got ${found}`);
});

test('A program that is not QBNex is rejected', async () => {
  assert((await verifyQBNex(process.execPath)) === null, 'node is not QBNex');
  assert((await verifyQBNex(path.join(__dirname, 'missing-qb'))) === null, 'missing file');
});

const REAL_QB = process.env.QBNEX_TEST_COMPILER;
test('Real QBNex (QBNEX_TEST_COMPILER): version and a diagnostic round trip', async () => {
  if (!REAL_QB) {
    console.log('     (skipped: set QBNEX_TEST_COMPILER to a qb executable)');
    return;
  }
  const found = await verifyQBNex(REAL_QB);
  assert(found && found.version.major >= 2, 'Expected QBNex 2.x');
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qbnx-tc-'));
  const bad = path.join(dir, 'bad.bas');
  fs.writeFileSync(bad, 'PRINT 1\nX = 1 +\n');
  const r = await runTool(REAL_QB, buildCheckArgs('qbnex', bad, path.join(dir, 'bad.qir')), { cwd: dir, timeoutMs: 60000 });
  const [d] = parseCompilerOutput(r.output, { sourcePath: bad });
  assert(r.code !== 0 && d && d.line === 1, `Expected an error on line 2, got ${JSON.stringify(d)}`);
});

// ── Process runner ──────────────────────────────────────────────────────────

test('runTool collects output and the exit code', async () => {
  const r = await runTool(process.execPath, ['-e', 'console.log("out"); console.error("err"); process.exit(3)']);
  assert(r.code === 3 && r.output.includes('out') && r.output.includes('err'), JSON.stringify(r));
});

test('runTool stops a hung process on timeout', async () => {
  const r = await runTool(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 300 });
  assert(r.timedOut === true, 'Expected timedOut');
});

test('runTool stops on cancellation', async () => {
  let cancel = null;
  const token = {
    isCancellationRequested: false,
    onCancellationRequested(fn) {
      cancel = fn;
      return { dispose() {} };
    },
  };
  const pending = runTool(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { token });
  setTimeout(() => cancel(), 200);
  const r = await pending;
  assert(r.canceled === true, 'Expected canceled');
});

test('runTool rejects when the program does not exist', async () => {
  let rejected = false;
  await runTool(path.join(__dirname, 'no-such-compiler')).catch(() => {
    rejected = true;
  });
  assert(rejected, 'Expected a rejection');
});

// ── Vendored qb-web ─────────────────────────────────────────────────────────

test('Vendored qb-web runs a QIR program from the classic-script loader', async () => {
  const vendor = path.join(__dirname, '..', 'vendor', 'qb-web');
  const loader = toClassicScript(fs.readFileSync(path.join(vendor, 'qbnex.js'), 'utf8'));
  assert(!/^export /m.test(loader), 'Expected no export statements left');
  const QBNex = new Function(`${loader}\nreturn QBNex;`)();
  const qb = await QBNex.load(fs.readFileSync(path.join(vendor, 'qb_web.wasm')), {});
  const r = qb.run(fs.readFileSync(path.join(__dirname, 'fixtures', 'hello.qir'), 'utf8'), '');
  assert(r.status === 0, `Expected status 0, got ${r.status}: ${r.message}`);
  assert(r.screenText.includes('Hello from QBNex'), 'Expected the greeting on the text screen');
  assert(/Line\s+10\s+- squared is\s+100/.test(r.screenText), 'Expected the loop output');
  assert(r.frame && r.frame.width > 0, 'Expected a final frame');
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
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
})();
