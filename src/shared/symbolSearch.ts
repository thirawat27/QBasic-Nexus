/**
 * Workspace symbol search helpers. Pure functions, no VS Code dependency.
 */

const MAX_RESULTS = 1000;

/**
 * Fuzzy match: every query character appears in order in the name,
 * ignoring case. An empty query matches everything.
 * @param {string} name
 * @param {string} query
 * @returns {boolean}
 */
function fuzzyMatch(name, query) {
  if (!query) return true;
  const haystack = String(name).toUpperCase();
  const needle = String(query).toUpperCase().replace(/\s+/g, '');
  let position = 0;
  for (const ch of needle) {
    position = haystack.indexOf(ch, position);
    if (position === -1) return false;
    position++;
  }
  return true;
}

/**
 * Flatten per-file analyses into searchable symbol entries.
 * @param {Array<{file: string, analysis: {symbols: Array, lines: string[],
 *   definitions?: Map}}>} fileAnalyses
 * @param {string} query
 * @returns {Array<{name: string, detail: string, kind: string, file: string,
 *   line: number, start: number, end: number}>}
 */
function searchSymbols(fileAnalyses, query = '') {
  const results = [];
  for (const { file, analysis } of fileAnalyses) {
    for (const symbol of analysis.symbols || []) {
      if (!fuzzyMatch(symbol.name, query)) continue;

      const lineText = analysis.lines?.[symbol.line] || '';
      const definition = analysis.definitions?.get(symbol.name.toUpperCase());
      let start;
      if (definition && definition.line === symbol.line) {
        start = definition.start;
      } else {
        start = Math.max(
          0,
          lineText.toUpperCase().indexOf(symbol.name.toUpperCase()),
        );
      }

      results.push({
        name: symbol.name,
        detail: symbol.detail,
        kind: symbol.kind,
        file,
        line: symbol.line,
        start,
        end: start + symbol.name.length,
      });
      if (results.length >= MAX_RESULTS) return results;
    }
  }
  return results;
}

export {
  fuzzyMatch,
  searchSymbols,
  MAX_RESULTS,
};
