'use strict';

const os = require('os');
const path = require('path');

const {
  buildPackagerArgs,
  ensureExecutableReady,
  ensureOutputDirectoryReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getNativeExecutableLabel,
  hasExperimentalMacosArm64Target,
  getTerminalLaunchSpec,
  isHostCompatibleTarget,
  normalizePackagerTargets,
  parsePackagerTarget,
  resolveExecutableOutputDir,
  shouldUsePortablePackaging,
  validatePackagerTargets,
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

test('Packager target normalization canonicalizes aliases and token order', () => {
  const targets = normalizePackagerTargets('windows-amd64, node20-darwin-aarch64, current');
  assert(
    JSON.stringify(targets) === JSON.stringify(['win-x64', 'node20-macos-arm64', 'host']),
    'Expected aliases to normalize to canonical pkg targets',
  );
});

test('Packager target parser extracts canonical target parts', () => {
  const parsed = parsePackagerTarget('node20-darwin-aarch64');
  assert(parsed.nodeRange === 'node20', 'Expected node range to be parsed');
  assert(parsed.platform === 'macos', 'Expected macOS platform alias to normalize');
  assert(parsed.arch === 'arm64', 'Expected arm64 alias to normalize');
  assert(parsed.canonical === 'node20-macos-arm64', 'Expected canonical target ordering');
});

test('Packager target validation rejects unknown tokens', () => {
  let error = null;
  try {
    validatePackagerTargets('linux-quantum');
  } catch (err) {
    error = err;
  }

  assert(error, 'Expected invalid target to throw');
  assert(
    error.message.includes('unknown token(s): quantum'),
    'Expected unknown token details in the validation error',
  );
});

test('Packager target validation rejects conflicting target categories', () => {
  let error = null;
  try {
    validatePackagerTargets('win-linux');
  } catch (err) {
    error = err;
  }

  assert(error, 'Expected conflicting target to throw');
  assert(
    error.message.includes('multiple platform tokens'),
    'Expected duplicate platform details in the validation error',
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

test('Home-relative internal output directory expands to the user home directory', () => {
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

test('Experimental macOS arm64 targets surface a signing note', () => {
  assert(
    hasExperimentalMacosArm64Target('macos-arm64'),
    'Expected macOS arm64 target to require a signing note',
  );
  assert(
    hasExperimentalMacosArm64Target('host', { platform: 'darwin', arch: 'arm64' }),
    'Expected arm64 macOS host builds to require a signing note',
  );
  assert(
    !hasExperimentalMacosArm64Target('linux-x64'),
    'Non-macOS targets should not require a signing note',
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
