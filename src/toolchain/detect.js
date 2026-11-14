/**
 * QBasic Nexus - Toolchain discovery
 *
 * Finds QBNex (`qb` / `qbnex`) and its companion tools (qb-lsp, qb-dap,
 * qb-fmt), and identifies an executable by asking it for its version.
 * QB64 / QB64-PE discovery stays in ../extension/qb64AutoDetect.js.
 * No VS Code dependency.
 */

'use strict';

const nodeFs = require('fs');
const fs = nodeFs.promises;
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const QBNEX_ENV_HINTS = Object.freeze(['QBNEX_HOME', 'QBNEX_PATH']);
const QBNEX_MIN_MAJOR = 2;
const VERSION_PATTERN = /QBNex(?:\s+Compiler)?\s+v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?/i;

function exeSuffix(platform = process.platform) {
  return platform === 'win32' ? '.exe' : '';
}

function expandHome(value) {
  const text = String(value || '').trim().replace(/^["']|["']$/g, '');
  if (!text) return '';
  if (text === '~') return os.homedir();
  if (text.startsWith('~/') || text.startsWith('~\\')) {
    return path.join(os.homedir(), text.slice(2));
  }
  return text;
}

/** Install folders the QBNex setup and common manual installs use. */
function qbnexInstallDirs(platform = process.platform, env = process.env) {
  const home = os.homedir();
  if (platform === 'win32') {
    const dirs = [];
    if (env.LOCALAPPDATA) dirs.push(path.join(env.LOCALAPPDATA, 'Programs', 'QBNex'));
    dirs.push('C:\\QBNex', 'C:\\Apps\\QBNex');
    if (env.ProgramFiles) dirs.push(path.join(env.ProgramFiles, 'QBNex'));
    return dirs;
  }
  return [
    path.join(home, '.local', 'bin'),
    path.join(home, '.local', 'share', 'qbnex'),
    '/opt/qbnex',
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
  ];
}

async function isFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  return !!stat && stat.isFile();
}

/**
 * Runs `<exe> --version` and parses the QBNex version line.
 * @param {string} exePath
 * @param {number} [timeoutMs]
 * @returns {Promise<{ major: number, minor: number, patch: number, label: string } | null>}
 */
function probeQBNexVersion(exePath, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let child;
    try {
      child = execFile(
        exePath,
        ['--version'],
        { timeout: timeoutMs, windowsHide: true, maxBuffer: 256 * 1024 },
        (error, stdout, stderr) => {
          const match = VERSION_PATTERN.exec(`${stdout || ''}\n${stderr || ''}`);
          if (!match) {
            resolve(null);
            return;
          }
          const [, major, minor, patch, pre] = match;
          resolve({
            major: Number(major),
            minor: Number(minor),
            patch: Number(patch),
            label: `${major}.${minor}.${patch}${pre || ''}`,
          });
        },
      );
    } catch {
      resolve(null);
      return;
    }
    child.stdin?.end();
  });
}

/** Ordered candidate paths for the QBNex compiler. */
function qbnexCandidates(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const suffix = exeSuffix(platform);
  const names = [`qb${suffix}`, `qbnex${suffix}`];
  const out = [];
  const add = (candidate) => {
    const value = expandHome(candidate);
    if (value && !out.includes(value)) out.push(value);
  };

  for (const hint of QBNEX_ENV_HINTS) {
    const dir = expandHome(env[hint]);
    if (!dir) continue;
    for (const name of names) {
      add(path.join(dir, name));
      add(path.join(dir, 'bin', name));
    }
  }

  const separator = platform === 'win32' ? ';' : ':';
  for (const dir of String(env.PATH || env.Path || '').split(separator).filter(Boolean)) {
    for (const name of names) add(path.join(dir, name));
  }

  for (const dir of qbnexInstallDirs(platform, env)) {
    for (const name of names) {
      add(path.join(dir, name));
      add(path.join(dir, 'bin', name));
    }
  }
  return out;
}

/**
 * Identifies a QBNex compiler. Resolves null for anything that does not
 * report a QBNex version (another program called `qb`, for example).
 * @param {string} exePath
 */
async function verifyQBNex(exePath) {
  const resolved = expandHome(exePath);
  if (!resolved || !(await isFile(resolved))) return null;
  const version = await probeQBNexVersion(resolved);
  if (!version) return null;
  return {
    path: resolved,
    version,
    supported: version.major >= QBNEX_MIN_MAJOR,
  };
}

/**
 * Finds the first QBNex compiler on this machine, preferring a 2.x release.
 * @param {{ platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv }} [options]
 */
async function findQBNex(options = {}) {
  let fallback = null;
  for (const candidate of qbnexCandidates(options)) {
    if (!(await isFile(candidate))) continue;
    const found = await verifyQBNex(candidate);
    if (!found) continue;
    if (found.supported) return found;
    fallback = fallback || found;
  }
  return fallback;
}

/**
 * Places to look for a QBNex companion tool, in order: the configured path,
 * next to the compiler, then the bare name (found through PATH at spawn).
 * @param {string} tool  qb-lsp | qb-dap | qb-fmt
 * @param {{ configured?: string, compilerPath?: string, platform?: NodeJS.Platform }} options
 */
function companionToolCandidates(tool, options = {}) {
  const platform = options.platform || process.platform;
  const name = tool + exeSuffix(platform);
  const out = [];
  const configured = expandHome(options.configured);
  if (configured) out.push(configured);
  if (options.compilerPath) {
    const dir = path.dirname(options.compilerPath);
    out.push(path.join(dir, name), path.join(dir, 'bin', name));
  }
  out.push(name);
  return out;
}

/**
 * Full path of an executable found on PATH, or null.
 * @param {string} name file name including any .exe suffix
 */
async function findOnPath(name, env = process.env, platform = process.platform) {
  const separator = platform === 'win32' ? ';' : ':';
  for (const dir of String(env.PATH || env.Path || '').split(separator).filter(Boolean)) {
    const candidate = path.join(dir, name);
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolves a companion tool to an existing file, or to its bare name when
 * none of the absolute candidates exists (the OS then searches PATH).
 */
async function findCompanionTool(tool, options = {}) {
  for (const candidate of companionToolCandidates(tool, options)) {
    if (!path.isAbsolute(candidate)) return candidate;
    if (await isFile(candidate)) return candidate;
  }
  return tool + exeSuffix(options.platform || process.platform);
}

/**
 * Like findCompanionTool, but null when the tool is neither at an absolute
 * candidate nor on PATH (so callers can explain what is missing).
 */
async function locateCompanionTool(tool, options = {}) {
  const command = await findCompanionTool(tool, options);
  if (path.isAbsolute(command)) return command;
  return findOnPath(command, options.env, options.platform);
}

module.exports = {
  QBNEX_MIN_MAJOR,
  VERSION_PATTERN,
  companionToolCandidates,
  expandHome,
  findCompanionTool,
  findOnPath,
  findQBNex,
  locateCompanionTool,
  probeQBNexVersion,
  qbnexCandidates,
  qbnexInstallDirs,
  verifyQBNex,
};
