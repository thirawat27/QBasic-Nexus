/**
 * Detect backward GOTO loops that can be rewritten as DO...LOOP.
 *
 *   top:                     DO
 *   PRINT i                  PRINT i
 *   i = i + 1         →      i = i + 1
 *   IF i < 5 THEN GOTO top   LOOP WHILE i < 5
 *
 * Only safe cases are offered: the label is referenced exactly once (by the
 * jump), the jump comes after the label in the same block, and the lines in
 * between neither close a block they did not open nor define a label that
 * code jumps to. Pure functions, no VS Code dependency.
 */

import { PATTERNS } from '../providers/patterns';
import { maskCode } from './sourceText';
import { escapeRegex } from '../providers/patterns';

const LABEL_DEF_RE = /^(\s*)(?:([A-Za-z_][A-Za-z0-9_]*):(?!=)|(\d+)(?=\s|$))\s*/;
const PROC_BOUNDARY_RE = /^\s*(?:(?:STATIC\s+)?(?:SUB|FUNCTION)\b|END\s+(?:SUB|FUNCTION)\b)/i;

function blockDelta(trimmed) {
  let delta = 0;
  if (PATTERNS.BLOCK_END.test(trimmed) || PATTERNS.BLOCK_MID.test(trimmed)) delta--;
  if (PATTERNS.BLOCK_START.test(trimmed)) {
    if (!/^\s*IF\b/i.test(trimmed) || /\bTHEN\s*$/i.test(trimmed)) delta++;
  } else if (PATTERNS.BLOCK_MID.test(trimmed)) {
    delta++;
  }
  return delta;
}

function countReferences(maskedLines, label, definitionLine) {
  const re = new RegExp(`(?<![A-Za-z0-9_.$%!#&])${escapeRegex(label)}(?![A-Za-z0-9_$%!#&:])`, 'gi');
  let count = 0;
  maskedLines.forEach((line, index) => {
    const text = index === definitionLine ? line.replace(LABEL_DEF_RE, '') : line;
    const matches = text.match(re);
    if (matches) count += matches.length;
  });
  return count;
}

/**
 * @param {string[]} lines
 * @returns {Array<{label: string, labelLine: number, jumpLine: number,
 *   edits: Array<{line: number, text: string}>}>}
 */
function findGotoLoops(lines) {
  const masked = lines.map((line) => maskCode(line));
  const loops = [];

  for (let jumpLine = 0; jumpLine < lines.length; jumpLine++) {
    // Group 1 keeps the indentation and an optional line number of its own.
    const jump =
      /^(\s*(?:(\d+)\s+)?)(?:GOTO\s+([A-Za-z_]\w*|\d+)|IF\s+(.+?)\s+THEN\s+(?:GOTO\s+([A-Za-z_]\w*|\d+)|(\d+)))\s*$/i.exec(
        masked[jumpLine],
      );
    if (!jump) continue;
    const label = jump[3] || jump[5] || jump[6];
    const conditional = Boolean(jump[5] || jump[6]);
    // A jump line whose own number is a jump target cannot become LOOP.
    if (jump[2] && countReferences(masked, jump[2], jumpLine) > 0) continue;

    // Find the label definition above the jump.
    let labelLine = -1;
    for (let i = jumpLine - 1; i >= 0; i--) {
      const def = LABEL_DEF_RE.exec(masked[i]);
      if (def && (def[2] || def[3] || '').toUpperCase() === label.toUpperCase()) {
        labelLine = i;
        break;
      }
      if (PROC_BOUNDARY_RE.test(masked[i])) break;
    }
    if (labelLine === -1) continue;

    // The jump must be the only use of the label. Numeric labels can collide
    // with number literals, which makes them fail this check: that is safe.
    if (countReferences(masked, label, labelLine) !== 1) continue;

    // Lines in between must stay inside one block level and must not define
    // labels that other code jumps to.
    let depth = 0;
    let safe = true;
    const labelRest = masked[labelLine].replace(LABEL_DEF_RE, '');
    for (let i = labelLine; i < jumpLine && safe; i++) {
      const text = i === labelLine ? labelRest : masked[i];
      if (i > labelLine && PROC_BOUNDARY_RE.test(text)) safe = false;
      if (i > labelLine) {
        const inner = LABEL_DEF_RE.exec(text);
        const innerName = inner && (inner[2] || inner[3]);
        if (innerName && countReferences(masked, innerName, i) > 0) safe = false;
      }
      const trimmed = text.trim();
      if (!trimmed) continue;
      depth += blockDelta(trimmed);
      if (depth < 0) safe = false;
    }
    if (!safe || depth !== 0) continue;

    const labelIndent = LABEL_DEF_RE.exec(lines[labelLine])[1];
    const restOriginal = lines[labelLine].replace(LABEL_DEF_RE, '');
    const jumpIndent = jump[1];
    const conditionText = conditional
      ? lines[jumpLine].slice(
          masked[jumpLine].search(/\bIF\b/i) + 2,
          masked[jumpLine].search(/\bTHEN\b/i),
        ).trim()
      : '';

    const edits = [
      {
        line: labelLine,
        text: restOriginal.trim()
          ? `${labelIndent}DO\n${labelIndent}${restOriginal.trimEnd()}`
          : `${labelIndent}DO`,
      },
      {
        line: jumpLine,
        text: conditional ? `${jumpIndent}LOOP WHILE ${conditionText}` : `${jumpIndent}LOOP`,
      },
    ];
    loops.push({ label, labelLine, jumpLine, edits });
  }

  return loops;
}

export {
  findGotoLoops,
};
