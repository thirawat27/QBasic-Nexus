/**
 * QBasic Nexus - QB64 Auto-Detection System
 * Automatically detects QB64 installation across all platforms
 */

'use strict';

const nodeFs = require('fs');
const fs = nodeFs.promises;
const path = require('path');
const os = require('os');

const QB64_ENV_HINTS = [
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
 * Verify QB64 executable by checking if it looks like a real QB64 binary
 * @param {string} filePath
 * @param {NodeJS.Platform} [platform]
 * @returns {Promise<boolean>}
 */
async function verifyQB64(filePath, platform = process.platform) {
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

    return /^qb64(pe)?(?:\.exe)?$/.test(baseName) || parentName.includes('qb64');
  } catch {
    return false;
  }
}

/**
 * Auto-detect QB64 installation path
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, searchPaths?: Array<string|Function> }} [options]
 * @returns {Promise<string|null>} Path to QB64 executable or null if not found
 */
async function autoDetectQB64(options = {}) {
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
async function searchInPath(options = {}) {
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
async function findQB64(options = {}) {
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

module.exports = {
  autoDetectQB64,
  findQB64,
  searchInPath,
  verifyQB64,
  getInstallInstructions,
  QB64_SEARCH_PATHS,
  QB64_ENV_HINTS,
  getQB64ExecutableNames,
};
