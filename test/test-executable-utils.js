'use strict';

const os = require('os');
const path = require('path');

const {
  ensureExecutableReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getTerminalLaunchSpec,
} = require('../src/extension/executableUtils');

console.log('\n📦 Native Executable Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('Executable extension is platform-specific', () => {
  assert(getExecutableExtension('win32') === '.exe', 'Windows should use .exe');
  assert(getExecutableExtension('linux') === '', 'Linux should not use an extension');
  assert(getExecutableExtension('darwin') === '', 'macOS should not use an extension');
});

test('Executable output path keeps the source basename', () => {
  const sourcePath = path.join('/tmp', 'demo.bas');
  assert(
    getExecutableOutputPath(sourcePath, 'linux') === path.join('/tmp', 'demo'),
    'Linux output path should omit the extension',
  );
  assert(
    getExecutableOutputPath(sourcePath, 'win32') === path.join('/tmp', 'demo.exe'),
    'Windows output path should add .exe',
  );
});

test('Executable output path can target a custom output directory', () => {
  const sourcePath = path.join(os.tmpdir(), 'workspace', 'src', 'demo.bas');
  const outputDir = path.join(os.tmpdir(), 'workspace', 'dist');
  assert(
    getExecutableOutputPath(sourcePath, 'win32', outputDir) === path.join(outputDir, 'demo.exe'),
    'Windows output path should respect the custom output directory',
  );
});

test('Windows terminal launch spec uses cmd.exe quoting', () => {
  const launch = getTerminalLaunchSpec('C:\\Temp Folder\\demo.exe', {
    platform: 'win32',
    env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
  });

  assert(launch.shellPath === 'C:\\Windows\\System32\\cmd.exe', 'Expected cmd.exe shell path');
  assert(JSON.stringify(launch.shellArgs) === JSON.stringify(['/d']), 'Expected cmd.exe shell args');
  assert(launch.commandText === '"C:\\Temp Folder\\demo.exe"', 'Expected cmd quoting');
});

test('POSIX terminal launch spec uses shell quoting', () => {
  const launch = getTerminalLaunchSpec('/tmp/demo file', {
    platform: 'linux',
    env: { SHELL: '/bin/bash' },
  });

  assert(launch.shellPath === '/bin/bash', 'Expected POSIX shell path');
  assert(Array.isArray(launch.shellArgs) && launch.shellArgs.length === 0, 'Expected no shell args');
  assert(launch.commandText === "'/tmp/demo file'", 'Expected POSIX single-quote command');
});

test('ensureExecutableReady skips chmod on Windows', async () => {
  const calls = [];
  await ensureExecutableReady(
    {
      access: async (filePath) => {
        calls.push(['access', filePath]);
      },
      chmod: async () => {
        calls.push(['chmod']);
      },
    },
    'C:\\Temp\\demo.exe',
    'win32',
  );

  assert(JSON.stringify(calls) === JSON.stringify([['access', 'C:\\Temp\\demo.exe']]), 'Windows should only check file access');
});

test('ensureExecutableReady applies chmod on POSIX binaries', async () => {
  const calls = [];
  const filePath = path.join(os.tmpdir(), 'demo-bin');
  await ensureExecutableReady(
    {
      access: async (targetPath) => {
        calls.push(['access', targetPath]);
      },
      chmod: async (targetPath, mode) => {
        calls.push(['chmod', targetPath, mode]);
      },
    },
    filePath,
    'linux',
  );

  assert(
    JSON.stringify(calls) === JSON.stringify([
      ['access', filePath],
      ['chmod', filePath, 0o755],
    ]),
    'POSIX binaries should be made executable',
  );
});

async function run() {
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
}

void run();
