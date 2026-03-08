'use strict';

/**
 * Legacy transpiler entrypoint kept for backward compatibility.
 * The canonical implementation now lives in ./parser so benchmarks, tests,
 * the extension runtime, and the compiler wrapper stay on the same code path.
 */
module.exports = require('./parser');
