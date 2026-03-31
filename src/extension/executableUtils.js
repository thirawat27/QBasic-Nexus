'use strict';

const path = require('path');

const DEFAULT_PACKAGER_TARGET = 'host';
const DEFAULT_PACKAGER_COMPRESSION = 'GZip';
const PACKAGER_PLATFORMS = new Set(['alpine', 'linux', 'linuxstatic', 'win', 'macos', 'freebsd']);
const PACKAGER_ARCHITECTURES = new Set(['x64', 'arm64', 'armv6', 'armv7']);

function getPackagerPlatform(platform = process.platform) {
  if (platform === 'win32' || platform === 'win') return 'win';
  if (platform === 'darwin' || platform === 'macos') return 'macos';
  return platform;
}

function getExecutableExtension(platform = process.platform) {
  return getPackagerPlatform(platform) === 'win' ? '.exe' : '';
}

function getNativeExecutableLabel(platform = process.platform) {
  return platform === 'win32' ? 'native .exe' : 'native binary';
}

function resolveExecutableOutputDir(sourcePath, configuredOutputDir, options = {}) {
  const sourceDir = path.dirname(sourcePath);
  const rawOutputDir = String(configuredOutputDir || '').trim();
  if (!rawOutputDir) return sourceDir;

  if (path.isAbsolute(rawOutputDir)) {
    return path.normalize(rawOutputDir);
  }

  const workspaceDir = options.workspaceDir
    ? path.resolve(options.workspaceDir)
    : null;
  return path.resolve(workspaceDir || sourceDir, rawOutputDir);
}

function getExecutableOutputPath(
  sourcePath,
  platform = process.platform,
  outputDir = null,
) {
  const sourceDir = outputDir || path.dirname(sourcePath);
  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  return path.join(sourceDir, baseName + getExecutableExtension(platform));
}

function getPackagerTarget() {
  return DEFAULT_PACKAGER_TARGET;
}

function normalizePackagerTargets(value) {
  const rawTargets = Array.isArray(value)
    ? value.flatMap((item) => String(item || '').split(','))
    : String(value || DEFAULT_PACKAGER_TARGET).split(',');
  const normalized = [];
  const seen = new Set();

  for (const rawTarget of rawTargets) {
    const target = String(rawTarget || '').trim().toLowerCase();
    if (!target || seen.has(target)) continue;
    seen.add(target);
    normalized.push(target);
  }

  return normalized.length > 0 ? normalized : [DEFAULT_PACKAGER_TARGET];
}

function parsePackagerTarget(target) {
  const normalized = String(target || '').trim().toLowerCase();
  if (!normalized || normalized === 'host') {
    return {
      raw: DEFAULT_PACKAGER_TARGET,
      host: true,
      platform: null,
      arch: null,
      nodeRange: null,
    };
  }

  const parsed = {
    raw: normalized,
    host: false,
    platform: null,
    arch: null,
    nodeRange: null,
  };

  for (const token of normalized.split('-').filter(Boolean)) {
    if (/^(?:node\d+|latest)$/.test(token)) {
      parsed.nodeRange = token;
    } else if (PACKAGER_PLATFORMS.has(token)) {
      parsed.platform = token;
    } else if (PACKAGER_ARCHITECTURES.has(token)) {
      parsed.arch = token;
    }
  }

  return parsed;
}

function isHostCompatibleTarget(target, options = {}) {
  const parsed = parsePackagerTarget(target);
  if (parsed.host) return true;

  const hostPlatform = getPackagerPlatform(options.platform || process.platform);
  const hostArch = options.arch || process.arch;

  return (!parsed.platform || parsed.platform === hostPlatform) &&
    (!parsed.arch || parsed.arch === hostArch);
}

function shouldUsePortablePackaging(targets, options = {}) {
  return normalizePackagerTargets(targets).some(
    (target) => !isHostCompatibleTarget(target, options),
  );
}

function buildPackagerArgs(entryPath, outputPath, options = {}) {
  const normalizedTargets = normalizePackagerTargets(
    options.targets || options.target,
  );
  const args = [
    entryPath,
  ];

  if (normalizedTargets.length === 1) {
    args.push('--target', normalizedTargets[0], '--output', outputPath);
  } else {
    args.push('--targets', normalizedTargets.join(','), '--out-path', outputPath);
  }

  args.push('--compress', options.compression || DEFAULT_PACKAGER_COMPRESSION);

  if (options.portable !== false && shouldUsePortablePackaging(normalizedTargets, options)) {
    args.push('--no-bytecode', '--public-packages', '*', '--public');
  }

  return args;
}

function quoteForPosixShell(value) {
  return "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
}

function quoteForCmd(value) {
  return `"${String(value).replace(/"/g, '')}"`;
}

function getTerminalLaunchSpec(executablePath, options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const cwd = options.cwd || path.dirname(executablePath);

  if (platform === 'win32') {
    return {
      cwd,
      shellPath: env.ComSpec || 'cmd.exe',
      shellArgs: ['/d'],
      commandText: quoteForCmd(executablePath),
    };
  }

  return {
    cwd,
    shellPath: env.SHELL || '/bin/sh',
    shellArgs: [],
    commandText: quoteForPosixShell(executablePath),
  };
}

async function ensureExecutableReady(fsPromises, executablePath, platform = process.platform) {
  await fsPromises.access(executablePath);
  if (platform !== 'win32') {
    await fsPromises.chmod(executablePath, 0o755).catch(() => {});
  }
  return executablePath;
}

module.exports = {
  DEFAULT_PACKAGER_COMPRESSION,
  DEFAULT_PACKAGER_TARGET,
  buildPackagerArgs,
  ensureExecutableReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getNativeExecutableLabel,
  getPackagerPlatform,
  getPackagerTarget,
  getTerminalLaunchSpec,
  isHostCompatibleTarget,
  normalizePackagerTargets,
  parsePackagerTarget,
  resolveExecutableOutputDir,
  shouldUsePortablePackaging,
};
