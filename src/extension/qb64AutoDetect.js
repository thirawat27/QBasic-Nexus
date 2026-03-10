/**
 * QBasic Nexus - QB64 Auto-Detection System
 * Automatically detects QB64 installation across all platforms
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Common QB64 installation paths by platform
 */
const QB64_SEARCH_PATHS = {
  win32: [
    'C:\\QB64\\qb64.exe',
    'C:\\QB64pe\\qb64pe.exe',
    'C:\\Program Files\\QB64\\qb64.exe',
    'C:\\Program Files\\QB64pe\\qb64pe.exe',
    'C:\\Program Files (x86)\\QB64\\qb64.exe',
    'C:\\Program Files (x86)\\QB64pe\\qb64pe.exe',
    () => path.join(os.homedir(), 'QB64', 'qb64.exe'),
    () => path.join(os.homedir(), 'QB64pe', 'qb64pe.exe'),
    () => path.join(os.homedir(), 'Desktop', 'QB64', 'qb64.exe'),
    () => path.join(os.homedir(), 'Desktop', 'QB64pe', 'qb64pe.exe'),
    () => path.join(os.homedir(), 'Downloads', 'QB64', 'qb64.exe'),
    () => path.join(os.homedir(), 'Downloads', 'QB64pe', 'qb64pe.exe'),
    () => path.join(os.homedir(), 'Documents', 'QB64', 'qb64.exe'),
    () => path.join(os.homedir(), 'Documents', 'QB64pe', 'qb64pe.exe'),
  ],
  darwin: [
    '/Applications/QB64/qb64',
    '/Applications/QB64pe/qb64pe',
    () => path.join(os.homedir(), 'QB64', 'qb64'),
    () => path.join(os.homedir(), 'QB64pe', 'qb64pe'),
    () => path.join(os.homedir(), 'Applications', 'QB64', 'qb64'),
    () => path.join(os.homedir(), 'Applications', 'QB64pe', 'qb64pe'),
    () => path.join(os.homedir(), 'Desktop', 'QB64', 'qb64'),
    () => path.join(os.homedir(), 'Desktop', 'QB64pe', 'qb64pe'),
    () => path.join(os.homedir(), 'Downloads', 'QB64', 'qb64'),
    () => path.join(os.homedir(), 'Downloads', 'QB64pe', 'qb64pe'),
    '/usr/local/qb64/qb64',
    '/usr/local/qb64pe/qb64pe',
    '/opt/qb64/qb64',
    '/opt/qb64pe/qb64pe',
  ],
  linux: [
    () => path.join(os.homedir(), 'qb64', 'qb64'),
    () => path.join(os.homedir(), 'qb64pe', 'qb64pe'),
    '/opt/qb64/qb64',
    '/opt/qb64pe/qb64pe',
    '/usr/local/qb64/qb64',
    '/usr/local/qb64pe/qb64pe',
    '/usr/local/bin/qb64',
    '/usr/local/bin/qb64pe',
    '/usr/bin/qb64',
    '/usr/bin/qb64pe',
    () => path.join(os.homedir(), 'Desktop', 'qb64', 'qb64'),
    () => path.join(os.homedir(), 'Desktop', 'qb64pe', 'qb64pe'),
    () => path.join(os.homedir(), 'Downloads', 'qb64', 'qb64'),
    () => path.join(os.homedir(), 'Downloads', 'qb64pe', 'qb64pe'),
  ],
};

/**
 * Check if a file exists and is executable
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isExecutable(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return false;

    // On Unix-like systems, check execute permission
    if (process.platform !== 'win32') {
      try {
        await fs.access(filePath, fs.constants.X_OK);
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
 * Verify QB64 executable by checking if it responds correctly
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function verifyQB64(filePath) {
  try {
    // Basic check: file exists and is executable
    if (!(await isExecutable(filePath))) {
      return false;
    }

    // Additional verification: check if it's actually QB64
    // QB64 executables should be at least 1MB in size
    const stats = await fs.stat(filePath);
    if (stats.size < 1024 * 1024) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-detect QB64 installation path
 * @returns {Promise<string|null>} Path to QB64 executable or null if not found
 */
async function autoDetectQB64() {
  const platform = process.platform;
  const searchPaths = QB64_SEARCH_PATHS[platform] || QB64_SEARCH_PATHS.linux;

  // Resolve function paths and filter out invalid entries
  const resolvedPaths = searchPaths.map((p) =>
    typeof p === 'function' ? p() : p,
  );

  // Search for QB64 in common locations
  for (const searchPath of resolvedPaths) {
    try {
      if (await verifyQB64(searchPath)) {
        return searchPath;
      }
    } catch {
      // Continue searching
      continue;
    }
  }

  // Not found in common locations
  return null;
}

/**
 * Search for QB64 in PATH environment variable
 * @returns {Promise<string|null>}
 */
async function searchInPath() {
  const pathEnv = process.env.PATH || '';
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const paths = pathEnv.split(pathSeparator);

  const executableNames =
    process.platform === 'win32'
      ? ['qb64.exe', 'qb64pe.exe']
      : ['qb64', 'qb64pe'];

  for (const dir of paths) {
    for (const execName of executableNames) {
      const fullPath = path.join(dir, execName);
      try {
        if (await verifyQB64(fullPath)) {
          return fullPath;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Find QB64 installation using multiple detection methods
 * @returns {Promise<string|null>}
 */
async function findQB64() {
  // Method 1: Check common installation paths
  let qb64Path = await autoDetectQB64();
  if (qb64Path) return qb64Path;

  // Method 2: Search in PATH environment variable
  qb64Path = await searchInPath();
  if (qb64Path) return qb64Path;

  // Not found
  return null;
}

/**
 * Get platform-specific QB64 installation instructions
 * @returns {string}
 */
function getInstallInstructions() {
  const platform = process.platform;

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

  return instructions[platform] || instructions.linux;
}

module.exports = {
  autoDetectQB64,
  findQB64,
  verifyQB64,
  getInstallInstructions,
  QB64_SEARCH_PATHS,
};
