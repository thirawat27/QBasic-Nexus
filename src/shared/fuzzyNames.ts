/**
 * Edit-distance helpers for "did you mean" suggestions.
 * Pure functions, no VS Code dependency.
 */

/**
 * Optimal string alignment distance (Damerau–Levenshtein with adjacent
 * transpositions), case-insensitive. Stops early and returns `max + 1` once
 * the distance is known to exceed `max`.
 * @param {string} a
 * @param {string} b
 * @param {number} [max]
 * @returns {number}
 */
function editDistance(a, b, max = Infinity) {
  const s = String(a).toUpperCase();
  const t = String(b).toUpperCase();
  if (Math.abs(s.length - t.length) > max) return max + 1;

  let prevPrev = null;
  let prev = Array.from({ length: t.length + 1 }, (_, j) => j);

  for (let i = 1; i <= s.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (
        prevPrev &&
        i > 1 &&
        j > 1 &&
        s[i - 1] === t[j - 2] &&
        s[i - 2] === t[j - 1]
      ) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      row.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }

  return prev[t.length];
}

/**
 * Largest distance accepted as a typo for a word of this length. Short words
 * allow one edit, longer ones two, so `PIRNT` → `PRINT` but `X` → `Y` is not
 * suggested.
 * @param {string} word
 */
function maxTypoDistance(word) {
  const length = String(word).replace(/[^A-Za-z0-9]/g, '').length;
  if (length <= 2) return 0;
  if (length <= 5) return 1;
  return 2;
}

/**
 * Closest candidate within the typo threshold, or null.
 * Ties prefer the candidate whose first letter matches, then the shorter one.
 * @param {string} word
 * @param {Iterable<string>} candidates
 * @returns {string|null}
 */
function suggestName(word, candidates) {
  const max = maxTypoDistance(word);
  if (max === 0) return null;

  const upper = String(word).toUpperCase();
  let best = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    if (candidate.toUpperCase() === upper) return null;
    const distance = editDistance(upper, candidate, max);
    if (distance > max) continue;
    const score =
      distance * 4 +
      (candidate[0].toUpperCase() === upper[0] ? 0 : 2) +
      Math.abs(candidate.length - upper.length) * 0.1;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export {
  editDistance,
  maxTypoDistance,
  suggestName,
};
