/**
 * QB64 Compiler Auto-Detection Module
 * Automatically detects QB64 compiler installation across platforms
 */

"use strict"

const fs = require("fs").promises
const path = require("path")
const { exec } = require("child_process")
const { promisify } = require("util")
const { IS_WINDOWS, IS_MACOS } = require("./platform")
const { getDefaultQB64Paths, resolvePath } = require("./pathUtils")

const execAsync = promisify(exec)

/**
 * Check if a file exists and is executable
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if exists and executable
 */
async function isExecutable(filePath) {
  try {
    const stats = await fs.stat(filePath)
    if (!stats.isFile()) return false

    // On Windows, check if file has .exe extension
    if (IS_WINDOWS) {
      return path.extname(filePath).toLowerCase() === ".exe"
    }

    // On Unix, check execute permission
    return (stats.mode & 0o111) !== 0
  } catch {
    return false
  }
}

/**
 * Search for QB64 in PATH environment variable
 * @returns {Promise<string|null>} Path to QB64 if found
 */
async function searchInPath() {
  const qb64Names = IS_WINDOWS ? ["qb64.exe", "qb64"] : ["qb64"]

  const pathDirs = (process.env.PATH || "").split(IS_WINDOWS ? ";" : ":")

  for (const dir of pathDirs) {
    for (const name of qb64Names) {
      const fullPath = path.join(dir.trim(), name)
      if (await isExecutable(fullPath)) {
        return fullPath
      }
    }
  }

  return null
}

/**
 * Search for QB64 in common installation directories
 * @returns {Promise<string|null>} Path to QB64 if found
 */
async function searchCommonLocations() {
  const locations = getDefaultQB64Paths()

  for (const location of locations) {
    const resolvedPath = resolvePath(location)
    if (await isExecutable(resolvedPath)) {
      return resolvedPath
    }
  }

  return null
}

/**
 * Search for QB64 using platform-specific commands
 * @returns {Promise<string|null>} Path to QB64 if found
 */
async function searchWithCommands() {
  try {
    if (IS_WINDOWS) {
      // Try where command on Windows
      const { stdout } = await execAsync("where qb64.exe 2>nul")
      const paths = stdout.trim().split("\n")
      if (paths.length > 0) {
        return paths[0].trim()
      }
    } else {
      // Try which command on Unix
      try {
        const { stdout } = await execAsync("which qb64 2>/dev/null")
        const result = stdout.trim()
        if (result) return result
      } catch {
        // which failed, try find
      }

      // Try find command
      if (IS_MACOS) {
        try {
          const { stdout } = await execAsync(
            'find /Applications -name "qb64" -type f 2>/dev/null | head -1',
          )
          const result = stdout.trim()
          if (result) return result
        } catch {
          // find failed
        }
      }

      // Try locate if available
      try {
        const { stdout } = await execAsync("locate -n 1 qb64 2>/dev/null")
        const result = stdout.trim()
        if (result && (await isExecutable(result))) {
          return result
        }
      } catch {
        // locate not available
      }
    }
  } catch {
    // Command failed
  }

  return null
}

/**
 * Check if QB64 Phoenix (new version) is installed
 * @param {string} compilerPath - Path to compiler
 * @returns {Promise<boolean>} True if QB64 Phoenix
 */
async function isQB64Phoenix(compilerPath) {
  try {
    const dir = path.dirname(compilerPath)
    const files = await fs.readdir(dir)
    return files.some((f) => f.toLowerCase().includes("phoenix"))
  } catch {
    return false
  }
}

/**
 * Get QB64 version information
 * @param {string} compilerPath - Path to compiler
 * @returns {Promise<Object>} Version information
 */
async function getCompilerVersion(compilerPath) {
  try {
    // Try to get version by running with -v flag
    const { stdout, stderr } = await execAsync(`"${compilerPath}" -v 2>&1`, {
      timeout: 5000,
    })
    const output = stdout + stderr

    // Try to extract version number
    const versionMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/)
    const version = versionMatch ? versionMatch[1] : "unknown"

    // Check for Phoenix
    const isPhoenix =
      output.toLowerCase().includes("phoenix") ||
      (await isQB64Phoenix(compilerPath))

    return {
      version,
      isPhoenix,
      fullOutput: output.trim(),
    }
  } catch {
    return {
      version: "unknown",
      isPhoenix: false,
      fullOutput: "",
    }
  }
}

/**
 * Detect QB64 compiler installation
 * @param {Object} options - Detection options
 * @param {boolean} options.checkPath - Search in PATH
 * @param {boolean} options.checkCommon - Search common locations
 * @param {boolean} options.checkCommands - Use system commands
 * @returns {Promise<Object>} Detection result
 */
async function detectCompiler(options = {}) {
  const { checkPath = true, checkCommon = true, checkCommands = true } = options

  const result = {
    found: false,
    path: null,
    version: null,
    isPhoenix: false,
    method: null,
  }

  // Search in order of preference
  const searchMethods = []

  if (checkPath) {
    searchMethods.push({
      name: "PATH",
      search: searchInPath,
    })
  }

  if (checkCommon) {
    searchMethods.push({
      name: "common",
      search: searchCommonLocations,
    })
  }

  if (checkCommands) {
    searchMethods.push({
      name: "command",
      search: searchWithCommands,
    })
  }

  for (const method of searchMethods) {
    try {
      const found = await method.search()
      if (found) {
        result.found = true
        result.path = found
        result.method = method.name

        // Get version info
        const versionInfo = await getCompilerVersion(found)
        result.version = versionInfo.version
        result.isPhoenix = versionInfo.isPhoenix

        break
      }
    } catch (err) {
      console.error(
        `[CompilerDetector] ${method.name} search failed:`,
        err.message,
      )
    }
  }

  return result
}

/**
 * Validate QB64 compiler path
 * @param {string} compilerPath - Path to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateCompilerPath(compilerPath) {
  if (!compilerPath) {
    return {
      valid: false,
      error: "No compiler path provided",
    }
  }

  const resolved = resolvePath(compilerPath)

  try {
    const stats = await fs.stat(resolved)

    if (!stats.isFile()) {
      return {
        valid: false,
        error: "Path is not a file",
      }
    }

    if (!IS_WINDOWS) {
      // Check executable permission on Unix
      const isExecutable = (stats.mode & 0o111) !== 0
      if (!isExecutable) {
        return {
          valid: false,
          error: "File is not executable",
        }
      }
    }

    // Try to get version
    const versionInfo = await getCompilerVersion(resolved)

    return {
      valid: true,
      path: resolved,
      version: versionInfo.version,
      isPhoenix: versionInfo.isPhoenix,
    }
  } catch (err) {
    return {
      valid: false,
      error: err.code === "ENOENT" ? "File not found" : err.message,
    }
  }
}

/**
 * Get installation instructions for QB64
 * @returns {string} Installation instructions
 */
function getInstallationInstructions() {
  const instructions = {
    windows: `
QB64 Installation Instructions for Windows:
1. Download QB64 from https://qb64.com/ or https://github.com/QB64-Phoenix-Edition/QB64pe
2. Extract to C:\\QB64 or your preferred location
3. Add the QB64 folder to your system PATH, OR
4. Set the compiler path in VS Code settings (qbasic-nexus.compilerPath)
`,
    macos: `
QB64 Installation Instructions for macOS:
1. Download QB64 Phoenix Edition from https://github.com/QB64-Phoenix-Edition/QB64pe/releases
2. Extract to /Applications/QB64
3. Make sure qb64 is executable: chmod +x /Applications/QB64/qb64
4. Set the compiler path in VS Code settings if needed
`,
    linux: `
QB64 Installation Instructions for Linux:
1. Download QB64 Phoenix Edition from https://github.com/QB64-Phoenix-Edition/QB64pe/releases
2. Extract to ~/qb64 or /opt/qb64
3. Make sure qb64 is executable: chmod +x ~/qb64/qb64
4. Add to PATH: export PATH=$PATH:~/qb64
5. Or set the compiler path in VS Code settings
`,
  }

  if (IS_WINDOWS) return instructions.windows
  if (IS_MACOS) return instructions.macos
  return instructions.linux
}

module.exports = {
  detectCompiler,
  validateCompilerPath,
  getCompilerVersion,
  isQB64Phoenix,
  getInstallationInstructions,
  searchInPath,
  searchCommonLocations,
  searchWithCommands,
  isExecutable,
}
