'use strict';

/**
 * QB64-PE debugger tests: vWATCH framing plus a full DAP session driven
 * against a fake program that speaks the vWATCH protocol over TCP.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const {
  MessageReader,
  encodeMessage,
  handshakeMessages,
  mkl,
  cvl,
  parseCallStack,
} = require('../src/debug/vwatchProtocol');
const { QB64DebugSession } = require('../src/debug/qb64DebugSession');

console.log('\n🐞 QB64-PE Debugger Tests\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.stack || error.message}`);
    failed++;
  }
}

function waitFor(predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const value = predicate();
      if (value) return resolve(value);
      if (Date.now() - started > timeoutMs) return reject(new Error('Timed out waiting'));
      setTimeout(tick, 10);
    };
    tick();
  });
}

(async () => {
  await test('messages are MKL$ length + name:value', async () => {
    const encoded = encodeMessage('set breakpoint', mkl(12));
    assert.equal(encoded.readInt32LE(0), encoded.length - 4);
    assert.equal(encoded.subarray(4, 19).toString('latin1'), 'set breakpoint:');
    assert.equal(cvl(encoded, 19), 12);
    assert.equal(encodeMessage('run').toString('latin1', 4), 'run');
  });

  await test('the reader reassembles split and merged chunks', async () => {
    const reader = new MessageReader();
    const stream = Buffer.concat([
      encodeMessage('me', 'C:\\a b\\prog.exe'),
      encodeMessage('line number', mkl(7)),
    ]);
    const first = reader.push(stream.subarray(0, 5));
    const rest = reader.push(stream.subarray(5));
    assert.equal(first.length, 0);
    assert.deepEqual(rest.map((m) => m.name), ['me', 'line number']);
    assert.equal(rest[0].value.toString('latin1'), 'C:\\a b\\prog.exe');
    assert.equal(cvl(rest[1].value), 7);
  });

  await test('values containing colons keep everything after the first colon', async () => {
    const [message] = new MessageReader().push(encodeMessage('quit', 'Error: at 1:2'));
    assert.equal(message.name, 'quit');
    assert.equal(message.value.toString(), 'Error: at 1:2');
  });

  await test('handshake sends ok, hwnd, line count, breakpoints, then run/break', async () => {
    const reader = new MessageReader();
    const messages = handshakeMessages({ lineCount: 20, breakpoints: [3, 3, 99, 5] })
      .flatMap((buffer) => reader.push(buffer));
    assert.deepEqual(messages.map((m) => m.name), [
      'vwatch', 'hwnd', 'line count', 'breakpoint count', 'breakpoint list', 'run',
    ]);
    assert.equal(cvl(messages[2].value), 20);
    assert.equal(cvl(messages[3].value), 2);
    assert.deepEqual([cvl(messages[4].value, 0), cvl(messages[4].value, 4)], [3, 5]);
    const paused = handshakeMessages({ lineCount: 5, breakpoints: [], stopOnEntry: true })
      .flatMap((buffer) => new MessageReader().push(buffer));
    assert.deepEqual(paused.map((m) => m.name), ['vwatch', 'hwnd', 'line count', 'break']);
  });

  await test('call stack entries are split on NUL and parsed', async () => {
    const entries = parseCallStack(Buffer.from('DrawAll, line 12\0Plot, line 30', 'latin1'));
    assert.deepEqual(entries, [
      { name: 'DrawAll', line: 12 },
      { name: 'Plot', line: 30 },
    ]);
    assert.deepEqual(parseCallStack(Buffer.alloc(0)), []);
  });

  await test('a DAP session drives a fake $DEBUG program end to end', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-debug-'));
    const program = path.join(dir, 'game.bas');
    const include = path.join(dir, 'lib.bi');
    fs.writeFileSync(program, '$DEBUG\nPRINT 1\nDrawAll\nPRINT 2\nSUB DrawAll\nPRINT 3\nEND SUB\n');

    const sent = [];
    const fromIde = [];
    let client = null;
    let killed = false;

    const session = new QB64DebugSession({
      send: (message) => sent.push(message),
      compile: async (programPath, log) => {
        log('compiled\n');
        return programPath.replace(/\.bas$/, '.exe');
      },
      launch: (exePath, { env }) => {
        const reader = new MessageReader();
        client = net.connect(Number(env.QB64DEBUGPORT), '127.0.0.1', () => {
          client.write(encodeMessage('me', exePath));
        });
        client.on('data', (chunk) => fromIde.push(...reader.push(chunk)));
        client.on('error', () => {});
        return { kill: () => { killed = true; } };
      },
    });

    let seq = 1;
    const request = async (command, args = {}) => {
      const requestSeq = seq++;
      await session.handleMessage({ type: 'request', seq: requestSeq, command, arguments: args });
      return waitFor(() => sent.find((m) => m.type === 'response' && m.request_seq === requestSeq));
    };
    const events = (name) => sent.filter((m) => m.type === 'event' && m.event === name);

    try {
      await request('initialize', { linesStartAt1: true });
      assert.equal(events('initialized').length, 1);

      const launch = await request('launch', { program });
      assert.ok(launch.success, launch.message);

      const breakpoints = await request('setBreakpoints', {
        source: { path: program },
        breakpoints: [{ line: 3 }, { line: 6 }],
      });
      assert.deepEqual(breakpoints.body.breakpoints.map((b) => b.verified), [true, true]);

      const includeBps = await request('setBreakpoints', {
        source: { path: include },
        breakpoints: [{ line: 1 }],
      });
      assert.equal(includeBps.body.breakpoints[0].verified, false);

      // The handshake waits for configurationDone so breakpoints are included.
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(fromIde.length, 0);
      await request('configurationDone');

      await waitFor(() => fromIde.find((m) => m.name === 'run'));
      const list = fromIde.find((m) => m.name === 'breakpoint list');
      assert.deepEqual([cvl(list.value, 0), cvl(list.value, 4)].sort(), [3, 6]);

      // Program hits the breakpoint inside SUB DrawAll.
      client.write(Buffer.concat([
        encodeMessage('breakpoint', mkl(6)),
        encodeMessage('current sub', 'SUB_DRAWALL'),
      ]));
      const stopped = await waitFor(() => events('stopped')[0]);
      assert.equal(stopped.body.reason, 'breakpoint');

      // Answer the call stack request like vwatch.bm does.
      const stackPromise = request('stackTrace', { threadId: 1 });
      await waitFor(() => fromIde.find((m) => m.name === 'call stack'));
      client.write(Buffer.concat([
        encodeMessage('call stack size', mkl(1)),
        encodeMessage('call stack', 'DrawAll, line 3'),
      ]));
      const stack = await stackPromise;
      assert.deepEqual(
        stack.body.stackFrames.map((f) => `${f.name}@${f.line}`),
        ['DrawAll@6', '(main module)@3'],
      );
      assert.equal(stack.body.stackFrames[0].source.path, path.resolve(program));

      // Breakpoint edits while paused are sent as set/clear commands.
      await request('setBreakpoints', { source: { path: program }, breakpoints: [{ line: 3 }, { line: 4 }] });
      await waitFor(() => fromIde.find((m) => m.name === 'set breakpoint'));
      assert.equal(cvl(fromIde.find((m) => m.name === 'set breakpoint').value), 4);
      assert.equal(cvl(fromIde.find((m) => m.name === 'clear breakpoint').value), 6);

      for (const [command, wire] of [['next', 'step over'], ['stepIn', 'step'], ['stepOut', 'step out'], ['continue', 'run'], ['pause', 'break']]) {
        const before = fromIde.length;
        await request(command, { threadId: 1 });
        const message = await waitFor(() => fromIde.slice(before).find((m) => m.name === wire));
        assert.equal(message.name, wire);
      }

      client.write(encodeMessage('line number', mkl(4)));
      const paused = await waitFor(() => events('stopped')[1]);
      assert.equal(paused.body.reason, 'pause');

      client.write(encodeMessage('quit', 'Program ended.'));
      await waitFor(() => events('terminated')[0]);
      assert.equal(killed, false, 'a program that ended by itself is not killed');
      assert.ok(
        events('output').some((e) => e.body.output.includes('Program ended.')),
      );
    } finally {
      client?.destroy();
      session.dispose();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test('launch refuses a program without $DEBUG', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbnx-debug-'));
    const program = path.join(dir, 'plain.bas');
    fs.writeFileSync(program, 'PRINT 1\n');
    const sent = [];
    const session = new QB64DebugSession({
      send: (m) => sent.push(m),
      compile: async () => { throw new Error('should not compile'); },
      launch: () => { throw new Error('should not launch'); },
    });
    try {
      await session.handleMessage({ type: 'request', seq: 1, command: 'launch', arguments: { program } });
      const response = sent.find((m) => m.type === 'response');
      assert.equal(response.success, false);
      assert.match(response.message, /\$DEBUG/);
    } finally {
      session.dispose();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
})();
