'use strict';

/**
 * Child-process runner for test-bas-programs.js.
 * Reads QBasic source from stdin, transpiles it for Node and runs it. The
 * program writes to stdout itself; a compile or runtime failure goes to
 * stderr with exit code 2. Running in a child process lets the caller kill a
 * program that never ends.
 */

const path = require('path');

const Transpiler = require(path.join(__dirname, '..', 'src', 'compiler', 'parser'));

let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  source += chunk;
});
process.stdin.on('end', async () => {
  try {
    const code = new Transpiler().transpile(source, 'node');
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction('require', code)(require);
  } catch (error) {
    process.stderr.write(`RUN_ERROR: ${error && error.message ? error.message : error}\n`);
    process.exitCode = 2;
  }
});
