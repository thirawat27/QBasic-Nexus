<div align="center">
  <img src="./image/QBasicNexus.png" alt="QBasicNexus Icon" width="220" height="220" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
  <p>
    <strong>Modern QBasic/QB64 Development Environment for VS Code</strong>
  </p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start-guide">Quick Start</a> •
    <a href="#-usage-examples">Usage</a> •
    <a href="#-configuration">Configuration</a> •
    <a href="#-troubleshooting">Troubleshooting</a>
  </p>
</div>

<br>

Enhances QBasic development in VS Code with syntax highlighting, code snippets, and robust support for your **externally installed QB64 compiler**. Features include auto-detection of your QB64 installation or manual path configuration.

---

## 📖 Table of Contents

- [✨ Features](#-features)
  - [🔧 Dual Compilation Modes](#-dual-compilation-modes)
  - [🛠️ Flexible QB64 Integration](#️-flexible-qb64-integration)
  - [🚀 Compile & Run](#-compile--run)
  - [📺 Retro CRT Mode](#-retro-crt-mode)
  - [📊 IDE Integration](#-ide-integration)
  - [✨ IntelliSense & Language Features](#-intellisense--language-features)
  - [🧩 Internal JS Transpiler](#-internal-js-transpiler)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [📦 Available Commands](#-available-commands)
- [📋 Usage Examples](#-usage-examples)
  - [Basic Workflow](#basic-workflow)
  - [Using Code Snippets](#using-code-snippets)
  - [Refactoring Features](#refactoring-features)
- [🛠️ Configuration](#️-configuration)
- [📄 Understanding the Output](#-understanding-the-output)
- [🧩 Snippets Reference](#-snippets-reference)
- [🆘 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

---

## ✨ Features

### 🔧 Dual Compilation Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **QB64 (Recommended)** | Compile with your installed QB64 compiler for native executable | Best performance, full QBasic/QB64 compatibility |
| **Internal JS Transpiler** | Transpile QBasic to JavaScript and run via Node.js | When QB64 is not available |

### 🛠️ Flexible QB64 Integration

| Feature | Description |
|---------|-------------|
| **Auto-Detection** | Attempts to automatically find your existing QB64 installation on startup |
| **Manual Configuration** | Allows you to specify the exact path to your QB64 executable via VS Code settings |

### 🚀 Compile & Run

| Action | Description |
|--------|-------------|
| **Compile & Run 🚀** | Compile your QBasic code and run it in the integrated terminal with a single command |
| **Compile Only 🔨** | Compile your code to create a standalone executable file (`.exe` on Windows, or a plain executable on macOS/Linux) |
| **Cross-Platform Support** | Works seamlessly on Windows, macOS, and Linux |

### 📺 Retro CRT Mode

Experience the nostalgia! Run your QBasic programs in a beautiful **Retro CRT Webview** with authentic scanline effects and classic terminal aesthetics.

| Feature | Description |
|---------|-------------|
| **CRT Visual Effects** | Authentic retro terminal look with scanlines |
| **INKEY$ Support** | Full keyboard input support in web mode |
| **ANSI Colors** | 16-color terminal support for `COLOR` statement |
| **Web Audio** | `SOUND` and `BEEP` using Web Audio API |

### 📊 IDE Integration

| Feature | Description |
|---------|-------------|
| **Status Bar Integration** | Easily access the **Compile & Run** command from an icon in the status bar |
| **Code Statistics** | Real-time display of code lines, SUBs, and FUNCTIONs in status bar |
| **Detailed Output Panel** | View detailed logs, progress, and errors in a dedicated "QBasic Nexus" output channel |
| **Integrated Terminal Execution** | Runs the compiled program directly in the VS Code integrated terminal |
| **Customizable Compiler Arguments** | Pass additional arguments to the QB64 compiler via settings |

### ✨ IntelliSense & Language Features

| Feature | Shortcut | Description |
|---------|----------|-------------|
| **Syntax Highlighting** | - | Rich language support for QBasic and QB64 |
| **Code Snippets** | Type prefix + `Tab` | 50+ ready-to-use code templates |
| **Outline View** | - | Navigate quickly through SUBs, FUNCTIONs, TYPEs, CONSTs, Labels |
| **Go to Definition** | `Ctrl+Click` or `F12` | Jump to function or sub definition |
| **Find All References** | `Shift+F12` | Locate all usages of any symbol |
| **Rename Symbol** | `F2` | Rename variables, functions, or subs across the entire file |
| **Auto-Completion** | `Ctrl+Space` | Smart suggestions for keywords, built-in functions, and variables |
| **Hover Information** | Hover over text | See documentation and usage hints |
| **Signature Help** | Type `(` after function | See function parameter hints |
| **Document Formatting** | `Shift+Alt+F` | Auto-indentation and code formatting |
| **Code Folding** | Click fold icon | Collapse SUBs, FUNCTIONs, TYPE blocks, loops, and IF statements |
| **Document Highlights** | Click on variable | Highlight all occurrences of selected variable |
| **Quick Fix Actions** | `Ctrl+.` | Intelligent suggestions to fix common errors |
| **Extract to SUB** | Select code + right-click | Extract selected code into a new SUB procedure |
| **Toggle Comment** | `Ctrl+/` | Quickly comment/uncomment selected lines |
| **Error Diagnostics** | - | Compiler errors shown in VS Code's "Problems" tab with red underlines |
| **On-Type Formatting** | - | Smart auto-indent after `Enter` key |

### 🧩 Internal JS Transpiler

When QB64 is not available, you can use the **Internal JS Transpiler** mode. This transpiler uses a custom **Lexer & Recursive Descent Parser** written in pure JavaScript.

**Supported QBasic Statements:**

| Category | Commands |
|----------|----------|
| **I/O** | `PRINT`, `INPUT`, `LINE INPUT`, `CLS`, `LOCATE`, `COLOR`, `SCREEN`, `WIDTH`, `BEEP`, `SOUND` |
| **Variables** | `DIM`, `CONST`, `LET`, `SWAP`, `ERASE`, `REDIM`, `REDIM PRESERVE` |
| **Control Flow** | `IF...THEN...ELSE`, `ELSEIF`, `END IF`, `GOTO`, `GOSUB`, `RETURN` |
| **Loops** | `FOR...TO...STEP...NEXT`, `DO...LOOP`, `WHILE...WEND`, `EXIT` |
| **Branching** | `SELECT CASE...CASE...END SELECT`, `ON...GOTO`, `ON...GOSUB` |
| **Procedures** | `SUB`, `FUNCTION`, `CALL`, `DECLARE`, `END SUB/FUNCTION` |
| **Data** | `DATA`, `READ`, `RESTORE`, `TYPE...END TYPE`, `DEF FN` |
| **Error Handling** | `ON ERROR GOTO`, `RESUME`, `RESUME NEXT`, `ERROR`, `STOP` |
| **File I/O** | `OPEN`, `CLOSE` (stubs for web compatibility) |
| **Misc** | `SLEEP`, `RANDOMIZE` |

**Supported Built-in Functions:**

| Category | Functions |
|----------|-----------|
| **String** | `LEN`, `LEFT$`, `RIGHT$`, `MID$`, `UCASE$`, `LCASE$`, `STR$`, `VAL`, `CHR$`, `ASC`, `INSTR`, `LTRIM$`, `RTRIM$`, `SPACE$`, `STRING$`, `BIN$`, `_BIN$`, `LSET`, `RSET` |
| **Math** | `ABS`, `INT`, `FIX`, `SGN`, `SQR`, `RND`, `SIN`, `COS`, `TAN`, `ATN`, `LOG`, `EXP` |
| **System** | `TIMER`, `INKEY$`, `CSRLIN`, `POS` |
| **File** | `EOF`, `FREEFILE` |

---

## ⌨️ Keyboard Shortcuts

| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| **Compile & Run** | `F5` | `F5` | Compile and run the current file |
| **Compile Only** | `Ctrl+Shift+B` | `Cmd+Shift+B` | Compile without running |
| **Toggle Comment** | `Ctrl+/` | `Cmd+/` | Comment/uncomment selected lines |
| **Show Code Statistics** | `Ctrl+Shift+I` | `Cmd+Shift+I` | View detailed code statistics |
| **Go to Definition** | `F12` | `F12` | Jump to symbol definition |
| **Find All References** | `Shift+F12` | `Shift+F12` | Find all usages of a symbol |
| **Rename Symbol** | `F2` | `F2` | Rename symbol across file |
| **Quick Fix** | `Ctrl+.` | `Cmd+.` | Show quick fix suggestions |
| **Format Document** | `Shift+Alt+F` | `Shift+Option+F` | Format the entire document |
| **Trigger Suggestions** | `Ctrl+Space` | `Cmd+Space` | Show code completion |

---

## ⚙️ Prerequisites

For QBasic Nexus to compile your code, your QB64 installation must be correctly set up.

### Step 1: Install QB64 Correctly

| Platform | Instructions |
|----------|--------------|
| **All Systems** | Download QB64 from [qb64.com](https://qb64.com/) or QB64 Phoenix Edition from [qb64phoenix.com](https://www.qb64phoenix.com/) |
| **macOS** | After unzipping, run the setup script: `sh ./setup_osx.command` |
| **Linux** | After unzipping, run the setup script: `sh ./setup_lnx.sh` |

> ⚠️ **Important:** The setup script is essential for macOS and Linux. The extension will not work without it.

### Step 2: Ensure C++ Compiler is Available

| Platform | Instructions |
|----------|--------------|
| **macOS** | Install Xcode Command Line Tools: `xcode-select --install` |
| **Linux (Debian/Ubuntu)** | Install build-essential: `sudo apt-get update && sudo apt-get install build-essential` |
| **Windows** | QB64 Phoenix Edition typically includes its own C++ compiler - no extra tools needed |

---

## 🚀 Quick Start Guide

### Step 1: Install & Set Up QB64

1. Download and extract QB64 from [qb64.com](https://qb64.com/) or [qb64phoenix.com](https://www.qb64phoenix.com/)
2. **(macOS/Linux only)** Run the setup script:
   ```sh
   # macOS
   sh ./setup_osx.command
   
   # Linux
   sh ./setup_lnx.sh
   ```

### Step 2: Install QBasic Nexus Extension

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Search for "QBasic Nexus"
4. Click **Install**

### Step 3: Configure Compiler Path

| Method | Instructions |
|--------|--------------|
| **Auto-Detection** | On first activation, the extension tries to detect QB64 automatically. Click "Yes, use this path" if found. |
| **Manual Configuration** | Open Settings (`Ctrl+,`), search for `QBasic Nexus Compiler Path`, and enter the full path to your QB64 executable. |

**Example Paths:**

| OS | Example Path |
|----|--------------|
| Windows | `C:\QB64\qb64.exe` |
| macOS | `/Applications/qb64/qb64` |
| Linux | `/home/youruser/qb64/qb64` |

### Step 4: Create and Run Your First Program

1. Create a new file with `.bas` extension (e.g., `hello.bas`)
2. Write your QBasic code:
   ```basic
   CLS
   PRINT "Hello, QBasic Nexus!"
   END
   ```
3. Press `F5` to compile and run!

---

## 📦 Available Commands

Access these commands via Command Palette (`Ctrl+Shift+P`) or right-click context menu:

| Command | Title | Shortcut | Description |
|---------|-------|----------|-------------|
| `qbasic-nexus.compile` | QBasic: Compile 🔨 | `Ctrl+Shift+B` | Compile the current file to executable |
| `qbasic-nexus.compileAndRun` | QBasic: Compile & Run 🌀 | `F5` | Compile and run in integrated terminal |
| `qbasic-nexus.runInCrt` | QBasic: Run in Retro CRT 📺 | - | Run in beautiful retro CRT webview |
| `qbasic-nexus.startTutorial` | QBasic: Start Interactive Tutorial 🎮 | - | Learn QBasic interactively |
| `qbasic-nexus.showCodeStats` | QBasic: Show Code Statistics 📊 | `Ctrl+Shift+I` | View detailed code statistics |
| `qbasic-nexus.toggleComment` | QBasic: Toggle Comment 💬 | `Ctrl+/` | Comment/uncomment selected lines |
| `qbasic-nexus.extractToSub` | QBasic: Extract to SUB 📦 | - | Extract selected code into a new SUB |

---

## 📋 Usage Examples

### Basic Workflow

| Step | Action | How To |
|------|--------|--------|
| 1️⃣ | **Open/Create a file** | Open any `.bas`, `.bi`, `.bm`, or `.inc` file |
| 2️⃣ | **Write your code** | Use IntelliSense for auto-completion (type and see suggestions) |
| 3️⃣ | **Use snippets** | Type snippet prefix (e.g., `for`) and press `Tab` |
| 4️⃣ | **Format code** | Press `Shift+Alt+F` to auto-format |
| 5️⃣ | **Compile & Run** | Press `F5` or click the ▶️ button in status bar |
| 6️⃣ | **Fix errors** | Check Problems panel (`Ctrl+Shift+M`) for errors |

### Using Code Snippets

Type the prefix and press `Tab` to expand:

| Prefix | Expands To | Description |
|--------|------------|-------------|
| `for` | `FOR i = 1 TO 10...NEXT i` | For-Next loop |
| `forstep` | `FOR counter = 1 TO 10 STEP 2...` | For loop with step |
| `if` | `IF condition THEN...END IF` | If-Then block |
| `ifelse` | `IF...THEN...ELSE...END IF` | If-Else block |
| `select` | `SELECT CASE...END SELECT` | Select Case block |
| `dowhile` | `DO WHILE condition...LOOP` | Do While loop |
| `dountil` | `DO UNTIL condition...LOOP` | Do Until loop |
| `while` | `WHILE condition...WEND` | While-Wend loop |
| `sub` | `SUB ProcedureName...END SUB` | Sub procedure |
| `function` | `FUNCTION FunctionName...END FUNCTION` | Function procedure |
| `dim` | `DIM arrayName(10) AS INTEGER` | Dimension array |
| `dim2d` | `DIM arrayName(10, 10) AS INTEGER` | 2D array |
| `type` | `TYPE TypeName...END TYPE` | User-defined type |
| `print` | `PRINT "text"` | Print statement |
| `input` | `INPUT "prompt", variable` | Input statement |
| `openinput` | Open file for reading | File input setup |
| `openoutput` | Open file for writing | File output setup |
| `gameloop` | Complete game loop template | Game development |
| `keycheck` | Keyboard input handler | Input handling |
| `mousecheck` | Mouse input handler | Input handling |
| `random` | Random number generator | Generate random numbers |
| `newqb64` | QB64 program boilerplate | New QB64 project |
| `newclassic` | Classic QBasic boilerplate | New QBasic project |

### Refactoring Features

| Feature | How to Use |
|---------|------------|
| **Rename Symbol** | Click on a variable/function → Press `F2` → Type new name → Press `Enter` |
| **Find References** | Right-click on symbol → "Find All References" or press `Shift+F12` |
| **Extract to SUB** | Select lines of code → Right-click → "QBasic: Extract to SUB 📦" |
| **Quick Fix** | When you see a 💡 icon, press `Ctrl+.` to see suggestions |
| **Toggle Comment** | Select lines → Press `Ctrl+/` |

---

## 🛠️ Configuration

Access settings via `File > Preferences > Settings` and search for "QBasic Nexus":

### `qbasic-nexus.compilerMode`

| Option | Description |
|--------|-------------|
| **QB64 (Recommended)** | Compile with QB64 for native executable (best performance) |
| **Internal (JS Transpiler)** | Transpile to JavaScript and run via Node.js (backup mode) |

**Default:** `QB64 (Recommended)`

### `qbasic-nexus.compilerPath`

Full path to your QB64 executable.

| OS | Example Path |
|----|--------------|
| Windows | `C:\QB64\qb64.exe` |
| macOS | `/Applications/qb64/qb64` or `~/qb64/qb64` |
| Linux | `/usr/local/bin/qb64` or `~/qb64/qb64` |

Leave empty to trigger auto-detection on startup.

### `qbasic-nexus.compilerArgs`

Optional additional arguments to pass to the QB64 compiler.

| Argument | Description |
|----------|-------------|
| `-w` | Enable more warnings |
| `-g` | Include debug symbols |
| `-prof` | Enable profiling |

**Default:** Empty (no additional arguments)

### `qbasic-nexus.enableLinting`

| Value | Description |
|-------|-------------|
| `true` | Enable real-time syntax checking and error highlighting |
| `false` | Disable linting |

**Default:** `true`

### `qbasic-nexus.lintDelay`

Delay in milliseconds before linting after typing stops.

| Value | Description |
|-------|-------------|
| `100` - `500` | Fast feedback, more CPU usage |
| `500` - `1000` | Balanced (recommended) |
| `1000` - `3000` | Slower feedback, less CPU usage |

**Default:** `500`

### `qbasic-nexus.autoFormatOnSave`

| Value | Description |
|-------|-------------|
| `true` | Automatically format the document when saving |
| `false` | No auto-format on save |

**Default:** `false`

---

## 📄 Understanding the Output

### Output Panel ("QBasic Nexus Compiler" channel)

Access via `Ctrl+Shift+U` (or `Cmd+Shift+U` on Mac) → Select "QBasic Nexus Compiler"

| Output | Meaning |
|--------|---------|
| `✅ COMPILE SUCCESSFUL` | Code compiled without errors |
| `❌ COMPILE FAILED` | Compilation failed - check error messages |
| `🔧 Using QB64 at: ...` | Shows which compiler is being used |
| `⏱️ Compile time: ...` | Shows how long compilation took |

### Terminal Panel ("QBasic Nexus: Run Output" tab)

Displays the output of your running QBasic program (e.g., from `PRINT` statements).

### Executable File Location

Created in the same directory as your source file:
- **Windows:** `yourfile.exe`
- **macOS/Linux:** `yourfile` (no extension)

---

## 🧩 Snippets Reference

QBasic Nexus includes **50+ code snippets** to speed up your development:

### Program Templates

| Prefix | Description |
|--------|-------------|
| `newqb64` | QB64 program with screen setup |
| `newclassic` | Classic QBasic program |
| `gameloop` | Complete game loop structure |
| `doublebuffer` | Double buffering setup for smooth graphics |

### Control Structures

| Prefix | Description |
|--------|-------------|
| `for`, `forstep`, `forrev` | For-Next loops |
| `if`, `ifelse`, `ifelseif`, `ifs` | If statements |
| `select`, `selectrange` | Select Case |
| `dowhile`, `dountil`, `doloopw`, `doloopu` | Do loops |
| `while` | While-Wend loop |

### Procedures

| Prefix | Description |
|--------|-------------|
| `sub`, `subnp` | Sub procedures |
| `function`, `functiont` | Functions |
| `declaresub`, `declarefunction` | Declarations |

### Data & Variables

| Prefix | Description |
|--------|-------------|
| `dim`, `dim2d`, `dimvar` | Dimension arrays/variables |
| `redim` | Redimension array |
| `type` | User-defined type |
| `const` | Constant declaration |
| `dataread` | DATA/READ structure |

### Graphics & Sound

| Prefix | Description |
|--------|-------------|
| `screen`, `screensetup` | Screen setup |
| `line`, `box`, `boxf` | Draw lines and boxes |
| `circle`, `circlef` | Draw circles |
| `pset`, `paint` | Pixel operations |
| `sound`, `beep`, `play` | Sound and music |

### QB64 Specific

| Prefix | Description |
|--------|-------------|
| `rgb`, `rgba` | RGB color values |
| `printstring` | Print at pixel coordinates |
| `loadfont` | Load TrueType fonts |
| `loadsound` | Load and play sounds |
| `qb64image` | Load and display images |
| `fullscreen` | Toggle fullscreen mode |
| `clipboard` | Access clipboard |
| `delay`, `limit` | Timing control |

### Metacommands

| Prefix | Description |
|--------|-------------|
| `$include` | Include external file |
| `$dynamic` | Dynamic arrays |
| `$console` | Enable console window |
| `$if` | Conditional compilation |

### Utility

| Prefix | Description |
|--------|-------------|
| `random` | Random number generation |
| `swap` | Swap variables |
| `sleep`, `timerdelay` | Delays |
| `onerror` | Error handling |
| `keycheck` | Keyboard input handling |
| `mousecheck` | Mouse input handling |

### Math Functions

| Prefix | Description |
|--------|-------------|
| `pi` | PI constant |
| `deg2rad` | Degrees to radians function |
| `rad2deg` | Radians to degrees function |
| `clamp` | Clamp value function |

---

## 🆘 Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **"QB64 compiler path is not set"** | Extension cannot find QB64 | Set the path in Settings → "QBasic Nexus Compiler Path" |
| **"QB64 compiler not found at the specified path"** | Path is incorrect or QB64 not set up | Verify path exists and run QB64 setup script (macOS/Linux) |
| **"ERROR: C++ compilation failed"** | QB64 setup incomplete or C++ compiler missing | Run setup script (`setup_lnx.sh` or `setup_osx.command`) and install C++ compiler |
| **"Failed to set execute permission"** | Missing execute permission on QB64 | Run: `chmod +x /path/to/your/qb64/qb64` |
| **Syntax errors not showing** | Linting disabled | Enable in Settings: `qbasic-nexus.enableLinting` |
| **Slow IntelliSense** | Large file or low lintDelay | Increase `qbasic-nexus.lintDelay` value |

### Where to Find Error Details

| Location | What It Shows |
|----------|---------------|
| **Output Panel** | Detailed compilation logs, exact commands executed |
| **Problems Panel** (`Ctrl+Shift+M`) | All syntax errors with line numbers |
| **compilelog.txt** | QB64 internal C++ errors (in QB64's `internal/temp/` folder) |

### Debug Steps

1. ✅ Check the **Output Panel** ("QBasic Nexus Compiler" channel)
2. ✅ Verify your **compiler path** in settings
3. ✅ Ensure QB64 **setup script** was executed (macOS/Linux)
4. ✅ Check if the **C++ compiler** is installed
5. ✅ Try compiling directly in QB64 IDE to isolate the issue

### Still Having Issues?

Please open an issue on the [GitHub Repository Issues](https://github.com/thirawat27/QBasic-Nexus/issues) and include:
- Full logs from the "QBasic Nexus Compiler" Output Panel
- The `compilelog.txt` file (if applicable)
- Your OS and QB64 version

---

## 📄 License

```
MIT License

Copyright (c) 2025-2026 Thirawat Sinlapasomsak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/thirawat27">Thirawat27</a></p>
  <p>
    <a href="https://github.com/thirawat27/QBasic-Nexus">GitHub</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Report Bug</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Request Feature</a>
  </p>
</div>