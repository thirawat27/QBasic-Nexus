/**
 * QBasic Nexus - Utility Functions
 * Shared utility functions used throughout the extension
 */

'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { defu } = require('defu');
const { CONFIG } = require('./constants');
const { state } = require('./state');

// Default values for every known config key
const CONFIG_DEFAULTS = Object.freeze({
  [CONFIG.COMPILER_PATH]: null,
  [CONFIG.COMPILER_MODE]: CONFIG.MODE_QB64,
  [CONFIG.COMPILER_ARGS]: '',
  [CONFIG.ENABLE_LINT]: true,
  [CONFIG.LINT_DELAY]: 500,
  [CONFIG.AUTO_FORMAT]: true,
  [CONFIG.LINE_NUMBER_START]: 1,
  [CONFIG.LINE_NUMBER_STEP]: 1,
});

/**
 * Create a debounced version of a function with cancel support
 */
function debounce(fn, delay) {
  let timer = null;
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };
  // Allow cancellation to prevent stale callbacks
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

/**
 * Create a throttled version of a function with trailing call support
 */
function throttle(fn, limit) {
  let inThrottle = false;
  let lastArgs = null;
  let timeoutId = null;

  const throttled = (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      timeoutId = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args; // Save latest args for trailing call
    }
  };
  // Allow cancellation
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inThrottle = false;
    lastArgs = null;
  };
  return throttled;
}

/**
 * Get or create the output channel
 */
function getOutputChannel() {
  if (!state.outputChannel) {
    state.outputChannel = vscode.window.createOutputChannel(
      CONFIG.OUTPUT_CHANNEL,
    );
  }
  return state.outputChannel;
}

/**
 * Get or create a terminal instance
 */
function getTerminal(options = {}) {
  const cwd = options.cwd || null;
  const needsNewTerminal =
    !state.terminal ||
    state.terminal.exitStatus !== undefined ||
    state.terminalCwd !== cwd;

  if (needsNewTerminal) {
    state.terminal = vscode.window.createTerminal({
      name: CONFIG.TERMINAL_NAME,
      iconPath: new vscode.ThemeIcon('terminal'),
      cwd: cwd || undefined,
    });
    state.terminalCwd = cwd;
  }
  return state.terminal;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Expand a user-provided path such as ~/qb64/qb64 into an absolute path.
 * @param {string|null|undefined} filePath
 * @returns {string|null}
 */
function expandHomePath(filePath) {
  if (filePath === null || filePath === undefined) return null;

  const value = String(filePath).trim();
  if (!value) return null;

  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
}

/**
 * Split a shell-like argument string while preserving quoted segments.
 * Handles the common QB64 settings cases without shell evaluation.
 * @param {string|null|undefined} value
 * @returns {string[]}
 */
function splitCommandLineArgs(value) {
  if (!value || typeof value !== 'string') return [];

  const args = [];
  let current = '';
  let quote = null;
  let escapeNext = false;

  for (const char of value.trim()) {
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && quote === '"') {
      escapeNext = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escapeNext) current += '\\';
  if (current) args.push(current);

  return args;
}

/**
 * Get a single configuration value, merged with defaults via defu.
 * defu ensures: user setting → default (never null/undefined for known keys).
 * @param {string} key
 * @param {*} [fallback] - override fallback (optional, CONFIG_DEFAULTS used if omitted)
 */
function getConfig(key, fallback = undefined) {
  const raw = vscode.workspace.getConfiguration(CONFIG.SECTION).get(key);
  // Build a single-key object, merge with defaults, return the value
  const merged = defu({ [key]: raw }, CONFIG_DEFAULTS);
  const value = merged[key];
  // If still undefined/null AND a manual fallback was given, use it
  if ((value === undefined || value === null) && fallback !== undefined)
    return fallback;
  return value;
}

/**
 * Get ALL extension configuration values at once, merged with defaults.
 * Useful when multiple settings are needed in one call.
 * @returns {Record<string, any>}
 */
function getAllConfig() {
  const section = vscode.workspace.getConfiguration(CONFIG.SECTION);
  const raw = {};
  for (const key of Object.keys(CONFIG_DEFAULTS)) {
    raw[key] = section.get(key);
  }
  return defu(raw, CONFIG_DEFAULTS);
}

/**
 * Log message to output channel
 */
function log(message, type = 'info') {
  const channel = getOutputChannel();
  const prefix =
    {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
    }[type] || '';
  channel.appendLine(`${prefix} ${message}`);
}

module.exports = {
  debounce,
  throttle,
  getOutputChannel,
  getTerminal,
  fileExists,
  expandHomePath,
  splitCommandLineArgs,
  getConfig,
  getAllConfig,
  log,
};
