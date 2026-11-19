/**
 * Procedure index: SUB / FUNCTION blocks, their parameters and the call sites
 * between them. Feeds CodeLens, call hierarchy and parameter-name inlay hints.
 * Pure functions over source lines, no VS Code dependency.
 */

import { maskCode, normalizeName, makeIdentifierScanner, splitArguments } from './sourceText';

const PROC_HEADER_RE =
  /^(\s*(?:STATIC\s+)?)(SUB|FUNCTION)\s+([A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|%&|[$%!#&]))?)\s*(?:\(([^)]*)\))?/i;
const PROC_END_RE = /^\s*END\s+(SUB|FUNCTION)\b/i;
const DECLARE_RE = /^\s*DECLARE\b/i;
const PARAM_NAME_RE =
  /^(?:BYVAL\s+)?([A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|%&|[$%!#&]))?)/i;
const STATEMENT_LEAD_RE = /(?:^|:|\bTHEN|\bELSE)\s*(?:CALL\s+)?$/i;

/** A SUB or FUNCTION block. Lines are 0-based. */
export interface Procedure {
  name: string;
  /** Upper-cased name without its type suffix. */
  normName: string;
  kind: string;
  line: number;
  nameStart: number;
  nameEnd: number;
  endLine: number;
  params: string[];
}

/** One mention of a procedure name in code. */
export interface CallSite {
  name: string;
  normName: string;
  line: number;
  start: number;
  end: number;
  /** True when the name starts a statement (`Foo a, b` or `CALL Foo`). */
  statementStart: boolean;
}

export interface FileAnalysis {
  file: string;
  analysis: { lines: string[] };
}

export interface CallArgument {
  start: number;
  end: number;
  text: string;
}

const procedureCache = new WeakMap<object, Procedure[]>();

function parseParameters(paramText: string | undefined): string[] {
  if (!paramText || !paramText.trim()) return [];
  return splitArguments(paramText)
    .map((arg) => PARAM_NAME_RE.exec(arg.text)?.[1] || null)
    .filter(Boolean);
}

/**
 * Collect SUB / FUNCTION definitions.
 * @param {string[]} lines
 * @returns {Procedure[]}
 */
function collectProcedures(lines: string[] = []): Procedure[] {
  const procedures: Procedure[] = [];
  let open: Procedure | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (DECLARE_RE.test(line)) continue;

    if (open && PROC_END_RE.test(line)) {
      open.endLine = index;
      open = null;
      continue;
    }

    const match = PROC_HEADER_RE.exec(line);
    if (!match) continue;

    const nameStart =
      match[1].length + match[2].length +
      line.slice(match[1].length + match[2].length).search(/\S/);
    const proc = {
      name: match[3],
      normName: normalizeName(match[3]),
      kind: match[2].toUpperCase(),
      line: index,
      nameStart,
      nameEnd: nameStart + match[3].length,
      endLine: lines.length - 1,
      params: parseParameters(match[4]),
    };
    if (open) open.endLine = index - 1;
    procedures.push(proc);
    open = proc;
  }

  return procedures;
}

/**
 * Memoized collectProcedures for a document-analysis object.
 * @param {{lines: string[]}} analysis
 * @returns {Procedure[]}
 */
function getProcedures(analysis: { lines: string[] } | null | undefined): Procedure[] {
  if (!analysis || !Array.isArray(analysis.lines)) return [];
  let cached = procedureCache.get(analysis);
  if (!cached) {
    cached = collectProcedures(analysis.lines);
    procedureCache.set(analysis, cached);
  }
  return cached;
}

/**
 * Find the procedure whose block contains a line, or null for module code.
 * @param {Procedure[]} procedures
 * @param {number} line
 * @returns {Procedure|null}
 */
function findEnclosingProcedure(procedures: Procedure[], line: number): Procedure | null {
  for (const proc of procedures) {
    if (line >= proc.line && line <= proc.endLine) return proc;
  }
  return null;
}

/**
 * Find calls to known procedures inside a line range.
 * @param {string[]} lines
 * @param {Map<string, any>|Set<string>} knownNames - normalized names
 * @param {{fromLine?: number, toLine?: number, procedures?: Procedure[]}} [options]
 * @returns {CallSite[]}
 */
function findCallSites(
  lines: string[],
  knownNames: { has(name: string): boolean },
  options: { fromLine?: number; toLine?: number; procedures?: Procedure[] } = {},
): CallSite[] {
  const procedures = options.procedures || collectProcedures(lines);
  const fromLine = Math.max(0, options.fromLine ?? 0);
  const toLine = Math.min(lines.length - 1, options.toLine ?? lines.length - 1);
  const sites: CallSite[] = [];

  for (let index = fromLine; index <= toLine; index++) {
    const line = lines[index];
    if (DECLARE_RE.test(line) || PROC_END_RE.test(line)) continue;

    const masked = maskCode(line);
    const header = PROC_HEADER_RE.exec(masked);
    const scanFrom = header ? header[0].length : 0;
    const enclosing = findEnclosingProcedure(procedures, index);
    const scanner = makeIdentifierScanner();
    scanner.lastIndex = scanFrom;

    let match;
    while ((match = scanner.exec(masked)) !== null) {
      const name = match[0];
      const normName = normalizeName(name);
      if (!knownNames.has(normName)) continue;

      const before = masked.slice(0, match.index);
      const after = masked.slice(match.index + name.length);
      const statementStart = STATEMENT_LEAD_RE.test(before);

      // `FuncName = value` inside its own FUNCTION sets the return value.
      if (
        enclosing &&
        enclosing.kind === 'FUNCTION' &&
        enclosing.normName === normName &&
        statementStart &&
        /^\s*=(?!=)/.test(after)
      ) {
        continue;
      }

      sites.push({
        name,
        normName,
        line: index,
        start: match.index,
        end: match.index + name.length,
        statementStart,
      });
    }
  }

  return sites;
}

/**
 * Argument positions of a call site.
 * Parenthesized calls `Foo(a, b)` and statement calls `Foo a, b` are supported.
 * @param {string} line
 * @param {{end: number, statementStart: boolean}} site
 * @returns {Array<{start: number, end: number, text: string}>}
 */
function getCallArguments(
  line: string,
  site: { end: number; statementStart: boolean },
): CallArgument[] {
  const masked = maskCode(line);
  let i = site.end;
  while (i < masked.length && masked[i] === ' ') i++;

  if (masked[i] === '(') {
    let depth = 0;
    for (let j = i; j < masked.length; j++) {
      if (masked[j] === '(') depth++;
      else if (masked[j] === ')') {
        depth--;
        if (depth === 0) {
          return splitArguments(masked.slice(i + 1, j), i + 1).map((arg) => ({
            ...arg,
            text: line.slice(arg.start, arg.end),
          }));
        }
      }
    }
    return [];
  }

  if (!site.statementStart) return [];
  if (/^\s*=/.test(masked.slice(site.end))) return [];

  let depth = 0;
  let end = masked.length;
  for (let j = site.end; j < masked.length; j++) {
    const ch = masked[j];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ':' && depth === 0) {
      end = j;
      break;
    } else if (depth === 0 && /^\sELSE\b/i.test(masked.slice(j, j + 6))) {
      end = j;
      break;
    }
  }

  return splitArguments(masked.slice(site.end, end), site.end).map((arg) => ({
    ...arg,
    text: line.slice(arg.start, arg.end),
  }));
}

/**
 * Build a name → definition index across several files.
 * Earlier entries win, so pass the current document first.
 * @param {FileAnalysis[]} fileAnalyses
 * @returns {Map<string, {file: string, proc: Procedure}>}
 */
function indexProcedures(
  fileAnalyses: FileAnalysis[],
): Map<string, { file: string; proc: Procedure }> {
  const index = new Map<string, { file: string; proc: Procedure }>();
  for (const { file, analysis } of fileAnalyses) {
    for (const proc of getProcedures(analysis)) {
      if (!index.has(proc.normName)) index.set(proc.normName, { file, proc });
    }
  }
  return index;
}

/**
 * Every call to `targetNormName`, grouped by the calling procedure.
 * Module-level code is reported with `caller: null`.
 * @param {FileAnalysis[]} fileAnalyses
 * @param {string} targetNormName
 * @returns {Array<{file: string, caller: Procedure|null, sites: CallSite[]}>}
 */
function findIncomingCalls(
  fileAnalyses: FileAnalysis[],
  targetNormName: string,
): Array<{ file: string; caller: Procedure | null; sites: CallSite[] }> {
  const target = new Set([targetNormName]);
  const groups: Array<{ file: string; caller: Procedure | null; sites: CallSite[] }> = [];

  for (const { file, analysis } of fileAnalyses) {
    const lines = analysis.lines;
    if (!lines.some((l) => l.toUpperCase().includes(targetNormName))) continue;

    const procedures = getProcedures(analysis);
    const byCaller = new Map<number, { file: string; caller: Procedure | null; sites: CallSite[] }>();
    for (const site of findCallSites(lines, target, { procedures })) {
      const caller = findEnclosingProcedure(procedures, site.line);
      const key = caller ? caller.line : -1;
      if (!byCaller.has(key)) byCaller.set(key, { file, caller, sites: [] });
      byCaller.get(key).sites.push(site);
    }
    groups.push(...byCaller.values());
  }

  return groups;
}

/**
 * Calls made from inside one procedure (or from module code when proc is null),
 * grouped by callee.
 * @param {{lines: string[]}} analysis
 * @param {Procedure|null} proc
 * @param {Map<string, {file: string, proc: Procedure}>} knownProcedures - from indexProcedures
 * @returns {Map<string, CallSite[]>} normName → call sites
 */
function findOutgoingCalls(
  analysis: { lines: string[] },
  proc: Procedure | null,
  knownProcedures: Map<string, { file: string; proc: Procedure }>,
): Map<string, CallSite[]> {
  const procedures = getProcedures(analysis);
  const sites = proc
    ? findCallSites(analysis.lines, knownProcedures, {
        procedures,
        fromLine: proc.line,
        toLine: proc.endLine,
      })
    : findCallSites(analysis.lines, knownProcedures, { procedures }).filter(
        (site) => !findEnclosingProcedure(procedures, site.line),
      );

  const byCallee = new Map<string, CallSite[]>();
  for (const site of sites) {
    if (!byCallee.has(site.normName)) byCallee.set(site.normName, []);
    byCallee.get(site.normName).push(site);
  }
  return byCallee;
}

export {
  collectProcedures,
  getProcedures,
  findEnclosingProcedure,
  findCallSites,
  getCallArguments,
  indexProcedures,
  findIncomingCalls,
  findOutgoingCalls,
  parseParameters,
};
