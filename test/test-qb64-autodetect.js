'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const {
  autoDetectQB64,
  searchInPath,
  verifyQB64,
  getQB64ExecutableNames,
  QB64_BANNER_PATTERN,
  extractQB64Banner,
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

  await test('QB64 banner pattern matches QB64, QB64-PE and forks only', async () => {
    const accepted = ['QB64 Compiler V2.1', 'QB64-PE Compiler V3.14.1', 'QB64 Phoenix Edition Compiler v4.0'];
    const rejected = ['QBNex Compiler', 'FreeBASIC Compiler - Version 1.10', 'node v24'];
    for (const banner of accepted) {
      if (!QB64_BANNER_PATTERN.test(banner)) throw new Error(`Expected banner to match: ${banner}`);
    }
    for (const banner of rejected) {
      if (QB64_BANNER_PATTERN.test(banner)) throw new Error(`Expected banner to be rejected: ${banner}`);
    }
  });

  await test('verifyQB64 probes renamed executables for a QB64-family banner', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qbnx-fork-'));
    const binaryPath = path.join(tempDir, process.platform === 'win32' ? 'mybasic.exe' : 'mybasic');
    try {
      await fs.writeFile(binaryPath, Buffer.alloc(1024 * 1024 + 32, 1));
      if (process.platform !== 'win32') await fs.chmod(binaryPath, 0o755);

      const probed = [];
      const accept = async (filePath) => { probed.push(filePath); return true; };
      const reject = async () => false;

      if (!(await verifyQB64(binaryPath, process.platform, { probe: accept }))) {
        throw new Error('Expected a renamed QB64-family compiler to pass');
      }
      if (probed.length !== 1) throw new Error('Expected the banner probe to run once');
      if (await verifyQB64(binaryPath, process.platform, { probe: reject })) {
        throw new Error('Expected a non-QB64 executable to be rejected');
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  await test('extractQB64Banner returns the compiler name and version line', async () => {
    const banner = extractQB64Banner('noise\r\nQB64-PE Compiler V3.14.1\r\n\r\nUsage: qb64pe [switches] <file>');
    if (banner !== 'QB64-PE Compiler V3.14.1') throw new Error(`Unexpected banner: ${banner}`);
    if (extractQB64Banner('FreeBASIC Compiler - Version 1.10') !== null) {
      throw new Error('Expected non-QB64 output to give no banner');
    }
  });

  await test('QB64_COMPILER points auto-detection at a specific executable', async () => {
    await withFakeQB64(async ({ binaryPath }) => {
      const detectedPath = await autoDetectQB64({
        env: { QB64_COMPILER: binaryPath },
        platform: process.platform,
        searchPaths: [],
      });
      if (path.resolve(detectedPath || '') !== path.resolve(binaryPath)) {
        throw new Error(`Expected QB64_COMPILER to be used, got ${detectedPath}`);
      }
    });
  });

  await test('verifyQB64 does not probe executables named qb64 / qb64pe', async () => {
    await withFakeQB64(async ({ binaryPath }) => {
      const probe = async () => { throw new Error('probe should not run'); };
      if (!(await verifyQB64(binaryPath, process.platform, { probe }))) {
        throw new Error('Expected a qb64-named binary to pass without probing');
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
