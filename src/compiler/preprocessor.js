'use strict';

const fs = require('fs');
const path = require('path');
const { DiagnosticCollector, ErrorCategory } = require('./error-recovery');

const DIRECTIVE_RE = /^\s*\$(INCLUDE|DYNAMIC|STATIC)\b(.*)$/i;
const HAS_DIRECTIVE_RE = /^\s*\$(INCLUDE|DYNAMIC|STATIC)\b/im;
const MAX_INCLUDE_DEPTH = 32;

function formatPreprocessorErrors(diagnostics) {
  return diagnostics
    .getAll()
    .filter((diag) => diag.severity === 'error')
    .map((diag) => {
      const line = Number.isInteger(diag.line) ? diag.line + 1 : '?';
      const column = Number.isInteger(diag.column) ? diag.column : 0;
      return `line ${line}:${column} ${diag.message}`;
    })
    .join('; ');
}

function preprocessSource(source, options = {}) {
  const diagnostics = new DiagnosticCollector();
  const metadata = {
    directives: {
      dynamic: false,
      static: false,
    },
    includedFiles: [],
  };

  const sourcePath = options.sourcePath
    ? path.resolve(String(options.sourcePath))
    : null;
  const cwd = options.cwd ? path.resolve(String(options.cwd)) : process.cwd();
  const rootDir = sourcePath ? path.dirname(sourcePath) : cwd;

  const expandedSource = expandSource(String(source ?? ''), {
    diagnostics,
    metadata,
    currentDir: rootDir,
    sourcePath,
    includeStack: sourcePath ? [sourcePath] : [],
    depth: 0,
  });

  return {
    source: expandedSource,
    diagnostics,
    metadata,
  };
}

function expandSource(source, context) {
  if (context.depth > MAX_INCLUDE_DEPTH) {
    context.diagnostics.error(
      ErrorCategory.SYNTAX,
      `Maximum $INCLUDE depth of ${MAX_INCLUDE_DEPTH} exceeded`,
      0,
      0,
    );
    return source;
  }

  // Fast-path: completely skip array allocation + split + join if there's
  // no hint of a directive anywhere in the source block.
  if (!HAS_DIRECTIVE_RE.test(source)) {
    return source;
  }

  const lines = source.split(/\r?\n/);
  const output = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = DIRECTIVE_RE.exec(line);

    if (!match) {
      output.push(line);
      continue;
    }

    const directive = match[1].toUpperCase();
    const rest = match[2] || '';

    if (directive === 'DYNAMIC') {
      context.metadata.directives.dynamic = true;
      context.metadata.directives.static = false;
      output.push(`' ${line.trim()}`);
      continue;
    }

    if (directive === 'STATIC') {
      context.metadata.directives.static = true;
      context.metadata.directives.dynamic = false;
      output.push(`' ${line.trim()}`);
      continue;
    }

    const includePath = parseIncludePath(rest);
    if (!includePath) {
      context.diagnostics.error(
        ErrorCategory.SYNTAX,
        'Invalid $INCLUDE directive. Expected a quoted path.',
        index,
        0,
        Math.max(line.length, 1),
      );
      output.push(`' ${line.trim()}`);
      continue;
    }

    const resolvedPath = path.resolve(context.currentDir, includePath);
    if (context.includeStack.includes(resolvedPath)) {
      context.diagnostics.error(
        ErrorCategory.SYNTAX,
        `Circular $INCLUDE detected for "${resolvedPath}"`,
        index,
        0,
        Math.max(line.length, 1),
      );
      output.push(`' ${line.trim()}`);
      continue;
    }

    let includeSource;
    try {
      includeSource = fs.readFileSync(resolvedPath, 'utf8');
    } catch (_error) {
      context.diagnostics.error(
        ErrorCategory.SYNTAX,
        `Could not resolve $INCLUDE "${includePath}" from "${context.currentDir}"`,
        index,
        0,
        Math.max(line.length, 1),
      );
      output.push(`' ${line.trim()}`);
      continue;
    }

    context.metadata.includedFiles.push(resolvedPath);
    output.push(`' ${line.trim()}`);
    output.push(
      expandSource(includeSource, {
        diagnostics: context.diagnostics,
        metadata: context.metadata,
        currentDir: path.dirname(resolvedPath),
        sourcePath: resolvedPath,
        includeStack: [...context.includeStack, resolvedPath],
        depth: context.depth + 1,
      }),
    );
  }

  return output.join('\n');
}

function parseIncludePath(input) {
  const trimmed = String(input || '').trim().replace(/^:/, '').trim();
  const quotedMatch = trimmed.match(/^(['"])(.+)\1$/);

  if (quotedMatch) {
    return quotedMatch[2];
  }

  return null;
}

module.exports = {
  formatPreprocessorErrors,
  preprocessSource,
};
