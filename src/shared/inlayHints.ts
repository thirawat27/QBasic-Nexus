/**
 * Inlay hint computation: parameter names at call sites and the type implied
 * by a variable's suffix. Pure functions, no VS Code dependency.
 */

import { maskCode, normalizeName, makeIdentifierScanner } from './sourceText';
import { findCallSites, getCallArguments } from './procedureIndex';

const SUFFIX_TYPES = Object.freeze([
  ['~%%', '_UNSIGNED _BYTE'],
  ['~&&', '_UNSIGNED _INTEGER64'],
  ['~%&', '_UNSIGNED _OFFSET'],
  ['%%', '_BYTE'],
  ['&&', '_INTEGER64'],
  ['##', '_FLOAT'],
  ['%&', '_OFFSET'],
  ['~%', '_UNSIGNED INTEGER'],
  ['~&', '_UNSIGNED LONG'],
  ['%', 'INTEGER'],
  ['&', 'LONG'],
  ['!', 'SINGLE'],
  ['#', 'DOUBLE'],
  ['$', 'STRING'],
]);

/**
 * QBasic type named by an identifier's suffix, or null when it has none.
 * @param {string} name
 * @returns {string|null}
 */
function typeFromSuffix(name) {
  for (const [suffix, type] of SUFFIX_TYPES) {
    if (name.endsWith(suffix) && name.length > suffix.length) return type;
  }
  return null;
}

function stripSuffix(name) {
  return normalizeName(name);
}

export interface InlayHintOptions {
  fromLine?: number;
  toLine?: number;
  /** Known procedures by normalized name (see indexProcedures). */
  procedures: Map<string, { proc: { params: string[] } }>;
  /** Built-in functions; only those with two or more parameters are hinted. */
  builtins?: Record<string, { params?: string[] }>;
  /** Upper-cased keyword and function names that never get a type hint. */
  reserved?: Set<string>;
  parameterNames?: boolean;
  variableTypes?: boolean;
}

export interface ComputedInlayHint {
  line: number;
  character: number;
  label: string;
  kind: 'parameter' | 'type';
}

function computeInlayHints(lines: string[], options: InlayHintOptions): ComputedInlayHint[] {
  const fromLine = Math.max(0, options.fromLine ?? 0);
  const toLine = Math.min(lines.length - 1, options.toLine ?? lines.length - 1);
  const hints = [];

  if (options.parameterNames !== false) {
    const callable = new Map();
    for (const [normName, entry] of options.procedures) {
      if (entry.proc.params.length > 0) callable.set(normName, entry.proc.params);
    }
    // Built-in functions with a single parameter gain nothing from a hint.
    for (const [name, data] of Object.entries(options.builtins || {})) {
      const normName = normalizeName(name);
      if (Array.isArray(data?.params) && data.params.length >= 2 && !callable.has(normName)) {
        callable.set(normName, data.params);
      }
    }

    const sites = findCallSites(lines, callable, { fromLine, toLine });
    for (const site of sites) {
      const params = callable.get(site.normName);
      // Built-in functions are only hinted in their parenthesized form.
      if (
        !options.procedures.has(site.normName) &&
        !/^\s*\(/.test(lines[site.line].slice(site.end))
      ) {
        continue;
      }
      const args = getCallArguments(lines[site.line], site);
      args.forEach((arg, index) => {
        const param = params[index];
        if (!param) return;
        // `Draw x, y` with params (x, y) is already self-describing.
        if (stripSuffix(arg.text) === stripSuffix(param)) return;
        hints.push({
          line: site.line,
          character: arg.start,
          label: `${param}:`,
          kind: 'parameter',
        });
      });
    }
  }

  if (options.variableTypes) {
    const reserved = options.reserved || new Set();
    const seen = new Set();
    // Scan from the top so a hint marks the first use only.
    for (let index = 0; index <= toLine; index++) {
      const masked = maskCode(lines[index]);
      const scanner = makeIdentifierScanner();
      let match;
      while ((match = scanner.exec(masked)) !== null) {
        const name = match[0];
        const upper = name.toUpperCase();
        if (seen.has(upper)) continue;
        const type = typeFromSuffix(name);
        if (!type) continue;
        seen.add(upper);
        if (reserved.has(upper) || options.procedures.has(normalizeName(name))) continue;
        if (index < fromLine) continue;
        hints.push({
          line: index,
          character: match.index + name.length,
          label: `: ${type}`,
          kind: 'type',
        });
      }
    }
  }

  return hints;
}

export {
  computeInlayHints,
  typeFromSuffix,
};
