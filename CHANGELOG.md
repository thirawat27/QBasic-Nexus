# Changelog

All notable changes to the "QBasic Nexus" extension will be documented in this file.

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