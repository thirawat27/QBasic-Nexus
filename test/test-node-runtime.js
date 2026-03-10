'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const InternalTranspiler = require('../src/compiler/transpiler');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runNodeProgram(source, options = {}) {
  const transpiler = new InternalTranspiler();
  const code = transpiler.transpile(source, 'node');
  const tempFile = path.join(
    os.tmpdir(),
    `qbnx-node-runtime-${Date.now()}-${Math.random().toString(16).slice(2)}.js`,
  );

  fs.writeFileSync(tempFile, code, 'utf8');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tempFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      try {
        fs.unlinkSync(tempFile);
      } catch {
        /* ignore */
      }
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      finish({
        code: null,
        signal: 'SIGTERM',
        stdout,
        stderr,
        timedOut: true,
      });
    }, options.timeoutMs ?? 1500);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', fail);
    child.on('close', (code, signal) => {
      finish({
        code,
        signal,
        stdout,
        stderr,
        timedOut: false,
      });
    });

    if (options.stdin) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

async function main() {
  console.log('\n📦 Node Runtime Compatibility Tests');

  await test('graphics commands do not crash in node target', async () => {
    const source = [
      'SCREEN 12',
      'CIRCLE (10, 10), 5, 14',
      'PSET (1, 1), 4',
      'PRINT "OK"',
      'END',
    ].join('\n');

    const result = await runNodeProgram(source);

    assert(!/Runtime Error/i.test(result.stderr), result.stderr || 'Unexpected runtime error');
    assert(result.stdout.includes('OK'), `Expected node runtime output to include OK.\n${result.stdout}`);
  });

  await test('gorillas.bas starts without crashing in node target', async () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'gorillas.bas'),
      'utf8',
    );
    const result = await runNodeProgram(source, {
      stdin: '45\n50\n',
      timeoutMs: 1200,
    });

    assert(
      result.stdout.includes('Gorillas - ลิงปาระเบิด!'),
      `Expected gorillas banner in stdout.\n${result.stdout}`,
    );
    assert(
      !/Runtime Error/i.test(result.stderr),
      result.stderr || 'Unexpected runtime error while starting gorillas.bas',
    );
  });

  console.log('\n════════════════════════════════════════');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n❌ Node runtime test suite crashed: ${error.message}`);
  process.exit(1);
});
