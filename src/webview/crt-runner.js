// QBasic Nexus - Retro CRT page.
// Runs QIR programs on qb-web in a worker; the extension sends the qb-web
// loader and wasm (vendor/qb-web) once, then one QIR program per run.
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('gfx-layer');
  const ctx2d = canvas.getContext('2d');
  const consoleEl = document.getElementById('screen');
  const questHud = document.getElementById('quest-hud');
  const questTitle = document.getElementById('quest-title');
  const questDesc = document.getElementById('quest-desc');

  function showLesson(lesson, passed) {
    if (!lesson) {
      questHud.classList.remove('visible', 'pass');
      return;
    }
    questTitle.textContent = passed ? 'LESSON COMPLETE' : 'CURRENT OBJECTIVE';
    questDesc.textContent = passed ? lesson.title : `${lesson.title}\n${lesson.objective}`;
    questHud.classList.add('visible');
    questHud.classList.toggle('pass', !!passed);
  }

  // Input event protocol of qb-web (crates/engine/exec/src/rt/input.rs).
  const EVENT_KEY = 1;
  const EVENT_BUTTON = 2;
  const EVENT_MOVE = 3;
  const EVENT_WHEEL = 4;
  const RING = 256;
  const NAMED_KEYS = {
    PageUp: 20, PageDown: 21, Home: 22, End: 23, ArrowLeft: 24, ArrowUp: 25, ArrowRight: 26, ArrowDown: 27,
    Insert: 28, Delete: 29, Pause: 36, Cancel: 37, Enter: 38, Escape: 39, Tab: 40, Backspace: 41,
  };
  const MODIFIER_KEYS = { ControlLeft: 30, ControlRight: 31, ShiftLeft: 32, ShiftRight: 33, AltLeft: 34, AltRight: 35 };
  const VIRTUAL_KEYS = { CapsLock: 0x14, NumLock: 0x90, ScrollLock: 0x91, Meta: 0x5b, ContextMenu: 0x5d, PrintScreen: 0x2c };

  const WORKER_BODY = `
let qb = null;
let ring = null;
let lastOut = '';
function pollEvent() {
  if (!ring) return null;
  const written = Atomics.load(ring, 0);
  const read = Atomics.load(ring, 1);
  if (read >= written) return null;
  const at = 2 + (read % ${RING}) * 6;
  const e = Array.from(ring.subarray(at, at + 6));
  Atomics.store(ring, 1, read + 1);
  return e;
}
const hooks = {
  interactive: false,
  pollEvent,
  onFrame(f) {
    postMessage({ type: 'frame', frame: f }, [f.rgba.buffer]);
    const out = qb.stdoutSoFar();
    if (out !== lastOut) {
      lastOut = out;
      postMessage({ type: 'stdout', text: out });
    }
  },
  onAudio(pcm, rate) {
    postMessage({ type: 'audio', pcm, rate }, [pcm.buffer]);
  },
};
onmessage = async (ev) => {
  const m = ev.data;
  if (m.type === 'init') {
    try {
      qb = await QBNex.load(m.wasm, hooks);
      postMessage({ type: 'ready' });
    } catch (e) {
      postMessage({ type: 'fatal', message: String((e && e.message) || e) });
    }
    return;
  }
  if (m.type === 'events') {
    ring = new Int32Array(m.sab);
    hooks.interactive = true;
    return;
  }
  if (m.type === 'run' && qb) {
    if (ring) Atomics.store(ring, 1, Atomics.load(ring, 0));
    lastOut = '';
    const t0 = performance.now();
    const r = qb.run(m.qir, m.stdin || '');
    r.ms = performance.now() - t0;
    postMessage({ type: 'done', result: r }, r.frame ? [r.frame.rgba.buffer] : []);
  }
};
`;

  let loaderSource = null;
  let wasmBytes = null;
  let worker = null;
  let workerReady = false;
  let running = false;
  let queuedRun = null;
  let ring = null;
  let audio = null;
  let audioTime = 0;
  let announcedReady = false;

  const liveInput = typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;

  // The 1.x screen has no status line: the state shows as the screen's tooltip.
  function setStatus(text) {
    canvas.title = text;
  }

  function startWorker() {
    worker?.terminate();
    workerReady = false;
    running = false;
    const url = URL.createObjectURL(new Blob([loaderSource, WORKER_BODY], { type: 'text/javascript' }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = onWorkerMessage;
    worker.onerror = (e) => {
      setStatus(`Worker error: ${e.message || e}`);
      vscode.postMessage({ type: 'fatal', message: String(e.message || e) });
    };
    if (liveInput) {
      const sab = new SharedArrayBuffer((2 + RING * 6) * 4);
      ring = new Int32Array(sab);
      worker.postMessage({ type: 'events', sab });
    }
    worker.postMessage({ type: 'init', wasm: wasmBytes.slice().buffer });
  }

  function drawFrame(frame) {
    if (!frame) return;
    if (canvas.width !== frame.width || canvas.height !== frame.height) {
      canvas.width = frame.width;
      canvas.height = frame.height;
    }
    ctx2d.putImageData(new ImageData(frame.rgba, frame.width, frame.height), 0, 0);
  }

  function showConsole(text) {
    consoleEl.textContent = text || '';
  }

  function playAudio(pcm, rate) {
    if (!audio) return;
    const frames = pcm.length / 2;
    const buffer = audio.createBuffer(2, frames, rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < frames; i++) {
      left[i] = pcm[i * 2];
      right[i] = pcm[i * 2 + 1];
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    audioTime = Math.max(audioTime, audio.currentTime + 0.02);
    source.start(audioTime);
    audioTime += buffer.duration;
  }

  function ensureAudio() {
    if (audio) {
      void audio.resume();
      return;
    }
    try {
      audio = new AudioContext();
    } catch {
      audio = null;
    }
  }

  function onWorkerMessage(ev) {
    const m = ev.data;
    switch (m.type) {
      case 'ready':
        workerReady = true;
        setStatus('Ready');
        if (!announcedReady) {
          announcedReady = true;
          vscode.postMessage({ type: 'ready' });
        }
        if (queuedRun) {
          const run = queuedRun;
          queuedRun = null;
          startRun(run);
        }
        break;
      case 'frame':
        drawFrame(m.frame);
        break;
      case 'stdout':
        showConsole(m.text);
        break;
      case 'audio':
        playAudio(m.pcm, m.rate);
        break;
      case 'done': {
        running = false;
        const r = m.result;
        drawFrame(r.frame);
        showConsole(r.stdout);
        const seconds = (r.ms / 1000).toFixed(2);
        if (r.status === 0) setStatus(`Finished in ${seconds}s${r.exitCode ? ` (exit code ${r.exitCode})` : ''}`);
        else if (r.status === 1) setStatus(`Runtime error ${r.error} at line ${r.line}: ${r.message}`);
        else setStatus(`Stopped: ${r.message}`);
        const { frame, ...rest } = r;
        void frame;
        vscode.postMessage({ type: 'done', result: rest });
        break;
      }
      case 'fatal':
        setStatus(`qb-web failed: ${m.message}`);
        vscode.postMessage({ type: 'fatal', message: m.message });
        break;
      default:
        break;
    }
  }

  function startRun(run) {
    if (!workerReady) {
      queuedRun = run;
      return;
    }
    if (running) {
      // A program is still running: start over on a fresh worker.
      queuedRun = run;
      startWorker();
      setStatus('Restarting...');
      return;
    }
    running = true;
    showConsole('');
    showLesson(run.lesson, false);
    setStatus('Running...');
    worker.postMessage({ type: 'run', qir: run.qir, stdin: run.stdin || '' });
    canvas.focus();
  }

  function pushEvent(event) {
    if (!ring || !running) return;
    const written = Atomics.load(ring, 0);
    const read = Atomics.load(ring, 1);
    if (written - read >= RING) return;
    ring.set(event, 2 + (written % RING) * 6);
    Atomics.store(ring, 0, written + 1);
  }

  function keyEvent(e, pressed) {
    const mods = (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0);
    let id = -1;
    let ch = 0;
    if (e.code in MODIFIER_KEYS) id = MODIFIER_KEYS[e.code];
    else if (e.key in NAMED_KEYS) id = NAMED_KEYS[e.key];
    else if (/^F([1-9]|1[0-2])$/.test(e.key)) id = Number(e.key.slice(1));
    else if (e.key in VIRTUAL_KEYS) {
      id = 50;
      ch = VIRTUAL_KEYS[e.key];
    } else if ([...e.key].length === 1) {
      id = 0;
      ch = e.key.codePointAt(0);
    }
    if (id < 0) return null;
    return [EVENT_KEY, pressed ? 1 : 0, e.repeat ? 1 : 0, id, ch, mods];
  }

  function screenPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width),
      Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height),
    ];
  }

  canvas.addEventListener('keydown', (e) => {
    const event = keyEvent(e, true);
    if (event && running) {
      e.preventDefault();
      pushEvent(event);
    }
  });
  canvas.addEventListener('keyup', (e) => {
    const event = keyEvent(e, false);
    if (event && running) {
      e.preventDefault();
      pushEvent(event);
    }
  });
  canvas.addEventListener('mousemove', (e) => pushEvent([EVENT_MOVE, ...screenPoint(e), 0, 0, 0]));
  canvas.addEventListener('mousedown', (e) => {
    ensureAudio();
    canvas.focus();
    pushEvent([EVENT_BUTTON, e.button, 1, ...screenPoint(e), 0]);
  });
  canvas.addEventListener('mouseup', (e) => pushEvent([EVENT_BUTTON, e.button, 0, ...screenPoint(e), 0]));
  canvas.addEventListener('wheel', (e) => {
    if (!running) return;
    e.preventDefault();
    pushEvent([EVENT_WHEEL, e.deltaY < 0 ? 1 : -1, ...screenPoint(e), 0, 0]);
  }, { passive: false });


  window.addEventListener('message', (ev) => {
    const m = ev.data;
    if (m.type === 'init') {
      loaderSource = m.loader;
      wasmBytes = m.wasm instanceof Uint8Array ? m.wasm : new Uint8Array(m.wasm);
      startWorker();
    } else if (m.type === 'run') {
      ensureAudio();
      startRun(m);
    } else if (m.type === 'lesson') {
      showLesson({ title: m.title, objective: m.objective }, m.passed);
    } else if (m.type === 'stop') {
      if (!worker) return;
      queuedRun = null;
      startWorker();
      setStatus('Stopped');
    }
  });

  vscode.postMessage({ type: 'hello' });
})();
