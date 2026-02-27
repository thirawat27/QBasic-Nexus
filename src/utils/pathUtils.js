/**
 * Cross-platform Path Utilities for QBasic Nexus
 * Handles path normalization and conversion across Windows, macOS, and Linux
 */

"use strict"

const path = require("path")
const os = require("os")

// Platform detection
const IS_WIN = process.platform === "win32"
const IS_MAC = process.platform === "darwin"
const IS_LINUX = process.platform === "linux"

/**
 * Normalize path separators to platform-specific format
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(filePath) {
  if (!filePath) return ""
  // Replace all forward/back slashes with platform separator
  return filePath.replace(/[/\\]/g, path.sep)
}

/**
 * Convert path to Unix-style (forward slashes) - useful for web/URLs
 * @param {string} filePath - Path to convert
 * @returns {string} Unix-style path
 */
function toUnixPath(filePath) {
  if (!filePath) return ""
  return filePath.replace(/\\/g, "/")
}

/**
 * Convert path to Windows-style (backslashes)
 * @param {string} filePath - Path to convert
 * @returns {string} Windows-style path
 */
function toWindowsPath(filePath) {
  if (!filePath) return ""
  return filePath.replace(/\//g, "\\")
}

/**
 * Get executable extension for current platform
 * @returns {string} Executable extension (e.g., '.exe' on Windows, '' on Unix)
 */
function getExecutableExtension() {
  return IS_WIN ? ".exe" : ""
}

/**
 * Add executable extension if not present
 * @param {string} cmd - Command name
 * @returns {string} Command with proper extension
 */
function ensureExecutableExtension(cmd) {
  if (!cmd) return ""
  const ext = getExecutableExtension()
  if (ext && !cmd.endsWith(ext)) {
    // Check if it already has any extension
    const hasExt = path.extname(cmd) !== ""
    if (!hasExt) {
      return cmd + ext
    }
  }
  return cmd
}

/**
 * Quote path if it contains spaces (platform-aware)
 * @param {string} filePath - Path to quote
 * @param {boolean} force - Force quoting even without spaces
 * @returns {string} Quoted path if needed
 */
function quotePath(filePath, force = false) {
  if (!filePath) return ""
  const needsQuotes = force || filePath.includes(" ")
  if (!needsQuotes) return filePath

  // Use double quotes for all platforms
  // Remove existing quotes first to avoid double-quoting
  const unquoted = filePath.replace(/^["']|["']$/g, "")
  return `"${unquoted}"`
}

/**
 * Get platform-specific shell command separator
 * @returns {string} Command separator (; for PowerShell/Windows, && for Unix)
 */
function getCommandSeparator() {
  return IS_WIN ? ";" : "&&"
}

/**
 * Build a shell command that works across platforms
 * @param {string} command - Base command
 * @param {string[]} args - Command arguments
 * @returns {string} Shell command string
 */
function buildShellCommand(command, args = []) {
  const quotedArgs = args.map((arg) => quotePath(arg))
  const ext = getExecutableExtension()
  const cmdWithExt = command.endsWith(ext)
    ? command
    : ext && !path.extname(command)
      ? command + ext
      : command

  if (IS_WIN) {
    // Use PowerShell-compatible format
    return `& ${quotePath(cmdWithExt)} ${quotedArgs.join(" ")}`
  }

  // Unix-style
  return `${quotePath(cmdWithExt)} ${quotedArgs.join(" ")}`
}

/**
 * Get platform-specific QB64 default paths
 * @returns {string[]} Array of possible QB64 paths
 */
function getDefaultQB64Paths() {
  const homeDir = os.homedir()
  const paths = []

  if (IS_WIN) {
    paths.push(
      "C:\\QB64\\qb64.exe",
      "C:\\Program Files\\QB64\\qb64.exe",
      "C:\\Program Files (x86)\\QB64\\qb64.exe",
      path.join(homeDir, "QB64", "qb64.exe"),
      path.join(homeDir, "qb64", "qb64.exe"),
      path.join(homeDir, "Downloads", "qb64", "qb64.exe"),
    )
  } else if (IS_MAC) {
    paths.push(
      "/Applications/QB64/qb64",
      "/usr/local/bin/qb64",
      path.join(homeDir, "QB64", "qb64"),
      path.join(homeDir, "qb64", "qb64"),
      "/opt/qb64/qb64",
    )
  } else {
    // Linux and other Unix-like
    paths.push(
      "/usr/bin/qb64",
      "/usr/local/bin/qb64",
      path.join(homeDir, "QB64", "qb64"),
      path.join(homeDir, "qb64", "qb64"),
      path.join(homeDir, ".local", "bin", "qb64"),
      "/opt/qb64/qb64",
    )
  }

  return paths
}

/**
 * Check if path is absolute (cross-platform)
 * @param {string} filePath - Path to check
 * @returns {boolean} True if absolute
 */
function isAbsolutePath(filePath) {
  if (!filePath) return false

  if (IS_WIN) {
    // Windows: C:\ or \\server\share
    return /^[a-zA-Z]:[/\\]/.test(filePath) || /^[/\\]{2}/.test(filePath)
  }

  // Unix: starts with /
  return filePath.startsWith("/")
}

/**
 * Get relative path from base (handles platform differences)
 * @param {string} from - Base path
 * @param {string} to - Target path
 * @returns {string} Relative path
 */
function getRelativePath(from, to) {
  return path.relative(from, to)
}

/**
 * Join paths with platform separator
 * @param {...string} paths - Paths to join
 * @returns {string} Joined path
 */
function joinPaths(...paths) {
  return path.join(...paths)
}

/**
 * Resolve path to absolute (handles ~ on Unix)
 * @param {string} filePath - Path to resolve
 * @returns {string} Absolute path
 */
function resolvePath(filePath) {
  if (!filePath) return ""

  // Expand ~ to home directory
  if (filePath.startsWith("~/")) {
    filePath = path.join(os.homedir(), filePath.slice(2))
  } else if (filePath.startsWith("~\\")) {
    filePath = path.join(os.homedir(), filePath.slice(2))
  }

  return path.resolve(filePath)
}

/**
 * Get temp directory (cross-platform)
 * @returns {string} Temp directory path
 */
function getTempDirectory() {
  return os.tmpdir()
}

/**
 * Create a temp file path
 * @param {string} prefix - File name prefix
 * @param {string} extension - File extension
 * @returns {string} Temp file path
 */
function getTempFilePath(prefix = "qbasic_", extension = ".tmp") {
  const tempDir = getTempDirectory()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return path.join(tempDir, `${prefix}${timestamp}_${random}${extension}`)
}

/**
 * Sanitize filename for cross-platform compatibility
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename) return ""

  // Replace invalid characters with underscore
  // Windows: < > : " / \ | ? *
  // macOS/Linux: / and null
  return filename.replace(/[<>:"|?*\x00]/g, "_").trim()
}

module.exports = {
  IS_WIN,
  IS_MAC,
  IS_LINUX,
  normalizePath,
  toUnixPath,
  toWindowsPath,
  getExecutableExtension,
  ensureExecutableExtension,
  quotePath,
  getCommandSeparator,
  buildShellCommand,
  getDefaultQB64Paths,
  isAbsolutePath,
  getRelativePath,
  joinPaths,
  resolvePath,
  getTempDirectory,
  getTempFilePath,
  sanitizeFilename,
}
