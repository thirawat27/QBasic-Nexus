/**
 * QBasic Nexus - checks against real QB64 / QB64-PE installations.
 *
 *   node test/qb64-real.js <qb64 or qb64pe executable> [...more]
 *
 * For each compiler: detection, the default build (the 1.x command line),
 * a syntax error, an error inside a $INCLUDE file, warnings with -w, and the
 * check-only run (-x -z). Raw compiler output goes to <tmp>/qbnx-qb64-real/.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { buildCompileArgs, buildCheckArgs, runTool } = require('../src/toolchain/build');
const { parseCompilerOutput } = require('../src/toolchain/diagnostics');
const { verifyQB64, autoDetectQB64 } = require('../src/extension/qb64AutoDetect');

const compilers = process.argv.slice(2);
if (compilers.length === 0) {
  console.error('usage: node test/qb64-real.js <qb64 executable> [...]');
  process.exit(2);
}

const report = [];
let failures = 0;

function line(ok, text) {
  report.push(`  ${ok === null ? '➖' : ok ? '✅' : '❌'} ${text}`);
  if (ok === false) failures++;
}

async function run(exe, args, cwd, logFile) {
  const started = Date.now();
  const result = await runTool(exe, args, { cwd, timeoutMs: 15 * 60 * 1000 });
  fs.writeFileSync(logFile, `> ${exe} ${args.join(' ')}\nexit ${result.code} in ${Date.now() - started} ms\n\n${result.output}`);
  return { ...result, ms: Date.now() - started };
}

async function check(exe) {
  const label = path.basename(path.dirname(exe));
  report.push(`\n${label} (${exe})`);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `qbnx-qb64-real-${label}-`));
  const logs = path.join(os.tmpdir(), 'qbnx-qb64-real', label);
  fs.mkdirSync(logs, { recursive: true });

  // Detection, as the extension does it
  line(await verifyQB64(exe), 'recognized as QB64 (verifyQB64)');
  line((await autoDetectQB64({ searchPaths: [path.dirname(exe)], env: {} })) === exe, 'found by auto-detection in its folder');

  // Default build: exactly the 1.x command line
  const good = path.join(work, 'good.bas');
  fs.writeFileSync(good, '$CONSOLE:ONLY\nPRINT "Hello from QB64"\nFOR i = 1 TO 3: PRINT i * i: NEXT\nOPEN "good-out.txt" FOR OUTPUT AS #1: PRINT #1, "ran"; 3 * 3: CLOSE #1\nSYSTEM\n');
  const goodExe = path.join(work, process.platform === 'win32' ? 'good.exe' : 'good');
  const build = await run(exe, buildCompileArgs('qb64', good, goodExe, {}), work, path.join(logs, '1-build.txt'));
  const built = build.code === 0 && fs.existsSync(goodExe);
  line(built, `default build (-x -c -o) exit ${build.code}, ${(build.ms / 1000).toFixed(1)} s`);
  if (built) {
    let out;
    try {
      out = execFileSync(goodExe, [], { cwd: work, timeout: 20000, input: '' }).toString();
    } catch (error) {
      out = String(error.stdout || '');
    }
    const outFile = path.join(work, 'good-out.txt');
    const wrote = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
    line(/ran\s+9/.test(wrote), 'the built program runs (writes its output file)');
    // QB64 1.x writes to the console directly, so a pipe sees nothing; the extension runs programs in a terminal.
    const printed = /Hello from QB64/.test(out) && /\b9\b/.test(out);
    line(printed ? true : null, printed ? 'PRINT output reaches a pipe' : 'PRINT output does not reach a pipe (console-only, fine in a terminal)');
  }
  line(parseCompilerOutput(build.output, { sourcePath: good, compiler: 'qb64' }).filter((d) => d.severity === 'error').length === 0,
    'a clean build reports no errors');

  // Syntax error
  const bad = path.join(work, 'bad.bas');
  fs.writeFileSync(bad, 'PRINT "start"\nX = 1 +\nPRINT "end"\n');
  const badRun = await run(exe, buildCompileArgs('qb64', bad, path.join(work, 'bad.exe'), {}), work, path.join(logs, '2-bad.txt'));
  const badDiags = parseCompilerOutput(badRun.output, { sourcePath: bad, compiler: 'qb64' });
  line(badRun.code !== 0, `syntax error stops the build (exit ${badRun.code})`);
  line(badDiags.some((d) => d.severity === 'error' && d.line === 1 && path.basename(d.file) === 'bad.bas'),
    `syntax error reported on line 2: ${JSON.stringify(badDiags.map((d) => [d.line + 1, d.message]))}`);

  // Error inside an $INCLUDE file
  fs.writeFileSync(path.join(work, 'lib.bi'), 'DIM shared x AS INTEGER\ny = 2 *\n');
  const inc = path.join(work, 'inc.bas');
  fs.writeFileSync(inc, "'$INCLUDE: 'lib.bi'\nPRINT 1\n");
  const incRun = await run(exe, buildCompileArgs('qb64', inc, path.join(work, 'inc.exe'), {}), work, path.join(logs, '3-include.txt'));
  const incDiags = parseCompilerOutput(incRun.output, { sourcePath: inc, compiler: 'qb64' });
  line(incDiags.some((d) => d.severity === 'error'), `include error reported: ${JSON.stringify(incDiags.map((d) => [path.basename(d.file), d.line + 1, d.message]))}`);
  line(incDiags.some((d) => path.basename(d.file) === 'lib.bi' && d.line === 1), 'include error points at lib.bi line 2');

  // Warnings: only when the user turns on showWarnings
  const warn = path.join(work, 'warn.bas');
  fs.writeFileSync(warn, 'DIM unused AS INTEGER\nPRINT "ok"\n');
  const warnRun = await run(exe, buildCompileArgs('qb64', warn, path.join(work, 'warn.exe'), { warnings: true }), work, path.join(logs, '4-warnings.txt'));
  const warnDiags = parseCompilerOutput(warnRun.output, { sourcePath: warn, compiler: 'qb64' });
  line(warnRun.code === 0 ? true : null, `-w accepted (exit ${warnRun.code})${warnRun.code === 0 ? '' : ' - this release rejects -w'}`);
  line(warnDiags.some((d) => d.severity === 'warning') ? true : null,
    `warnings parsed: ${JSON.stringify(warnDiags.map((d) => [d.line + 1, d.severity, d.message.split('\n')[0]]))}`);

  // Check-only run (qb64CheckOnSave / Check for Errors)
  const checkRun = await run(exe, buildCheckArgs('qb64', bad, ''), work, path.join(logs, '5-check.txt'));
  const checkDiags = parseCompilerOutput(checkRun.output, { sourcePath: bad, compiler: 'qb64' });
  line(checkDiags.some((d) => d.severity === 'error' && d.line === 1),
    `-x -z finds the syntax error (exit ${checkRun.code}, ${(checkRun.ms / 1000).toFixed(1)} s)`);
  const cleanCheck = await run(exe, buildCheckArgs('qb64', good, ''), work, path.join(logs, '6-check-clean.txt'));
  line(cleanCheck.code === 0 && parseCompilerOutput(cleanCheck.output, { sourcePath: good, compiler: 'qb64' }).length === 0,
    `-x -z on a clean file: exit ${cleanCheck.code}, ${(cleanCheck.ms / 1000).toFixed(1)} s, no diagnostics`);
  line(!fs.readdirSync(work).some((f) => /\.(c|cpp|h)$/i.test(f)), '-x -z leaves no generated files beside the source');

  report.push(`  logs: ${logs}`);
}

(async () => {
  for (const exe of compilers) {
    try {
      await check(path.resolve(exe));
    } catch (error) {
      line(false, `crashed: ${error.stack || error}`);
    }
  }
  console.log(report.join('\n'));
  console.log(`\n${failures === 0 ? 'All required checks passed' : `${failures} check(s) failed`}`);
  process.exit(failures > 0 ? 1 : 0);
})();
