'use strict';

const os = require('os');
const path = require('path');

const {
  ensureExecutableReady,
  ensureOutputDirectoryReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getTerminalLaunchSpec,
  resolveExecutableOutputDir,
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

test('Output directory falls back to the source folder by default', () => {
  const sourcePath = path.join(os.tmpdir(), 'workspace', 'src', 'demo.bas');
  assert(
    resolveExecutableOutputDir(sourcePath, '') === path.dirname(sourcePath),
    'Blank output dir should fall back to the source folder',
  );
});

test('Relative output directory resolves from the workspace folder', () => {
  const workspaceDir = path.join(os.tmpdir(), 'workspace');
  const sourcePath = path.join(workspaceDir, 'src', 'demo.bas');
  const resolved = resolveExecutableOutputDir(sourcePath, 'build/artifacts', {
    workspaceDir,
  });

  assert(
    resolved === path.resolve(workspaceDir, 'build', 'artifacts'),
    'Relative output dir should resolve from the workspace folder',
  );
});

test('Absolute output directory is preserved', () => {
  const sourcePath = path.join(os.tmpdir(), 'workspace', 'src', 'demo.bas');
  const outputDir = path.join(os.tmpdir(), 'qbnx-out');
  assert(
    resolveExecutableOutputDir(sourcePath, outputDir) === path.normalize(outputDir),
    'Absolute output dir should be preserved',
  );
});

test('Home-relative output directory expands to the user home directory', () => {
  const sourcePath = path.join(os.tmpdir(), 'workspace', 'src', 'demo.bas');
  const resolved = resolveExecutableOutputDir(sourcePath, '~/qbnx-out');
  assert(
    resolved === path.join(os.homedir(), 'qbnx-out'),
    'Expected ~/ paths to expand to the user home directory',
  );
});

test('ensureOutputDirectoryReady creates a missing directory', async () => {
  const calls = [];
  const targetDir = path.join(os.tmpdir(), 'qbnx-new-dir');

  await ensureOutputDirectoryReady(
    {
      stat: async () => {
        const error = new Error('Not found');
        error.code = 'ENOENT';
        throw error;
      },
      mkdir: async (dirPath, options) => {
        calls.push(['mkdir', dirPath, options]);
      },
    },
    targetDir,
  );

  assert(
    JSON.stringify(calls) === JSON.stringify([
      ['mkdir', targetDir, { recursive: true }],
    ]),
    'Expected mkdir to be called for missing output directories',
  );
});

test('ensureOutputDirectoryReady rejects file paths', async () => {
  let error = null;
  const targetPath = path.join(os.tmpdir(), 'qbnx-file-target');

  try {
    await ensureOutputDirectoryReady(
      {
        stat: async () => ({
          isDirectory: () => false,
        }),
        mkdir: async () => {},
      },
      targetPath,
    );
  } catch (err) {
    error = err;
  }

  assert(error, 'Expected file-backed output path to throw');
  assert(
    error.message.includes('is not a directory'),
    'Expected a clear directory validation error',
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
