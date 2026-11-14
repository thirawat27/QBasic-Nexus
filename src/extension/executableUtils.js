'use strict';

const os = require('os');
const path = require('path');

function expandHomeDir(inputPath) {
  const value = String(inputPath || '').trim();
  if (!value) return '';
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function getExecutableExtension(platform = process.platform) {
  return platform === 'win32' || platform === 'win' ? '.exe' : '';
}

/**
 * Folder the executable is written to: the configured output directory
 * (absolute, ~/..., or relative to the workspace folder), else the source's folder.
 */
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
    throw new Error(`Output path is not a directory: ${outputDir}`);
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
  ensureExecutableReady,
  ensureOutputDirectoryReady,
  expandHomeDir,
  getExecutableExtension,
  getExecutableOutputPath,
  getTerminalLaunchSpec,
  resolveExecutableOutputDir,
};
