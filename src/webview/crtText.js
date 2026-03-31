'use strict';

;(function initCrtText(globalScope, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (globalScope && typeof globalScope === 'object') {
    globalScope.QBasicCrtText = api;
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : this,
  function createCrtTextApi() {
    const CRT_NEWLINE = '\n';
    const ESCAPED_CONTROL_PATTERN = /\\r\\n|\\n|\\r|\\t/g;
    const LIKELY_PATH_PATTERN = /(?:^|[\s("'`])(?:[A-Za-z]:\\|\\\\|\.{1,2}\\)/;

    function normalizeLineEndings(value) {
      return String(value ?? '')
        .replace(/\r\n/g, CRT_NEWLINE)
        .replace(/\r/g, CRT_NEWLINE);
    }

    function looksLikePath(text) {
      return LIKELY_PATH_PATTERN.test(text);
    }

    function shouldDecodeEscapedControls(value) {
      const text = normalizeLineEndings(value);
      const matches = text.match(ESCAPED_CONTROL_PATTERN) || [];

      if (matches.length === 0 || looksLikePath(text)) {
        return false;
      }

      return true;
    }

    function decodeEscapedControls(value) {
      return normalizeLineEndings(value)
        .replace(/\\r\\n/g, CRT_NEWLINE)
        .replace(/\\n/g, CRT_NEWLINE)
        .replace(/\\r/g, CRT_NEWLINE)
        .replace(/\\t/g, '\t');
    }

    function splitRenderedLines(value, options = {}) {
      return normalizeCrtText(value, options).split(CRT_NEWLINE);
    }

    function appendCrtNewline(value, options = {}) {
      return normalizeCrtText(value, options) + CRT_NEWLINE;
    }

    function normalizeCrtText(value, options = {}) {
      const text = normalizeLineEndings(value);
      if (options.decodeEscapedControls === false) {
        return text;
      }
      return shouldDecodeEscapedControls(text)
        ? decodeEscapedControls(text)
        : text;
    }

    function splitPromptText(value, options = {}) {
      const text = normalizeCrtText(value, options);
      const lastBreakIndex = text.lastIndexOf(CRT_NEWLINE);

      if (lastBreakIndex === -1) {
        return { leadingText: '', inlineText: text };
      }

      return {
        leadingText: text.slice(0, lastBreakIndex + 1),
        inlineText: text.slice(lastBreakIndex + 1),
      };
    }

    return {
      CRT_NEWLINE,
      appendCrtNewline,
      decodeEscapedControls,
      normalizeCrtText,
      normalizeLineEndings,
      shouldDecodeEscapedControls,
      splitRenderedLines,
      splitPromptText,
    };
  },
);
