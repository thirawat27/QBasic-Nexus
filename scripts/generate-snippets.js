'use strict';

const fs = require('fs');
const path = require('path');
const { KEYWORDS, FUNCTIONS } = require('../languageData');
const { sanitizeSnippetBody } = require('../src/shared/snippetSanitizer');

const snippetsPath = path.join(__dirname, '..', 'snippets', 'qbasic.json');

const STATEMENT_STYLE_FUNCTION_SNIPPETS = Object.freeze({
  SHELL: 'SHELL ${1:command$}',
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isGeneratedSnippetName(name) {
  return name.startsWith('Keyword: ') || name.startsWith('Function: ');
}

function readHandcraftedSnippets() {
  const existing = fs.existsSync(snippetsPath)
    ? readJson(snippetsPath)
    : {};
  return Object.fromEntries(
    Object.entries(existing).filter(([name]) => !isGeneratedSnippetName(name)),
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildTokenAliases(token) {
  const raw = String(token || '').trim().toLowerCase();
  const collapsed = raw.replace(/\s+/g, '');
  return unique([
    raw,
    collapsed,
  ]);
}

function buildNamespacedPrefixes(namespace, token) {
  const aliases = buildTokenAliases(token);
  return unique(
    aliases.flatMap((alias) => [`${namespace} ${alias}`, `${namespace}${alias}`]),
  );
}

function escapeSnippetText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\}/g, '\\}');
}

function buildFunctionBody(name, entry) {
  if (STATEMENT_STYLE_FUNCTION_SNIPPETS[name]) {
    return [STATEMENT_STYLE_FUNCTION_SNIPPETS[name]];
  }

  const params = Array.isArray(entry.params) ? entry.params : [];
  if (params.length === 0) {
    return [name];
  }

  const placeholders = params
    .map((param, index) => `\${${index + 1}:${escapeSnippetText(param)}}`)
    .join(', ');
  return [`${name}(${placeholders})`];
}

function buildKeywordSnippets() {
  const generated = {};
  for (const [key, entry] of Object.entries(KEYWORDS).sort(([left], [right]) => left.localeCompare(right))) {
    const label = entry.label || key;
    generated[`Keyword: ${label}`] = {
      prefix: buildNamespacedPrefixes('kw', label),
      body: [label],
      description: `${entry.detail}. Inserts the ${label} keyword.`,
    };
  }
  return generated;
}

function buildFunctionSnippets() {
  const generated = {};
  for (const [name, entry] of Object.entries(FUNCTIONS).sort(([left], [right]) => left.localeCompare(right))) {
    generated[`Function: ${name}`] = {
      prefix: buildNamespacedPrefixes('fn', name),
      body: buildFunctionBody(name, entry),
      description: `${entry.detail}. Inserts the ${name} built-in.`,
    };
  }
  return generated;
}

function sanitizeSnippetDefinition(snippet) {
  return {
    ...snippet,
    body: sanitizeSnippetBody(snippet.body),
  };
}

function main() {
  const baseSnippets = readHandcraftedSnippets();
  const merged = Object.fromEntries(
    Object.entries({
      ...baseSnippets,
      ...buildKeywordSnippets(),
      ...buildFunctionSnippets(),
    }).map(([name, snippet]) => [name, sanitizeSnippetDefinition(snippet)]),
  );

  fs.writeFileSync(snippetsPath, `${JSON.stringify(merged, null, '\t')}\n`, 'utf8');

  console.log(JSON.stringify({
    handcraftedSnippets: Object.keys(baseSnippets).length,
    keywordSnippets: Object.keys(KEYWORDS).length,
    functionSnippets: Object.keys(FUNCTIONS).length,
    totalSnippets: Object.keys(merged).length,
    output: path.relative(path.join(__dirname, '..'), snippetsPath),
  }, null, 2));
}

main();
