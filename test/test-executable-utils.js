'use strict';

const os = require('os');
const path = require('path');

const {
  buildPackagerArgs,
  ensureExecutableReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getNativeExecutableLabel,
  getTerminalLaunchSpec,
  isHostCompatibleTarget,
  normalizePackagerTargets,
  resolveExecutableOutputDir,
  shouldUsePortablePackaging,
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

test('Native executable label reflects the host platform wording', () => {
  assert(getNativeExecutableLabel('win32') === 'native .exe', 'Windows label mismatch');
  assert(getNativeExecutableLabel('linux') === 'native binary', 'Linux label mismatch');
});

test('Packager args target the host executable output', () => {
  const args = buildPackagerArgs('entry.js', 'demo.exe');
  assert(
    JSON.stringify(args) ===
      JSON.stringify(['entry.js', '--target', 'host', '--output', 'demo.exe', '--compress', 'GZip']),
    'Unexpected packager args',
  );
});

test('Packager target normalization trims, lowercases, and deduplicates', () => {
  const targets = normalizePackagerTargets(' host, WIN-x64 ,host, linux-x64 ');
  assert(
    JSON.stringify(targets) === JSON.stringify(['host', 'win-x64', 'linux-x64']),
    'Unexpected target normalization',
  );
});

test('Host compatibility detection distinguishes local and foreign targets', () => {
  assert(
    isHostCompatibleTarget('win-x64', { platform: 'win32', arch: 'x64' }),
    'Windows x64 target should match a Windows x64 host',
  );
  assert(
    !isHostCompatibleTarget('linux-x64', { platform: 'win32', arch: 'x64' }),
    'Linux x64 target should not match a Windows host',
  );
});

test('Cross-target packaging enables portable pkg flags', () => {
  const args = buildPackagerArgs('entry.js', '/tmp/out', {
    targets: 'host,linux-x64',
    platform: 'win32',
    arch: 'x64',
  });

  assert(args.includes('--targets'), 'Expected multi-target packaging');
  assert(args.includes('--out-path'), 'Expected out-path for multi-target packaging');
  assert(args.includes('--no-bytecode'), 'Expected portable no-bytecode flag');
  assert(args.includes('--public'), 'Expected portable public flag');
  assert(
    shouldUsePortablePackaging('host,linux-x64', { platform: 'win32', arch: 'x64' }),
    'Expected cross-target packaging to use portable flags',
  );
});

test('Internal output directory falls back to the source folder by default', () => {
  const sourcePath = path.join(os.tmpdir(), 'workspace', 'src', 'demo.bas');
  assert(
    resolveExecutableOutputDir(sourcePath, '') === path.dirname(sourcePath),
    'Blank output dir should fall back to the source folder',
  );
});

test('Relative internal output directory resolves from the workspace folder', () => {
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

test('Absolute internal output directory is preserved', () => {
  const sourcePath = path.join(os.tmpdir(), 'workspace', 'src', 'demo.bas');
  const outputDir = path.join(os.tmpdir(), 'qbnx-out');
  assert(
    resolveExecutableOutputDir(sourcePath, outputDir) === path.normalize(outputDir),
    'Absolute output dir should be preserved',
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
