'use strict';

;(function initCrtTranscript(globalScope, factory) {
  const crtTextApi = typeof module === 'object' && module.exports
    ? require('./crtText')
    : (globalScope && globalScope.QBasicCrtText) || {};
  const api = factory(crtTextApi);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (globalScope && typeof globalScope === 'object') {
    globalScope.QBasicCrtTranscript = api;
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : this,
  function createCrtTranscriptApi(crtTextApi) {
    const normalizeCrtText =
      typeof crtTextApi.normalizeCrtText === 'function'
        ? crtTextApi.normalizeCrtText
        : (value) => String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const DEFAULT_MAX_TRANSCRIPT_ENTRIES = 1000;
    const DEFAULT_MAX_TRANSCRIPT_TEXT = 200000;
    const RENDERABLE_KINDS = new Set([
      'output',
      'input_echo',
      'runtime_error',
      'legacy_output',
    ]);

    function normalizeNumber(value) {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    function createTranscriptEvent(kind, payload = {}) {
      const event = {
        kind: String(kind || payload.kind || 'output'),
        text:
          payload.text == null
            ? ''
            : normalizeCrtText(payload.text, {
                decodeEscapedControls: payload.decodeEscapedControls,
              }),
        newline: Boolean(payload.newline),
        timestamp: normalizeNumber(payload.timestamp) || Date.now(),
      };

      const numericFields = ['sourceLine', 'fg', 'bg', 'promptId'];
      for (const field of numericFields) {
        const value = normalizeNumber(payload[field]);
        if (value !== undefined) {
          event[field] = value;
        }
      }

      const passthroughFields = ['filename', 'prompt', 'value', 'reason'];
      for (const field of passthroughFields) {
        if (payload[field] != null) {
          event[field] = String(payload[field]);
        }
      }

      return event;
    }

    function eventHasRenderableText(event) {
      return Boolean(event && RENDERABLE_KINDS.has(event.kind) && event.text);
    }

    function eventToText(event) {
      return eventHasRenderableText(event) ? String(event.text) : '';
    }

    function appendTranscriptState(state, rawEvent, options = {}) {
      const event =
        rawEvent && typeof rawEvent.kind === 'string'
          ? createTranscriptEvent(rawEvent.kind, rawEvent)
          : createTranscriptEvent('output', rawEvent || {});
      const maxEntries =
        normalizeNumber(options.maxEntries) || DEFAULT_MAX_TRANSCRIPT_ENTRIES;
      const maxTextLength =
        normalizeNumber(options.maxTextLength) || DEFAULT_MAX_TRANSCRIPT_TEXT;

      if (event.kind === 'clear') {
        return {
          entries: [],
          text: '',
          lastEvent: event,
        };
      }

      const entries = Array.isArray(state?.entries) ? state.entries.slice() : [];
      entries.push(event);
      if (entries.length > maxEntries) {
        entries.splice(0, entries.length - maxEntries);
      }

      let text = String(state?.text || '');
      const chunk = eventToText(event);
      if (chunk) {
        text += chunk;
        if (text.length > maxTextLength) {
          text = text.slice(-maxTextLength);
        }
      }

      return {
        entries,
        text,
        lastEvent: event,
      };
    }

    return {
      DEFAULT_MAX_TRANSCRIPT_ENTRIES,
      DEFAULT_MAX_TRANSCRIPT_TEXT,
      appendTranscriptState,
      createTranscriptEvent,
      eventHasRenderableText,
      eventToText,
    };
  },
);
