/**
 * QBasic Nexus - Compiler command lines and process runner
 * No VS Code dependency (the cancellation token is duck-typed).
 */

'use strict';

const { spawn } = require('child_process');

const KIND_QBNEX = 'qbnex';
const KIND_QB64 = 'qb64';

/**
 * Flags shared by build and check runs.
 * @param {'qbnex'|'qb64'} kind
 * @param {{ warnings?: boolean, warningsAsErrors?: boolean, explicit?: boolean, extraArgs?: string[] }} options
 */
function commonFlags(kind, options = {}) {
  const flags = [];
  if (options.warnings || options.warningsAsErrors) flags.push('-w');
  // QB64 has no warnings-as-errors switch; QBNex does.
  if (kind === KIND_QBNEX && options.warningsAsErrors) flags.push('-Werror');
  if (options.explicit) flags.push('-e');
  for (const arg of options.extraArgs || []) {
    if (arg && !flags.includes(arg)) flags.push(arg);
  }
  return flags;
}

/**
 * Arguments that build a native executable.
 * QBNex: `qb <file> -o <exe> -q -m`  (quiet banner, plain text output)
 * QB64:  `qb64pe -x -c <file> -o <exe>`
 */
function buildCompileArgs(kind, source, output, options = {}) {
  if (kind === KIND_QB64) {
    return ['-x', '-c', source, '-o', output, ...commonFlags(kind, options)];
  }
  return [source, '-o', output, '-q', '-m', ...commonFlags(kind, options)];
}

/**
 * Arguments that only check a program.
 * QBNex writes the program's QIR (no native build, a fraction of a second).
 * QB64 generates its C++ without compiling it (`-z`).
 */
function buildCheckArgs(kind, source, qirOutput, options = {}) {
  if (kind === KIND_QB64) {
    return ['-x', '-z', source, ...commonFlags(kind, options)];
  }
  return [source, '--emit-ir', '-o', qirOutput, '-q', '-m', ...commonFlags(kind, options)];
}

/** Arguments that compile a program to QIR for the Retro CRT (QBNex only). */
function buildQirArgs(source, qirOutput, options = {}) {
  return [source, '--emit-ir', '-o', qirOutput, '-q', '-m', ...commonFlags(KIND_QBNEX, options)];
}

/**
 * Runs a tool and collects its output.
 * @param {string} command
 * @param {string[]} args
 * @param {{
 *   cwd?: string,
 *   timeoutMs?: number,
 *   token?: { isCancellationRequested?: boolean, onCancellationRequested?: Function },
 *   onData?: (text: string) => void,
 *   env?: NodeJS.ProcessEnv,
 * }} [options]
 * @returns {Promise<{ code: number|null, output: string, timedOut: boolean, canceled: boolean }>}
 */
function runTool(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn(command, args, {
        cwd: options.cwd,
        env: { ...(options.env || process.env), NO_COLOR: '1' },
        shell: false,
        windowsHide: true,
      });
    } catch (error) {
      reject(error);
      return;
    }

    let output = '';
    let timedOut = false;
    let canceled = false;
    let settled = false;
    let forceTimer = null;

    const stop = () => {
      try {
        proc.kill('SIGTERM');
      } catch {
        // already gone
      }
      forceTimer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          // already gone
        }
      }, 3000);
      forceTimer.unref?.();
    };

    const timeoutMs = Math.trunc(Number(options.timeoutMs) || 0);
    const timer = timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          stop();
        }, timeoutMs)
      : null;
    timer?.unref?.();

    const cancelSub = options.token?.onCancellationRequested?.(() => {
      canceled = true;
      stop();
    });
    if (options.token?.isCancellationRequested) {
      canceled = true;
      stop();
    }

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      cancelSub?.dispose?.();
      fn();
    };

    const onChunk = (chunk) => {
      const text = chunk.toString();
      output += text;
      options.onData?.(text);
    };
    proc.stdout?.on('data', onChunk);
    proc.stderr?.on('data', onChunk);
    // The compilers never read stdin; closing it stops a prompt from hanging the build.
    proc.stdin?.end();

    proc.on('error', (error) => finish(() => reject(error)));
    proc.on('close', (code) => finish(() => resolve({ code, output, timedOut, canceled })));
  });
}

module.exports = {
  KIND_QB64,
  KIND_QBNEX,
  buildCheckArgs,
  buildCompileArgs,
  buildQirArgs,
  commonFlags,
  runTool,
};
