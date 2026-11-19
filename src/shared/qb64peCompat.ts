/**
 * Detect QB64-PE-only keywords in source that will not compile with the
 * original QB64 (v2.x and older). Pure functions, no VS Code dependency.
 *
 * The list is deliberately conservative: it only names additions that the
 * QB64-PE wiki marks as new in QB64-PE. Keywords that the original QB64
 * already had ($RESIZE, $EXEICON, $VERSIONINFO, $NOPREFIX, $LET, $ERROR,
 * _DEFLATE$/_INFLATE$, ...) are not listed.
 */

import { maskCode } from './sourceText';

const QB64PE_ONLY = Object.freeze(
  new Set([
    '_IIF', '_ANDALSO', '_ORELSE', '_NEGATE',
    '_MIN', '_MAX', '_CLAMP', '_ROL', '_ROR', '_TOSTR$',
    '_UPRINTSTRING', '_UPRINTWIDTH', '_ULINESPACING', '_UFONTHEIGHT', '_UCHARPOS',
    '_READFILE$', '_WRITEFILE', '_SAVEIMAGE',
    '_MESSAGEBOX', '_INPUTBOX$', '_OPENFILEDIALOG$', '_SAVEFILEDIALOG$',
    '_NOTIFYPOPUP', '_SNDNEW', '_MIDISOUNDBANK',
    '_CRC32', '_ADLER32', '_MD5$',
    '_BASE64ENCODE$', '_BASE64DECODE$', '_ENCODEURL$', '_DECODEURL$',
    '_STATUSCODE', '_ASSERT',
    '_LOGTRACE', '_LOGINFO', '_LOGWARN', '_LOGERROR', '_LOGMINLEVEL',
    '$EMBED', '_EMBEDDED$', '$UNSTABLE', '$INCLUDEONCE', '$ASSERTS',
  ]),
);

const TOKEN_RE = /(?<![A-Za-z0-9_$%!#&~.])\$?_?[A-Za-z][A-Za-z0-9_]*\$?/g;

/**
 * True when a compiler banner names QB64 Phoenix Edition.
 * @param {string|null} identity - e.g. "QB64-PE Compiler V3.14.1"
 */
function isQB64PEIdentity(identity) {
  return /QB64[-\s]?PE\b|Phoenix/i.test(String(identity || ''));
}

/**
 * Find QB64-PE-only keywords.
 * @param {string[]} lines
 * @returns {Array<{line: number, start: number, end: number, keyword: string}>}
 */
function findQB64PEOnlyUsages(lines = []) {
  const usages = [];
  for (let line = 0; line < lines.length; line++) {
    const text = lines[line];
    if (!text.includes('_') && !text.includes('$')) continue;
    const masked = maskCode(text);
    TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = TOKEN_RE.exec(masked)) !== null) {
      const keyword = match[0].toUpperCase();
      if (QB64PE_ONLY.has(keyword)) {
        usages.push({
          line,
          start: match.index,
          end: match.index + match[0].length,
          keyword,
        });
      }
    }
  }
  return usages;
}

export {
  QB64PE_ONLY,
  isQB64PEIdentity,
  findQB64PEOnlyUsages,
};
