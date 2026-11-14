// QBNex in a browser: loads qb_web.wasm and runs QIR programs.
//
// Works in a Web Worker (worker.js, used by index.html: sleeps really wait,
// frames, console text and sound stream to the page while the program runs)
// and in Node (tests/run.mjs). Each run gets a fresh instance of the compiled
// module, so no runtime state leaks from one program into the next. On a
// page's main thread, use the worker: a run blocks its thread until the
// program ends.
//
//   const qb = await QBNex.load(wasmBytesOrResponse, hooks);
//   const r = qb.run(qirText, stdinText);
//   r.status        0 finished, 1 runtime error, 2 did not load, 3 trapped
//   r.exitCode      SYSTEM n
//   r.error, r.line QBasic error number and source line
//   r.message       error text
//   r.stdout        console output ($CONSOLE / _DEST _CONSOLE)
//   r.screenText    characters of the final text screen
//   r.frame         { width, height, rgba: Uint8ClampedArray } of the final screen
//
// hooks (all optional):
//   onFrame(frame)        a frame is ready (_DISPLAY, _LIMIT, _DELAY, input polling)
//   onSleep(ms)           wait; default: busy wait (workers, Node), none on a page
//   pollEvent()           next input event as [kind, a, b, c, d, mods] or null (see EVENT_*)
//   interactive           true when pollEvent delivers live keys: INPUT then waits for typing
//                         once the stdin text is used up
//   onAudio(pcm, rate)    interleaved stereo Float32Array of the program's sound

// Program text is bytes. As the native console does (crates/runtime/core/src/console/utf8.rs):
// valid UTF-8 is shown as such (a program saved as UTF-8 prints Thai), and a byte that is not
// part of a valid sequence is a code page 437 character (CHR$(201) is a box corner).
const utf8 = new TextDecoder('utf-8', { fatal: true });
const CP437_HIGH = '\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00a2\u00a3\u00a5\u20a7\u0192\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u2310\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255d\u255c\u255b\u2510\u2514\u2534\u252c\u251c\u2500\u253c\u255e\u255f\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256b\u256a\u2518\u250c\u2588\u2584\u258c\u2590\u2580\u03b1\u00df\u0393\u03c0\u03a3\u03c3\u00b5\u03c4\u03a6\u0398\u03a9\u03b4\u221e\u03c6\u03b5\u2229\u2261\u00b1\u2265\u2264\u2320\u2321\u00f7\u2248\u00b0\u2219\u00b7\u221a\u207f\u00b2\u25a0\u0020';

/** Length of the valid UTF-8 sequence at `i`, 0 if there is none. */
function utf8Len(b, i) {
  const c = b[i];
  const n = c >= 0xc2 && c <= 0xdf ? 2 : c >= 0xe0 && c <= 0xef ? 3 : c >= 0xf0 && c <= 0xf4 ? 4 : 0;
  if (n === 0 || i + n > b.length) return 0;
  try {
    utf8.decode(b.subarray(i, i + n));
    return n;
  } catch {
    return 0;
  }
}

/** @param {Uint8Array} bytes @returns {string} */
export function decodeText(bytes) {
  try {
    return utf8.decode(bytes);
  } catch {
    let out = '';
    let i = 0;
    while (i < bytes.length) {
      let j = i;
      while (j < bytes.length && bytes[j] < 0x80) j++;
      if (j > i) out += utf8.decode(bytes.subarray(i, j));
      if (j >= bytes.length) break;
      const n = utf8Len(bytes, j);
      out += n ? utf8.decode(bytes.subarray(j, j + n)) : CP437_HIGH[bytes[j] - 0x80];
      i = j + (n || 1);
    }
    return out;
  }
}

/** Input event kinds (`[kind, a, b, c, d, mods]`, read by crates/engine/exec/src/rt/input.rs). */
export const EVENT_KEY = 1; // a pressed, b repeat, c key id (KEY_IDS), d character code; mods 1 shift 2 ctrl 4 alt
export const EVENT_BUTTON = 2; // a button (0 left, 1 right, 2 middle), b down, c x, d y (screen pixels)
export const EVENT_MOVE = 3; // a x, b y
export const EVENT_WHEEL = 4; // a direction (1 up, -1 down), b x, c y

/** Event ring the page shares with worker.js (Int32Array): [0] events written, [1] events read, then RING slots of 6 ints. */
export const RING = 256;

const NAMED = {
  PageUp: 20, PageDown: 21, Home: 22, End: 23, ArrowLeft: 24, ArrowUp: 25, ArrowRight: 26, ArrowDown: 27,
  Insert: 28, Delete: 29, Pause: 36, Cancel: 37, Enter: 38, Escape: 39, Tab: 40, Backspace: 41,
};
const MODIFIER = { ControlLeft: 30, ControlRight: 31, ShiftLeft: 32, ShiftRight: 33, AltLeft: 34, AltRight: 35 };
const OTHER_VK = { CapsLock: 0x14, NumLock: 0x90, ScrollLock: 0x91, Meta: 0x5b, ContextMenu: 0x5d, PrintScreen: 0x2c };

/**
 * A KeyboardEvent as an EVENT_KEY event, or null for keys QBasic does not see.
 * @param {{key:string, code:string, repeat?:boolean, shiftKey?:boolean, ctrlKey?:boolean, altKey?:boolean}} e
 * @param {boolean} pressed
 */
export function keyEvent(e, pressed) {
  const mods = (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0);
  let id = -1;
  let ch = 0;
  if (e.code in MODIFIER) id = MODIFIER[e.code];
  else if (e.key in NAMED) id = NAMED[e.key];
  else if (/^F([1-9]|1[0-2])$/.test(e.key)) id = Number(e.key.slice(1));
  else if (e.key in OTHER_VK) { id = 50; ch = OTHER_VK[e.key]; }
  else if ([...e.key].length === 1) { id = 0; ch = e.key.codePointAt(0); }
  if (id < 0) return null;
  return [EVENT_KEY, pressed ? 1 : 0, e.repeat ? 1 : 0, id, ch, mods];
}

function nowMs() {
  return Date.now();
}

function monoMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// Blocks for `ms` where the platform allows it (workers, Node); returns at
// once on a page's main thread, which must never block.
function defaultSleep(ms) {
  const isWindow = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isWindow || !(ms > 0)) return;
  const until = monoMs() + Math.min(ms, 60000);
  while (monoMs() < until) { /* busy wait: no SharedArrayBuffer needed */ }
}

/** Seconds of sound mixed ahead of the clock. */
const AUDIO_AHEAD = 0.25;
/** Longest tail of sound mixed after the program ends. */
const AUDIO_TAIL = 30;

export class QBNex {
  constructor(module, hooks) {
    this.module = module;
    this.hooks = hooks;
    this.x = null;
  }

  /**
   * @param {BufferSource|Response|Promise<Response>} source the .wasm
   * @param {object} hooks see the top of this file
   */
  static async load(source, hooks = {}) {
    let bytes = await source;
    if (typeof Response !== 'undefined' && bytes instanceof Response) bytes = await bytes.arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    const qb = new QBNex(module, hooks);
    qb.instantiate();
    return qb;
  }

  /** New instance with the page's imports (fresh runtime state). */
  instantiate() {
    const { module, hooks } = this;
    const self = this;
    const tick = () => self.pumpAudio(false);
    const qbnex = {
      qb_web_now_ms: () => { tick(); return nowMs(); },
      qb_web_monotonic_ms: () => { tick(); return monoMs(); },
      qb_web_sleep_ms: (ms) => {
        // long waits in slices, so sound keeps flowing
        const until = monoMs() + ms;
        for (;;) {
          tick();
          const left = until - monoMs();
          if (left <= 0) break;
          (hooks.onSleep || defaultSleep)(Math.min(left, 20));
          if (hooks.onSleep) break; // a custom sleep decides itself
        }
      },
      qb_web_present: () => {
        tick();
        if (hooks.onFrame) {
          const f = self.frame(0);
          if (f) hooks.onFrame(f);
        }
      },
      qb_web_poll_event: (ptr) => {
        tick();
        const e = hooks.pollEvent ? hooks.pollEvent() : null;
        if (!e) return 0;
        new Int32Array(self.x.memory.buffer, ptr, 6).set(e.slice(0, 6));
        return 1;
      },
      qb_web_interactive: () => (hooks.interactive ? 1 : 0),
    };
    // Every other import is a host service the browser build does not have:
    // calling one stops the program with a clear message instead of a link error.
    const imports = { qbnex };
    for (const imp of WebAssembly.Module.imports(module)) {
      if (imp.module === 'qbnex' && imp.name in qbnex) continue;
      if (imp.kind !== 'function') throw new Error(`qb_web.wasm needs ${imp.module}.${imp.name} (${imp.kind})`);
      (imports[imp.module] ||= {})[imp.name] = () => {
        throw new Error(`unsupported in the browser build: ${imp.module}.${imp.name}`);
      };
    }
    this.x = new WebAssembly.Instance(module, imports).exports;
    this.audio = null;
  }

  /**
   * Mixes the program's sound up to the clock (plus AUDIO_AHEAD) and hands
   * it to hooks.onAudio. `tail`: after the run, mix until the sound ends.
   */
  pumpAudio(tail) {
    if (!this.hooks.onAudio || !this.x || !this.x.qb_web_audio) return;
    const chunk = 2048;
    const take = (frames) => {
      const rate = this.x.qb_web_audio(frames);
      if (!rate) return null;
      const pcm = new Float32Array(this.buf(frames * 8).buffer);
      return { rate, pcm };
    };
    if (!this.audio) {
      const first = take(chunk);
      if (!first) return;
      this.audio = { rate: first.rate, start: monoMs(), done: chunk };
      this.hooks.onAudio(first.pcm, first.rate);
    }
    const a = this.audio;
    const limit = tail ? a.done + AUDIO_TAIL * a.rate : ((monoMs() - a.start) / 1000 + AUDIO_AHEAD) * a.rate;
    while (a.done < limit) {
      const c = take(chunk);
      if (!c) return;
      a.done += chunk;
      if (tail && c.pcm.every((v) => v === 0)) return;
      this.hooks.onAudio(c.pcm, c.rate);
    }
  }

  /** Bytes of the result buffer (copy). */
  buf(len) {
    return new Uint8Array(this.x.memory.buffer, this.x.qb_web_buf(), len).slice();
  }

  text(kind) {
    return decodeText(this.buf(this.x.qb_web_text(kind)));
  }

  /** @param {0|1} which 0 = frame of the last _DISPLAY, 1 = final screen */
  frame(which) {
    if (!this.x.qb_web_frame(which)) return null;
    const width = this.x.qb_web_frame_width();
    const height = this.x.qb_web_frame_height();
    const rgba = new Uint8ClampedArray(this.buf(width * height * 4).buffer);
    return { width, height, rgba };
  }

  /** Console output so far (call from onFrame for a live console). */
  stdoutSoFar() {
    return decodeText(this.buf(this.x.qb_web_poll_stdout()));
  }

  put(bytes) {
    const p = this.x.qb_web_alloc(bytes.length);
    new Uint8Array(this.x.memory.buffer, p, bytes.length).set(bytes);
    return p;
  }

  /**
   * @param {string} qir program text (`qb --ir`)
   * @param {string} stdin text INPUT and LINE INPUT read (lines end with \n)
   */
  run(qir, stdin = '') {
    if (this.used) this.instantiate();
    this.used = true;
    const enc = new TextEncoder();
    const src = enc.encode(qir);
    // UTF-8, as a terminal sends it (the low byte of each UTF-16 unit turned Thai into control codes)
    const inp = enc.encode(stdin);
    const ps = this.put(src);
    const pi = this.put(inp);
    let status;
    try {
      status = this.x.qb_web_run(ps, src.length, pi, inp.length);
    } catch (e) {
      // a trap (e.g. an unsupported import or a VM abort): the instance state is gone
      return { status: 3, exitCode: 0, error: 0, line: 0, message: String(e && e.message || e), stdout: '', screenText: '', frame: null };
    } finally {
      try {
        this.x.qb_web_free(ps, src.length);
        this.x.qb_web_free(pi, inp.length);
      } catch { /* instance trapped */ }
    }
    this.pumpAudio(true);
    return {
      status,
      exitCode: this.x.qb_web_exit_code(),
      error: this.x.qb_web_error(),
      line: this.x.qb_web_error_line(),
      message: this.text(1),
      stdout: this.text(0),
      screenText: this.text(2),
      frame: this.frame(1),
    };
  }
}

export default QBNex;
