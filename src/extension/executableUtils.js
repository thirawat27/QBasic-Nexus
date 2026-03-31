'use strict';

const os = require('os');
const path = require('path');

const DEFAULT_PACKAGER_TARGET = 'host';
const DEFAULT_PACKAGER_COMPRESSION = 'GZip';
const PACKAGER_PLATFORMS = new Set(['alpine', 'linux', 'linuxstatic', 'win', 'macos', 'freebsd']);
const PACKAGER_ARCHITECTURES = new Set(['x64', 'arm64', 'armv6', 'armv7']);
const PACKAGER_PLATFORM_ALIASES = Object.freeze({
  windows: 'win',
  win32: 'win',
  osx: 'macos',
  mac: 'macos',
  darwin: 'macos',
});
const PACKAGER_ARCH_ALIASES = Object.freeze({
  amd64: 'x64',
  'x86-64': 'x64',
  x86_64: 'x64',
  aarch64: 'arm64',
  armv6l: 'armv6',
  armv7l: 'armv7',
});
const PACKAGER_TARGET_ALIASES = Object.freeze({
  current: DEFAULT_PACKAGER_TARGET,
  native: DEFAULT_PACKAGER_TARGET,
});
const NODE_RANGE_PATTERN = /^(?:node\d+|latest)$/;

function expandHomeDir(inputPath) {
  const value = String(inputPath || '').trim();
  if (!value) return '';
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function normalizePackagerTargetToken(token) {
  const normalized = String(token || '').trim().toLowerCase();
  if (!normalized) return '';
  if (PACKAGER_TARGET_ALIASES[normalized]) {
    return PACKAGER_TARGET_ALIASES[normalized];
  }
  if (PACKAGER_PLATFORM_ALIASES[normalized]) {
    return PACKAGER_PLATFORM_ALIASES[normalized];
  }
  if (PACKAGER_ARCH_ALIASES[normalized]) {
    return PACKAGER_ARCH_ALIASES[normalized];
  }
  return normalized;
}

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
  const rawOutputDir = expandHomeDir(configuredOutputDir);
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

function parsePackagerTarget(target) {
  const normalized = normalizePackagerTargetToken(target);
  if (!normalized || normalized === 'host') {
    return {
      raw: DEFAULT_PACKAGER_TARGET,
      canonical: DEFAULT_PACKAGER_TARGET,
      host: true,
      platform: null,
      arch: null,
      nodeRange: null,
      unknownTokens: [],
      duplicateCategories: [],
    };
  }

  const parsed = {
    raw: normalized,
    canonical: normalized,
    host: false,
    platform: null,
    arch: null,
    nodeRange: null,
    unknownTokens: [],
    duplicateCategories: [],
  };

  for (const rawToken of normalized.split('-').filter(Boolean)) {
    const token = normalizePackagerTargetToken(rawToken);
    if (NODE_RANGE_PATTERN.test(token)) {
      if (parsed.nodeRange && parsed.nodeRange !== token) {
        parsed.duplicateCategories.push('Node.js version');
      } else {
        parsed.nodeRange = token;
      }
    } else if (PACKAGER_PLATFORMS.has(token)) {
      if (parsed.platform && parsed.platform !== token) {
        parsed.duplicateCategories.push('platform');
      } else {
        parsed.platform = token;
      }
    } else if (PACKAGER_ARCHITECTURES.has(token)) {
      if (parsed.arch && parsed.arch !== token) {
        parsed.duplicateCategories.push('architecture');
      } else {
        parsed.arch = token;
      }
    } else {
      parsed.unknownTokens.push(rawToken);
    }
  }

  const canonicalParts = [parsed.nodeRange, parsed.platform, parsed.arch].filter(Boolean);
  if (canonicalParts.length > 0) {
    parsed.canonical = canonicalParts.join('-');
  }

  return parsed;
}

function canonicalizePackagerTarget(target) {
  const parsed = parsePackagerTarget(target);
  if (parsed.host) return DEFAULT_PACKAGER_TARGET;
  if (parsed.unknownTokens.length > 0 || parsed.duplicateCategories.length > 0) {
    return parsed.raw;
  }
  return parsed.canonical;
}

function normalizePackagerTargets(value) {
  const rawTargets = Array.isArray(value)
    ? value.flatMap((item) => String(item || '').split(','))
    : String(value || DEFAULT_PACKAGER_TARGET).split(',');
  const normalized = [];
  const seen = new Set();

  for (const rawTarget of rawTargets) {
    const target = canonicalizePackagerTarget(rawTarget);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    normalized.push(target);
  }

  return normalized.length > 0 ? normalized : [DEFAULT_PACKAGER_TARGET];
}

function validatePackagerTargets(value) {
  const normalizedTargets = normalizePackagerTargets(value);
  const validatedTargets = [];
  const seen = new Set();

  for (const target of normalizedTargets) {
    const parsed = parsePackagerTarget(target);
    const problems = [];

    if (parsed.unknownTokens.length > 0) {
      problems.push(`unknown token(s): ${parsed.unknownTokens.join(', ')}`);
    }
    if (parsed.duplicateCategories.length > 0) {
      problems.push(`multiple ${parsed.duplicateCategories.join(' and ')} tokens`);
    }

    if (problems.length > 0) {
      throw new Error(
        `Invalid internal target "${target}". ${problems.join('; ')}. ` +
          'Use values like host, linux-x64, win-arm64, node20-macos-arm64, or comma-separated lists.',
      );
    }

    const canonical = parsed.host ? DEFAULT_PACKAGER_TARGET : parsed.canonical;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      validatedTargets.push(canonical);
    }
  }

  return validatedTargets.length > 0 ? validatedTargets : [DEFAULT_PACKAGER_TARGET];
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

function hasExperimentalMacosArm64Target(targets, options = {}) {
  const hostPlatform = getPackagerPlatform(options.platform || process.platform);
  const hostArch = options.arch || process.arch;

  return normalizePackagerTargets(targets).some((target) => {
    const parsed = parsePackagerTarget(target);
    if (parsed.host) {
      return hostPlatform === 'macos' && hostArch === 'arm64';
    }
    return parsed.platform === 'macos' && parsed.arch === 'arm64';
  });
}

function buildPackagerArgs(entryPath, outputPath, options = {}) {
  const normalizedTargets = validatePackagerTargets(
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

async function ensureOutputDirectoryReady(fsPromises, outputDir) {
  let stat = null;

  try {
    stat = await fsPromises.stat(outputDir);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  if (stat && !stat.isDirectory()) {
    throw new Error(`Internal output path is not a directory: ${outputDir}`);
  }

  await fsPromises.mkdir(outputDir, { recursive: true });
  return outputDir;
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
  ensureOutputDirectoryReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getNativeExecutableLabel,
  getPackagerPlatform,
  getPackagerTarget,
  hasExperimentalMacosArm64Target,
  getTerminalLaunchSpec,
  isHostCompatibleTarget,
  normalizePackagerTargets,
  parsePackagerTarget,
  resolveExecutableOutputDir,
  shouldUsePortablePackaging,
  validatePackagerTargets,
};
