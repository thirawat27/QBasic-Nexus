# Changelog

All notable changes to the "QBasic Nexus" extension will be documented in this file.

## [1.0.2] - 2026-01-04

### 🐞 Bug Fixes
- **Throttle Logic**: Fixed an issue where the throttle function would drop the latest update, causing UI lag or missing states.
- **Transpiler Duplicates**: Resolved duplicate function definitions (`_locate`, `_color`, `_beep`) when compiling for web target.
- **Transpiler Naming**: Renamed internal `_inkey$` to `INKEY` to avoid potential JS strict mode or naming conflicts.
- **Unused Code**: Removed dead code variables (`hasElse`) from the parser.

### ✨ Enhancements
- **Auto-Indentation**: Added smart auto-indent logic for `IF`, `FOR`, `DO`, `SELECT CASE` and other blocks in `providers.js`.
- **Cross-Platform**: Improved `runExecutable` to better handle paths with spaces on Windows (PowerShell) and Unix-based systems.
- **Status Bar**: Status bar now links directly to the specific setting when QB64 path is missing.
- **Runtime Improvements**: 
    - Added `CSRLIN`, `POS`, `BIN$`, `_BIN$`, `LSET`, `RSET` support.
    - Improved `WebviewManager` cleanup and error handling.
    - Added `clearScreen()` method to WebviewManager.

### 🔊 Audio System Improvements
- **Faster BEEP/SOUND (Windows)**: Replaced slow PowerShell-based audio with instant `mshta` JavaScript audio for near-zero latency.
- **Shared AudioContext (Web)**: Web runtime now uses a single shared AudioContext for much faster sound playback.
- **Better Sound Quality**: Added proper gain envelope (attack/release) to prevent click/pop sounds.
- **Improved macOS Support**: Now tries `sox` for frequency control before falling back to system beep.
- **Promise-based Audio**: Both `BEEP` and `SOUND` now properly return Promises for accurate timing.


### 🔴 Critical Fixes
- **Missing `constants.js`**: Created the missing compiler constants file that caused Internal Transpiler and CRT Mode to crash completely
- **Variable Scope Bug**: Fixed `_hasVar` function to check all parent scopes for proper nested SUB/FUNCTION support
- **Dead Code Cleanup**: Removed unused `QBasicOnTypeFormattingEditProvider` import

### ✨ New QBasic/QB64 Statement Support
- **Control Flow**: `GOTO`, `GOSUB`, `RETURN`, `ON...GOTO`, `ON...GOSUB`, `ON ERROR GOTO/RESUME NEXT`, `STOP`
- **I/O Statements**: `LINE INPUT`, `LOCATE`, `COLOR`, `SCREEN`, `WIDTH`, `BEEP`, `SOUND`
- **Data**: `TYPE...END TYPE`, `ERASE`, `REDIM PRESERVE`, `DEF FN`
- **File I/O**: `OPEN`, `CLOSE` (stubs for web compatibility)
- **Misc**: `RANDOMIZE`, `LET`, `DECLARE` (skipped), `ERROR`

### 🚀 Runtime Enhancements
- **Complete Runtime Functions**: Added `_locate()`, `_color()`, `_beep()`, `_sound()`, `_screen()`, `_width()`, `_randomize()`, `_inkey$()` for both Node.js and WebView
- **2D Array Support**: Full support for 2D arrays with `DIM` and `REDIM`
- **File I/O Stubs**: Web-compatible stubs for `OPEN`, `CLOSE`, `EOF`, `FREEFILE`
- **ANSI Colors**: Full 16-color terminal support for `COLOR` statement
- **Web Audio**: `SOUND` and `BEEP` using Web Audio API
- **Keyboard Input**: `INKEY$` support in CRT mode

### 📦 Constants & Keywords
- **Comprehensive KEYWORDS**: 200+ QBasic/QB64 keywords including all QB64-specific commands
- **Built-in Functions**: 60+ function mappings with edge-case handling
- **Error Codes**: Standardized error codes for better diagnostics
- **Operator Precedence**: Correct operator precedence table

### 🔧 Code Quality
- **Production-Ready**: Enterprise-grade error handling and validation
- **JSDoc Comments**: Full documentation for all public APIs
- **Type Hints**: Proper TypeScript-compatible type annotations
- **Label Support**: Basic label parsing for GOSUB compatibility

## [1.0.2] - 2026-01-02

### Added
- **Code Folding**: Collapse SUBs, FUNCTIONs, TYPE blocks, loops, and IF statements
- **Rename Symbol** (`F2`): Rename variables, functions, or subs across the entire file
- **Find All References** (`Shift+F12`): Locate all usages of any symbol
- **Document Highlights**: Automatically highlight all occurrences of selected variable
- **Quick Fix Actions**: Intelligent suggestions to fix common errors
- **Extract to SUB**: Select code and extract it into a new SUB procedure
- **Toggle Comment** (`Ctrl+/`): Quickly comment/uncomment selected lines
- **Code Statistics**: Real-time display of code lines, SUBs, and FUNCTIONs in status bar
- **Show Code Statistics Command** (`Ctrl+Shift+I`): View detailed statistics about your code
- **50+ New Snippets**: Game loop, keyboard/mouse input, timer, sound, fonts, graphics, math functions, sorting, menu system and more
- **Enhanced Hover Documentation**: Better documentation with code examples
- **100+ New Keywords**: Expanded support for QB64-specific commands and functions
- **QB64 Metacommands**: Support for `$INCLUDE`, `$DYNAMIC`, `$CONSOLE`, `$IF`, etc.

### Improved
- **Performance**: Added caching and throttling for faster response times
- **Linting**: Configurable delay and ability to enable/disable
- **Code Completion**: Now includes user-defined SUBs and FUNCTIONs
- **Hover Information**: Shows where user-defined procedures are defined
- **Definition Provider**: Now also finds DIM declarations
- **Compilation Output**: Shows compile time duration
- **README**: Added comprehensive examples and usage guide

### Configuration
- `qbasic-nexus.enableLinting`: Enable/disable real-time syntax checking
- `qbasic-nexus.lintDelay`: Configure delay before linting (100-3000ms)
- `qbasic-nexus.autoFormatOnSave`: Auto-format on save option

## [1.0.1] - 2025-12-26

### Fixed
- Extension validation issues for VS Code Marketplace

## [1.0.0] - 2025-12-25

### Initial Release
- Syntax highlighting for QBasic/QB64
- IntelliSense (auto-completion, hover, signature help)
- Code formatting with auto-indentation
- QB64 compilation and execution
- Internal JS transpiler (backup mode)
- Real-time linting
- Document symbols (Outline view)
- Go to Definition
- Snippets for common QBasic patterns
- Status bar integration