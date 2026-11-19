'use strict';

const path = require('path');

function getExecutableExtension(platform = process.platform) {
  return platform === 'win32' || platform === 'win' ? '.exe' : '';
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

async function ensureExecutableReady(fsPromises, executablePath, platform = process.platform) {
  await fsPromises.access(executablePath);
  if (platform !== 'win32') {
    await fsPromises.chmod(executablePath, 0o755).catch(() => {});
  }
  return executablePath;
}

module.exports = {
  ensureExecutableReady,
  getExecutableExtension,
  getExecutableOutputPath,
  getTerminalLaunchSpec,
};
