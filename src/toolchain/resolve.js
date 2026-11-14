/**
 * QBasic Nexus - Active toolchain
 *
 * Decides which compiler a command uses, from the compiler mode:
 *   Auto  - QBNex 2.x when one is found, else QB64 / QB64-PE
 *   QBNex - QBNex only
 *   QB64  - QB64 / QB64-PE only
 * Results are cached for the session and dropped when a path setting changes.
 */

'use strict';

const { CONFIG, normalizeCompilerMode } = require('../extension/constants');
const { state } = require('../extension/state');
const { getConfig, expandHomePath } = require('../extension/utils');
const { findQB64, verifyQB64 } = require('../extension/qb64AutoDetect');
const { findQBNex, verifyQBNex } = require('./detect');
const { KIND_QB64, KIND_QBNEX } = require('./build');

/**
 * @typedef {object} Toolchain
 * @property {'qbnex'|'qb64'} kind
 * @property {string} path
 * @property {string} label            e.g. "QBNex 2.0.0" or "QB64"
 * @property {string|null} version
 * @property {boolean} autoDetected
 * @property {boolean} supported       false for QBNex releases older than 2.0
 */

const cache = {
  qbnex: undefined,
  qb64: undefined,
  inFlight: new Map(),
};

function clearToolchainCache() {
  cache.qbnex = undefined;
  cache.qb64 = undefined;
  cache.inFlight.clear();
}

function once(key, fn) {
  if (cache.inFlight.has(key)) return cache.inFlight.get(key);
  const promise = fn().finally(() => cache.inFlight.delete(key));
  cache.inFlight.set(key, promise);
  return promise;
}

/** @returns {Promise<Toolchain|null>} */
function resolveQBNex() {
  if (cache.qbnex !== undefined) return Promise.resolve(cache.qbnex);
  return once('qbnex', async () => {
    const configured = expandHomePath(getConfig(CONFIG.QBNEX_PATH));
    let found = configured ? await verifyQBNex(configured) : null;
    const autoDetected = !found;
    if (!found) found = await findQBNex();
    cache.qbnex = found
      ? {
          kind: KIND_QBNEX,
          path: found.path,
          label: `QBNex ${found.version.label}`,
          version: found.version.label,
          autoDetected,
          supported: found.supported,
          configuredInvalid: !!configured && autoDetected,
        }
      : null;
    return cache.qbnex;
  });
}

/** @returns {Promise<Toolchain|null>} */
function resolveQB64() {
  if (cache.qb64 !== undefined) return Promise.resolve(cache.qb64);
  return once('qb64', async () => {
    const configured = expandHomePath(getConfig(CONFIG.COMPILER_PATH));
    const configuredValid = configured ? await verifyQB64(configured) : false;
    const found = configuredValid ? configured : await findQB64();
    state.autoDetectedCompilerPath = !configuredValid && found ? found : null;
    cache.qb64 = found
      ? {
          kind: KIND_QB64,
          path: found,
          label: /qb64pe/i.test(found) ? 'QB64-PE' : 'QB64',
          version: null,
          autoDetected: !configuredValid,
          supported: true,
          configuredInvalid: !!configured && !configuredValid,
        }
      : null;
    return cache.qb64;
  });
}

/**
 * The toolchain the current compiler mode selects, or null.
 * @returns {Promise<Toolchain|null>}
 */
async function resolveToolchain(mode = getConfig(CONFIG.COMPILER_MODE)) {
  const normalized = normalizeCompilerMode(mode);
  if (normalized === CONFIG.MODE_QBNEX) return resolveQBNex();
  if (normalized === CONFIG.MODE_QB64) return resolveQB64();
  // A QB64 path the user saved (in 1.x or since) keeps them on QB64 in Auto.
  if (expandHomePath(getConfig(CONFIG.COMPILER_PATH))) {
    const qb64 = await resolveQB64();
    if (qb64 && !qb64.configuredInvalid) return qb64;
  }
  const qbnex = await resolveQBNex();
  if (qbnex && qbnex.supported) return qbnex;
  return (await resolveQB64()) || qbnex;
}

/** Text explaining how to install the compiler a mode needs. */
function missingToolchainMessage(mode = getConfig(CONFIG.COMPILER_MODE)) {
  const normalized = normalizeCompilerMode(mode);
  if (normalized === CONFIG.MODE_QB64) {
    return 'QB64 / QB64-PE was not found. Install it from https://qb64phoenix.com/ or set qbasic-nexus.compilerPath.';
  }
  if (normalized === CONFIG.MODE_QBNEX) {
    return 'QBNex was not found. Install QBNex 2.0 (https://github.com/thirawat27/QBNex) or set qbasic-nexus.qbnexPath.';
  }
  return 'No compiler was found. Install QBNex 2.0 (https://github.com/thirawat27/QBNex) or QB64-PE (https://qb64phoenix.com/), or set qbasic-nexus.qbnexPath / qbasic-nexus.compilerPath.';
}

module.exports = {
  clearToolchainCache,
  missingToolchainMessage,
  resolveQB64,
  resolveQBNex,
  resolveToolchain,
};
