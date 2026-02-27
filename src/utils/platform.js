/**
 * Cross-platform Platform Detection and Utilities for QBasic Nexus
 * Provides platform-specific behaviors and fallbacks
 */

"use strict"

const os = require("os")
const fs = require("fs").promises

// Platform constants
const PLATFORM = Object.freeze({
  WIN32: "win32",
  DARWIN: "darwin",
  LINUX: "linux",
  AIX: "aix",
  FREEBSD: "freebsd",
  OPENBSD: "openbsd",
  SUNOS: "sunos",
})

// Architecture constants
const ARCH = Object.freeze({
  X64: "x64",
  X32: "ia32",
  ARM: "arm",
  ARM64: "arm64",
  PPC64: "ppc64",
  S390: "s390",
  S390X: "s390x",
})

// Current platform info
const CURRENT_PLATFORM = process.platform
const CURRENT_ARCH = process.arch

// Platform detection getters
const IS_WINDOWS = CURRENT_PLATFORM === PLATFORM.WIN32
const IS_MACOS = CURRENT_PLATFORM === PLATFORM.DARWIN
const IS_LINUX = CURRENT_PLATFORM === PLATFORM.LINUX
const IS_UNIX = !IS_WINDOWS

/**
 * Get detailed platform information
 * @returns {Object} Platform details
 */
function getPlatformInfo() {
  return {
    platform: CURRENT_PLATFORM,
    arch: CURRENT_ARCH,
    isWindows: IS_WINDOWS,
    isMacOS: IS_MACOS,
    isLinux: IS_LINUX,
    isUnix: IS_UNIX,
    version: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    endianness: os.endianness(),
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
    EOL: os.EOL,
  }
}

/**
 * Get the default shell for the current platform
 * @async
 * @returns {Promise<string>} Shell command path
 */
async function getDefaultShell() {
  if (IS_WINDOWS) {
    // Prefer PowerShell if available, fallback to cmd
    const psPath =
      "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
    try {
      await fs.access(psPath)
      return psPath
    } catch {
      return process.env.COMSPEC || "cmd.exe"
    }
  }

  // Unix-like systems
  return process.env.SHELL || "/bin/sh"
}

/**
 * Get platform-specific command to run executable
 * @param {string} exePath - Path to executable
 * @returns {string} Command to run
 */
function getRunCommand(exePath) {
  if (!exePath) return ""

  if (IS_WINDOWS) {
    // On Windows, use PowerShell for better cross-drive support
    return `& '${exePath.replace(/'/g, "''")}'`
  }

  // Unix: make executable and run
  return `'${exePath.replace(/'/g, "'\\''")}'`
}

/**
 * Get platform-specific terminal command
 * @returns {Object} Terminal command and arguments
 */
function getTerminalCommand() {
  if (IS_WINDOWS) {
    // Try to use VS Code's integrated terminal preference
    return {
      command: process.env.COMSPEC || "cmd.exe",
      args: ["/c"],
      shell: true,
    }
  }

  if (IS_MACOS) {
    return {
      command: process.env.SHELL || "/bin/zsh",
      args: ["-c"],
      shell: true,
    }
  }

  // Linux
  return {
    command: process.env.SHELL || "/bin/bash",
    args: ["-c"],
    shell: true,
  }
}

/**
 * Get line ending for current platform
 * @returns {string} Line ending character(s)
 */
function getLineEnding() {
  return os.EOL
}

/**
 * Normalize line endings to platform format
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeLineEndings(text) {
  if (!text) return ""
  // Replace all line endings with platform-specific ones
  return text.replace(/\r\n|\r|\n/g, os.EOL)
}

/**
 * Get file permissions for executable (Unix only)
 * @returns {number} File mode (0o755 for Unix, undefined for Windows)
 */
function getExecutablePermissions() {
  return IS_WINDOWS ? undefined : 0o755
}

/**
 * Check if running on WSL (Windows Subsystem for Linux)
 * @returns {boolean} True if running on WSL
 */
function isWSL() {
  if (!IS_LINUX) return false

  try {
    const release = fs.readFileSync("/proc/version", "utf8")
    return (
      release.toLowerCase().includes("microsoft") ||
      release.toLowerCase().includes("wsl")
    )
  } catch {
    return false
  }
}

/**
 * Check if running on ARM architecture
 * @returns {boolean} True if ARM
 */
function isARM() {
  return CURRENT_ARCH === ARCH.ARM || CURRENT_ARCH === ARCH.ARM64
}

/**
 * Get recommended worker thread count
 * @returns {number} Recommended number of workers
 */
function getRecommendedWorkerCount() {
  const cpus = os.cpus().length
  // Leave one core free for UI
  return Math.max(1, cpus - 1)
}

/**
 * Get platform-specific process priority
 * @returns {string} Priority setting
 */
function getProcessPriority() {
  // Return platform-specific priority settings
  if (IS_WINDOWS) {
    return "NORMAL_PRIORITY_CLASS"
  }
  return "0" // Normal priority on Unix
}

/**
 * Get environment variable (case-insensitive on Windows)
 * @param {string} name - Variable name
 * @returns {string|undefined} Variable value
 */
function getEnv(name) {
  if (IS_WINDOWS) {
    // Windows environment variables are case-insensitive
    const upperName = name.toUpperCase()
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toUpperCase() === upperName) {
        return value
      }
    }
    return undefined
  }
  return process.env[name]
}

/**
 * Check if a feature is supported on current platform
 * @param {string} feature - Feature name
 * @returns {boolean} True if supported
 */
function isFeatureSupported(feature) {
  const features = {
    worker_threads: true, // All supported Node versions have this
    native_modules: true,
    symlinks: !IS_WINDOWS, // Windows requires special permissions for symlinks
    executable_permissions: !IS_WINDOWS,
    case_sensitive_fs: !IS_WINDOWS,
    spawn_detached: true,
    clipboard: true,
    notifications: true,
  }

  return features[feature] !== false
}

/**
 * Get platform-specific signal names
 * @returns {Object} Signal names
 */
function getSignals() {
  if (IS_WINDOWS) {
    return {
      SIGTERM: "SIGTERM",
      SIGKILL: "SIGKILL",
      SIGINT: "SIGINT",
    }
  }

  return {
    SIGTERM: "SIGTERM",
    SIGKILL: "SIGKILL",
    SIGINT: "SIGINT",
    SIGUSR1: "SIGUSR1",
    SIGUSR2: "SIGUSR2",
    SIGHUP: "SIGHUP",
  }
}

/**
 * Format platform-specific error message
 * @param {Error} error - Error object
 * @returns {string} Formatted message
 */
function formatError(error) {
  if (!error) return "Unknown error"

  let message = error.message || String(error)

  // Platform-specific error handling
  if (IS_WINDOWS && error.code === "ENOENT") {
    message += " (Program not found in PATH)"
  }

  return message
}

/**
 * Get native module file extension for current platform
 * @returns {string} File extension (.node, .dll, .so, .dylib)
 */
function getNativeExtension() {
  if (IS_WINDOWS) return ".dll"
  if (IS_MACOS) return ".dylib"
  return ".so"
}

/**
 * Get Node.js binary name
 * @returns {string} Node binary name
 */
function getNodeBinaryName() {
  return IS_WINDOWS ? "node.exe" : "node"
}

module.exports = {
  PLATFORM,
  ARCH,
  CURRENT_PLATFORM,
  CURRENT_ARCH,
  IS_WINDOWS,
  IS_MACOS,
  IS_LINUX,
  IS_UNIX,
  getPlatformInfo,
  getDefaultShell,
  getRunCommand,
  getTerminalCommand,
  getLineEnding,
  normalizeLineEndings,
  getExecutablePermissions,
  isWSL,
  isARM,
  getRecommendedWorkerCount,
  getProcessPriority,
  getEnv,
  isFeatureSupported,
  getSignals,
  formatError,
  getNativeExtension,
  getNodeBinaryName,
}
