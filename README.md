<div align="center">
  <img src="./image/QBasicNexus.png" alt="QBasicNexus Icon" width="220" height="220" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
  <p>
    <strong>The Ultimate Modern QBasic & QB64 Development Environment for VS Code</strong>
  </p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#️-prerequisites">Prerequisites</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-web-runtime-capabilities">Web Runtime</a> •
    <a href="#️-configuration">Configuration</a> •
    <a href="#-troubleshooting">Troubleshooting</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/version-1.3.1-blue.svg" alt="Version" />
    <img src="https://img.shields.io/badge/VS%20Code-1.105.0+-green.svg" alt="VS Code" />
    <img src="https://img.shields.io/badge/license-MIT-orange.svg" alt="License" />
  </p>
</div>

<br>

**QBasic Nexus** transforms VS Code into a powerful retro-coding station. Whether you're a veteran developer reliving the glory days or a new learner exploring the roots of programming, QBasic Nexus provides a seamless, modern experience for **QBasic** and **QB64**.

## 🌟 What's New in v1.3.1

- ✨ **Enhanced Compiler Performance**: Optimized transpiler with improved memory management
- 🎨 **Better CRT Rendering**: Improved neon glow effects and smoother graphics
- 🔧 **Robust Error Recovery**: Continued parsing despite syntax errors with precise reporting
- 📦 **Advanced Caching System**: Faster recompilation with intelligent code caching
- 🎮 **Interactive Tutorials**: Learn QBasic with guided, hands-on lessons
- 🐛 **Bug Fixes**: Resolved variable declaration issues and improved stability

---

## 📖 Table of Contents

- [✨ Features](#-features)
  - [🔧 Dual Compilation Modes](#-dual-compilation-modes)
  - [📺 Advanced Web Runtime](#-advanced-web-runtime)
  - [📊 Professional IDE Tools](#-professional-ide-tools)
- [🎮 Interactive Tutorials](#-interactive-tutorials)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Getting Started](#-getting-started)
- [🎬 Web Runtime Capabilities](#-web-runtime-capabilities)
- [📦 Available Commands](#-available-commands)
- [🛠️ Configuration](#️-configuration)
- [🧩 Snippets Reference](#-snippets-reference)
- [🆘 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

---

## ✨ Features

### 🔧 Dual Compilation Modes

| Mode                          | Description                                                                                                              | Best For                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **QB64 (Recommended)** | Uses your local QB64 compiler to build optimized standalone executables.                                             | Performance-critical apps, full system access, deployment.                     |
| **QBasic Nexus (Internal)**   | Instantly transpiles QBasic to JavaScript and packages as native `.exe` using pkg. **No QB64 installation required!** | Quick prototyping, learning, testing logic, cross-platform distribution. |

### 📺 Advanced Web Runtime

The internal web runtime is a fully-featured emulation layer powered by HTML5 Canvas and Web Audio API.

- **Retro CRT Aesthetic**: Authentic scanlines, neon glow effects, and phosphor persistence
- **Rich Graphics**: Full support for `SCREEN`, `PSET`, `LINE`, `CIRCLE`, `PAINT`, `GET`, `PUT`, `DRAW`, and more
- **High-Fidelity Audio**: Complete `PLAY` command parsing (octaves, tempo, legato/staccato), `SOUND`, and `BEEP`
- **QB64 Extensions**: Advanced keywords like `_RGB32`, `_MOUSEINPUT`, `_LIMIT`, `_DELAY`, `_PI`, `_TITLE`, and more
- **Virtual File System**: LocalStorage-based file I/O (`OPEN`, `WRITE`, `INPUT#`) with 10MB storage limit
- **Mouse & Keyboard**: Full support for `_MOUSEX`, `_MOUSEY`, `_MOUSEBUTTON`, `_KEYHIT`, and `INKEY$`

### 📊 Professional IDE Tools

- **IntelliSense**: Smart auto-completion for 400+ keywords, including QB64 extensions
- **Real-time Linting**: Catches syntax errors as you type with configurable delay
- **Code Navigation**: "Go to Definition" (F12) for SUBs, FUNCTIONs, and TYPEs
- **Document Formatting**: Auto-indentation and keyword casing with `Shift+Alt+F`
- **Outline View**: Navigate large files via VS Code's Outline panel
- **Symbol Highlighting**: Automatic highlighting of variable references
- **Code Actions**: Quick fixes for common errors (missing THEN, END IF, etc.)
- **Signature Help**: Parameter hints for built-in functions
- **Hover Information**: Inline documentation for keywords and functions
- **Code Folding**: Collapse SUBs, FUNCTIONs, and control structures
- **Rename Symbol**: Rename variables across entire file with F2

---

## 🎮 Interactive Tutorials

New to QBasic? The **Interactive Tutorial Mode** provides hands-on learning.

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Select **"QBasic: Start Interactive Tutorial 🎮"**
3. Choose a lesson:
   - **Level 1**: Hello World - Learn PRINT basics
   - **Level 2**: Variables - Work with numbers and strings
   - **Level 3**: Interaction - Get user INPUT
   - **Level 4**: Loops - Master FOR loops
4. Read the objective and write code to solve it
5. Press `F5` to run - get instant feedback!
6. Complete missions to unlock next levels

---

## ⚙️ Prerequisites

### For QB64 Native Mode

**QB64 Installation Required**: Download from [qb64.com](https://qb64.com/) or [qb64phoenix.com](https://www.qb64phoenix.com/)

#### Platform-Specific Setup

**Windows**:
- Download and extract QB64
- No additional setup required

**macOS**:
1. Download and extract QB64
2. Install Xcode Command Line Tools: `xcode-select --install`
3. Run setup script: `sh ./setup_osx.command` (in QB64 directory)
4. Allow QB64 in System Settings > Privacy & Security (first run)

**Linux**:
1. Download and extract QB64
2. Install build tools: `sudo apt-get install build-essential`
3. Run setup script: `sh ./setup_lnx.sh` (in QB64 directory)

### For Internal Transpiler Mode

**No prerequisites!** The internal transpiler works out of the box with zero setup.

---

## 🚀 Getting Started

### Quick Start (No Installation)

1. Install **QBasic Nexus** from VS Code Marketplace
2. Create a new file: `hello.bas`
3. Write your code:
   ```basic
   SCREEN 13
   COLOR 14
   PRINT "Hello from QBasic Nexus!"
   CIRCLE (160, 100), 50, 4
   PLAY "CDEFGAB>C"
   ```
4. Press **F5** and select **"QBasic Nexus"** mode
5. Watch it run in the Retro CRT viewer!

### Full Setup (QB64 Native)

1. **Install QB64** (see Prerequisites above)
2. **Install Extension** from VS Code Marketplace
3. **Configure Path**:
   - Extension will auto-detect QB64 on first use
   - Or manually set in Settings: `QBasic Nexus: Compiler Path`
   - Examples:
     - Windows: `C:\QB64\qb64.exe`
     - macOS: `/Applications/qb64/qb64`
     - Linux: `/home/user/qb64/qb64`
4. **Open a `.bas` file** and press **F5** to compile and run!

---

## 🎬 Web Runtime Capabilities

### Supported Keywords (400+)

| Category        | Commands                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Core I/O**    | `PRINT`, `INPUT`, `LINE INPUT`, `CLS`, `LOCATE`, `COLOR`, `SCREEN`, `WIDTH`, `WRITE`, `LPRINT`                          |
| **Control Flow**| `IF...THEN...ELSE`, `ELSEIF`, `SELECT CASE`, `FOR...NEXT`, `DO...LOOP`, `WHILE...WEND`, `EXIT`, `GOTO`, `GOSUB`        |
| **Variables**   | `DIM`, `REDIM`, `CONST`, `SHARED`, `STATIC`, `TYPE`, `SWAP`, `ERASE`, `LET`                                             |
| **Math**        | `ABS`, `INT`, `FIX`, `SIN`, `COS`, `TAN`, `ATN`, `SQR`, `LOG`, `EXP`, `RND`, `SGN`, `MOD`                               |
| **Advanced Math**| `_PI`, `_ROUND`, `_CEIL`, `_HYPOT`, `_ATAN2`, `_SINH`, `_COSH`, `_TANH`, `_D2R`, `_R2D`, `_ASIN`, `_ACOS`              |
| **Strings**     | `LEFT$`, `RIGHT$`, `MID$`, `LEN`, `UCASE$`, `LCASE$`, `LTRIM$`, `RTRIM$`, `_TRIM$`, `INSTR`, `CHR$`, `ASC`, `STR$`, `VAL`, `SPACE$`, `STRING$` |
| **System**      | `TIMER`, `DATE$`, `TIME$`, `SLEEP`, `INKEY$`, `CSRLIN`, `POS`, `SHELL`, `CHAIN`, `RUN`, `SYSTEM`, `RANDOMIZE`          |
| **File I/O**    | `OPEN`, `CLOSE`, `PRINT#`, `INPUT#`, `LINE INPUT#`, `WRITE#`, `GET`, `PUT`, `SEEK`, `LOF`, `LOC`, `EOF`, `FREEFILE`, `NAME`, `KILL`, `MKDIR`, `RMDIR`, `CHDIR`, `FILES` |
| **Graphics**    | `LINE`, `CIRCLE`, `PSET`, `PRESET`, `DRAW`, `PAINT`, `VIEW`, `WINDOW`, `GET`, `PUT`, `PALETTE`, `PCOPY`, `POINT`       |
| **QB64 Graphics**| `_RGB`, `_RGBA`, `_RGB32`, `_RGBA32`, `_RED`, `_GREEN`, `_BLUE`, `_ALPHA`, `_NEWIMAGE`, `_LOADIMAGE`, `_FREEIMAGE`, `_PUTIMAGE`, `_COPYIMAGE`, `_PRINTSTRING`, `_CLEARCOLOR`, `_SETALPHA` |
| **QB64 System** | `_TITLE`, `_FULLSCREEN`, `_SCREENMOVE`, `_LIMIT`, `_DELAY`, `_DISPLAY`, `_DEST`, `_SOURCE`, `_FONT`, `_LOADFONT`, `_CLIPBOARD$` |
| **QB64 Input**  | `_KEYHIT`, `_KEYDOWN`, `_MOUSEINPUT`, `_MOUSEX`, `_MOUSEY`, `_MOUSEBUTTON`, `_MOUSEWHEEL`, `_MOUSEMOVE`, `_MOUSESHOW`, `_MOUSEHIDE` |
| **Audio**       | `SOUND`, `PLAY`, `BEEP`, `_SNDOPEN`, `_SNDPLAY`, `_SNDSTOP`, `_SNDCLOSE`, `_SNDVOL`, `_SNDPAUSE`, `_SNDLOOP`, `_SNDLEN`, `_SNDGETPOS`, `_SNDSETPOS` |

### Graphics Examples

```basic
' Draw a colorful scene
SCREEN 13
LINE (0, 0)-(319, 199), 1, BF  ' Blue background
CIRCLE (160, 100), 50, 14      ' Yellow circle
PAINT (160, 100), 14, 14       ' Fill it
LINE (100, 50)-(220, 150), 12, B  ' Red box

' QB64 advanced graphics
_TITLE "QBasic Nexus Demo"
c& = _RGB32(255, 128, 0)  ' Orange color
CIRCLE (160, 100), 30, c&
```

### Audio Examples

```basic
' Classic PLAY command
PLAY "T120 O4 L4 C D E F G A B >C"

' QB64 sound files
handle& = _SNDOPEN("music.mp3")
_SNDPLAY handle&
_SNDVOL handle&, 0.5  ' 50% volume
```

### Mouse Input Example

```basic
DO
    _LIMIT 60
    WHILE _MOUSEINPUT: WEND
    
    x = _MOUSEX
    y = _MOUSEY
    
    IF _MOUSEBUTTON(1) THEN
        CIRCLE (x, y), 5, 14
    END IF
    
    IF _MOUSEBUTTON(2) THEN
        CIRCLE (x, y), 10, 12
    END IF
LOOP UNTIL INKEY$ = CHR$(27)
```

---

## 📦 Available Commands

| Command                      | Shortcut       | Description                                          |
| ---------------------------- | -------------- | ---------------------------------------------------- |
| **Compile & Run 🌀**         | `F5`           | Compile and run (mode based on settings)             |
| **Compile Only 🔨**          | `Ctrl+Shift+B` | Build executable (QB64 mode only)                    |
| **Run in Retro CRT 📺**      | -              | Force run in Web Runtime                             |
| **Start Interactive Tutorial 🎮** | -         | Launch interactive learning mode                     |
| **Show Code Statistics 📊**  | `Ctrl+Shift+I` | Display LOC, SUBs, FUNCTIONs count                   |
| **Toggle Comment 💬**        | `Ctrl+/`       | Comment/uncomment selected lines                     |
| **Extract to SUB 📦**        | -              | Refactor selection into new SUB                      |

---

## 🛠️ Configuration

Access settings via `File > Preferences > Settings` and search for "QBasic Nexus"

| Setting                        | Default                | Description                                                             |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| **Compiler Mode**              | `QB64 (Recommended)`   | Choose between QB64 native or internal transpiler                       |
| **Compiler Path**              | `null` (auto-detect)   | Full path to QB64 executable                                            |
| **Compiler Args**              | `""`                   | Additional QB64 compiler flags (e.g., `-w`, `-g`)                       |
| **Enable Linting**             | `true`                 | Real-time syntax checking                                               |
| **Lint Delay**                 | `500` ms               | Delay before linting after typing stops                                 |
| **Auto Format On Save**        | `false`                | Automatically format code when saving                                   |

### Example Configuration

```json
{
  "qbasic-nexus.compilerMode": "QB64 (Recommended)",
  "qbasic-nexus.compilerPath": "C:\\QB64\\qb64.exe",
  "qbasic-nexus.enableLinting": true,
  "qbasic-nexus.lintDelay": 300,
  "qbasic-nexus.autoFormatOnSave": true
}
```

---

## 🧩 Snippets Reference

Type these prefixes and press `Tab` to expand:

### Structure Snippets
- `sub` → SUB definition with END SUB
- `function` → FUNCTION definition with END FUNCTION
- `type` → TYPE definition with END TYPE
- `select` → SELECT CASE structure
- `if` → IF...THEN statement
- `ifelse` → IF...THEN...ELSE structure

### Loop Snippets
- `for` → FOR...NEXT loop
- `forstep` → FOR...NEXT with STEP
- `dowhile` → DO WHILE...LOOP
- `dountil` → DO UNTIL...LOOP
- `while` → WHILE...WEND loop

### Graphics Snippets
- `screen` → SCREEN mode setup
- `line` → LINE drawing command
- `circle` → CIRCLE drawing command
- `rgb` → _RGB32 color definition

### Input Snippets
- `input` → INPUT statement
- `inkey` → INKEY$ check
- `mousecheck` → Mouse input check
- `keycheck` → Keyboard check

### Template Snippets
- `newqb64` → Complete QB64 program template
- `gameloop` → Game loop with _LIMIT

---

## 🆘 Troubleshooting

### Web Runtime Issues

**Problem**: No sound in CRT viewer
- **Solution**: Click inside the CRT window to enable audio (browser security requirement)

**Problem**: Slow performance or freezing
- **Solution**: Add `_LIMIT 60` inside your main loop to cap frame rate

**Problem**: Graphics not displaying
- **Solution**: Ensure you have `SCREEN` command at the start of your program

### QB64 Native Mode Issues

**Problem**: "Compiler not found" error
- **Solution**: 
  1. Check `qbasic-nexus.compilerPath` setting
  2. Ensure path points to executable file (not folder)
  3. Try auto-detection: Remove path and restart VS Code

**Problem**: Compilation fails on macOS
- **Solution**:
  1. Install Xcode Command Line Tools: `xcode-select --install`
  2. Run QB64 setup script: `sh ./setup_osx.command`
  3. Allow QB64 in System Settings > Privacy & Security

**Problem**: Compilation fails on Linux
- **Solution**:
  1. Install build tools: `sudo apt-get install build-essential`
  2. Run QB64 setup script: `sh ./setup_lnx.sh`
  3. Make QB64 executable: `chmod +x qb64`

**Problem**: "Permission denied" on Linux/macOS
- **Solution**: Make QB64 executable: `chmod +x /path/to/qb64`

### Internal Transpiler Issues

**Problem**: Variable "not defined" errors
- **Solution**: Declare variables with `DIM` before use

**Problem**: File I/O not working
- **Solution**: Web runtime has 10MB storage limit. Check browser console for errors.

### Known Limitations

**Web Runtime**:
- Direct memory access (`PEEK`, `POKE`, `VARPTR`) returns stub values
- Binary file I/O is limited (use text mode)
- Some QB64-specific features may have reduced functionality
- Maximum 10MB for Virtual File System

**QB64 Native**:
- Requires QB64 installation and setup
- Platform-specific compilation (Windows .exe, Linux ELF, macOS app)

---

## 📊 Performance Tips

1. **Use `_LIMIT`**: Cap your frame rate to prevent CPU overuse
   ```basic
   DO
       _LIMIT 60  ' 60 FPS
       ' Your game logic here
   LOOP
   ```

2. **Minimize Redraws**: Only redraw changed areas
   ```basic
   ' Bad: Redraws everything every frame
   CLS
   PRINT "Score: "; score
   
   ' Good: Only update when needed
   IF score <> oldScore THEN
       LOCATE 1, 1: PRINT "Score: "; score
       oldScore = score
   END IF
   ```

3. **Use Integer Math**: Faster than floating-point
   ```basic
   ' Slower
   x# = x# + 0.5
   
   ' Faster
   x% = x% + 1
   ```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License © 2025 Thirawat Sinlapasomsak

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/thirawat27">Thirawat27</a></p>
  <p>
    <a href="https://github.com/thirawat27/QBasic-Nexus">GitHub</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Report Bug</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Request Feature</a>
  </p>
  <p>
    <sub>If you find this extension helpful, please consider giving it a ⭐ on GitHub!</sub>
  </p>
</div>
