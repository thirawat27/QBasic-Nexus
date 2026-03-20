'use strict';

const { compileAndRun } = require('../src/compiler/compiler');

async function main() {
  const logs = [];
  const originalLog = console.log;

  console.log = (...args) => {
    logs.push(args.join(' '));
    originalLog(...args);
  };

  try {
    await compileAndRun('PRINT "Smoke Run OK"');
  } finally {
    console.log = originalLog;
  }

  if (!logs.some((line) => line.includes('Smoke Run OK'))) {
    throw new Error('compileAndRun did not emit the expected output');
  }

  console.log('✅ compileAndRun helper executed successfully');
}

main().catch((error) => {
  console.error('❌ compileAndRun helper test failed:', error.message);
  process.exit(1);
});
