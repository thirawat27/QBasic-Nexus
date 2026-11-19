/**
 * QBasic Nexus - QB64 Auto-Detection System
 * Automatically detects QB64 installation across all platforms
 */

import nodeFs = require('fs');
const fs = nodeFs.promises;
import path = require('path');
import os = require('os');
import { execFile } from 'child_process';

/** Overrides used by tests; defaults come from the running process. */
interface DetectOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  searchPaths?: Array<string | ((env: NodeJS.ProcessEnv) => string | string[] | null)>;
}

// Any QB64-family compiler (QB64, QB64-PE, or a fork built from them) prints a
// banner such as "QB64 Compiler V2.1" or "QB64-PE Compiler V3.14" for `-?`.
const QB64_BANNER_PATTERN = /\bQB64\b[^\r\n]*\bCompiler\b/i;
const BANNER_PROBE_TIMEOUT_MS = 5000;
const bannerProbeCache = new Map();

const QB64_ENV_HINTS = [
  // Full path to any QB64-family compiler executable, including forks with
  // their own executable name (verified through the `-?` banner).
  'QB64_COMPILER',
  'QB64_PATH',
  'QB64_HOME',
  'QB64PE_PATH',
  'QB64PE_HOME',
];

/**
 * Common QB64 installation paths by platform
 */
const QB64_SEARCH_PATHS = {
  win32: [
    'C:\\QB64',
    'C:\\QB64pe',
    'C:\\Program Files\\QB64',
    'C:\\Program Files\\QB64pe',
    'C:\\Program Files (x86)\\QB64',
    'C:\\Program Files (x86)\\QB64pe',
    () => path.join(os.homedir(), 'QB64'),
    () => path.join(os.homedir(), 'QB64pe'),
    () => path.join(os.homedir(), 'Desktop', 'QB64'),
    () => path.join(os.homedir(), 'Desktop', 'QB64pe'),
    () => path.join(os.homedir(), 'Downloads', 'QB64'),
    () => path.join(os.homedir(), 'Downloads', 'QB64pe'),
    () => path.join(os.homedir(), 'Documents', 'QB64'),
    () => path.join(os.homedir(), 'Documents', 'QB64pe'),
  ],
  darwin: [
    '/Applications/QB64',
    '/Applications/QB64pe',
    () => path.join(os.homedir(), 'QB64'),
    () => path.join(os.homedir(), 'QB64pe'),
    () => path.join(os.homedir(), 'Applications', 'QB64'),
    () => path.join(os.homedir(), 'Applications', 'QB64pe'),
    () => path.join(os.homedir(), 'Desktop', 'QB64'),
    () => path.join(os.homedir(), 'Desktop', 'QB64pe'),
    () => path.join(os.homedir(), 'Downloads', 'QB64'),
    () => path.join(os.homedir(), 'Downloads', 'QB64pe'),
    '/usr/local/qb64',
    '/usr/local/qb64pe',
    '/opt/qb64',
    '/opt/qb64pe',
    '/usr/local/bin',
  ],
  linux: [
    () => path.join(os.homedir(), 'qb64'),
    () => path.join(os.homedir(), 'qb64pe'),
    '/opt/qb64',
    '/opt/qb64pe',
    '/usr/local/qb64',
    '/usr/local/qb64pe',
    '/usr/local/bin',
    '/usr/bin',
    () => path.join(os.homedir(), 'Desktop', 'qb64'),
    () => path.join(os.homedir(), 'Desktop', 'qb64pe'),
    () => path.join(os.homedir(), 'Downloads', 'qb64'),
    () => path.join(os.homedir(), 'Downloads', 'qb64pe'),
  ],
};

function normalizeCandidatePath(candidate) {
  if (!candidate) return null;

  let value = String(candidate).trim();
  if (!value) return null;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  if (!value) return null;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
}

function getQB64ExecutableNames(platform = process.platform) {
  return platform === 'win32'
    ? ['qb64pe.exe', 'qb64.exe']
    : ['qb64pe', 'qb64'];
}

function getEnvironmentSearchPaths(env = process.env) {
  return QB64_ENV_HINTS.map((name) => normalizeCandidatePath(env[name])).filter(
    Boolean,
  );
}

function resolveSearchEntries(entries = []) {
  return entries
    .map((entry) => (typeof entry === 'function' ? entry() : entry))
    .map(normalizeCandidatePath)
    .filter(Boolean);
}

async function expandCandidatePath(candidatePath, platform = process.platform) {
  const normalizedPath = normalizeCandidatePath(candidatePath);
  if (!normalizedPath) return [];

  const stats = await fs.stat(normalizedPath).catch(() => null);
  if (stats?.isDirectory()) {
    return getQB64ExecutableNames(platform).map((name) =>
      path.join(normalizedPath, name),
    );
  }

  return [normalizedPath];
}

async function collectCandidatePaths(searchEntries, platform = process.platform) {
  const candidates = [];
  const seen = new Set();

  for (const searchEntry of resolveSearchEntries(searchEntries)) {
    const expandedPaths = await expandCandidatePath(searchEntry, platform);

    for (const candidatePath of expandedPaths) {
      const resolvedPath = path.resolve(candidatePath);
      if (!seen.has(resolvedPath)) {
        seen.add(resolvedPath);
        candidates.push(resolvedPath);
      }
    }
  }

  return candidates;
}

/**
 * Check if a file exists and is executable
 * @param {string} filePath
 * @param {NodeJS.Platform} [platform]
 * @returns {Promise<boolean>}
 */
async function isExecutable(filePath, platform = process.platform) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return false;

    if (platform !== 'win32') {
      try {
        await fs.access(filePath, nodeFs.constants.X_OK);
      } catch {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Pick the QB64-family banner line ("QB64-PE Compiler V3.14.1") out of
 * compiler output.
 * @param {string} output
 * @returns {string|null}
 */
function extractQB64Banner(output) {
  const match = QB64_BANNER_PATTERN.exec(String(output || ''));
  if (!match) return null;
  const start = output.lastIndexOf('\n', match.index) + 1;
  const end = output.indexOf('\n', match.index);
  return output.slice(start, end === -1 ? undefined : end).trim();
}

/**
 * Run `<exe> -?` and return its QB64-family banner line, or null.
 * Results are cached per path, size and modification time.
 * @param {string} filePath
 * @param {import('fs').Stats} stats
 * @returns {Promise<string|null>}
 */
function readCompilerBanner(filePath, stats) {
  const key = `${filePath}|${stats.size}|${stats.mtimeMs}`;
  if (!bannerProbeCache.has(key)) {
    bannerProbeCache.set(
      key,
      new Promise((resolve) => {
        try {
          execFile(
            filePath,
            ['-?'],
            {
              cwd: path.dirname(filePath),
              timeout: BANNER_PROBE_TIMEOUT_MS,
              windowsHide: true,
              maxBuffer: 256 * 1024,
            },
            (_error, stdout, stderr) => {
              resolve(extractQB64Banner(`${stdout || ''}\n${stderr || ''}`));
            },
          );
        } catch {
          resolve(null);
        }
      }),
    );
  }
  return bannerProbeCache.get(key);
}

async function probeQB64Banner(filePath, stats) {
  return (await readCompilerBanner(filePath, stats)) !== null;
}

/**
 * Name and version of a QB64-family compiler, e.g. "QB64-PE Compiler V3.14.1".
 * @param {string} filePath
 * @returns {Promise<string|null>} null when the banner cannot be read
 */
async function getCompilerIdentity(filePath) {
  try {
    const normalizedPath = normalizeCandidatePath(filePath);
    if (!normalizedPath) return null;
    const stats = await fs.stat(normalizedPath);
    return await readCompilerBanner(normalizedPath, stats);
  } catch {
    return null;
  }
}

/**
 * Verify that a path is a QB64-family compiler executable.
 * Files named qb64 / qb64pe (or inside a qb64* folder) are accepted directly;
 * any other executable is accepted when its `-?` banner identifies it as a
 * QB64-family compiler, so forks and renamed builds work too.
 * @param {string} filePath
 * @param {NodeJS.Platform} [platform]
 * @param {{ probe?: (filePath: string, stats: import('fs').Stats) => Promise<boolean> }} [options]
 * @returns {Promise<boolean>}
 */
async function verifyQB64(
  filePath: string,
  platform: NodeJS.Platform = process.platform,
  options: { probe?: (filePath: string, stats: import('fs').Stats) => Promise<boolean> } = {},
) {
  try {
    const normalizedPath = normalizeCandidatePath(filePath);
    if (!normalizedPath) return false;

    if (!(await isExecutable(normalizedPath, platform))) {
      return false;
    }

    const stats = await fs.stat(normalizedPath);
    if (stats.size < 1024 * 1024) {
      return false;
    }

    const baseName = path.basename(normalizedPath).toLowerCase();
    const parentName = path.basename(path.dirname(normalizedPath)).toLowerCase();
    if (/^qb64(pe)?(?:\.exe)?$/.test(baseName) || parentName.includes('qb64')) {
      return true;
    }

    const probe = options.probe || probeQB64Banner;
    return await probe(normalizedPath, stats);
  } catch {
    return false;
  }
}

/**
 * Auto-detect QB64 installation path
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, searchPaths?: Array<string|Function> }} [options]
 * @returns {Promise<string|null>} Path to QB64 executable or null if not found
 */
async function autoDetectQB64(options: DetectOptions = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const searchPaths = [
    ...getEnvironmentSearchPaths(env),
    ...(options.searchPaths ||
      QB64_SEARCH_PATHS[platform] ||
      QB64_SEARCH_PATHS.linux),
  ];
  const candidatePaths = await collectCandidatePaths(searchPaths, platform);

  for (const searchPath of candidatePaths) {
    try {
      if (await verifyQB64(searchPath, platform)) {
        return searchPath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Search for QB64 in PATH environment variable
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv }} [options]
 * @returns {Promise<string|null>}
 */
async function searchInPath(options: DetectOptions = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const pathEnv = env.PATH || '';
  const separator = platform === 'win32' ? ';' : ':';
  const pathEntries = pathEnv.split(separator).filter(Boolean);
  const candidatePaths = await collectCandidatePaths(pathEntries, platform);

  for (const candidatePath of candidatePaths) {
    try {
      if (await verifyQB64(candidatePath, platform)) {
        return candidatePath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Find QB64 installation using multiple detection methods
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, searchPaths?: Array<string|Function> }} [options]
 * @returns {Promise<string|null>}
 */
async function findQB64(options: DetectOptions = {}) {
  let qb64Path = await autoDetectQB64(options);
  if (qb64Path) return qb64Path;

  qb64Path = await searchInPath(options);
  if (qb64Path) return qb64Path;

  return null;
}

/**
 * Get platform-specific QB64 installation instructions
 * @returns {string}
 */
function getInstallInstructions() {
  const instructions = {
    win32: `
Windows Installation:
1. Download QB64 from https://qb64.com/ or https://qb64phoenix.com/
2. Extract to C:\\QB64\\ or C:\\Program Files\\QB64\\
3. No additional setup required
`,
    darwin: `
macOS Installation:
1. Download QB64 from https://qb64.com/ or https://qb64phoenix.com/
2. Extract to /Applications/QB64/ or ~/QB64/
3. Install Xcode Command Line Tools: xcode-select --install
4. Run setup script: sh ./setup_osx.command
`,
    linux: `
Linux Installation:
1. Download QB64 from https://qb64.com/ or https://qb64phoenix.com/
2. Extract to ~/qb64/ or /opt/qb64/
3. Install build tools: sudo apt-get install build-essential
4. Run setup script: sh ./setup_lnx.sh
`,
  };

  return instructions[process.platform] || instructions.linux;
}

export {
  autoDetectQB64,
  findQB64,
  searchInPath,
  verifyQB64,
  getInstallInstructions,
  QB64_SEARCH_PATHS,
  QB64_ENV_HINTS,
  getQB64ExecutableNames,
  QB64_BANNER_PATTERN,
  extractQB64Banner,
  getCompilerIdentity,
};
