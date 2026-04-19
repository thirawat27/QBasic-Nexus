'use strict';

const Module = require('module');
const { EventEmitter } = require('events');

console.log('\n📦 Optimization Manager Tests\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function createVscodeMock() {
  let buildCount = 0;

  class SemanticTokensLegend {
    constructor(tokenTypes, tokenModifiers) {
      this.tokenTypes = tokenTypes;
      this.tokenModifiers = tokenModifiers;
    }
  }

  class SemanticTokensBuilder {
    constructor(legend) {
      this.legend = legend;
      this.entries = [];
    }

    push(line, start, length, tokenType, modifierMask) {
      this.entries.push({ line, start, length, tokenType, modifierMask });
    }

    build() {
      buildCount++;
      return {
        buildId: buildCount,
        entries: this.entries.slice(),
      };
    }
  }

  return {
    SemanticTokensLegend,
    SemanticTokensBuilder,
  };
}

function loadSemanticTokenProvider() {
  const vscodeMock = createVscodeMock();
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') return vscodeMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  const modulePath = require.resolve('../src/providers/semanticTokenProvider');
  delete require.cache[modulePath];

  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

test('Semantic token provider reuses cached tokens for the same document version', () => {
  const {
    QBasicDocumentSemanticTokenProvider,
    invalidateSemanticTokenCache,
  } = loadSemanticTokenProvider();
  const provider = new QBasicDocumentSemanticTokenProvider();
  const document = {
    uri: { toString: () => 'test://demo.bas' },
    version: 1,
    getText: () => 'DIM sharedValue\nsharedValue = 1',
  };

  const first = provider.provideDocumentSemanticTokens(document);
  const second = provider.provideDocumentSemanticTokens(document);

  assert(first === second, 'Expected semantic token result to be cached for the same version');

  document.version = 2;
  const third = provider.provideDocumentSemanticTokens(document);
  assert(third !== first, 'Expected cache miss after document version changes');

  invalidateSemanticTokenCache(document.uri);
  const fourth = provider.provideDocumentSemanticTokens(document);
  assert(fourth !== third, 'Expected explicit invalidation to drop semantic token cache');
});

test('LintWorkerClient returns diagnostics for invalid source', async () => {
  const { LintWorkerClient } = require('../src/managers/LintWorkerClient');
  const client = new LintWorkerClient();

  try {
    const okErrors = await client.lint('PRINT "Hello"', {});
    const badErrors = await client.lint('FOR = 1 TO 10', {});

    assert(Array.isArray(okErrors) && okErrors.length === 0, 'Valid source should not produce lint errors');
    assert(Array.isArray(badErrors) && badErrors.length > 0, 'Invalid source should produce lint diagnostics');
  } finally {
    client.dispose();
  }
});

test('LintWorkerClient scales across multiple worker threads under concurrent load', async () => {
  const { LintWorkerClient } = require('../src/managers/LintWorkerClient');
  const createdWorkers = [];

  class FakeWorker extends EventEmitter {
    constructor() {
      super();
      this.messages = [];
      this.id = createdWorkers.length + 1;
      createdWorkers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);

      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      setTimeout(() => {
        this.emit('message', {
          id: message.id,
          errors: [{ workerId: this.id, source: message.source }],
        });
      }, this.id === 1 ? 20 : 0);
    }

    terminate() {
      this.terminated = true;
      return Promise.resolve();
    }
  }

  const client = new LintWorkerClient({
    WorkerClass: FakeWorker,
    maxWorkers: 2,
    fallbackTranspiler: { lint: () => [] },
  });

  try {
    client.prepare();
    const [first, second] = await Promise.all([
      client.lint('first-source', {}),
      client.lint('second-source', {}),
    ]);

    assert(createdWorkers.length === 2, 'Expected concurrent linting to scale out to a second worker');
    assert(
      createdWorkers.every((worker) => worker.messages.some((message) => message.type !== 'warmup')),
      'Expected each worker to process at least one lint request',
    );
    assert(first[0].workerId !== second[0].workerId, 'Expected concurrent lint requests to be distributed across workers');

    const stats = client.getStats();
    assert(stats.maxWorkers === 2, 'Expected worker stats to expose the configured pool size');
    assert(stats.activeWorkers === 2, 'Expected worker stats to reflect the active worker pool');
  } finally {
    client.dispose();
  }
});

test('LintWorkerClient cancels superseded document work by restarting the stale worker', async () => {
  const { LintWorkerClient } = require('../src/managers/LintWorkerClient');
  const createdWorkers = [];

  class FakeWorker extends EventEmitter {
    constructor() {
      super();
      this.messages = [];
      this.terminated = false;
      this.id = createdWorkers.length + 1;
      createdWorkers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);

      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      if (this.id === 1) {
        return;
      }

      setImmediate(() => {
        this.emit('message', {
          id: message.id,
          errors: [{ workerId: this.id, source: message.source }],
        });
      });
    }

    terminate() {
      this.terminated = true;
      return Promise.resolve();
    }
  }

  const client = new LintWorkerClient({
    WorkerClass: FakeWorker,
    maxWorkers: 2,
    fallbackTranspiler: { lint: () => [] },
  });

  try {
    client.prepare();

    const firstPromise = client.lint('stale-source', {
      sourcePath: 'demo.bas',
      cancelKey: 'demo.bas',
    });

    await new Promise((resolve) => setImmediate(resolve));

    const secondResult = await client.lint('fresh-source', {
      sourcePath: 'demo.bas',
      cancelKey: 'demo.bas',
    });
    const firstResult = await firstPromise;

    assert(createdWorkers.length >= 2, 'Expected superseded lint work to spin up a replacement worker');
    assert(createdWorkers[0].terminated, 'Expected stale worker to be terminated when a newer document version arrived');
    assert(Array.isArray(firstResult) && firstResult.length === 0, 'Expected the superseded lint request to resolve as cancelled');
    assert(secondResult[0].workerId === 2, 'Expected the fresh lint request to complete on the replacement worker');
  } finally {
    client.dispose();
  }
});

test('CompileWorkerClient returns hydrated compilation results from worker threads', async () => {
  const { CompileWorkerClient } = require('../src/managers/CompileWorkerClient');
  const createdWorkers = [];

  class FakeCompileWorker extends EventEmitter {
    constructor() {
      super();
      this.messages = [];
      createdWorkers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);

      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      setImmediate(() => {
        this.emit('message', {
          id: message.id,
          result: {
            code: 'compiled-js',
            diagnostics: [],
            metadata: { cached: false, totalTime: 1.5 },
            success: true,
          },
        });
      });
    }

    terminate() {
      return Promise.resolve();
    }
  }

  const client = new CompileWorkerClient({
    WorkerClass: FakeCompileWorker,
    maxWorkers: 1,
  });

  try {
    client.prepare();
    const result = await client.compile(
      'PRINT "hi"',
      { sourcePath: 'demo.bas' },
      { target: 'web', cache: true },
    );

    assert(result.isSuccess(), 'Expected hydrated worker result to expose success helpers');
    assert(result.getCode() === 'compiled-js', 'Expected hydrated worker result to expose generated code');
    assert(result.getMetadata().totalTime === 1.5, 'Expected worker metadata to be preserved');
    assert(
      createdWorkers[0].messages.some((message) => message.type === 'compile'),
      'Expected compile request to be posted to the worker',
    );
  } finally {
    client.dispose();
  }
});

test('CompileWorkerClient scales across multiple worker threads under concurrent load', async () => {
  const { CompileWorkerClient } = require('../src/managers/CompileWorkerClient');
  const createdWorkers = [];

  class FakeCompileWorker extends EventEmitter {
    constructor() {
      super();
      this.messages = [];
      this.id = createdWorkers.length + 1;
      createdWorkers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);

      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      setTimeout(() => {
        this.emit('message', {
          id: message.id,
          result: {
            code: `compiled-${this.id}`,
            diagnostics: [],
            metadata: { workerId: this.id },
            success: true,
          },
        });
      }, this.id === 1 ? 20 : 0);
    }

    terminate() {
      return Promise.resolve();
    }
  }

  const client = new CompileWorkerClient({
    WorkerClass: FakeCompileWorker,
    maxWorkers: 2,
  });

  try {
    client.prepare();
    const [first, second] = await Promise.all([
      client.compile('PRINT "one"', {}, { target: 'web' }),
      client.compile('PRINT "two"', {}, { target: 'web' }),
    ]);

    assert(createdWorkers.length === 2, 'Expected concurrent compile requests to scale out to a second worker');
    assert(first.getMetadata().workerId !== second.getMetadata().workerId, 'Expected compile requests to be distributed across workers');

    const stats = client.getStats();
    assert(stats.activeWorkers === 2, 'Expected compile worker stats to report the active pool');
    assert(stats.maxWorkers === 2, 'Expected compile worker stats to preserve the configured pool size');
  } finally {
    client.dispose();
  }
});

test('CompileWorkerClient drains queued work by priority before older low-priority jobs', async () => {
  const { CompileWorkerClient } = require('../src/managers/CompileWorkerClient');
  const processedSources = [];

  class FakeCompileWorker extends EventEmitter {
    constructor() {
      super();
      this.messages = [];
      this.compileCount = 0;
    }

    postMessage(message) {
      this.messages.push(message);

      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      this.compileCount += 1;
      const source = message.source;
      processedSources.push(source);

      const emitResult = () =>
        this.emit('message', {
          id: message.id,
          result: {
            code: `compiled-${source}`,
            diagnostics: [],
            metadata: { source },
            success: true,
          },
        });

      if (this.compileCount === 1) {
        setTimeout(emitResult, 20);
      } else {
        setImmediate(emitResult);
      }
    }

    terminate() {
      return Promise.resolve();
    }
  }

  const client = new CompileWorkerClient({
    WorkerClass: FakeCompileWorker,
    maxWorkers: 1,
  });

  try {
    client.prepare();
    await new Promise((resolve) => setImmediate(resolve));

    const first = client.compile('first', {}, { priority: 0 });
    const low = client.compile('low', {}, { priority: 1 });
    const high = client.compile('high', {}, { priority: 50 });

    const results = await Promise.all([first, low, high]);
    assert(
      JSON.stringify(processedSources) === JSON.stringify(['first', 'high', 'low']),
      `Expected queued compile order ["first","high","low"], got ${JSON.stringify(processedSources)}`,
    );
    assert(
      results[1].getMetadata().source === 'low' && results[2].getMetadata().source === 'high',
      'Expected compile results to stay bound to their original requests',
    );
  } finally {
    client.dispose();
  }
});

test('CompileWorkerClient ages queued work so long-waiting jobs can overtake newer medium priority work', async () => {
  const { CompileWorkerClient } = require('../src/managers/CompileWorkerClient');
  const processedSources = [];
  let now = 0;

  class FakeCompileWorker extends EventEmitter {
    constructor() {
      super();
      this.compileCount = 0;
    }

    postMessage(message) {
      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      this.compileCount += 1;
      const source = message.source;
      processedSources.push(source);

      const emitResult = () => {
        if (this.compileCount === 1) {
          now = 120;
        } else {
          now += 5;
        }

        this.emit('message', {
          id: message.id,
          result: {
            code: `compiled-${source}`,
            diagnostics: [],
            metadata: { source },
            success: true,
          },
        });
      };

      if (this.compileCount === 1) {
        setTimeout(emitResult, 5);
      } else {
        setImmediate(emitResult);
      }
    }

    terminate() {
      return Promise.resolve();
    }
  }

  const client = new CompileWorkerClient({
    WorkerClass: FakeCompileWorker,
    maxWorkers: 1,
    now: () => now,
    agingIntervalMs: 10,
    agingBoostPerInterval: 5,
  });

  try {
    client.prepare();
    await new Promise((resolve) => setImmediate(resolve));

    const first = client.compile('first', {}, { priority: 0 });
    now = 10;
    const agedLow = client.compile('aged-low', {}, { priority: 1 });
    now = 105;
    const medium = client.compile('medium', {}, { priority: 10 });

    await Promise.all([first, agedLow, medium]);

    assert(
      JSON.stringify(processedSources) === JSON.stringify(['first', 'aged-low', 'medium']),
      `Expected aged queue order ["first","aged-low","medium"], got ${JSON.stringify(processedSources)}`,
    );
  } finally {
    client.dispose();
  }
});

test('Pooled worker stats expose queue timing and cancellation metrics', async () => {
  const { LintWorkerClient } = require('../src/managers/LintWorkerClient');
  const createdWorkers = [];
  let now = 0;

  class FakeWorker extends EventEmitter {
    constructor() {
      super();
      this.id = createdWorkers.length + 1;
      this.messages = [];
      this.terminated = false;
      createdWorkers.push(this);
    }

    postMessage(message) {
      this.messages.push(message);

      if (message.type === 'warmup') {
        setImmediate(() => this.emit('message', { type: 'ready' }));
        return;
      }

      if (this.id === 1) {
        return;
      }

      setImmediate(() => {
        now += 15;
        this.emit('message', {
          id: message.id,
          errors: [{ workerId: this.id }],
        });
      });
    }

    terminate() {
      this.terminated = true;
      return Promise.resolve();
    }
  }

  const client = new LintWorkerClient({
    WorkerClass: FakeWorker,
    maxWorkers: 2,
    fallbackTranspiler: { lint: () => [] },
    now: () => now,
    agingIntervalMs: 20,
  });

  try {
    client.prepare();
    const stalePromise = client.lint('stale-source', {
      cancelKey: 'demo.bas',
      sourcePath: 'demo.bas',
      priority: 5,
    });

    await new Promise((resolve) => setImmediate(resolve));

    now = 25;
    const freshPromise = client.lint('fresh-source', {
      cancelKey: 'demo.bas',
      sourcePath: 'demo.bas',
      priority: 5,
    });
    now = 55;
    const [freshResult, staleResult] = await Promise.all([freshPromise, stalePromise]);
    const stats = client.getStats();

    assert(Array.isArray(staleResult) && staleResult.length === 0, 'Expected stale lint work to resolve as cancelled');
    assert(Array.isArray(freshResult) && freshResult.length === 1, 'Expected fresh lint work to complete normally');
    assert(stats.metrics.canceledRequests === 1, `Expected 1 canceled request, got ${stats.metrics.canceledRequests}`);
    assert(stats.metrics.completedRequests === 2, `Expected 2 completed requests, got ${stats.metrics.completedRequests}`);
    assert(stats.metrics.fallbackRequests === 0, `Expected 0 fallback requests, got ${stats.metrics.fallbackRequests}`);
    assert(stats.metrics.dispatchedRequests === 2, `Expected 2 dispatched requests, got ${stats.metrics.dispatchedRequests}`);
    assert(stats.metrics.totalQueueWaitMs >= 30, `Expected queued wait time to be recorded, got ${stats.metrics.totalQueueWaitMs}`);
    assert(stats.metrics.averageRunTimeMs >= 0, 'Expected average run time metric to be present');
    assert(stats.metrics.longestQueueWaitMs >= 30, `Expected longest queue wait to be recorded, got ${stats.metrics.longestQueueWaitMs}`);
    assert(createdWorkers[0].terminated, 'Expected cancellation path to terminate the stale worker');
  } finally {
    client.dispose();
  }
});

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${err.message}`);
      failed++;
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED\n`);

  process.exit(failed > 0 ? 1 : 0);
}

void run();
