'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const {
  autoDetectQB64,
  searchInPath,
  verifyQB64,
  getQB64ExecutableNames,
} = require('../src/extension/qb64AutoDetect');

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

async function withFakeQB64(testFn) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qbnx-qb64-'));
  const binaryName = process.platform === 'win32' ? 'qb64.exe' : 'qb64';
  const binaryPath = path.join(tempDir, binaryName);

  try {
    await fs.writeFile(binaryPath, Buffer.alloc(1024 * 1024 + 32, 1));
    if (process.platform !== 'win32') {
      await fs.chmod(binaryPath, 0o755);
    }

    await testFn({ tempDir, binaryPath });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('\n📦 QB64 Auto-Detect Tests');

  await test('Executable names match each platform convention', async () => {
    const winNames = getQB64ExecutableNames('win32');
    const posixNames = getQB64ExecutableNames('linux');

    if (!winNames.includes('qb64.exe')) {
      throw new Error('Windows executable list is missing qb64.exe');
    }

    if (!posixNames.includes('qb64')) {
      throw new Error('POSIX executable list is missing qb64');
    }
  });

  await test('verifyQB64 accepts a plausible QB64 binary', async () => {
    await withFakeQB64(async ({ binaryPath }) => {
      if (!(await verifyQB64(binaryPath))) {
        throw new Error('Expected fake QB64 binary to pass verification');
      }
    });
  });

  await test('autoDetectQB64 honors QB64_HOME-style environment hints', async () => {
    await withFakeQB64(async ({ tempDir, binaryPath }) => {
      const env = {
        ...process.env,
        QB64_HOME: tempDir,
        QB64_PATH: '',
        QB64PE_HOME: '',
        QB64PE_PATH: '',
      };

      const detectedPath = await autoDetectQB64({
        env,
        platform: process.platform,
        searchPaths: [],
      });

      if (detectedPath !== path.resolve(binaryPath)) {
        throw new Error(`Expected ${binaryPath}, got ${detectedPath}`);
      }
    });
  });

  await test('searchInPath finds QB64 binaries on PATH', async () => {
    await withFakeQB64(async ({ tempDir, binaryPath }) => {
      const separator = process.platform === 'win32' ? ';' : ':';
      const env = {
        ...process.env,
        PATH: [tempDir, process.env.PATH || ''].filter(Boolean).join(separator),
      };

      const detectedPath = await searchInPath({
        env,
        platform: process.platform,
      });

      if (detectedPath !== path.resolve(binaryPath)) {
        throw new Error(`Expected ${binaryPath}, got ${detectedPath}`);
      }
    });
  });

  console.log('\n════════════════════════════════════════');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n❌ QB64 auto-detect test suite crashed: ${error.message}`);
  process.exit(1);
});
