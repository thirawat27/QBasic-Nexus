'use strict';

async function loadBenchClass() {
  try {
    const moduleNamespace = await import('tinybench');
    return moduleNamespace.Bench;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `tinybench is required to run the benchmark suite. Install dependencies first. ${detail}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
}

function summarizeTask(task) {
  const result = task?.result;
  const completed =
    result &&
    (result.state === 'completed' || result.state === 'aborted-with-statistics');

  if (!completed) {
    throw new Error(`Benchmark task "${task?.name || 'unknown'}" did not complete successfully.`);
  }

  return {
    mean: result.latency.mean,
    median: result.latency.p50,
    min: result.latency.min,
    max: result.latency.max,
    tail: result.latency.p95 ?? result.latency.p99 ?? result.latency.max,
    samples: result.latency.samplesCount,
    opsPerSecond: result.throughput.mean,
    relativeMarginOfError: result.latency.rme,
  };
}

async function runBenchmarkTasks(name, tasks, options = {}) {
  const Bench = await loadBenchClass();
  const bench = new Bench({
    name,
    time: options.time ?? 150,
  });

  for (const task of tasks) {
    bench.add(task.name, task.fn, task.options);
  }

  await bench.run();

  return bench.tasks.map((task) => ({
    name: task.name,
    ...summarizeTask(task),
  }));
}

function printStats(label, stats) {
  console.log(label);
  console.log(`  Mean:    ${stats.mean.toFixed(3)} ms`);
  console.log(`  Median:  ${stats.median.toFixed(3)} ms`);
  console.log(`  Min:     ${stats.min.toFixed(3)} ms`);
  console.log(`  Max:     ${stats.max.toFixed(3)} ms`);
  console.log(`  Tail:    ${stats.tail.toFixed(3)} ms`);
  console.log(`  Ops/s:   ${stats.opsPerSecond.toFixed(0)}`);
  console.log(`  Samples: ${stats.samples}`);
}

module.exports = {
  printStats,
  runBenchmarkTasks,
  summarizeTask,
};
