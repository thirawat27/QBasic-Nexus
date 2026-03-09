'use strict';

const MAX_WEBVIEW_CODE_SIZE = 8 * 1024 * 1024;
const PKG_TARGETS = Object.freeze({
  win32: {
    x64: 'node18-win-x64',
    arm64: 'node18-win-arm64',
  },
  darwin: {
    x64: 'node18-macos-x64',
    arm64: 'node18-macos-arm64',
  },
  linux: {
    x64: 'node18-linux-x64',
    arm64: 'node18-linux-arm64',
  },
  alpine: {
    x64: 'node18-alpine-x64',
  },
});

function splitCommandLineArgs(value) {
  if (!value || typeof value !== 'string') return [];

  const args = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];

    if (quote) {
      if (ch === '\\' && i + 1 < value.length) {
        const next = value[i + 1];
        if (next === quote || next === '\\') {
          current += next;
          i++;
          continue;
        }
      }

      if (ch === quote) {
        quote = null;
        continue;
      }

      current += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    current += ch;
  }

  if (current || quote !== null) {
    args.push(current);
  }

  return args;
}

function buildWebviewCsp(cspSource) {
  return `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-eval'; img-src ${cspSource} data: blob:;`;
}

function validateWebviewCodePayload(code) {
  if (typeof code !== 'string') {
    return 'Generated webview code must be a string.';
  }

  if (code.length > MAX_WEBVIEW_CODE_SIZE) {
    return `Generated program is too large for the CRT runtime (${code.length} bytes > ${MAX_WEBVIEW_CODE_SIZE} bytes).`;
  }

  return null;
}

function resolvePkgTarget(platform = process.platform, arch = process.arch) {
  const platformTargets = PKG_TARGETS[platform];
  if (!platformTargets) {
    throw new Error(`Unsupported packaging platform: ${platform}`);
  }

  const target = platformTargets[arch];
  if (!target) {
    throw new Error(
      `Unsupported packaging architecture for ${platform}: ${arch}`,
    );
  }

  return target;
}

function parseQb64CompilerOutput(output, filename) {
  if (!output || !filename) return [];

  const diagnostics = [];
  const expectedFile = String(filename).toLowerCase();
  const pattern =
    /([^\r\n\\/]+\.(?:bas|bi|bm))[:(](\d+)(?:[:)])?\s*(?:\d+:)?\s*(?:(error|warning))?:?\s*([^\r\n]+)/gi;

  let match;
  while ((match = pattern.exec(output)) !== null) {
    const [, file, lineStr, severityToken, message] = match;

    if (file.toLowerCase() !== expectedFile) {
      continue;
    }

    diagnostics.push({
      line: Math.max(0, parseInt(lineStr, 10) - 1),
      severity:
        String(severityToken || '').toLowerCase() === 'warning'
          ? 'warning'
          : 'error',
      message: message.trim(),
    });
  }

  return diagnostics;
}

module.exports = {
  MAX_WEBVIEW_CODE_SIZE,
  splitCommandLineArgs,
  buildWebviewCsp,
  validateWebviewCodePayload,
  resolvePkgTarget,
  parseQb64CompilerOutput,
};
