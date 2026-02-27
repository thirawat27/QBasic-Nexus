<div align="center">
  <img src="./image/QBasicNexus.png" alt="QBasicNexus Icon" width="220" height="220" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
  <p>
    <strong>Write QBasic. Run Anywhere. No Setup Required.</strong><br/>
    <sub>Native QB64 compilation · Retro CRT web runtime · Real-time IntelliSense · Cross-platform · Worker-threaded</sub>
  </p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#️-prerequisites">Prerequisites</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-keyboard-shortcuts">Shortcuts</a> •
    <a href="#-web-runtime-capabilities">Web Runtime</a> •
    <a href="#️-configuration">Configuration</a> •
    <a href="#-troubleshooting">Troubleshooting</a>
  </p>
  <p>
    <img alt="Version" src="https://img.shields.io/badge/version-1.3.0-blue?style=flat-square"/>
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square"/>
    <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square"/>
  </p>
</div>

<br>

**QBasic Nexus** transforms VS Code into a powerful retro-coding station. Whether you're a veteran developer reliving the glory days or a new learner exploring the roots of programming, QBasic Nexus provides a seamless, modern experience for **QBasic** and **QB64**.

---

## 🌐 Cross-Platform Native Support

QBasic Nexus features **full cross-platform native architecture** with optimized performance for:

| Platform    | Status             | Features                                                              |
| ----------- | ------------------ | --------------------------------------------------------------------- |
| **Windows** | ✅ Fully Supported | Native EXE compilation, PowerShell integration, Windows Audio (mshta) |
| **macOS**   | ✅ Fully Supported | Native app bundles, Xcode CLI integration, afplay/sox audio           |
| **Linux**   | ✅ Fully Supported | Native ELF binaries, GCC integration, ALSA/PulseAudio/beep            |

It offers **dual-mode execution**: compile native executables using your existing QB64 installation, OR run your code instantly in a **browser-based retro CRT** with zero setup — complete with graphics, sound, and mouse support!

---

## 📖 Table of Contents

- [✨ Features](#-features)
  - [🔧 Dual Compilation Modes](#-dual-compilation-modes)
  - [📺 Advanced Web Runtime](#-advanced-web-runtime)
  - [📊 Professional IDE Tools](#-professional-ide-tools)
- [🎮 Interactive Tutorials](#-interactive-tutorials)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Getting Started](#-getting-started)
- [🎬 Web Runtime Capabilities](#-web-runtime-capabilities)
  - [Supported Keywords](#supported-keywords)
  - [Graphics & Sound](#graphics--sound)
  - [Mouse & Input](#mouse--input)
- [📦 Available Commands](#-available-commands)
- [🛠️ Configuration](#️-configuration)
- [🧩 Snippets Reference](#-snippets-reference)
- [🔍 Language Features In Depth](#-language-features-in-depth)
  - [IntelliSense & Auto-Completion](#intellisense--auto-completion)
  - [Real-time Linting](#real-time-linting)
  - [Code Navigation](#code-navigation)
  - [Formatting](#formatting)
  - [Rename & Find References](#rename--find-references)
  - [Code Actions (Quick Fix)](#code-actions-quick-fix)
- [📐 Writing QBasic Code — Quick Reference](#-writing-qbasic-code--quick-reference)
- [🆘 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

---

## ✨ Features

### 🔧 Dual Compilation Modes

| Mode                          | Description                                                                                                              | Best For                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **QB64 Native (Recommended)** | Uses your local QB64 compiler to build optimized standalone `.exe` binaries.                                             | Performance-critical apps, full system access, deployment.        |
| **Internal Web Transpiler**   | Instantly transpiles QBasic to JavaScript and runs it in a simulated CRT webview. **No compiler installation required!** | Quick prototyping, learning, testing logic, retro graphics/sound. |

### 📺 Advanced Web Runtime

The internal web runtime is not just a toy — it's a fully-featured emulation layer powered by HTML5 Canvas and Web Audio API.

- **Retro CRT Quality**: Authentic scanlines, text lag, and phosphor persistence effects.
- **Rich Graphics**: Supports `SCREEN`, `PSET`, `LINE`, `CIRCLE`, `PAINT`, `GET`, `PUT`, and more.
- **High-Fidelity Audio**: Full `PLAY` command parsing (octaves, tempo, legato/staccato), `SOUND`, and `BEEP`.
- **QB64 Extensions**: Supports `_RGB32`, `_MOUSEINPUT`, `_LIMIT`, `_DELAY`, `_PI`, and more.
- **Virtual File System**: Uses LocalStorage to simulate file I/O (`OPEN`, `WRITE`, `INPUT#`) so your data persists between runs.

### 📊 Professional IDE Tools

- **IntelliSense**: Smart auto-completion for 400+ keywords, built-in functions, and user-defined Subs/Functions.
- **Real-time Linting**: Catches syntax errors (missing `NEXT`, `END IF`, type mismatches) as you type.
- **Code Navigation**: "Go to Definition" (`F12`) and "Go to Reference" (`Shift+F12`) for Subs, Functions, Types, and DIM declarations.
- **Symbol Rename**: Rename any variable/sub/function across all open `.bas` files with `F2`.
- **Code Actions**: Quick fixes for common errors (missing `DIM`, missing `THEN`, unclosed `END IF`).
- **Formatting**: Auto-indentation and block alignment with `Shift+Alt+F`. Smart on-type indenting after `FOR`, `IF`, `SUB`, etc.
- **Outline View**: Navigate large files via VS Code's built-in Outline panel.
- **Code Statistics**: Count lines of code, SUBs, FUNCTIONs, and CONSTs instantly.
- **Code Folding**: Collapse any block (`SUB`, `FUNCTION`, `FOR`, `IF`, `TYPE`).

---

## 🎮 Interactive Tutorials

New to QBasic? The **Interactive Tutorial Mode** solves the "blank screen" problem.

1. Open the Command Palette (`Ctrl+Shift+P`).
2. Select **"QBasic: Start Interactive Tutorial 🎮"**.
3. Choose a lesson (e.g., "Hello World", "Variables", "Loops").
4. Read the **Mission Objective** and write code to solve it.
5. Press `F5`. If the output matches the goal, you get a **"Mission Complete"** badge and unlock the next level!

### Available Lessons

| Level | Title       | What You Learn             |
| ----- | ----------- | -------------------------- |
| 1     | Hello World | `PRINT`, strings           |
| 2     | Variables   | Assignment, numeric output |
| 3     | Interaction | `INPUT`, string variables  |
| 4     | Loops       | `FOR...NEXT`               |

---

## ⌨️ Keyboard Shortcuts

| Shortcut                  | Action                                    |
| ------------------------- | ----------------------------------------- |
| `F5`                      | Compile & Run (uses current mode setting) |
| `Ctrl+Shift+B`            | Compile Only (Native QB64 mode)           |
| `Ctrl+Shift+P` → _QBasic_ | Open all QBasic commands                  |
| `F12`                     | Go to Definition                          |
| `Shift+F12`               | Find All References                       |
| `F2`                      | Rename Symbol                             |
| `Shift+Alt+F`             | Format Document                           |
| `Ctrl+/`                  | Toggle Line Comment                       |
| `Ctrl+Shift+I`            | Show Code Statistics                      |
| `Ctrl+Space`              | Trigger IntelliSense manually             |

---

## ⚙️ Prerequisites

### Step 1: Install QB64

- **All Systems**: Download QB64 from [qb64.com](https://qb64.com/) or QB64 Phoenix Edition from [qb64phoenix.com](https://www.qb64phoenix.com/).
- **macOS & Linux (Required)**: After unzipping, run the setup script once:
  - **macOS**: `sh ./setup_osx.command`
  - **Linux**: `sh ./setup_lnx.sh`

### Step 2: Ensure C++ Compiler (if required by QB64)

- **macOS**: `xcode-select --install`
- **Linux (Debian/Ubuntu)**: `sudo apt-get install build-essential`
- **Windows**: QB64 Phoenix Edition includes its own compiler — no extra tools needed.

> 💡 **Tip**: If you skip QB64 installation entirely, you can still use the **Internal Web Transpiler** mode for instant code execution with no setup at all.

---

## 🚀 Getting Started

### 1. Install the Extension

Search for **"QBasic Nexus"** in the VS Code Extensions Marketplace (`Ctrl+Shift+X`) and click Install.

### 2. Set Up QB64 Path

On first activation, the extension **auto-detects** your QB64 installation. If found:

- A notification appears: _"QB64 found at: ..."_. Click **"Yes, use this path"** to save.

If auto-detection fails, set the path manually:

1. Open VS Code Settings (`Ctrl+,`).
2. Search for `qbasic-nexus.compilerPath`.
3. Enter the full path to your QB64 executable:
   - **Windows**: `C:\QB64\qb64.exe`
   - **macOS**: `/Applications/qb64/qb64`
   - **Linux**: `/home/user/qb64/qb64`

### 3. Open a QBasic File

Open any file with extension `.bas`, `.bi`, `.bm`, or `.inc` — the extension activates automatically.

### 4. Choose Your Compilation Mode

Open Settings → Search `qbasic-nexus.compilerMode`:

- **`QB64`** — compile native executables (requires QB64 installed)
- **`internal`** — run instantly in the web CRT (no QB64 needed)

### 5. Run Your Code

- Press **`F5`** to compile & run.
- Or click the **⚙️ status bar button** (bottom of VS Code) when a `.bas` file is active.

### 6. Zero-Setup Quick Start

No QB64? Try the web runtime right now:

1. Create `hello.bas`
2. Paste this:
   ```basic
   SCREEN 13
   COLOR 14
   PRINT "Hello from QBasic Nexus!"
   CIRCLE (160, 100), 50, 4
   PLAY "CDEFGAB>C"
   ```
3. Press **F5** → select **"Internal (JS Transpiler)"** if prompted.

---

## 🎬 Web Runtime Capabilities

### Supported Keywords

| Category           | Commands Supported                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Core I/O**       | `PRINT`, `INPUT`, `CLS`, `LOCATE`, `COLOR`, `SCREEN`, `WIDTH`, `LPRINT`, `WRITE`                                                     |
| **Logic**          | `IF/THEN/ELSE/ELSEIF`, `SELECT CASE`, `FOR...NEXT`, `DO...LOOP`, `WHILE...WEND`                                                      |
| **Jump**           | `GOTO`, `GOSUB`, `RETURN`, `ON...GOTO`, `ON...GOSUB`, `ON ERROR GOTO`, `RESUME NEXT`                                                 |
| **Math**           | `ABS`, `INT`, `FIX`, `SIN`, `COS`, `TAN`, `ATN`, `SQR`, `LOG`, `EXP`, `RND`, `SGN`                                                   |
| **Adv. Math**      | `_PI`, `_ROUND`, `_CEIL`, `_HYPOT`, `_ATAN2`, `_SINH`, `_COSH`, `_TANH`, `_D2R`, `_R2D`                                              |
| **Strings**        | `LEFT$`, `RIGHT$`, `MID$`, `LEN`, `UCASE$`, `LCASE$`, `LTRIM$`, `RTRIM$`, `INSTR`, `CHR$`, `ASC`, `STR$`, `VAL`, `STRING$`, `SPACE$` |
| **System**         | `TIMER`, `DATE$`, `TIME$`, `SLEEP`, `INKEY$`, `CSRLIN`, `POS`, `SHELL`, `STOP`, `END`                                                |
| **File System**    | `OPEN`, `CLOSE`, `NAME`, `KILL`, `MKDIR`, `RMDIR`, `CHDIR`, `FILES`, `EOF`, `FREEFILE`                                               |
| **Graphics**       | `LINE`, `CIRCLE`, `PSET`, `PRESET`, `DRAW`, `PAINT`, `VIEW`, `WINDOW`, `GET`, `PUT`, `PALETTE`, `PCOPY`                              |
| **QB64 Extended**  | `_LIMIT`, `_DELAY`, `_RGB32`, `_RGBA32`, `_TITLE`, `_FULLSCREEN`, `_SCREENMOVE`, `_DEST`, `_SOURCE`, `_FONT`, `_CLIPBOARD`           |
| **Advanced Audio** | `_SNDPLAY`, `_SNDSTOP`, `_SNDVOL`, `_SNDPAUSE`, `_SNDLOOP`, `_SNDBAL`, `_SNDSETPOS`, `_SNDCLOSE`                                     |
| **Data**           | `TYPE...END TYPE`, `DIM`, `REDIM PRESERVE`, `CONST`, `DEF FN`, `SHARED`, `STATIC`                                                    |

### Graphics & Sound

```basic
' Draw filled shapes
SCREEN 12
LINE (10, 10)-(200, 100), 14, BF   ' Filled yellow box
CIRCLE (160, 240), 80, 4            ' Red circle
PAINT (160, 240), 2, 4              ' Fill green

' Play music
PLAY "T120 O3 L8 CDEFGAB>C"
SOUND 440, 18.2                     ' 440Hz for 1 second
BEEP
```

### Mouse & Input

```basic
' Full QB64 mouse API in the browser:
DO
    _LIMIT 60
    WHILE _MOUSEINPUT : WEND
    x = _MOUSEX
    y = _MOUSEY

    IF _MOUSEBUTTON(1) THEN
        CIRCLE (x, y), 3, 14
    END IF

    k$ = INKEY$
LOOP UNTIL k$ = CHR$(27)   ' ESC to quit
```

---

## 📦 Available Commands

Access via Command Palette (`Ctrl+Shift+P`) → type "QBasic":

| Command                           | Shortcut       | Description                                      |
| --------------------------------- | -------------- | ------------------------------------------------ |
| **Compile & Run 🌀**              | `F5`           | Run code (Native or Web based on settings).      |
| **Compile Only 🔨**               | `Ctrl+Shift+B` | Build `.exe` in Native QB64 mode.                |
| **Run in Retro CRT 📺**           | —              | Force-run in Web Runtime regardless of settings. |
| **Start Interactive Tutorial 🎮** | —              | Launch beginner lessons.                         |
| **Show Code Statistics 📊**       | `Ctrl+Shift+I` | Count LOC, Subs, Functions, Constants.           |
| **Toggle Comment 💬**             | `Ctrl+/`       | Comment/uncomment selected lines.                |
| **Extract to SUB 📦**             | —              | Refactor selected code into a new Sub.           |

---

## 🛠️ Configuration

All settings are under `qbasic-nexus.*` in VS Code Settings (`Ctrl+,`).

| Setting               | Default      | Description                                                     |
| --------------------- | ------------ | --------------------------------------------------------------- |
| `compilerMode`        | `QB64`       | `QB64` for native compilation, `internal` for web transpiler.   |
| `compilerPath`        | `""`         | Full path to QB64 executable. Auto-detected if blank.           |
| `compilerArgs`        | `""`         | Extra flags passed to QB64 (e.g., `-w` for more warnings).      |
| `enableLinting`       | `true`       | Enable real-time syntax error highlighting.                     |
| `lintDelay`           | `500`        | Milliseconds after typing before linting runs (100–3000).       |
| `autoFormatOnSave`    | `false`      | Auto-format (indent + capitalization) on every save.            |
| `enableAutoDetection` | `true`       | Auto-search for QB64 on extension startup.                      |
| `terminalIntegration` | `integrated` | Use VS Code integrated terminal or external terminal.           |
| `nativeOptimizations` | `true`       | Enable platform-specific worker thread and audio optimizations. |
| `workerThreads`       | `0`          | Number of worker threads (0 = auto-detect based on CPU cores).  |

### Example: Minimal settings.json

```json
{
  "qbasic-nexus.compilerMode": "QB64",
  "qbasic-nexus.compilerPath": "C:\\QB64\\qb64.exe",
  "qbasic-nexus.enableLinting": true,
  "qbasic-nexus.autoFormatOnSave": true
}
```

---

## 🧩 Snippets Reference

Type a prefix and press `Tab` to expand:

| Prefix       | Expands To                                            |
| ------------ | ----------------------------------------------------- |
| `sub`        | `SUB Name() ... END SUB`                              |
| `function`   | `FUNCTION Name() ... END FUNCTION`                    |
| `type`       | `TYPE Name ... END TYPE`                              |
| `if`         | `IF condition THEN ... END IF`                        |
| `ifelse`     | `IF ... THEN ... ELSE ... END IF`                     |
| `select`     | `SELECT CASE ... CASE ... END SELECT`                 |
| `for`        | `FOR i = 1 TO 10 ... NEXT i`                          |
| `forstep`    | `FOR i = start TO end STEP step`                      |
| `dowhile`    | `DO WHILE condition ... LOOP`                         |
| `dountil`    | `DO ... LOOP UNTIL condition`                         |
| `screen`     | `SCREEN 13 : CLS`                                     |
| `line`       | `LINE (x1, y1)-(x2, y2), color`                       |
| `circle`     | `CIRCLE (cx, cy), radius, color`                      |
| `rgb`        | `_RGB32(r, g, b)`                                     |
| `input`      | `INPUT "Prompt: ", variable`                          |
| `inkey`      | `DO ... k$ = INKEY$ : LOOP UNTIL k$ <> ""`            |
| `mousecheck` | Mouse polling loop with `_MOUSEINPUT`                 |
| `keycheck`   | Keyboard polling with `INKEY$`                        |
| `newqb64`    | Full QB64 program template with `_TITLE` and `SCREEN` |
| `gameloop`   | Game loop with `_LIMIT 60` and input handling         |

---

## 🔍 Language Features In Depth

### IntelliSense & Auto-Completion

QBasic Nexus provides context-aware completions:

- **Keywords** — All 200+ QBasic/QB64 keywords with descriptions.
- **Built-in Functions** — 60+ functions with parameter hints (e.g., `MID$(string, start, length)`).
- **Your SUBs & FUNCTIONs** — Automatically discovered from the current file and workspace.
- **Signature Help** — When you type `(`, a tooltip shows function parameters.
- **Hover Documentation** — Hover over any keyword or function to see its documentation and example.

```basic
' Hover over LEFT$ to see its signature:
result$ = LEFT$(text$, 5)
'             ^^^^^^ Shows: LEFT$(string, length) → string
```

### Real-time Linting

Linting runs automatically as you type (configurable delay). It detects:

- Missing `NEXT` for `FOR` loops
- Unclosed `IF` blocks (no `END IF`)
- Missing `END SUB` / `END FUNCTION`
- Invalid type assignments
- Undefined label references (`GOTO unknown_label`)

Errors appear as red underlines. Hover to see the description. Click the 💡 lightbulb for a **Quick Fix**.

### Code Navigation

| Action                   | How                                 |
| ------------------------ | ----------------------------------- |
| Go to Definition         | `F12` on any SUB/FUNCTION/TYPE name |
| Go to Definition (DIM)   | `F12` on a variable name            |
| Peek Definition          | `Alt+F12`                           |
| Find All References      | `Shift+F12`                         |
| Open Symbol in Workspace | `Ctrl+T` → type symbol name         |
| Outline Panel            | View → Open View → Outline          |

### Formatting

**Full Document Format** (`Shift+Alt+F`):

- Corrects indentation for all block structures.
- Preserves your spacing inside expressions.

**On-Type Auto-Indent**:

- After pressing Enter at the end of `FOR`, `DO`, `WHILE`, `IF...THEN`, `SUB`, `FUNCTION`, `TYPE`, the next line is auto-indented.
- After `NEXT`, `LOOP`, `WEND`, `END IF`, `END SUB`, indentation decreases.

**Auto-Format on Save** (optional):

```json
"qbasic-nexus.autoFormatOnSave": true
```

### Rename & Find References

Press `F2` on any symbol (variable, sub, function) to rename it across the **entire workspace** (all `.bas`, `.bi`, `.bm` files):

```basic
' Place cursor on "playerX" → Press F2 → Type "hero_x"
' All occurrences in all files are updated at once.
DIM playerX AS INTEGER
PRINT playerX
CALL MovePlayer(playerX)
```

### Code Actions (Quick Fix)

The 💡 lightbulb appears next to lines with errors. Available quick fixes:

| Diagnostic               | Quick Fix                               |
| ------------------------ | --------------------------------------- |
| Variable not defined     | `Add 'DIM variableName'` at top of file |
| Missing THEN             | `Add 'THEN'` at end of IF line          |
| Unclosed IF block        | `Add 'END IF'` after block              |
| Selected multi-line code | `Extract to SUB` (refactoring)          |

---

## 📐 Writing QBasic Code — Quick Reference

### Variables

```basic
' Implicit (auto-declared):
x = 10
name$ = "Alice"

' Explicit:
DIM score AS INTEGER
DIM name AS STRING * 20
DIM arr(100) AS DOUBLE
DIM grid(10, 10) AS INTEGER

' Constants:
CONST MAX_SCORE = 9999
CONST PI = 3.14159
```

### Type Suffixes

| Suffix | Type                   | Range           |
| ------ | ---------------------- | --------------- |
| (none) | Single precision float | ~7 digits       |
| `%`    | Integer                | -32768 to 32767 |
| `&`    | Long integer           | ±2 billion      |
| `!`    | Single precision       | ~7 digits       |
| `#`    | Double precision       | ~15 digits      |
| `$`    | String                 | Text            |

### Control Flow

```basic
' IF / ELSEIF / ELSE
IF score > 100 THEN
    PRINT "High score!"
ELSEIF score > 50 THEN
    PRINT "Good"
ELSE
    PRINT "Try again"
END IF

' SELECT CASE
SELECT CASE grade
    CASE "A": PRINT "Excellent"
    CASE "B", "C": PRINT "Good"
    CASE ELSE: PRINT "Below average"
END SELECT

' Loops
FOR i = 1 TO 10 STEP 2
    PRINT i
NEXT i

DO WHILE condition
    ' ...
LOOP

DO
    ' ...
LOOP UNTIL condition
```

### SUBs and FUNCTIONs

```basic
' Call a SUB:
CALL DrawBox(10, 20, 100, 50)
DrawBox 10, 20, 100, 50   ' No CALL also works

SUB DrawBox(x, y, w, h)
    LINE (x, y)-(x + w, y + h), 15, B
END SUB

' FUNCTION returns a value:
result = Add(3, 4)

FUNCTION Add(a, b)
    Add = a + b   ' Assign to function name to return
END FUNCTION
```

### User-Defined Types

```basic
TYPE Player
    x AS INTEGER
    y AS INTEGER
    name AS STRING * 20
    score AS LONG
END TYPE

DIM hero AS Player
hero.x = 100
hero.name = "Hero"
PRINT hero.name
```

### File I/O

```basic
' Write to file:
OPEN "data.txt" FOR OUTPUT AS #1
PRINT #1, "Hello File"
CLOSE #1

' Read from file:
OPEN "data.txt" FOR INPUT AS #1
WHILE NOT EOF(1)
    LINE INPUT #1, line$
    PRINT line$
WEND
CLOSE #1
```

---

## 🆘 Troubleshooting

### Web Runtime (CRT) Issues

| Problem                     | Solution                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- |
| **No sound**                | Browsers block audio until user interaction. Click anywhere in the CRT window first.   |
| **Slow / frozen**           | Always use `_LIMIT 60` inside game loops. Without it, the loop runs at full CPU speed. |
| **PRINT doesn't show**      | Make sure `CLS` is not clearing after your `PRINT`. Try removing `CLS`.                |
| **Program exits instantly** | Add `SLEEP` or an `INKEY$` loop at the end to keep the window open.                    |

### Native QB64 Issues

| Problem                              | Solution                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **"Compiler not found"**             | Go to Settings → `qbasic-nexus.compilerPath` → enter the path to your QB64 **executable** (not the folder). |
| **macOS: "Cannot verify developer"** | System Settings → Privacy & Security → click **Open Anyway** for `qb64`.                                    |
| **Linux: "qb64: command not found"** | Run the QB64 setup script first: `sh ./setup_lnx.sh` in your QB64 directory.                                |
| **"C++ compiler error"**             | Install build tools: `sudo apt install build-essential` (Linux) or `xcode-select --install` (macOS).        |
| **Output window closes immediately** | This is expected for console apps without `SLEEP`. Add `SLEEP` or `INPUT "Press ENTER...", q$` at the end.  |

### Extension Issues

| Problem                      | Solution                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **IntelliSense not working** | Make sure your file has a `.bas`, `.bi`, or `.bm` extension.                  |
| **Linting not appearing**    | Check `qbasic-nexus.enableLinting` is `true` in settings.                     |
| **Format messes up my code** | Report on [GitHub Issues](https://github.com/thirawat27/QBasic-Nexus/issues). |
| **Extension won't activate** | Reload VS Code window: `Ctrl+Shift+P` → "Reload Window".                      |

### Known Limitations (Web Runtime)

- **`PEEK`/`POKE`/`VARPTR`** — Safely stubbed; do not return real memory addresses.
- **Binary file I/O** — Raw binary modes are limited. Use text mode `OPEN ... FOR INPUT/OUTPUT`.
- **`SHELL` / `CHAIN` / `RUN`** — Cannot launch external programs from the browser sandbox.
- **Long-running CPU loops** — Very tight loops without `_LIMIT` may cause the browser tab to become unresponsive.

---

## 📄 License

MIT License © 2026 Thirawat Sinlapasomsak

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/thirawat27">Thirawat27</a></p>
  <p>
    <a href="https://github.com/thirawat27/QBasic-Nexus">GitHub</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Report Bug</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Request Feature</a>
  </p>
</div>
