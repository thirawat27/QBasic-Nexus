'use strict';

/**
 * Debug Adapter Protocol session for QB64-PE programs compiled with `$DEBUG`.
 *
 * Acts as the vWATCH "IDE" side: it hosts a TCP port, starts the program with
 * QB64DEBUGPORT set, and translates DAP requests into vWATCH commands.
 *
 * Supported: breakpoints (main .bas file), continue, pause, step over/into/
 * out, call stack, runtime-error stops, program end.
 * Not supported: reading variables (vWATCH has no symbol table on the wire),
 * breakpoints inside $INCLUDEd files (QB64-PE does not instrument them).
 *
 * No VS Code dependency: compiling and launching are injected, so the session
 * can be tested against a fake program.
 */

const fs = require('fs');
const net = require('net');
const path = require('path');
const {
  MessageReader,
  encodeMessage,
  handshakeMessages,
  mkl,
  cvl,
  parseCallStack,
} = require('./vwatchProtocol');

const THREAD_ID = 1;
const CONNECT_TIMEOUT_MS = 15000;
const STACK_TIMEOUT_MS = 3000;
const DEBUG_METACOMMAND_RE = /^\s*\$DEBUG\b/im;

class QB64DebugSession {
  /**
   * @param {{
   *   send: (message: object) => void,
   *   compile: (programPath: string, log: (text: string) => void) => Promise<string>,
   *   launch: (exePath: string, options: {cwd: string, env: Record<string, string>}) => {kill: () => void},
   *   readFile?: (filePath: string) => string,
   * }} host
   */
  constructor(host) {
    this._host = host;
    this._readFile = host.readFile || ((file) => fs.readFileSync(file, 'utf8'));
    this._seq = 1;
    this._server = null;
    this._socket = null;
    this._reader = new MessageReader();
    this._process = null;
    this._program = null;
    this._lineCount = 0;
    this._breakpoints = new Set();
    this._stopOnEntry = false;
    this._pauseRequested = false;
    this._currentLine = 0;
    this._currentSub = '';
    this._stackWaiters = [];
    this._pendingStackSize = null;
    this._terminated = false;
    this._configured = false;
    this._connectTimer = null;
    this._handshakePending = false;
  }

  // ── DAP plumbing ──────────────────────────────────────────────────────────

  _send(message) {
    this._host.send({ seq: this._seq++, ...message });
  }

  _respond(request, body = {}, error = null) {
    this._send({
      type: 'response',
      request_seq: request.seq,
      command: request.command,
      success: !error,
      ...(error ? { message: error } : {}),
      body,
    });
  }

  _event(event, body = {}) {
    this._send({ type: 'event', event, body });
  }

  _output(text, category = 'console') {
    this._event('output', { category, output: text.endsWith('\n') ? text : `${text}\n` });
  }

  /**
   * Entry point for every DAP request from the client.
   * @param {object} message
   */
  async handleMessage(message) {
    if (message.type !== 'request') return;
    const handler = this[`_on_${message.command}`];
    if (!handler) {
      this._respond(message, {}, `Unsupported request: ${message.command}`);
      return;
    }
    try {
      await handler.call(this, message, message.arguments || {});
    } catch (error) {
      this._respond(message, {}, error?.message || String(error));
    }
  }

  // ── DAP requests ──────────────────────────────────────────────────────────

  _on_initialize(request) {
    this._respond(request, {
      supportsConfigurationDoneRequest: true,
      supportsTerminateRequest: true,
      supportTerminateDebuggee: true,
    });
    this._event('initialized');
  }

  async _on_launch(request, args) {
    const program = args.program;
    if (!program || !fs.existsSync(program)) {
      throw new Error(`Program not found: ${program || '(none)'}`);
    }
    const source = this._readFile(program);
    if (!DEBUG_METACOMMAND_RE.test(source)) {
      throw new Error(
        'The program needs the $DEBUG metacommand to be debugged. Add a line containing $DEBUG at the top of the file.',
      );
    }

    this._program = path.resolve(program);
    this._lineCount = source.split(/\r?\n/).length + 1;
    this._stopOnEntry = Boolean(args.stopOnEntry);

    const exePath = await this._host.compile(this._program, (text) => this._output(text));
    const port = await this._listen();

    this._output(`Waiting for ${path.basename(exePath)} to connect on port ${port}…`);
    this._process = this._host.launch(exePath, {
      cwd: path.dirname(this._program),
      env: { QB64DEBUGPORT: String(port) },
    });
    this._connectTimer = setTimeout(() => {
      if (!this._socket) {
        this._output('The program did not connect to the debugger. Was it compiled with $DEBUG by QB64-PE?', 'stderr');
        this._terminate();
      }
    }, CONNECT_TIMEOUT_MS);

    this._respond(request);
  }

  _on_setBreakpoints(request, args) {
    const sourcePath = args.source?.path ? path.resolve(args.source.path) : '';
    const requested = (args.breakpoints || []).map((bp) => bp.line);
    const isMainFile =
      this._program === null ||
      sourcePath.toLowerCase() === this._program.toLowerCase();

    if (!isMainFile) {
      this._respond(request, {
        breakpoints: requested.map((line) => ({
          verified: false,
          line,
          message: 'QB64-PE only stops in the main .bas file; $INCLUDEd code is not instrumented.',
        })),
      });
      return;
    }

    const next = new Set(requested);
    if (this._socket) {
      for (const line of this._breakpoints) {
        if (!next.has(line)) this._write('clear breakpoint', mkl(line));
      }
      for (const line of next) {
        if (!this._breakpoints.has(line)) this._write('set breakpoint', mkl(line));
      }
    }
    this._breakpoints = next;

    this._respond(request, {
      breakpoints: requested.map((line) => ({ verified: true, line })),
    });
  }

  _on_configurationDone(request) {
    this._configured = true;
    this._respond(request);
    if (this._handshakePending) this._sendHandshake();
  }

  _sendHandshake() {
    this._handshakePending = false;
    for (const message of handshakeMessages({
      lineCount: this._lineCount,
      breakpoints: [...this._breakpoints],
      stopOnEntry: this._stopOnEntry,
    })) {
      this._socket.write(message);
    }
    this._output('Debugger connected.');
  }

  _on_threads(request) {
    this._respond(request, { threads: [{ id: THREAD_ID, name: 'QB64 program' }] });
  }

  async _on_stackTrace(request) {
    const entries = await this._requestCallStack();
    const source = { name: path.basename(this._program || ''), path: this._program };
    const frames = [
      {
        id: 0,
        name: entries.length ? entries[entries.length - 1].name : '(main module)',
        line: this._currentLine,
        column: 1,
        source,
      },
    ];
    // Each entry records the line its caller was on when it was entered.
    for (let i = entries.length - 1; i >= 0; i--) {
      frames.push({
        id: frames.length,
        name: i > 0 ? entries[i - 1].name : '(main module)',
        line: entries[i].line || 0,
        column: 1,
        source,
      });
    }
    this._respond(request, { stackFrames: frames, totalFrames: frames.length });
  }

  _on_scopes(request) {
    this._respond(request, { scopes: [] });
  }

  _on_variables(request) {
    this._respond(request, { variables: [] });
  }

  _on_continue(request) {
    this._resume('run');
    this._respond(request, { allThreadsContinued: true });
  }

  _on_next(request) {
    this._resume('step over');
    this._respond(request);
  }

  _on_stepIn(request) {
    this._resume('step');
    this._respond(request);
  }

  _on_stepOut(request) {
    this._resume('step out');
    this._respond(request);
  }

  _on_pause(request) {
    this._pauseRequested = true;
    this._write('break');
    this._respond(request);
  }

  _on_disconnect(request, args) {
    this._respond(request);
    this._terminate({ kill: args.terminateDebuggee !== false });
  }

  _on_terminate(request) {
    this._respond(request);
    this._terminate({ kill: true });
  }

  // ── vWATCH side ───────────────────────────────────────────────────────────

  _listen() {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => this._accept(socket));
      server.once('error', reject);
      // The program connects to "localhost"; listen on IPv4 loopback and,
      // when available, the same port on IPv6 loopback.
      server.listen(0, '127.0.0.1', () => {
        this._server = server;
        const { port } = server.address();
        const v6 = net.createServer((socket) => this._accept(socket));
        v6.once('error', () => v6.close());
        v6.listen(port, '::1', () => {
          this._serverV6 = v6;
        });
        resolve(port);
      });
    });
  }

  _accept(socket) {
    if (this._socket) {
      socket.destroy();
      return;
    }
    clearTimeout(this._connectTimer);
    this._socket = socket;
    socket.setNoDelay(true);
    socket.on('data', (chunk) => {
      for (const message of this._reader.push(chunk)) this._onProgramMessage(message);
    });
    socket.on('close', () => {
      if (!this._terminated) {
        this._output('Program disconnected from the debugger.');
        this._terminate();
      }
    });
    socket.on('error', () => {});
  }

  _write(name, value) {
    if (this._socket && !this._socket.destroyed) {
      this._socket.write(encodeMessage(name, value));
    }
  }

  _resume(command) {
    this._write(command);
    this._event('continued', { threadId: THREAD_ID, allThreadsContinued: true });
  }

  _stopped(reason, line, text) {
    this._currentLine = line;
    this._event('stopped', {
      reason,
      threadId: THREAD_ID,
      allThreadsStopped: true,
      ...(text ? { text, description: text } : {}),
    });
  }

  _onProgramMessage({ name, value }) {
    switch (name) {
      case 'me':
        // Breakpoints arrive before configurationDone; hold the handshake
        // until then so the program starts with all of them set.
        this._handshakePending = true;
        if (this._configured) this._sendHandshake();
        break;
      case 'line number': {
        const reason = this._pauseRequested
          ? 'pause'
          : this._currentLine === 0 && this._stopOnEntry
            ? 'entry'
            : 'step';
        this._pauseRequested = false;
        this._stopped(reason, cvl(value));
        break;
      }
      case 'breakpoint':
        this._pauseRequested = false;
        this._stopped('breakpoint', cvl(value));
        break;
      case 'error':
        this._stopped('exception', cvl(value), 'Runtime error');
        break;
      case 'current sub':
        this._currentSub = value.toString('latin1');
        break;
      case 'call stack size':
        this._pendingStackSize = cvl(value);
        break;
      case 'call stack': {
        const entries = parseCallStack(value);
        const waiters = this._stackWaiters.splice(0);
        for (const resolve of waiters) resolve(entries);
        break;
      }
      case 'enter input':
        this._output('Program is waiting for keyboard input in its window.');
        break;
      case 'quit':
        this._output(value.toString('latin1') || 'Program ended.');
        this._terminate({ kill: false });
        break;
      default:
        break;
    }
  }

  _requestCallStack() {
    if (!this._socket) return Promise.resolve([]);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._stackWaiters = this._stackWaiters.filter((w) => w !== done);
        resolve([]);
      }, STACK_TIMEOUT_MS);
      const done = (entries) => {
        clearTimeout(timer);
        resolve(entries);
      };
      this._stackWaiters.push(done);
      this._write('call stack');
    });
  }

  _terminate({ kill = true } = {}) {
    if (this._terminated) return;
    this._terminated = true;
    clearTimeout(this._connectTimer);
    for (const resolve of this._stackWaiters.splice(0)) resolve([]);

    if (this._socket && !this._socket.destroyed) {
      if (!kill) this._write('free');
      this._socket.end();
    }
    this._server?.close();
    this._serverV6?.close();
    if (kill) {
      try {
        this._process?.kill();
      } catch {
        // Already gone.
      }
    }
    this._event('terminated');
  }

  dispose() {
    this._terminate({ kill: true });
  }
}

module.exports = { QB64DebugSession, DEBUG_METACOMMAND_RE };
