'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const constantsPath = path.join(rootDir, 'src', 'compiler', 'constants.js');
const parserCorePath = path.join(rootDir, 'src', 'compiler', 'parser', 'core.js');
const runtimePath = path.join(rootDir, 'src', 'webview', 'runtime.js');

const constantsSource = fs.readFileSync(constantsPath, 'utf8');
const parserCoreSource = fs.readFileSync(parserCorePath, 'utf8');
const runtimeSource = fs.readFileSync(runtimePath, 'utf8');

function fail(message) {
  throw new Error(message);
}

function extractObjectSource(source, objectName) {
  const anchor = `const ${objectName} = Object.freeze({`;
  const start = source.indexOf(anchor);
  if (start === -1) {
    fail(`Could not locate ${objectName} in constants.js`);
  }

  const bodyStart = start + anchor.length;
  let depth = 1;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (!inDouble && ch === '\'') {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) continue;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(bodyStart, i);
      }
    }
  }

  fail(`Could not extract ${objectName} body`);
}

function collectQuotedKeys(objectSource) {
  const keys = [];
  const regex = /^\s*'([^']+)'\s*:/gm;
  let match;

  while ((match = regex.exec(objectSource)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

function findDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates].sort();
}

function helperExists(helperName) {
  const helperPattern = new RegExp(
    `function\\s+${helperName.replace(/[$]/g, '\\$')}\\s*\\(`,
  );
  return helperPattern.test(parserCoreSource) || helperPattern.test(runtimeSource);
}

function collectDirectHelperRefs(objectSource) {
  const refs = [];
  const regex = /^\s*'([^']+)'\s*:\s*'(_[A-Za-z0-9$]+)'/gm;
  let match;

  while ((match = regex.exec(objectSource)) !== null) {
    refs.push({
      builtin: match[1],
      helper: match[2],
    });
  }

  return refs;
}

function run() {
  const builtinFuncsSource = extractObjectSource(constantsSource, 'BUILTIN_FUNCS');
  const builtinKeys = collectQuotedKeys(builtinFuncsSource);
  const duplicates = findDuplicateValues(builtinKeys);

  if (duplicates.length > 0) {
    fail(`Duplicate BUILTIN_FUNCS keys: ${duplicates.join(', ')}`);
  }

  const requiredMappings = [
    'BIN$',
    'DIR$',
    '_BIN$',
    '_CLIPBOARD$',
    '_CWD$',
    '_DIR$',
    '_DIREXISTS',
    '_FILEEXISTS',
    '_OS$',
    '_STARTDIR$',
  ];

  const missingMappings = requiredMappings.filter((name) => !builtinKeys.includes(name));
  if (missingMappings.length > 0) {
    fail(`Missing required built-in mappings: ${missingMappings.join(', ')}`);
  }

  const missingHelpers = collectDirectHelperRefs(builtinFuncsSource)
    .filter(({ helper }) => !helperExists(helper))
    .map(({ builtin, helper }) => `${builtin} -> ${helper}`);

  if (missingHelpers.length > 0) {
    fail(`Built-ins reference missing helpers: ${missingHelpers.join(', ')}`);
  }

  console.log('✅ Built-in audit passed');
  console.log(`   Checked ${builtinKeys.length} built-in mappings`);
  console.log(`   Verified ${requiredMappings.length} regression-critical mappings`);
}

run();
