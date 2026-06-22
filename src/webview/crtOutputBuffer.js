'use strict';

;(function initCrtOutputBuffer(globalScope, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (globalScope && typeof globalScope === 'object') {
    globalScope.QBasicCrtOutputBuffer = api;
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : this,
  function createCrtOutputBufferApi() {
    function normalizeColorIndex(value, mask) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return 0;
      const integer = Math.trunc(numeric);
      return integer < 0 ? 0 : integer & mask;
    }

    function normalizeText(value) {
      return value == null ? '' : String(value);
    }

    function createTextRunBuffer() {
      const runs = [];
      let charCount = 0;

      function append(text, fg, bg) {
        const value = normalizeText(text);
        if (!value) {
          return {
            charCount,
            runCount: runs.length,
          };
        }

        const normalizedFg = normalizeColorIndex(fg, 15);
        const normalizedBg = normalizeColorIndex(bg, 7);
        const lastRun = runs[runs.length - 1];

        if (
          lastRun &&
          lastRun.fg === normalizedFg &&
          lastRun.bg === normalizedBg
        ) {
          lastRun.parts.push(value);
          lastRun.length += value.length;
        } else {
          runs.push({
            fg: normalizedFg,
            bg: normalizedBg,
            parts: [value],
            length: value.length,
          });
        }

        charCount += value.length;
        return {
          charCount,
          runCount: runs.length,
        };
      }

      function clear() {
        runs.length = 0;
        charCount = 0;
      }

      function flush() {
        if (runs.length === 0) return [];

        const output = runs.map((run) => ({
          fg: run.fg,
          bg: run.bg,
          text: run.parts.length === 1 ? run.parts[0] : run.parts.join(''),
          length: run.length,
        }));
        clear();
        return output;
      }

      function stats() {
        return {
          charCount,
          runCount: runs.length,
        };
      }

      return {
        append,
        clear,
        flush,
        stats,
        get charCount() {
          return charCount;
        },
        get runCount() {
          return runs.length;
        },
      };
    }

    return {
      createTextRunBuffer,
      normalizeColorIndex,
    };
  },
);
