/**
 * QBasic Nexus - Utility Functions
 * Shared utility functions used throughout the extension
 */

'use strict';

const vscode = require('vscode');
const fs = require('fs').promises;
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
  fileExists,
  getConfig,
  log,
};
