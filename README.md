<div align="center">
  <img src="./assets/QBasicNexus.png" alt="QBasicNexus Icon" width="220" height="220" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
  <p>
    <strong>The Most Advanced QBasic, QB64 & QBNex Development Environment Ever Built for VS Code 🚀</strong><br>
    <em>Build, check and debug with the real compilers, get live diagnostics as you type, and watch your programs glow in a built-in Retro CRT powered by the QBNex VM.</em>
  </p>
  <p>
    <a href="#️-prerequisites">Prerequisites</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#️-configuration-guide">Configuration</a> •
    <a href="#-unrivaled-features">Features</a> •
    <a href="#-troubleshooting">Troubleshooting</a>
  </p>
  <p>
     <img src="https://img.shields.io/open-vsx/v/thirawat27/qbasic-nexus" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-orange.svg" alt="License" />
    
  </p>
</div>

<br>

**QBasic Nexus** transforms VS Code into an immensely powerful retro-coding station. It builds, runs and checks your programs with the real compilers - **QBNex** and **QB64 / QB64-PE** - so the editor reports exactly what the compiler reports. Errors land in the Problems view at the right line (even inside `$INCLUDE` files), QBNex adds live diagnostics as you type, a real debugger and the Retro CRT, and everything works on Windows, macOS, and Linux. Whether you're a veteran developer reviving classic code or a newcomer learning the roots of programming, QBasic Nexus provides an unmatched, modern experience for **QBasic**, **QB64** and **QBNex**.

---

## 📖 Table of Contents

- [📖 Table of Contents](#-table-of-contents)
- [⚙️ Prerequisites](#️-prerequisites)
  - [Option 1 - QBNex (Recommended)](#option-1---qbnex-recommended)
  - [Option 2 - QB64 / QB64-PE](#option-2---qb64--qb64-pe)
- [🚀 Getting Started](#-getting-started)
  - [Step 1 - Install a Compiler](#step-1---install-a-compiler)
  - [Step 2 - Install QBasic Nexus Extension](#step-2---install-qbasic-nexus-extension)
  - [Step 3 - Configure Compiler Path](#step-3---configure-compiler-path)
  - [Step 4 - Start Coding](#step-4---start-coding)
- [🔁 Migrating from Earlier Versions](#-migrating-from-earlier-versions)
- [🛠️ Configuration Guide](#️-configuration-guide)
  - [Compiler Settings](#compiler-settings)
  - [Language Server \& Debugger Settings](#language-server--debugger-settings)
  - [Editor Settings](#editor-settings)
  - [Line Number Settings](#line-number-settings)
- [📂 Supported File Types \& Icons](#-supported-file-types--icons)
- [✨ Unrivaled Features](#-unrivaled-features)
  - [⚡ Real-Compiler Build Pipeline](#-real-compiler-build-pipeline)
  - [🐞 Debugging with qb-dap](#-debugging-with-qb-dap)
  - [📺 Retro CRT on the QBNex VM](#-retro-crt-on-the-qbnex-vm)
  - [📊 Professional IDE Tools](#-professional-ide-tools)
  - [🔧 Advanced Code Tools](#-advanced-code-tools)
- [📦 Available Commands](#-available-commands)
- [🎬 Retro CRT Capabilities](#-retro-crt-capabilities)
- [🧩 Snippets Reference](#-snippets-reference)
  - [Reference Snippets](#reference-snippets)
  - [Structure Snippets](#structure-snippets)
  - [Loop Snippets](#loop-snippets)
  - [Graphics Snippets](#graphics-snippets)
  - [Boilerplate Snippets](#boilerplate-snippets)
  - [How to Use Snippets](#how-to-use-snippets)
- [🎮 The Interactive Curriculum](#-the-interactive-curriculum)
- [🔥 Introducing QBNex Compiler](#-introducing-qbnex-compiler)
  - [Installation](#installation)
  - [How QBNex Works](#how-qbnex-works)
  - [Compiler Flags](#compiler-flags)
  - [Standard Library Imports](#standard-library-imports)
  - [Compatibility](#compatibility)
  - [Troubleshooting QBNex](#troubleshooting-qbnex)
  - [Why Choose QBNex?](#why-choose-qbnex)
- [🆘 Troubleshooting](#-troubleshooting)
  - [Installation Issues](#installation-issues)
  - [Compilation Issues](#compilation-issues)
  - [Runtime Issues](#runtime-issues)
  - [Common Runtime Errors](#common-runtime-errors)
  - [Performance Issues](#performance-issues)
  - [Platform-Specific Issues](#platform-specific-issues)
  - [Getting More Help](#getting-more-help)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ⚙️ Prerequisites

QBasic Nexus builds, runs and checks your programs with a real compiler - it never interprets BASIC itself. You need **at least one** of the two compilers below. With both installed, the default `Auto` mode uses QBNex.

| What you get                                         | QBNex | QB64 / QB64-PE |
| ---------------------------------------------------- | --------- | -------------- |
| Compile, Compile & Run, Check for Errors             | ✅        | ✅             |
| Errors and warnings in the Problems view             | ✅        | ✅             |
| Check on save                                        | ✅        | ✅             |
| IntelliSense, hover, outline, rename, snippets       | ✅        | ✅             |
| Live diagnostics as you type (qb-lsp)                | ✅        | -              |
| Debugging with breakpoints (qb-dap)                  | ✅        | -              |
| `qb-fmt` formatter                                   | ✅        | -              |
| Retro CRT and the Interactive Tutorial               | ✅        | -              |

### Option 1 - QBNex (Recommended)

**Download QBNex** - [QBNex Releases on GitHub](https://github.com/thirawat27/QBNex/releases)

QBNex is a modern QBasic/QuickBASIC compiler that also understands the QB64 dialect. It translates BASIC into QIR, a text intermediate language, and packages it with a Rust runner into a standalone executable. A release or the installer needs no C/C++ toolchain and no setup script.

**Key Characteristics**

- **File Size** - Every program is the runner (about 13 MB, with graphics, sound, network and the JIT) plus its QIR
- **Build Speed** - A hello world compiles in about half a second
- **Compatibility** - QBasic, QuickBASIC 4.5 and the QB64 dialect, plus QBNex extensions such as `_IIF`, `TRY`/`CATCH`, `FOR EACH` and `ENUM`
- **Platform** - Windows x64, Linux and macOS
- **Extra Tools** - `qb-lsp` (language server), `qb-dap` (debugger), `qb-fmt` (formatter) and `qb-web` (the QBNex VM built to WebAssembly, bundled with this extension for the Retro CRT)

**Best Use Cases**

- Learning QBasic programming with live diagnostics and the Interactive Tutorial
- Debugging with breakpoints and variables
- Creating games and utilities
- Cross-platform development without a C/C++ toolchain
- Demonstrations in the Retro CRT

### Option 2 - QB64 / QB64-PE

**Requires QB64 Installation**

Choose QB64 when you need the reference QB64 compiler and its libraries. Builds, checks and Problems-view errors work just as with QBNex; live diagnostics, the debugger, `qb-fmt` and the Retro CRT need QBNex.

**Download QB64**

- Phoenix Edition (Recommended) - [qb64phoenix.com](https://qb64phoenix.com/)
- Older QB64 builds are detected too

**Platform-Specific Requirements**

**Windows**

- Simply download and extract QB64 to any folder
- No additional setup required

**macOS**

- Install Xcode Command Line Tools first - `xcode-select --install`
- After extracting QB64, you MUST run the setup script (see Getting Started below)

**Linux**

- Install build tools - `sudo apt-get install build-essential`
- After extracting QB64, you MUST run the setup script (see Getting Started below)

---

## 🚀 Getting Started

Follow these steps to get QBasic Nexus up and running.

### Step 1 - Install a Compiler

Install QBNex, QB64-PE, or both (see [Prerequisites](#️-prerequisites) for what each one adds).

**Option A - Install QBNex (Recommended)**

1. Download the one-file installer for your system from [QBNex Releases](https://github.com/thirawat27/QBNex/releases) - `qbnex_<tag>_win-x64-setup.exe`, `qbnex_<tag>_lnx-setup` or `qbnex_<tag>_osx-setup`
2. Run it. It installs for the current user, without administrator rights
   - Windows - into `%LOCALAPPDATA%\Programs\QBNex`, added to your `PATH`
   - Linux/macOS - into `~/.local/share/qbnex`, with `qb` and `qbnex` linked in `~/.local/bin`
3. Open a new terminal and check the version
   ```bash
   qb --version
   ```
   You should see `QBNex Compiler` followed by its version

No setup script and no C/C++ compiler are needed. QBasic Nexus finds QBNex in these folders automatically, and finds `qb-lsp`, `qb-dap` and `qb-fmt` next to the compiler. More details (archives, installer options) are in [Introducing QBNex Compiler](#-introducing-qbnex-compiler).

**Option B - Install QB64 / QB64-PE**

**Why install QB64?**

- Compile to true native executables with full system access
- 100% compatibility with legacy QBasic/QuickBASIC code
- Access to QB64-specific extensions and libraries

**Installation Process**

**1.1 Download QB64**

Visit [qb64phoenix.com](https://qb64phoenix.com/) and download QB64 Phoenix Edition for your operating system.

**1.2 Extract QB64**

Extract the downloaded archive to a permanent location on your system. Choose a path without spaces for best compatibility.

**Recommended locations**

- Windows - `C:\QB64\` or `C:\Program Files\QB64\`
- macOS - `/Applications/QB64/` or `~/QB64/`
- Linux - `~/qb64/` or `/opt/qb64/`

**1.3 Run Setup Script (macOS and Linux ONLY)**

This step is **absolutely critical** for macOS and Linux users. The setup script configures the compiler and builds necessary components.

**What the Setup Script Does**

- Compiles the QB64 compiler itself from C++ source code
- Builds platform-specific libraries and dependencies
- Configures paths and environment variables
- Creates necessary helper executables
- Sets up the internal C++ compiler integration

**Expected Duration**

- macOS - 3-5 minutes (depending on Mac model)
- Linux - 2-4 minutes (depending on CPU speed)
- First-time setup downloads and compiles multiple components

**On macOS**

1. Open Terminal (Applications > Utilities > Terminal)
2. Navigate to your QB64 directory
   ```bash
   cd /Applications/QB64
   ```
3. Run the setup script
   ```bash
   sh ./setup_osx.command
   ```
4. Wait for the setup to complete

**Success Indicators (macOS)**
You'll see output similar to

```
Compiling QB64...
Building internal libraries...
Setup complete!
```

**On Linux**

1. Open Terminal
2. Navigate to your QB64 directory
   ```bash
   cd ~/qb64
   ```
3. Run the setup script
   ```bash
   sh ./setup_lnx.sh
   ```
4. Wait for the setup to complete

**Success Indicators (Linux)**
You'll see output similar to

```
Bootstrapping QB64...
Compiling...
Done!
```

**Common Setup Errors and Solutions**

**Error - "Permission denied"**

- Solution - Run `chmod +x setup_osx.command` (macOS) or `chmod +x setup_lnx.sh` (Linux) first

**Error - "Command not found: gcc" or "Command not found: g++"**

- macOS - Install Xcode Command Line Tools - `xcode-select --install`
- Linux - Install build-essential - `sudo apt-get install build-essential`

**Error - "Cannot find X11 libraries" (Linux)**

- Solution - Install X11 development files - `sudo apt-get install libx11-dev libxrandr-dev`

**Error - Setup hangs or freezes**

- Solution - Press Ctrl+C, delete the QB64 folder, re-extract, and try again

**Important Notes**

- Without running the setup script, QB64 will NOT work
- You only need to run the setup script once after installation
- If you move QB64 to a different location, run the setup script again
- The setup script must complete successfully (check for "Done" or "Complete" message)
- If setup fails, check the error messages carefully and install missing dependencies

### Step 2 - Install QBasic Nexus Extension

**2.1 Open VS Code Extensions**

- Click the Extensions icon in the sidebar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`)

**2.2 Search and Install**

- Search for "QBasic Nexus"
- Click the "Install" button
- Wait for installation to complete

**2.3 Reload VS Code (if prompted)**

- Click "Reload" if VS Code asks you to restart

### Step 3 - Configure Compiler Path

**Understanding Auto-Detection**

When you open a QBasic file (`.bas`, `.bi`, `.bm`, or `.inc`), QBasic Nexus looks for QBNex and QB64 automatically. Most users never need to set a path.

**How Auto-Detection Works**

QBNex is searched in this order

1. The `qbasic-nexus.qbnexPath` setting
2. The environment variables `QBNEX_HOME` and `QBNEX_PATH`
3. Your `PATH` (`qb` / `qbnex`)
4. Common install folders - `%LOCALAPPDATA%\Programs\QBNex` (the QBNex setup folder), `C:\QBNex`, `~/.local/bin`, `~/.local/share/qbnex`, `/opt/qbnex`, `/usr/local/bin`, `/opt/homebrew/bin`

QB64 is searched in this order

1. The `qbasic-nexus.compilerPath` setting
2. Environment hints such as `QB64_HOME`, `QB64_PATH`, `QB64PE_HOME`, and `QB64PE_PATH`
3. Common install folders on Windows, macOS, and Linux (including QB64 Phoenix Edition layouts)
4. Your `PATH`

**Detection Process**

- A QBNex candidate is verified by running `qb --version`, which reports `QBNex Compiler` followed by its version; older QBNex releases still work, with a warning
- A QB64 candidate must exist, be executable, and look like a real QB64/QB64PE binary
- In `Auto` mode, QBNex is used when it is found, otherwise QB64

**If Multiple Installations Exist**

- Auto-detection will use the first one found in the search order
- You can manually override by setting the path in settings
- A saved path is used in all future sessions

**3.1 If Auto-Detection Succeeds**

The first time you build with an auto-detected compiler, you'll see a notification like

```
"Using QBNex found at [path]. Save this path?"
```

- Click **"Save Path"** - The path is saved to your user settings
- Click **"Not Now"** - The detected compiler is still used, and you won't be asked again about that path in this session

**3.2 If Auto-Detection Fails (Manual Configuration)**

If no compiler is found, the toolchain item in the Status Bar shows **No compiler** and the Run button becomes **Find Compiler**.

**Method A - Via Status Bar (Easiest)**

1. Open any QBasic file (`.bas`)
2. Look at the bottom Status Bar
3. Click **No compiler** (or **Find Compiler**)
4. **QBasic: Configure System ⚙️** opens - pick the QBNex or QB64 path entry
5. Choose **Auto-Detect Now**, **Choose Executable...**, or **Custom Path...**

**Method B - Via Command Palette**

- Run **QBasic: Configure QBNex Path 🛤️** or **QBasic: Configure QB64 Path 🛤️**

**Method C - Via Settings Menu**

1. Open VS Code Settings
   - Windows/Linux - Press `Ctrl+,`
   - macOS - Press `Cmd+,`
2. In the search box at the top, type **"QBasic Nexus"**
3. Find **"Qbnex Path"** (`qbasic-nexus.qbnexPath`) or **"Compiler Path"** (`qbasic-nexus.compilerPath`, used for QB64)
4. Click "Edit in settings.json" or enter the path directly

**3.3 Enter the Correct Path**

You need to provide the **full, absolute path** to the compiler executable file (not just the folder). `~/` home-relative paths are accepted too.

**Path Examples by Operating System**

**Windows**

```
C:\Users\yourname\AppData\Local\Programs\QBNex\qb.exe
```

or

```
C:\QB64\qb64pe.exe
```

**macOS**

```
/Users/yourname/.local/bin/qb
```

or

```
/Applications/QB64/qb64pe
```

**Linux**

```
/home/yourname/.local/bin/qb
```

or

```
/opt/qb64/qb64pe
```

**Important Path Rules**

- Must be the full path to the executable file itself
- Must include the filename (`qb.exe`, `qb64pe.exe` or `qb64.exe` on Windows; `qb`, `qb64pe` or `qb64` on macOS/Linux)
- Use forward slashes `/` or double backslashes `\\` on Windows
- Avoid paths with spaces if possible

**3.4 Verify Configuration**

After setting the path

1. Open or create a `.bas` file
2. Check the Status Bar at the bottom
3. You should see the toolchain item (for example **QBNex**) and a **Run** button instead of the warning
4. Run **QBasic: Show Toolchain Info 🧰** to see the mode, the active compiler, both compiler paths, and whether the language server is running
5. The extension is now ready to use!

**3.5 Switching Between Compiler Modes**

You can switch compilers anytime

1. Run **QBasic: Select Compiler Mode 🧭**, or open Settings (`Ctrl+,` or `Cmd+,`) and search for **"QBasic Nexus Compiler Mode"**
2. Choose your preferred mode
   - **"Auto"** (default) - QBNex when it is installed, otherwise QB64
   - **"QBNex"** - Always build and check with QBNex
   - **"QB64"** - Always build and check with QB64 / QB64-PE

**Important Notes**

- Mode switching is instant and doesn't affect existing files
- Both compilers write to the same output path, so the latest build replaces the previous executable
- The Run button tooltip and the toolchain item show which compiler is active
- F5 always uses the currently selected mode
- Live diagnostics, debugging, `qb-fmt` and the Retro CRT need QBNex installed, whatever the mode

### Step 4 - Start Coding

**4.1 Create Your First QBasic File**

1. Create a new file - `hello.bas`
2. Write some QBasic code
   ```basic
   SCREEN 13
   COLOR 14
   PRINT "Welcome to the Nexus!"
   CIRCLE (160, 100), 50, 4
   PLAY "T120 O4 L4 C D E F G A B >C"
   ```

**4.2 Run Your Code**

You have multiple options to run your code

**Option 1 - Press F5 (Recommended)**

- Simply press `F5` on your keyboard
- Your code is compiled with the active compiler and the program runs in the integrated terminal

**Option 2 - Use the Status Bar**

- Click the **Run** button in the bottom Status Bar (its tooltip shows which compiler is used)
- Quick and convenient for mouse users

**Option 3 - Use Command Palette**

- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- Type "QBasic: Compile & Run"
- Press Enter

**Option 4 - Run in Retro CRT (Shift+F5)**

- Press `Shift+F5`, or run "QBasic: Run in Retro CRT" from the Command Palette
- See your code running in a beautiful retro terminal inside VS Code! (needs QBNex)

**4.3 Understanding the Output**

Each way of running produces different results. Here's a detailed comparison to help you choose.

**Comparison Table**

| Feature             | QBNex Build                          | QB64 Build                  | Retro CRT                                |
| ------------------- | ------------------------------------ | --------------------------- | ---------------------------------------- |
| **Output Type**     | Standalone executable (runner + QIR) | Native executable (via C++) | Runs in a VS Code panel                  |
| **File Size**       | About 13 MB                          | 2-5 MB                      | No file created                          |
| **Pipeline**        | BASIC → QIR → executable             | BASIC → C++ → native        | BASIC → QIR, run on qb-web (WebAssembly) |
| **System Access**   | Full (files, network, SHELL)         | Full (files, hardware)      | Sandboxed (no files, SHELL, TCP/HTTP)    |
| **Graphics**        | All SCREEN modes, 32-bit images      | All SCREEN modes            | SCREEN 0, SCREEN 13 and other modes      |
| **Audio**           | SOUND, PLAY, BEEP, `_SND*`           | Full QB64 audio             | SOUND, BEEP, PLAY, `_SND*` (WebAudio)    |
| **Debugger**        | qb-dap                               | -                           | -                                        |
| **Setup Required**  | QBNex                                | QB64 installation           | QBNex                                    |
| **Best For**        | Everyday builds & debugging          | QB64 libraries & projects   | Demos, lessons & learning                |

**When using QBNex**

- The executable is written beside your `.bas` file, or to `outputDirectory`
- Output files - `yourfile.exe` (Windows) or `yourfile` (macOS/Linux)
- The program runs in the integrated terminal; graphics programs open their own window
- Full access to files, network, `SHELL` and sound
- Errors and warnings appear in the Problems view at the right file, line and column
- Executables are about the same size whatever the program does, because each one carries the runner

**When using QB64**

- A native executable will be created beside your `.bas` file, or in `outputDirectory`
- The program runs in the integrated terminal, just like a QBNex build
- Output files - `yourfile.exe` (Windows) or `yourfile` (macOS/Linux)
- Full access to system resources (files, network, hardware)
- Supports all QB64 features and libraries
- Platform-specific - compile on Windows for Windows, macOS for macOS, etc.

**When using the Retro CRT**

- QBNex compiles the program to QIR (`qb --emit-ir`) and it runs on qb-web in a VS Code panel
- Beautiful retro aesthetic with scanlines and a neon monitor frame, in editor column 2
- No executable file is created
- `INPUT` and `LINE INPUT` read the answers set with the **⌨ Set INPUT Answers** button in the panel's title bar; **↻ Run Again** and **■ Stop Program** sit next to it
- Files, `SHELL` and TCP/HTTP are not available - build natively for those
- Great for learning, experimenting and the Interactive Tutorial

**Use Case Recommendations**

**Choose QBNex when**

- Learning QBasic programming with live diagnostics
- Debugging with breakpoints and variables
- Building games and utilities without a C/C++ toolchain
- Using QBNex extensions such as `TRY`/`CATCH` or `'$IMPORT:` modules
- Want to use the Retro CRT and the Interactive Tutorial

**Choose QB64 when**

- Your project depends on QB64-specific libraries or behaviour
- Need the smallest file size
- Distributing QB64 builds to end users

**Choose the Retro CRT when**

- Testing code snippets quickly
- Demonstrating code to others
- Learning with instant feedback
- Don't need to create executables
- Want the nostalgic CRT aesthetic
- Teaching or presenting

---

## 🔁 Migrating from Earlier Versions

QBasic Nexus no longer has the internal JavaScript compiler: every build, run and check now goes through QBNex or QB64. Your settings are converted automatically the first time the extension starts.

| Old setting or value                                       | Now                           |
| ---------------------------------------------------------- | ----------------------------- |
| `compilerMode`: `"QB64 (Recommended)"`                     | `compilerMode`: `"QB64"`      |
| `compilerMode`: `"Qbasic Nexus"` or `"Qbasic Nexus + WASM"` | `compilerMode`: `"QBNex"`     |
| `internalOutputDir`                                        | Moved to `outputDirectory`    |
| `internalTargets`, `internalWasmAccelerator`               | Removed                       |
| `compileWorkerMaxQueueSize`, `compileWorkerRequestTimeoutMs` | Removed                     |
| `lintWorkerMaxQueueSize`, `lintWorkerRequestTimeoutMs`, `lintDelay` | Removed              |

**What Else Changed**

- **No more internal builds** - The Node.js executables packaged with `@yao-pkg/pkg` and the multi-target builds (`win-x64`, `linux-x64`, `macos-arm64` from one machine) are gone. Build on each system with QBNex or QB64 instead
- **Real diagnostics** - The real-time linter built on the internal parser is replaced by check on save with the real compiler and live diagnostics from qb-lsp
- **New Retro CRT** - The JavaScript web runtime and its virtual file system are replaced by qb-web, the QBNex VM built to WebAssembly
- **Removed commands** - Internal Build Quick Actions, Select Internal Build Targets, Select Internal WASM Accelerator, Tune Compile Worker Resilience, Tune Lint Worker Resilience and Set Lint Delay
- **Renamed command** - Select Internal Output Folder is now **QBasic: Select Output Folder 📂**
- **New** - QBNex support, Check for Errors, debugging with qb-dap, the `qb-fmt` formatter, Show Toolchain Info and Restart Language Server

If you used the internal compiler because QB64 was not installed, install QBNex: it needs no setup script and no C/C++ compiler.

---

## 🛠️ Configuration Guide

Fine-tune QBasic Nexus to match your workflow. Access settings via `File > Preferences > Settings` and search for **"QBasic Nexus"**.

For faster setup, run **QBasic: Configure System ⚙️** from the Command Palette or click the toolchain item in the Status Bar while a QBasic file is open. This system picker centralizes compiler mode, QBNex and QB64 paths, diagnostics flags, extra compiler args, output folder, formatter, check on save, auto-format, and line-number defaults.

### Compiler Settings

These settings control how your QBasic code is compiled and executed.

**Compiler Mode**

- **Setting Name** - `qbasic-nexus.compilerMode`
- **Type** - Dropdown selection
- **Default** - `Auto`
- **Options**
  - `Auto` - QBNex when it is installed, otherwise QB64 / QB64-PE
  - `QBNex` - Build and check with QBNex (`qb` / `qbnex`)
  - `QB64` - Build and check with QB64 / QB64-PE

Values from earlier versions (`QB64 (Recommended)`, `Qbasic Nexus`, `Qbasic Nexus + WASM`) are converted automatically - see [Migrating from Earlier Versions](#-migrating-from-earlier-versions).

**When to use QBNex mode**

- Everyday builds with live diagnostics, debugging and the Retro CRT
- Fast builds without a C/C++ toolchain
- Programs that use QBNex extensions or `'$IMPORT:` modules

**When to use QB64 mode**

- Programs that need QB64-specific libraries
- Legacy code that must build exactly like it does in QB64
- Maximum compatibility with existing QB64 projects

---

**QBNex Path**

- **Setting Name** - `qbasic-nexus.qbnexPath`
- **Type** - String (file path)
- **Default** - `null` (auto-detect)
- **Used By** - QBNex builds and checks, the Retro CRT, the tutorial, and as the folder where `qb-lsp`, `qb-dap` and `qb-fmt` are looked for

**What to enter**

- The full path to `qb` / `qb.exe` (or `qbnex`)
- Leave it empty to auto-detect

**Examples**

```
Windows  C:\Users\yourname\AppData\Local\Programs\QBNex\qb.exe
macOS    /Users/yourname/.local/bin/qb
Linux    /home/yourname/.local/bin/qb
```

---

**Compiler Path (QB64)**

- **Setting Name** - `qbasic-nexus.compilerPath`
- **Type** - String (file path)
- **Default** - `null` (auto-detect)
- **Required For** - QB64 mode only

**What to enter**

- The full, absolute path to your QB64 executable
- Must point to the executable file itself, not just the folder

**Examples**

```
Windows  C:\QB64\qb64pe.exe
macOS    /Applications/QB64/qb64pe
Linux    /home/yourname/qb64/qb64pe
```

**How to find your QB64 path**

1. Locate where you extracted QB64
2. Find the executable file (`qb64pe.exe` / `qb64.exe` on Windows, `qb64pe` / `qb64` on macOS/Linux)
3. Copy the full path including the filename
4. Paste into this setting

**Troubleshooting**

- If you see "No compiler was found", double-check this path
- Make sure the file exists and is executable
- On macOS/Linux, ensure you ran the setup script first

---

**Diagnostics Flags**

| Setting                          | Default | Flag      | What it does                                   |
| -------------------------------- | ------- | --------- | ---------------------------------------------- |
| `qbasic-nexus.showWarnings`      | `true`  | `-w`      | Report compiler warnings                       |
| `qbasic-nexus.warningsAsErrors`  | `false` | `-Werror` | Treat warnings as errors (QBNex only)          |
| `qbasic-nexus.optionExplicit`    | `false` | `-e`      | Compile as if `OPTION _EXPLICIT` were set      |

Toggle all three from the Command Palette via **QBasic: Configure Diagnostics Flags 🩺**.

---

**Compiler Args**

- **Setting Name** - `qbasic-nexus.compilerArgs`
- **Type** - String
- **Default** - `""` (empty)
- **Used By** - QBNex and QB64

**What this does**

- Appends extra command-line arguments after the ones QBasic Nexus adds
- Useful for advanced users who need specific compiler flags
- Use the Diagnostics Flags above for `-w`, `-Werror` and `-e` instead of typing them here

**Common arguments**

- `-k` - Compact diagnostics (QBNex)
- `-g` - Include debug information (QB64-PE)

**Example**

```
-k
```

**The command lines QBasic Nexus runs**

```
QBNex  qb <file> -o <exe> -q -m [-w] [-Werror] [-e] [compilerArgs]
QB64   qb64pe -x -c <file> -o <exe> [-w] [-e] [compilerArgs]
```

**Note** - Most users can leave this empty. You can also change it via **QBasic: Configure Extra Compiler Args 🧪**.

---

**Output Directory**

- **Setting Name** - `qbasic-nexus.outputDirectory`
- **Type** - String
- **Default** - `""` (writes beside the source file)
- **Used By** - QBNex and QB64 builds

**What this does**

- Sends all built executables to a dedicated folder
- Relative paths resolve from the workspace folder
- Absolute paths and `~/...` home-relative paths are also accepted
- You can also change this from the Command Palette via **QBasic: Select Output Folder 📂**

**Examples**

```
bin
build/artifacts
C:\QBasicNexus\out
```

---

**External Build Timeout**

- **Setting Name** - `qbasic-nexus.externalBuildTimeoutMs`
- **Type** - Number (milliseconds)
- **Default** - `300000` (5 minutes)
- **Minimum** - `0` (`0` disables the timeout)

A compiler run that does not finish in time is stopped, so Compile and Run never stay stuck. Raise it for very large programs on slow machines.

### Language Server & Debugger Settings

These settings control the QBNex tools that run beside the editor.

**Language Server**

- **Setting Names** - `qbasic-nexus.languageServer.enabled` (default `true`) and `qbasic-nexus.languageServer.path` (default `""`)

**What this does**

- Starts **qb-lsp**, the QBNex language server, for live diagnostics as you type
- With an empty path, qb-lsp is looked for next to the QBNex compiler, then on your `PATH`
- It is not started when the official QBNex VS Code extension (`qbnex.qbnex`) is installed, because that extension runs qb-lsp itself
- It is not started in untrusted workspaces
- After changing these settings, run **QBasic: Restart Language Server 🔁**

The extension's own completion, hover, symbols, navigation, rename, semantic tokens, folding and code actions work without qb-lsp, and with QB64 too.

**Debug Adapter Path**

- **Setting Name** - `qbasic-nexus.debugAdapterPath`
- **Type** - String
- **Default** - `""` (next to the QBNex compiler, else `qb-dap` on `PATH`)

Path to **qb-dap**, the QBNex debug adapter. See [Debugging with qb-dap](#-debugging-with-qb-dap).

**Untrusted Workspaces**

In a workspace you have not trusted, the compiler, language server, debugger and formatter paths and `compilerArgs` are taken from your user settings only, never from the workspace, and qb-lsp does not start.

### Editor Settings

These settings control the editing experience and code checking.

**Check On Save (Enable Linting)**

- **Setting Name** - `qbasic-nexus.enableLinting`
- **Type** - Boolean (checkbox)
- **Default** - `true` (enabled)

**What this does**

- Checks each saved file with the active compiler
  - QBNex - `qb file --emit-ir` (no native build, about 0.25 s)
  - QB64 - `-x -z` (generates the C++ without compiling it)
- Highlights errors and warnings with squiggly underlines and lists them in the Problems panel, at the right file, line and column - including errors inside `$INCLUDE` files
- While qb-lsp runs, QBNex diagnostics come from it as you type
- Run the same check at any time with **QBasic: Check for Errors 🩺**
- Toggle it from the Command Palette via **QBasic: Configure Check On Save 🩺**

**Benefits of enabling**

- Catch syntax errors immediately before running code
- See exactly where and what the problem is - the messages come straight from the compiler
- Learn proper QBasic syntax through helpful error messages

**When to disable**

- Working with very large programs where checking on every save is too slow (QB64's C++ generation in particular)
- Intentionally writing incomplete code snippets

---

**Auto Format On Save**

- **Setting Name** - `qbasic-nexus.autoFormatOnSave`
- **Type** - Boolean (checkbox)
- **Default** - `true` (enabled)

**What this does**

- Automatically formats your code when you save the file (`Ctrl+S` / `Cmd+S`)
- Mimics the classic QBasic IDE behavior
- Skipped when VS Code's `editor.formatOnSave` is on, which already formats the file

**Formatting actions performed**

- **Keyword capitalization** - Converts keywords to proper case
  - `print` → `PRINT`
  - `if...then` → `IF...THEN`
  - `sub` → `SUB`
- **Consistent indentation** - Standardizes spacing and indentation
- **Whitespace cleanup** - Removes trailing spaces

**Benefits**

- Code looks professional and consistent
- Easier to read and maintain
- Matches the nostalgic QBasic IDE experience
- No need to manually capitalize keywords

**When to disable**

- You prefer lowercase keywords
- Working with auto-generated code that shouldn't be modified
- Collaborating on code with specific style requirements

---

**Formatter**

- **Setting Name** - `qbasic-nexus.formatter`
- **Type** - Dropdown selection
- **Default** - `builtin`
- **Options**
  - `builtin` - The extension's own formatter
  - `qb-fmt` - The QBNex formatter; if qb-fmt fails, the built-in formatter is used instead
- **Related** - `qbasic-nexus.formatterPath` - Path of `qb-fmt` (empty: next to the QBNex compiler, else `qb-fmt` on `PATH`)

Change it from the Command Palette via **QBasic: Select Formatter 🖌️**.

### Line Number Settings

These settings control the line numbering tools for legacy QBasic code.

**Line Number Start**

- **Setting Name** - `qbasic-nexus.lineNumberStart`
- **Type** - Number
- **Default** - `1`
- **Minimum** - `1`

**What this does**

- Sets the starting line number when using the "Renumber Lines" command
- Useful when converting old QBasic code that used line numbers

**Example**

- If set to `10`, renumbering will start at line 10, then 20, 30, etc. (depending on step)
- If set to `100`, renumbering will start at line 100, then 200, 300, etc.

**Common values**

- `1` - Modern style, sequential numbering
- `10` - Classic QBasic style with room for insertions
- `100` - Old BASIC style with large gaps

---

**Line Number Step**

- **Setting Name** - `qbasic-nexus.lineNumberStep`
- **Type** - Number
- **Default** - `1`
- **Minimum** - `1`

**What this does**

- Sets the increment between line numbers when using "Renumber Lines"
- Determines the spacing between consecutive line numbers

**Example**

- Step of `1` - Lines numbered 1, 2, 3, 4, 5...
- Step of `10` - Lines numbered 10, 20, 30, 40, 50...
- Step of `100` - Lines numbered 100, 200, 300, 400, 500...

**Why use larger steps?**

- Leaves room to insert new lines between existing ones
- Traditional BASIC programming practice
- Easier to reference specific sections (e.g., "the 1000s section")

**Recommended combinations**

```
Modern style          Start 1,    Step 1
Classic QBasic        Start 10,   Step 10
Old-school BASIC      Start 100,  Step 100
Structured sections   Start 1000, Step 1000
```

---

**Quick Settings Access**

**Via QBasic Quick Actions**

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Run **QBasic Configure System ⚙️**
3. Pick the setting you want to adjust

**Via Command Palette**

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Preferences Open Settings"
3. Search for "QBasic Nexus"

**Via Settings UI**

1. Click File > Preferences > Settings (or Code > Preferences > Settings on macOS)
2. Search for "QBasic Nexus" in the search box
3. All QBasic Nexus settings will appear

**Via settings.json (Advanced)**

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Preferences Open User Settings (JSON)"
3. Add settings manually

```json
{
  "qbasic-nexus.compilerMode": "Auto",
  "qbasic-nexus.showWarnings": true,
  "qbasic-nexus.optionExplicit": false,
  "qbasic-nexus.outputDirectory": "bin",
  "qbasic-nexus.enableLinting": true,
  "qbasic-nexus.formatter": "qb-fmt",
  "qbasic-nexus.autoFormatOnSave": true,
  "qbasic-nexus.lineNumberStart": 10,
  "qbasic-nexus.lineNumberStep": 10
}
```

---

## 📂 Supported File Types & Icons

QBasic Nexus provides full language support, syntax highlighting, and dedicated icons for all standard QBasic/QB64 file types. Every extension is distinctively mapped to the unified QBasic Nexus icon for immediate visual recognition in both light and dark themes in the VS Code file explorer:

| Extension | Description | Icon |
|-----------|-------------|------|
| **`.bas`** | Main Source File | <img src="./assets/qb64.png" width="40" alt="QB64 Icon" /> |
| **`.bi`**  | Include Header File | <img src="./assets/qb64.png" width="40" alt="QB64 Icon" /> |
| **`.bm`**  | Module File | <img src="./assets/qb64.png" width="40" alt="QB64 Icon" /> |
| **`.inc`** | Include / Library File | <img src="./assets/qb64.png" width="40" alt="QB64 Icon" /> |

---

## ✨ Unrivaled Features

### ⚡ Real-Compiler Build Pipeline

QBasic Nexus doesn't guess what a compiler would say - every build, run and check goes through the real compiler, so the editor reports exactly what the compiler reports.

- **Two Real Compilers** - Build with **QBNex** (BASIC → QIR → standalone executable with a Rust runner) or **QB64 / QB64-PE** (BASIC → C++ → native). `Auto` mode picks QBNex when it is installed.
- **Errors Where They Belong** - Errors and warnings from either compiler appear in the Problems view at the right file, line and column, including errors inside `$INCLUDE` files. QBNex diagnostic blocks (`[!!] QBNex :: Fatal [E0000] ...` with `[@] file(line,col)`), gcc-style `file.bas:12: warning: ...` lines and QB64 `LINE n:` errors are all understood.
- **Check on Save** - Saving runs a fast check without a native build: `qb file --emit-ir` for QBNex (about 0.25 s), `-x -z` (C++ generation only) for QB64. Run it on demand with **QBasic: Check for Errors 🩺**.
- **Live Diagnostics as You Type** - With QBNex installed, **qb-lsp** checks your code while you type.
- **Diagnostics Flags** - Warnings (`-w`), warnings as errors (`-Werror`, QBNex) and `OPTION _EXPLICIT` (`-e`) are plain settings.
- **No Stuck Builds** - A compiler run that hangs is stopped after `externalBuildTimeoutMs` (5 minutes by default).
- **Cross-Platform** - Works the same on Windows, Linux and macOS.

**What Happens When You Press F5**

1. The file is saved
2. QBasic Nexus picks the compiler (compiler mode, saved path, or auto-detection)
3. It runs the build
   ```
   QBNex  qb <file> -o <exe> -q -m [-w] [-Werror] [-e] [compilerArgs]
   QB64   qb64pe -x -c <file> -o <exe> [-w] [-e] [compilerArgs]
   ```
4. Compiler messages go to the **QBasic Nexus** Output panel and the Problems view
5. If the build succeeds, the program starts in the integrated terminal

### 🐞 Debugging with qb-dap

With QBNex installed, you can debug programs with **qb-dap**, the QBNex debug adapter: breakpoints, stepping, the call stack and variables, right inside VS Code.

**How to Start**

1. Open the **Run and Debug** view (`Ctrl+Shift+D` / `Cmd+Shift+D`)
2. Create a `launch.json` and choose **QBasic Nexus (QBNex)**, or add the configuration below
3. Set breakpoints by clicking left of the line numbers
4. Start debugging from the Run and Debug view. While a debug session runs, `F5` belongs to the debugger (continue); outside one, `F5` is still **Compile & Run**

**launch.json Example**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "qbasic-nexus",
      "request": "launch",
      "name": "Debug QBasic program",
      "program": "${file}",
      "stopOnEntry": false
    }
  ]
}
```

**Launch Attributes**

| Attribute     | Description                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| `program`     | The `.bas` file to debug (required)                                              |
| `qir`         | Run this QIR file instead of compiling the program                               |
| `compiler`    | QBNex compiler used to produce QIR (default: the detected or configured QBNex)  |
| `cwd`         | Working directory of the program (default: the program's folder)                |
| `stopOnEntry` | Stop at the first statement                                                      |
| `input`       | File whose contents the program reads as standard input (`INPUT`, `LINE INPUT`) |

qb-dap is looked for next to the QBNex compiler, then on `PATH`; set `qbasic-nexus.debugAdapterPath` to use another one. QB64 has no debugger, so debugging always uses QBNex.

### 📺 Retro CRT on the QBNex VM

Press `Shift+F5` (**QBasic: Run in Retro CRT 📺**) to run your program in a VS Code panel designed to look and feel exactly like the 90s.

- **The Real VM** - QBNex compiles your program to QIR (`qb --emit-ir`) and it runs on **qb-web**, the QBNex VM built to WebAssembly - the same QIR that your QBNex executables run.
- **Retro CRT Aesthetic** - The panel ("QBasic CRT 📺 <file>", in editor column 2) is a neon monitor with scanlines and a vignette, as in earlier versions.
- **Same Screen as Before** - The neon monitor, scanlines, vignette and objective HUD are unchanged; nothing is drawn over the program. The controls live in the panel's title bar: **⌨ Set INPUT Answers**, **↻ Run Again** (compiles and runs again) and **■ Stop Program**. Runtime errors and the run time appear as VS Code notifications.
- **Objective HUD** - During the Interactive Tutorial, the **CURRENT OBJECTIVE** HUD (top right) shows the lesson objective and turns to **LESSON COMPLETE** when you pass.
- **Text and Graphics** - `PRINT`, `CLS`, `LOCATE`, `COLOR`, `SCREEN 0`, `SCREEN 13` and other graphics modes, with `_DISPLAY`, `_LIMIT` and `_DELAY`.
- **High-Fidelity Audio** - `SOUND`, `BEEP`, `PLAY` and `_SND*` through WebAudio.
- **Input and Console** - `INPUT` and `LINE INPUT` read the answers from **⌨ Set INPUT Answers**; console output (`$CONSOLE`) appears as text on the screen, as before.
- **Requires QBNex** - QB64-only setups cannot use the Retro CRT; they run programs natively with `F5`.

qb-web ships with the extension in `vendor/qb-web` under the GPL-3.0 license, separate from the extension's MIT license. See [Retro CRT Capabilities](#-retro-crt-capabilities) for the full list and the limits.

### 📊 Professional IDE Tools

Write code faster, with fewer bugs, using tooling typically reserved for modern languages like TypeScript or C#.

- **Workspace-Wide IntelliSense** - Smart auto-completion and "Go to Definition" (F12) works flawlessly for your custom `SUB`s, `FUNCTION`s, and `TYPE` structures—even those defined across `$INCLUDE` files.
- **Cross-File Symbol Renaming (F2)** - Need to rename a variable used 50 times? Do it instantly across the entire workspace (including all included files) safely and accurately.
- **Color Preview & Picker** - Native VS Code visual color picker for `_RGB32`, `_RGBA`, and `_RGB` allowing an immediate visual display of QBasic colors in your code.
- **Project TODOs View** - Automatically scans your workspace for `TODO:`, `FIXME:`, `BUG:`, and `NOTE:` tags, highlighting them securely in the editor and aggregating them in an interactive sidebar Explorer tree for instant tracking.
- **Live Diagnostics** - With QBNex, **qb-lsp** reports errors _as you type_. On save, the real compiler (QBNex or QB64) checks the file and puts its errors and warnings in the Problems view at the right line, even inside `$INCLUDE` files.
- **Semantic Token Highlighting** - Context-aware highlighting separates globals, locals, parameters, arrays, labels, and `TYPE` declarations so large QBasic files stay readable even when classic regex grammar coloring is not enough.
- **Advanced Preprocessor Support** - Automatic tracking and intelligent resolution for `$INCLUDE`, `$STATIC`, and `$DYNAMIC` directives. Included files are verified and integrated instantly for seamless cross-file completion and diagnostics.
- **At-a-glance Code Stats** - Live status bar counter showing your total Lines of Code, SUBs, and FUNCTIONs.
- **Signature Help** - Parameter hints for built-in functions, custom procedures, and common statement signatures such as `CIRCLE`, `PAINT`, `PLAY`, `DRAW`, `OPEN`, `LINE INPUT`, and `ON ERROR`.
- **Document Symbols** - Quick navigation through your code structure with the Outline view.
- **Code Folding** - Collapse and expand SUBs, FUNCTIONs, and control structures for better code organization.
- **Hover Information** - Rich inline reference for keywords, built-ins, and symbols, including generated syntax and examples for multi-word commands such as `LINE INPUT`, `ON ERROR`, `PRINT #`, plus advanced legacy/QB64 commands like `INTERRUPT`, `IOCTL`, `_MEMCOPY`, and `_SNDLEN`.
- **Find All References** - Locate all usages of variables, SUBs, and FUNCTIONs throughout your code.

### 🔧 Advanced Code Tools

Powerful utilities to manage and enhance your QBasic code.

- **Line Number Management** - Remove or renumber line numbers with customizable start and step values (perfect for legacy code migration).
- **ASCII & CP437 Character Chart Viewer** - Interactive full ASCII and CP437 reference table with decimal, hexadecimal, and character display. Built-in `CHR$()` insert workflow directly maps keys into your editor (Ctrl+Alt+A).
- **Code Statistics Analyzer** - Get instant breakdown of codebase structure, modules, LOC, and loops using `QBasic Show Code Statistics 📊` (Ctrl+Shift+I).
- **Auto-Format on Save** - Automatically capitalize keywords and standardize indentation (mimicking classic QBasic IDE behavior), with the built-in formatter or QBNex's `qb-fmt`.
- **Code Actions** - Quick fixes and refactoring suggestions directly in the editor.

---

## 📦 Available Commands

Trigger these via the VS Code Command Palette (`Ctrl+Shift+P`)

| Command                                      | Shortcut       | Description                                                            |
| -------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| **QBasic: Compile 🔨**                       | `Ctrl+Shift+B` | Compiles the current file without running it.                          |
| **QBasic: Compile & Run 🌀**                 | `F5`           | Compiles with the active compiler and runs the program.                |
| **QBasic: Check for Errors 🩺**              | -              | Checks the current file with the compiler, without a native build.     |
| **QBasic: Run in Retro CRT 📺**              | `Shift+F5`     | Runs the current file in the Retro CRT on the QBNex VM.                |
| **QBasic: Start Interactive Tutorial 🎮**    | -              | Opens the 150-lesson interactive tutorial.                             |
| **QBasic: Show Code Statistics 📊**          | `Ctrl+Shift+I` | Provides an instant breakdown of line counts, loops, and SUBs.         |
| **QBasic: Remove Line Numbers 🔢**           | `Ctrl+Alt+R`   | Removes all line numbers from the current file.                        |
| **QBasic: Renumber Lines 🔄**                | `Ctrl+Alt+N`   | Renumbers all lines with customizable start and step values.           |
| **QBasic: Show ASCII Chart 📋**              | `Ctrl+Alt+A`   | Opens an interactive ASCII reference table.                            |
| **QBasic: Insert CHR$() at Cursor ✍️**       | -              | Inserts a CHR$() code at the current cursor position from ASCII chart. |
| **Refresh TODOs 🔄**                         | -              | Scans workspace and refreshes the QBasic TODOs panel.                  |
| **QBasic: Configure System ⚙️**              | -              | Opens one quick picker for the extension's main adjustable settings.   |
| **QBasic: Show Toolchain Info 🧰**           | -              | Shows the mode, the compilers found, and the language server state.    |
| **QBasic: Select Compiler Mode 🧭**          | -              | Switches between Auto, QBNex and QB64.                                 |
| **QBasic: Configure QBNex Path 🛤️**          | -              | Saves, clears, auto-detects, or picks the QBNex executable path.       |
| **QBasic: Configure QB64 Path 🛤️**           | -              | Saves, clears, auto-detects, or picks the QB64 executable path.        |
| **QBasic: Configure Diagnostics Flags 🩺**   | -              | Toggles warnings, warnings as errors, and `OPTION _EXPLICIT`.          |
| **QBasic: Configure Extra Compiler Args 🧪** | -              | Picks or customizes extra compiler command-line arguments.             |
| **QBasic: Select Output Folder 📂**          | -              | Picks or enters the folder for built executables.                      |
| **QBasic: Select Formatter 🖌️**              | -              | Chooses the built-in formatter or qb-fmt.                              |
| **QBasic: Restart Language Server 🔁**       | -              | Restarts qb-lsp, for example after changing its settings.              |
| **QBasic: Configure Check On Save 🩺**       | -              | Enables or disables the compiler check on save.                        |
| **QBasic: Configure Auto Format 💾**         | -              | Enables or disables format-on-save behavior.                           |
| **QBasic: Set Line Number Defaults 🔢**      | -              | Sets the default renumber start and step values.                       |

`F5` and `Shift+F5` work while no debug session is running; during a debug session they belong to the debugger.

---

## 🎬 Retro CRT Capabilities

The Retro CRT runs the QIR that QBNex compiles from your program on **qb-web**, the QBNex VM built to WebAssembly. The language is therefore whatever QBNex supports (QBasic, QuickBASIC 4.5, the QB64 dialect and the QBNex extensions); what differs from a native build is what the sandboxed panel can reach.

**Compatibility Overview**

| Feature Category        | In the Retro CRT          | Supported Commands Examples                                                    |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| **Core I/O**            | ✅                        | `PRINT`, `PRINT USING`, `CLS`, `LOCATE`, `COLOR`, `SCREEN`, `WIDTH`            |
| **Control Flow**        | ✅                        | `IF`, `SELECT CASE`, `FOR`, `DO`, `WHILE`, `GOTO`, `GOSUB`, `ON ERROR`, `RESUME` |
| **Math, Strings, Data** | ✅                        | `SIN`, `RND`, `MID$`, `INSTR`, `DIM`, `REDIM PRESERVE`, `TYPE`, `STRING * N`   |
| **SUB/FUNCTION**        | ✅                        | `SUB`, `FUNCTION`, `CALL`, `SHARED`, `STATIC`                                  |
| **Graphics**            | ✅                        | `SCREEN 0`, `SCREEN 13` and other modes, `PSET`, `LINE`, `CIRCLE`, `PAINT`, `DRAW` |
| **Timing**              | ✅                        | `_DISPLAY`, `_LIMIT`, `_DELAY`, `TIMER`                                        |
| **Sound**               | ✅ WebAudio               | `SOUND`, `BEEP`, `PLAY`, `_SND*`                                               |
| **INPUT**               | ✅ Prepared answers       | `INPUT`, `LINE INPUT`                                                          |
| **Console**             | ✅ Separate pane          | `$CONSOLE`                                                                     |
| **Live Keyboard/Mouse** | ⚠️ Isolated webview only  | `INKEY$`, `_KEYHIT`, `_MOUSEINPUT`, `_MOUSEX`                                  |
| **Files**               | ❌ Build natively         | `OPEN`, `KILL`, `MKDIR`, `FILES`                                               |
| **SHELL**               | ❌ Build natively         | `SHELL`                                                                        |
| **Network**             | ❌ Build natively         | `_OPENHOST`, `_OPENCLIENT`, HTTP                                               |

**Known Limitations**

**Keyboard and Mouse**

- Live keyboard and mouse input (`INKEY$`, `_KEYHIT`, `_MOUSE*`) needs `SharedArrayBuffer`, which only a cross-origin isolated webview provides
- VS Code normally does not provide that; then `INPUT` reads the prepared answers only and key polling does not see your key presses
- For games that poll the keyboard or mouse, build natively with `F5`

**INPUT**

- Click **⌨ Set INPUT Answers** in the panel's title bar and type the answers separated by `|` (for example `Alice | 42`), then run (or click **↻ Run Again**)
- `INPUT` and `LINE INPUT` read these answers in order

**Files, SHELL and Network**

- The Retro CRT has no access to your disk, to other programs, or to the network
- Programs that use files, `SHELL`, TCP or HTTP need a native QBNex or QB64 build

**Requirements**

- QBNex must be installed: the program is compiled with `qb --emit-ir` before it runs
- QB64-only users can still build and run natively with `F5`

**Testing Your Code**

To check if your code will work in the Retro CRT

1. Look at the compatibility table above
2. Run it with `Shift+F5`
3. If it needs files, `SHELL`, the network or live key polling, build it natively with `F5` instead

---

## 🧩 Snippets Reference

Never type repetitive code again. Start typing these keywords and press `Tab`

QBasic Nexus now ships with 680+ snippets, including handcrafted templates plus generated keyword and built-in reference snippets for QBasic, QuickBASIC 4.5, and QB64.

Short structural snippets keep their classic prefixes such as `for`, `if`, `sub`, and `screen`. Generated reference snippets use `kw...` for keywords and `fn...` for built-ins to avoid IntelliSense collisions.

### Reference Snippets

Use generated reference snippets when you want to insert exact keywords or built-ins without losing the short handcrafted prefixes.

**Keyword reference prefixes**

- `kw line input` inserts `LINE INPUT`
- `kw on error` inserts `ON ERROR`
- `kw interrupt` inserts `INTERRUPT`
- `kw _memcopy` inserts `_MEMCOPY`

**Function reference prefixes**

- `fn cbool` inserts `CBOOL(value)`
- `fn _sndlen` inserts `_SNDLEN(soundHandle)`
- `fn _openhost` inserts `_OPENHOST(port)`
- `fn varptr` inserts `VARPTR(variable)`

These reference snippets are useful for advanced or less frequently typed commands where you want the exact spelling quickly while still keeping classic short prefixes like `for`, `if`, `sub`, and `screen` dedicated to structural templates.

### Structure Snippets

**`sub` - Create a SUB procedure**

```basic
SUB ProcedureName()
    ' Your code here
END SUB
```

**`function` - Create a FUNCTION**

```basic
FUNCTION FunctionName() AS INTEGER
    ' Your code here
    FunctionName = returnValue
END FUNCTION
```

**`type` - Create a custom TYPE**

```basic
TYPE TypeName
    field1 AS INTEGER
    field2 AS STRING
END TYPE
```

**`select` - SELECT CASE statement**

```basic
SELECT CASE variable
    CASE value1
        ' Code for value1
    CASE value2
        ' Code for value2
    CASE ELSE
        ' Default code
END SELECT
```

**`if` - Simple IF statement**

```basic
IF condition THEN
    ' Code when true
END IF
```

**`ifelse` - IF...ELSE statement**

```basic
IF condition THEN
    ' Code when true
ELSE
    ' Code when false
END IF
```

### Loop Snippets

**`for` - FOR loop**

```basic
FOR i = 1 TO 10
    ' Loop code
NEXT i
```

**`forstep` - FOR loop with STEP**

```basic
FOR i = 1 TO 10 STEP 2
    ' Loop code
NEXT i
```

**`dowhile` - DO WHILE loop**

```basic
DO WHILE condition
    ' Loop code
LOOP
```

**`dountil` - DO UNTIL loop**

```basic
DO UNTIL condition
    ' Loop code
LOOP
```

**`while` - WHILE...WEND loop**

```basic
WHILE condition
    ' Loop code
WEND
```

### Graphics Snippets

**`screen` - Initialize graphics mode**

```basic
SCREEN 13
CLS
```

**`line` - Draw a line**

```basic
LINE (x1, y1)-(x2, y2), color
```

**`circle` - Draw a circle**

```basic
CIRCLE (x, y), radius, color
```

**`rgb` - Create RGB color (QB64)**

```basic
color& = _RGB32(red, green, blue)
```

### Boilerplate Snippets

**`newqb64` - Complete QB64 program template**

```basic
' Program: YourProgramName
' Author: Your Name
' Date: Current Date

SCREEN 13
CLS

' Main program code here

DO
    ' Game/Program loop
    _LIMIT 60
LOOP UNTIL INKEY$ = CHR$(27) ' ESC to exit

SYSTEM
```

**`gameloop` - Game loop with \_LIMIT**

```basic
DO
    ' Input handling
    k$ = INKEY$

    ' Update game logic

    ' Draw graphics
    CLS

    ' Control frame rate
    _LIMIT 60
LOOP UNTIL k$ = CHR$(27) ' ESC to exit
```

### How to Use Snippets

1. Start typing the snippet name (e.g., `sub`)
2. IntelliSense will show the snippet suggestion
3. Press `Tab` or `Enter` to insert the snippet
4. Use `Tab` to jump between editable fields
5. Modify the placeholder text as needed

**Pro Tips**

- Snippets save time on repetitive code structures
- Tab key moves between editable fields in the snippet
- `kw...` snippets are best for language keywords and statements, while `fn...` snippets are best for built-in functions and QB64 helpers
- Hover over a generated keyword or built-in after insertion to see syntax notes and examples directly in the editor
- You can customize snippets in `.vscode/snippets/qbasic.json`
- Combine snippets with IntelliSense for maximum productivity

---

## 🎮 The Interactive Curriculum

New to QBasic, or just need to knock off the rust? The **Interactive Tutorial Mode** provides a comprehensive **150-lesson** hands-on curriculum built straight into the editor.

**How It Works**

The Interactive Tutorial is a guided learning system that teaches you QBasic programming through practical exercises.

**Tutorial System Features**

- **150 Progressive Lessons** - Covering the full QBasic core language, advanced runtime topics, game programming, and real-world applications.
- **35 Comprehensive Stages** - Organized by topic and difficulty, from absolute basics to advanced techniques.
- **Side-by-Side Dual Panel** - Code editor on the **left**, rich lesson description on the **right** — no more switching windows!
- **Live Markdown Lesson Panel** - Each lesson opens a beautiful description panel showing the Objective, Description, Hint, and a Code Template — all formatted and syntax-highlighted.
- **Automatic Verification** - Your code is checked instantly against the lesson goal the moment you run it.
- **Instant Feedback** - See results immediately in the Retro CRT.
- **Hints and Tips** - Stuck? A `💡 Hint` is always visible in the lesson panel.

**How to Start**

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Execute **"QBasic Start Interactive Tutorial 🎮"**
3. A **Quick Pick** menu shows all 150 lessons — pick any stage to jump right in
4. The editor splits into **two panels automatically**:
   - **Left (Column 1)** — A new QBasic file pre-loaded with the lesson's starter template code
   - **Right (Column 2)** — A **Markdown Preview** showing the full lesson brief: Objective, Description, Hint, and the Template code block
5. Write or modify your solution in the **left panel**
6. Press **`F5`** (or **`Shift+F5`**) in the lesson editor - the program runs in the **Retro CRT** with QBNex and its output is checked against the lesson goal
7. On success you'll see **Lesson complete** with a **Next Lesson** button

**Tutorial Stages**

**Stage 1 - Basics & Variables (Lessons 1.1-1.5)**

- First program (`PRINT`, `CLS`)
- User Input & Variables (`DIM`, `AS STRING`)
- Screen placement and colors (`LOCATE`, `COLOR`)
- Basic debugging and execution

**Stage 2 - Mathematics & Logic (Lessons 2.1-2.4)**

- Arithmetic Operators (`*`, `/`, `MOD`)
- Logical Operators (`AND`, `OR`, `NOT`)
- Numeric rounding behavior (`INT`, `FIX`)

**Stage 3 - Control Flow (Lessons 3.1-3.4)**

- Conditional logic (`IF..THEN`, `ELSEIF`)
- Multiple choice routing (`SELECT CASE`)
- Inverting conditions with `NOT`

**Stage 4 - Loops (Lessons 4.1-4.6)**

- Counting loops (`FOR...NEXT`, `STEP`)
- Conditional loops (`DO...LOOP UNTIL`, `WHILE...WEND`)
- Breaking out early (`EXIT FOR`, `EXIT DO`)

**Stage 5 - Strings Manipulation (Lessons 5.1-5.7)**

- Slicing & Formatting (`LEFT$`, `RIGHT$`, `MID$`, `UCASE$`)
- ASCII and Searching (`LEN`, `INSTR`, `CHR$`)
- Trimming and conversion (`LTRIM$`, `RTRIM$`, `STR$`, `VAL`)

**Stage 6 - Math Extras & Randomness (Lessons 6.1-6.3)**

- Random Numbers (`RANDOMIZE`, `RND`)
- Math Functions (`ABS`, `SQR`)
- Trigonometry basics (`SIN`, `COS`)

**Stage 7 - Arrays & Custom Types (Lessons 7.1-7.3)**

- Fixed arrays (`DIM`)
- 1D and 2D Grids
- Inspecting array bounds in multiple dimensions

**Stage 8 - Advanced Routing (Lessons 8.1-8.3)**

- Line Labels and Jumping (`GOTO`)
- Local Subroutines (`GOSUB`, `RETURN`)
- Avoiding runaway call stacks

**Stage 9 - Dynamic Arrays & Bounds (Lessons 9.1-9.4)**

- Dynamic arrays (`REDIM`, `REDIM PRESERVE`)
- Finding bounds (`LBOUND`, `UBOUND`)
- Clearing memory (`ERASE`)

**Stage 10 - Custom Procedures (Lessons 10.1-10.4)**

- Creating Commands (`SUB`)
- Creating Functions (`FUNCTION`)
- Passing by reference and using multiple arguments

**Stage 11 - Scope & Modularity (Lessons 11.1-11.3)**

- Global Variables (`SHARED`, `COMMON SHARED`)
- Preserving Sub/Function states (`STATIC`)
- Multi-file projects (`$INCLUDE`)

**Stage 12 - Managing Static Data (Lessons 12.1-12.3)**

- Storing & Extracting Data (`DATA`, `READ`)
- Resetting pointers (`RESTORE`)
- Mixing numeric and string data records

**Stage 13 - Structured Data & Types (Lessons 13.1-13.4)**

- Defining custom structures (`TYPE...END TYPE`)
- Fixed-length Strings (`STRING * N`)
- Arrays of structures and nested types

**Stage 14 - Sequential File I/O (Lessons 14.1-14.4)**

- Opening and closing text files (`OPEN FOR OUTPUT/INPUT`)
- Writing and Reading data (`PRINT #`, `INPUT #`)
- Appending logs and looping with `EOF`

**Stage 15 - Random & Binary File I/O (Lessons 15.1-15.4)**

- Writing structured files (`OPEN FOR RANDOM`)
- Legacy binary conversion (`MKI$`, `CVI`)
- File seeking and binary-mode reads (`SEEK`, `GET #`)

**Stage 16 - Directory Management (Lessons 16.1-16.3)**

- Managing folders (`MKDIR`, `CHDIR`, `RMDIR`)
- Looking up, renaming, and deleting files (`FILES`, `NAME`, `KILL`)

**Stage 17 - Memory & Hardware Emulation (Lessons 17.1-17.4)**

- Checking addresses (`DEF SEG`)
- Virtual RAM editing (`PEEK`, `POKE`)
- Emulated hardware signals and fast memory helpers (`INP`, `_MEMCOPY`, `_MEMFILL`)

**Stage 18 - Visuals & Graphics (Lessons 18.1-18.5)**

- Initializing screens (`SCREEN 13`)
- Drawing primitives (`PSET`, `LINE`, `CIRCLE`)
- Automated drawing and filling (`DRAW`, `PAINT`)

**Stage 19 - Audio & Music (Lessons 19.1-19.2)**

- Tone playback (`SOUND`)
- Music macro language (`PLAY`)

**Stage 20 - Error Handling & Limit (Lessons 20.1-20.3)**

- Trapping and resolving errors (`ON ERROR GOTO`, `RESUME`)
- Frame pacing (`_LIMIT`)
- Modern mouse polling (`_MOUSEINPUT`, `_MOUSEX`)

**Stage 21 - Capstone Projects (Lessons 21.1-21.2)**

- Save & Load a High Score (File I/O integration)
- Build an interactive guessing game that combines loops, random numbers, input, and error handling

**Stage 22 - Console & Keyboard (Lessons 22.1-22.5)**

- Cursor position and print-column tracking (`CSRLIN`, `POS`)
- Formatted spacing (`TAB`, `SPC`)
- Alerts, key polling, and full-line reads (`BEEP`, `INKEY$`, `LINE INPUT`)

**Stage 23 - Declarations & Numeric Types (Lessons 23.1-23.5)**

- Constants and explicit assignment (`CONST`, `LET`)
- Value swapping and array bases (`SWAP`, `OPTION BASE`)
- Numeric storage and conversion (`LONG`, `SINGLE`, `DOUBLE`, `CINT`, `CLNG`, `CSNG`, `CDBL`)

**Stage 24 - Program Flow & Legacy Logic (Lessons 24.1-24.5)**

- Bitwise and logical operators (`XOR`, `EQV`, `IMP`)
- Computed branching (`ON GOTO`, `ON GOSUB`)
- Classic one-line functions (`DEF FN`)

**Stage 25 - Text & Time Utilities (Lessons 25.1-25.5)**

- Lowercase and padding helpers (`LCASE$`, `SPACE$`, `STRING$`)
- Numeric formatting (`HEX$`, `OCT$`)
- Clock access (`TIMER`, `DATE$`, `TIME$`)

**Stage 26 - Procedures & Shared State (Lessons 26.1-26.5)**

- Explicit calls and forward declarations (`CALL`, `DECLARE`)
- Parameter passing rules (`BYVAL`, `BYREF`)
- Cross-module shared variables (`COMMON SHARED`)

**Stage 27 - File Utilities (Lessons 27.1-27.5)**

- Structured output and automatic handles (`WRITE #`, `FREEFILE`)
- File size and exact reads (`LOF`, `LOC`, `INPUT$`)
- Directory cleanup (`RMDIR`)

**Stage 28 - Graphics Toolkit (Lessons 28.1-28.5)**

- Resetting and sampling pixels (`PRESET`, `POINT`)
- Viewports and coordinate mapping (`VIEW`, `WINDOW`)
- Palette changes and page copying (`PALETTE`, `PCOPY`)

**Stage 29 - Runtime & Diagnostics (Lessons 29.1-29.5)**

- Environment and argument access (`ENVIRON$`, `COMMAND$`)
- Program pacing and exits (`SLEEP`, `STOP`, `SYSTEM`)
- Manual error creation and inspection (`ERROR`, `ERR`, `ERL`)

**Stage 30 - Advanced Graphics (Lessons 30.1-30.5)**

- Sprite capture and rendering (`GET`, `PUT`)
- PUT drawing modes (XOR, AND, OR for sprite effects)
- Multiple screen modes and resolutions
- Text width control and binary graphics (`WIDTH`, `BSAVE`, `BLOAD`)

**Stage 31 - Advanced String Operations (Lessons 31.1-31.5)**

- String comparison and matching
- Reversing strings with loops
- String replacement techniques
- Splitting strings by delimiters
- Complete whitespace trimming

**Stage 32 - Advanced Math (Lessons 32.1-32.5)**

- Exponential and logarithm functions (`EXP`, `LOG`)
- Tangent and arctangent (`TAN`, `ATN`)
- Sign function (`SGN`)
- Seeded random numbers for reproducibility
- Calculating Pi using trigonometry

**Stage 33 - Advanced Arrays (Lessons 33.1-33.5)**

- Bubble sort implementation
- Linear search algorithms
- Array sum and average calculations
- Finding maximum and minimum values
- Matrix operations (addition, multiplication)

**Stage 34 - Advanced File Operations (Lessons 34.1-34.5)**

- Checking file existence with error handling
- Copying files programmatically
- Parsing CSV files
- Creating timestamped log files
- Configuration file management

**Stage 35 - Game Programming Basics (Lessons 35.1-35.5)**

- Basic game loop structure
- Player movement systems
- Collision detection algorithms
- Score tracking and display
- Health and lives management

**Verification System**

**How Your Code Is Checked**

- QBNex compiles your program to QIR and it runs in the **Retro CRT** on qb-web, the QBNex VM - a real run, not a simulation.
- The output of the run - console text and the text screen - is matched against the lesson goal. The **CURRENT OBJECTIVE** HUD in the CRT turns to **LESSON COMPLETE** when it matches.
- Compile errors come straight from QBNex, so you learn the messages a real compiler gives.
- The tutorial needs QBNex installed.
- The Retro CRT has no file access, so programs from the file lessons (for example stages 14-16, 27 and 34) need a native build with **QBasic: Compile & Run** to work with real files.

**Verification Criteria**

- **Correct Output** - Program produces the text the lesson asks for.
- **No Errors** - Code compiles and runs cleanly.

**Getting Help**

**If You're Stuck**

- Read the lesson objective carefully
- Check the example code provided
- Look at the hints section
- Try breaking the problem into smaller steps
- Experiment in the Retro CRT

**Lesson Navigation**

- You can skip lessons (but not recommended for beginners)
- Return to previous lessons anytime
- Lessons can be repeated for practice
- After **Lesson complete**, **Next Lesson** opens the following lesson

**Tips for Success**

- Read each lesson objective completely before coding
- Test your code frequently with F5
- Use the Retro CRT (Shift+F5) to see immediate results
- Don't rush - understanding is more important than speed
- Experiment beyond the lesson requirements
- Review previous lessons if you forget concepts

**Beyond the Tutorial**

After completing the tutorial

- You'll have solid QBasic fundamentals
- Ready to build your own programs
- Understand both classic QBasic and QB64 extensions
- Can explore advanced topics independently

---

## 🔥 Introducing QBNex Compiler

Looking for a modern, high-performance alternative to **QB64**? Meet **QBNex**, a next-generation QBasic/QuickBASIC compiler by **Thirawat27** - and the compiler QBasic Nexus is built around.

QBNex translates BASIC source code into **QIR**, a text intermediate language, and packages it with a Rust runner into a standalone executable for Windows, Linux and macOS. There is no C or C++ anywhere in the pipeline: the runner and runtime are Rust, the QIR runs on a register VM, and hot loops are compiled to native code with Cranelift. The compiler itself is **self-hosting** - written in QBNex BASIC (about 35,000 lines) and compiled by itself.

**Key Advantages**

- 🚀 **Self-Hosting Architecture** - The compiler is written in BASIC and compiles itself, proving its capability.
- ⚡ **No C/C++ Toolchain** - BASIC → QIR → standalone executable, with nothing else to install.
- 🔌 **Standalone Executables** - For Windows x64, Linux, and macOS.
- 🛡️ **Modern Runtime** - A Rust runtime for windows, graphics (all `SCREEN` modes and QB64 32-bit images), sound, fonts, images, files and TCP/IP.
- 📦 **Standard Library** - `json`, `url`, collections, strings, I/O, system and Rust-backed `ext.*` modules via `'$IMPORT:'module'`.
- 🧰 **Developer Tools** - `qb-lsp` (language server), `qb-dap` (debugger), `qb-fmt` (formatter) and `qb-web` (the VM in WebAssembly); QBasic Nexus uses all four.

**QBNex vs QB64 Comparison**

| Feature                    | QBNex                                          | QB64                   |
| -------------------------- | ---------------------------------------------- | ---------------------- |
| **Implementation**         | BASIC (self-hosting) + Rust runtime            | C++                    |
| **Compilation**            | BASIC → QIR → runner (VM + JIT)                | BASIC → C++ → Native   |
| **C/C++ Toolchain**        | Not needed                                     | Needed                 |
| **Binary Size**            | About 13 MB (runner included)                  | Varies                 |
| **Platform Support**       | Windows, macOS, Linux                          | Windows, macOS, Linux  |
| **Language Server, Debugger** | qb-lsp, qb-dap                              | -                      |
| **Modern Features**        | Extended (`_IIF`, `TRY`/`CATCH`, `FOR EACH`, `ENUM`) | Limited          |
| **Active Development**     | Yes                                            | Yes                    |

### Installation

QBNex needs no setup script and no C/C++ compiler when you install a release.

**Step 1 - Download QBNex**

📥 [Get the latest version from GitHub Releases](https://github.com/thirawat27/QBNex/releases)

Download the appropriate package for your operating system:

- Installer (recommended) - `qbnex_<tag>_win-x64-setup.exe`, `qbnex_<tag>_lnx-setup`, `qbnex_<tag>_osx-setup`
- Archives - `qbnex_<tag>_win-x64.zip`, `qbnex_<tag>_lnx.tar.gz`, `qbnex_<tag>_osx.tar.gz`

**Step 2 - Install QBNex**

The installer installs for the current user, without administrator rights:

- Windows - into `%LOCALAPPDATA%\Programs\QBNex`, added to your `PATH`, the Start menu and "Apps & features"
- Linux/macOS - into `~/.local/share/qbnex`, with `qb` and `qbnex` linked in `~/.local/bin`

Use `--yes` to install without questions or `--dir <folder>` to choose the folder. With an archive, extract it to a folder you can write to, then add that folder to `PATH` or set `qbasic-nexus.qbnexPath`.

The installer and `qb` are not code-signed, so SmartScreen (Windows) and Gatekeeper (macOS) may warn on the first run.

**Step 3 - Configure QBasic Nexus Extension**

Usually there is nothing to do: QBasic Nexus finds QBNex in the installer folders, on `PATH`, through `QBNEX_HOME` / `QBNEX_PATH`, and in `C:\QBNex`, `/opt/qbnex`, `/usr/local/bin` and `/opt/homebrew/bin`. Otherwise:

1. Run **QBasic: Configure QBNex Path 🛤️**, or open VS Code Settings (`Ctrl+,` or `Cmd+,`) and search for **"QBasic Nexus Qbnex Path"**
2. Enter the path to the QBNex executable:

**Examples:**
```
Windows  C:\Users\yourname\AppData\Local\Programs\QBNex\qb.exe
macOS    /Users/yourname/.local/bin/qb
Linux    /home/yourname/.local/bin/qb
```

3. Leave **Compiler Mode** on **"Auto"** (or set it to **"QBNex"**)
4. The Status Bar shows **QBNex** once it is found

**Step 4 - Verify Installation**

1. Open a new terminal
2. Check the compiler version:
   ```bash
   qb --version
   ```
   You should see `QBNex Compiler` followed by its version
3. Create a test file `test.bas`:
   ```basic
   PRINT "Hello from QBNex!"
   ```
4. Compile and run:
   ```bash
   qb test.bas -o test.exe   # Windows: then run test.exe
   qb test.bas -o test       # Linux/macOS: then run ./test
   ```
5. If you see "Hello from QBNex!", the installation is working!

**Using QBNex**

**Compilation**

- Use F5 or "QBasic: Compile & Run" command
- QBNex compiles your code to a standalone executable
- A hello world builds in about half a second
- Check on save and the Retro CRT use `qb file --emit-ir`, which skips the executable

### How QBNex Works

QBNex uses a 3-stage pipeline that needs no C/C++ compiler:

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: Pre-pass                                          │
│  ├── Process $INCLUDE files and '$IMPORT modules            │
│  ├── Evaluate $IF / $LET                                    │
│  ├── Rewrite DEF FN and CLASS into ordinary procedures      │
│  └── Record variables, procedures and types                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: QIR Emission                                      │
│  ├── Check each statement                                   │
│  ├── Lower it to QIR (typed registers, runtime calls)       │
│  └── --emit-ir stops here and writes the QIR text           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: Packaging & Execution                             │
│  ├── Copy the prebuilt Rust runner (qb-exec)                │
│  ├── Append the QIR to it                                   │
│  ├── At start-up: validate, lower to bytecode, run on the VM│
│  └── Hot functions are compiled by the Cranelift JIT        │
└─────────────────────────────────────────────────────────────┘
```

**Self-Hosting Architecture**

QBNex is one of the few compilers in the world that is truly self-hosting in BASIC:

- The compiler source code is in `compiler/` (about 35,000 lines of QBNex BASIC)
- A stage-0 compiler built from `bootstrap/qbnex.qir` compiles `compiler/qbnex.bas` into `qb` / `qb.exe`
- This proves QBNex is a complete, capable BASIC implementation
- Modifying the compiler? Edit `compiler/qbnex.bas` and rebuild with the setup script!

### Compiler Flags

QBNex supports various flags for different workflows:

| Flag | Description | Example |
|------|-------------|---------|
| `-h`, `--help` | Show help information | `qb -h` |
| `-v`, `--version` | Show compiler version | `qb -v` |
| `-o <file>` | Custom output filename (a name ending in `.qir` writes QIR) | `qb game.bas -o mygame.exe` |
| `--emit-ir` | Write the QIR text instead of an executable | `qb game.bas --emit-ir -o game.qir` |
| `-x` | Send the compiler's output to the console (does not run the program) | `qb test.bas -x` |
| `-w` | Show warnings | `qb code.bas -w` |
| `-Werror` | Treat warnings as errors | `qb code.bas -Werror` |
| `-e` | Enable OPTION _EXPLICIT | `qb strict.bas -e` |
| `-k` | Compact diagnostics | `qb code.bas -k` |
| `-q` | Quiet mode (warnings and errors are still shown) | `qb code.bas -q` |
| `-m` | No colours in the compiler output | `qb code.bas -m` |
| `-s` | View/edit compiler settings | `qb -s` |

Without `-o` the executable goes to the QBNex folder, as in QB64. QBasic Nexus always passes `-o`, so your program lands beside the source file or in `outputDirectory`.

### Standard Library Imports

QBNex extends BASIC with standard library modules, imported with the `'$IMPORT:'module'` metacommand:

```basic
' Import the full qbnex stdlib core
'$IMPORT:'qbnex'

' Now use modern features
DIM myList AS QBNex_List
List_Init myList
List_Add myList, "Hello"
List_Add myList, "World"
```

Other modules include `json`, `url`, `sys.env`, `io.path`, `strings.text`, `collections.list`, `math.numeric` and the Rust-backed `ext.*` modules (regex, hash, zip, http, utf8, collections, datetime).

### Compatibility

**Fully Supported**

- All standard QBasic and QuickBASIC 4.5 commands
- The QB64 dialect (`_` keywords, `$` metacommands, `_UNSIGNED`, `_INTEGER64`, `_FLOAT`, `_MEM`, `DECLARE LIBRARY`)
- Graphics (all SCREEN modes 0-13, 32-bit images, `_PUTIMAGE`, `_LOADIMAGE`, TrueType fonts)
- Sound (`SOUND`, `PLAY`, `BEEP`, `_SND*`)
- File I/O, TCP/IP (`_OPENHOST`, `_OPENCLIENT`), `SHELL`, `CHAIN`
- `PEEK`/`POKE`/`DEF SEG` over an emulated 1 MB memory
- Arrays, TYPEs, SUBs and FUNCTIONs

**Preview**

- Native executables linked with `rust-lld`
- High-level 3D (`_LOADMODEL`, `_MESH*`, `_CAMERA`)
- The WebAssembly runner (used by the Retro CRT)

**Not Yet Supported**

- Inline assembly
- Planned syntax such as `x += 1`, array literals and `IMPORT module` without the `'$IMPORT:` form
- Legacy QB64 quirks and bugs (intentionally)

### Troubleshooting QBNex

**"No compiler was found" / QBNex not detected**

- Run `qb --version` in a new terminal; it should print `QBNex Compiler` followed by its version
- If `qb` is not on `PATH`, set `qbasic-nexus.qbnexPath` to the full path of `qb` / `qb.exe`
- On macOS/Linux, ensure the file is executable: `chmod +x qb`
- Run **QBasic: Show Toolchain Info 🧰** to see what the extension found

**Older QBNex warning**

- QBasic Nexus is made for the current QBNex. An older QBNex still builds, with a warning; update QBNex for full support

**Compilation errors**

- The Problems view shows each error at the right file and line; the full QBNex explanation is in the **QBasic Nexus** Output panel
- `QIR: unsupported: line N: ...` means a statement QBNex does not support yet
- Try compiling with QB64 to compare
- Report issues on GitHub with code sample

**Live diagnostics missing**

- qb-lsp must be next to the QBNex compiler or on `PATH`, or set `qbasic-nexus.languageServer.path`
- qb-lsp does not start in untrusted workspaces, or when the official QBNex extension (`qbnex.qbnex`) is installed (that extension runs it itself)
- Run **QBasic: Restart Language Server 🔁**

**Switching Between QB64 and QBNex**

You can easily switch between QB64 and QBNex

1. Run **QBasic: Select Compiler Mode 🧭**
2. Choose **QBNex**, **QB64**, or **Auto**
3. Next compilation uses the selected compiler

### Why Choose QBNex?

**Choose QBNex if you want**

- Live diagnostics, debugging, `qb-fmt` and the Retro CRT in QBasic Nexus
- No C/C++ toolchain to install or set up
- Self-hosting compiler architecture (proves BASIC can build real systems)
- Modern extensions (`_IIF`, string interpolation, `TRY`/`CATCH`, `FOR EACH`, `ENUM`, `OPTIONAL` parameters)
- Standard library with JSON, collections, strings, I/O utilities and more
- Docker support for consistent builds

**Stick with QB64 if you need**

- Built for QB64 compatibility: existing QB64 programs are its main target
- Access to all QB64-specific libraries and extensions
- Mature, stable reference compiler
- Extensive community resources and examples

**Contributing to QBNex**

QBNex is open source and welcomes contributions

- Report bugs and issues
- Suggest new features
- Contribute code improvements
- Help with documentation
- Share your QBNex projects

Visit the [QBNex GitHub Repository](https://github.com/thirawat27/QBNex) to get involved!

---

## 🆘 Troubleshooting

Comprehensive guide to solving common issues with QBasic Nexus.

### Installation Issues

**Extension Not Activating**

**Symptoms**

- No QBasic commands in Command Palette
- No syntax highlighting for .bas files
- Status bar doesn't show the Run button

**Solutions**

1. Check that VS Code is up to date
2. Reload VS Code - Press `Ctrl+Shift+P` > "Developer Reload Window"
3. Reinstall extension - Uninstall, restart VS Code, reinstall
4. Check for conflicting extensions - Disable other BASIC extensions

**Compiler Installation Problems**

**Error - "No compiler was found. Install QBNex ... or QB64-PE ..."**

**Causes**

- Neither QBNex nor QB64 is installed
- Incorrect path in settings
- The compiler is not in a location the extension searches

**Solutions**

1. Verify the compiler is installed
   - QBNex - `qb --version` should print `QBNex Compiler` followed by its version
   - QB64 - QB64 is extracted (and on macOS/Linux, its setup script has run)
2. Check the path settings
   - Open Settings > Search "QBasic Nexus"
   - `qbasic-nexus.qbnexPath` (QBNex) or `qbasic-nexus.compilerPath` (QB64) must point to the executable file (not the folder)
   - Windows - Must end with `qb.exe`, `qb64pe.exe` or `qb64.exe`
   - macOS/Linux - Must point to the `qb`, `qb64pe` or `qb64` file
3. Use auto-detection
   - Run **QBasic: Configure QBNex Path 🛤️** or **QBasic: Configure QB64 Path 🛤️** and choose **Auto-Detect Now**
   - Click "Save Path" when asked to keep the detected location
4. Manually set path
   - Copy full path to the compiler executable
   - Paste into the setting

**Error - "Permission denied" (macOS/Linux)**

**Causes**

- QB64 executable doesn't have execute permission
- Setup script wasn't run

**Solutions**

1. Make QB64 executable
   ```bash
   chmod +x /path/to/qb64
   ```
2. Run setup script
   - macOS - `sh ./setup_osx.command`
   - Linux - `sh ./setup_lnx.sh`
3. Check file ownership
   ```bash
   ls -l /path/to/qb64
   ```

**Error - "Setup script failed" (macOS/Linux)**

**Common Causes and Solutions**

**Missing Xcode Command Line Tools (macOS)**

```bash
xcode-select --install
```

**Missing build tools (Linux)**

```bash
sudo apt-get update
sudo apt-get install build-essential
```

**Missing X11 libraries (Linux)**

```bash
sudo apt-get install libx11-dev libxrandr-dev libgl1-mesa-dev
```

**Insufficient disk space**

- QB64 setup needs ~500MB free space
- Check available space - `df -h`

**Corrupted download**

- Re-download QB64
- Verify file integrity
- Extract to new location

### Compilation Issues

**QB64 Mode Problems**

**Error - "Compilation failed"**

**Check These First**

1. Syntax errors in code
   - Look for red underlines in editor
   - Check Problems panel (`Ctrl+Shift+M`)
2. QB64 path is correct
   - Verify in settings
   - Test by running QB64 directly
3. Antivirus blocking
   - Temporarily disable antivirus
   - Add QB64 folder to exclusions

**Error - "C++ compiler not found"**

**Causes**

- QB64 setup not completed
- Missing C++ compiler

**Solutions (macOS)**

```bash
xcode-select --install
cd /Applications/QB64
sh ./setup_osx.command
```

**Solutions (Linux)**

```bash
sudo apt-get install g++
cd ~/qb64
sh ./setup_lnx.sh
```

**Error - "Out of memory during compilation"**

**Solutions**

1. Close other applications
2. Simplify code (split into modules)
3. Increase system swap/page file
4. Try QBNex instead (it needs no C++ compiler)

**QBNex Problems**

**Error - "QIR: unsupported: line N: ..."**

**Cause**

- The program uses a statement that QBNex does not support yet

**Solutions**

1. Check the error in the Problems view and the **QBasic Nexus** Output panel
2. Rewrite that statement, or build the program with QB64 (`compilerMode` set to `QB64`)
3. Report it on the [QBNex issues page](https://github.com/thirawat27/QBNex/issues) with a code sample

**Build Stops After a Long Time**

**Cause**

- The compiler ran longer than `qbasic-nexus.externalBuildTimeoutMs` (5 minutes by default) and was stopped

**Solutions**

1. Raise `externalBuildTimeoutMs` for very large programs (`0` disables the timeout)
2. Check the Output panel for a compiler that waits for input or hangs

**Executable Size**

**Normal Behavior**

- QBNex executables are about 13 MB
- Each one contains the Rust runner (VM, JIT, graphics, sound, network)
- A hello world and a graphics program are about the same size

### Runtime Issues

**Retro CRT Issues**

**Retro CRT Does Not Start**

**Cause**

- QBNex is not installed or not found; the Retro CRT compiles with `qb --emit-ir` first

**Solution**

- Install QBNex or set `qbasic-nexus.qbnexPath`; QB64-only setups can run programs natively with `F5`

**INKEY$, _KEYHIT or the Mouse Do Not React**

**Cause**

- Live keyboard and mouse input needs a cross-origin isolated webview (`SharedArrayBuffer`), which VS Code normally does not provide

**Solutions**

- Set the `INPUT` answers with **⌨ Set INPUT Answers** in the panel's title bar before running
- Build natively with `F5` for programs that poll the keyboard or mouse

**No Sound**

**Cause**

- Browser security requires user interaction

**Solution**

- Click anywhere inside the CRT window
- Sound will start working after interaction

**Simulation Freezing/Excessive CPU**

**Causes**

- Infinite loop without delay
- Missing `_LIMIT` or `SLEEP`

**Solutions**

1. Add frame rate limiting
   ```basic
   DO
       ' Your code
       _LIMIT 60  ' Limit to 60 FPS
   LOOP
   ```
2. Add sleep in loops
   ```basic
   DO
       ' Your code
       SLEEP 1  ' Sleep 1 second
   LOOP
   ```
3. Use proper exit conditions
   ```basic
   DO UNTIL INKEY$ = CHR$(27)  ' ESC to exit
       ' Your code
       _LIMIT 60
   LOOP
   ```

**Nothing Displays**

**Causes**

- No SCREEN mode initialized
- Drawing outside screen bounds
- Wrong color (same as background)

**Solutions**

1. Initialize graphics mode
   ```basic
   SCREEN 13  ' Required for graphics
   CLS
   ```
2. Check coordinates
   - SCREEN 13 is 320x200
   - X must be 0-319
   - Y must be 0-199
3. Use visible colors
   ```basic
   COLOR 15  ' White
   PRINT "Test"
   ```

**Graphics Glitches**

**Causes**

- Complex DRAW commands
- Webview rendering issues

**Solutions**

1. Compare with a native build (`F5`)
2. Simplify DRAW macro strings
3. Refresh the Retro CRT (close and reopen)

**File Operations Not Working**

**Cause**

- The Retro CRT has no file access (and no `SHELL`, TCP or HTTP)

**Solution**

- Build and run the program natively with `F5` (QBNex or QB64)

### Common Runtime Errors

**"Subscript out of range"**

**Causes**

- Array index out of bounds
- Array not dimensioned

**Solutions**

```basic
' Dimension array first
DIM myArray(1 TO 10) AS INTEGER

' Check bounds before accessing
IF index >= 1 AND index <= 10 THEN
    value = myArray(index)
END IF

' Use LBOUND and UBOUND
FOR i = LBOUND(myArray) TO UBOUND(myArray)
    PRINT myArray(i)
NEXT i
```

**"Type mismatch"**

**Causes**

- Wrong data type in operation
- String used as number or vice versa

**Solutions**

```basic
' Convert types explicitly
numStr$ = STR$(123)      ' Number to string
num = VAL("123")         ' String to number

' Declare variables with correct types
DIM age AS INTEGER
DIM name AS STRING

' Use type suffixes
count% = 10              ' Integer
price# = 19.99           ' Double
name$ = "John"           ' String
```

**"Out of memory"**

**Causes**

- Too many variables
- Large arrays
- Memory leak in loop

**Solutions**

1. Use smaller arrays
2. ERASE arrays when done
   ```basic
   ERASE bigArray
   ```
3. Avoid creating variables in loops
4. Use REDIM for dynamic arrays

**"Division by zero"**

**Causes**

- Dividing by zero or zero variable

**Solutions**

```basic
' Check before dividing
IF divisor <> 0 THEN
    result = numerator / divisor
ELSE
    PRINT "Cannot divide by zero"
END IF
```

**"Illegal function call"**

**Causes**

- Invalid parameter to function
- Function not supported in current mode

**Solutions**

1. Check parameter ranges
   ```basic
   ' SQR requires non-negative
   IF x >= 0 THEN
       result = SQR(x)
   END IF
   ```
2. Verify function is supported
3. Check function syntax in documentation

### Performance Issues

**Slow Compilation**

**QB64 Mode**

- First compilation is always slower
- Subsequent compilations use cache
- Large programs take longer (normal)

**Solutions**

1. Use cache (automatic)
2. Split large programs into modules
3. Close other applications
4. Upgrade hardware (SSD helps)

**QBNex**

- A hello world builds in about half a second; a 10,000-line program takes about 15 seconds
- Check on save uses `--emit-ir` and skips the executable

**Solutions**

1. Use check on save or **QBasic: Check for Errors 🩺** to find errors without a full build
2. Compile to an executable only when you want to run it
3. Exclude the QBNex folder and your project folder from antivirus scanning

**Slow Execution**

**Causes**

- Inefficient algorithms
- Missing `_LIMIT` causing 100% CPU
- Large graphics operations

**Solutions**

1. Add frame rate limiting
   ```basic
   _LIMIT 60
   ```
2. Optimize loops

   ```basic
   ' Bad - recalculates every iteration
   FOR i = 1 TO LEN(text$)
       ' ...
   NEXT

   ' Good - calculate once
   length = LEN(text$)
   FOR i = 1 TO length
       ' ...
   NEXT
   ```

3. Build natively (`F5`) instead of using the Retro CRT for heavy programs
4. Reduce graphics complexity

**High Memory Usage**

**Causes**

- Large arrays
- Memory leaks
- Too many variables

**Solutions**

1. Use smaller data structures
2. ERASE arrays when done
3. Avoid global variables
4. Use SUBs/FUNCTIONs with local variables

### Platform-Specific Issues

**Windows Issues**

**Windows Defender Blocking**

**Symptoms**

- Compilation succeeds but .exe deleted
- "Threat detected" notification

**Solutions**

1. Add folder to exclusions
   - Windows Security > Virus & threat protection
   - Manage settings > Exclusions
   - Add folder containing your .bas files
2. Restore quarantined file
   - Windows Security > Protection history
   - Restore the file
3. Use different antivirus (if persistent)

**Path with Spaces Problems**

**Symptoms**

- "File not found" errors
- Compilation fails

**Solutions**

1. Use paths without spaces
   - Bad - `C:\My Programs\QB64\`
   - Good - `C:\QB64\`
2. Use quotes in settings
   ```json
   "qbasic-nexus.compilerPath": "C:\\My Programs\\QB64\\qb64.exe"
   ```

**macOS Issues**

**Gatekeeper Blocking QB64**

**Symptoms**

- "QB64 cannot be opened because it is from an unidentified developer"

**Solutions**

1. Right-click QB64 > Open
2. Click "Open" in dialog
3. Or disable Gatekeeper temporarily
   ```bash
   sudo spctl --master-disable
   ```
4. Re-enable after setup
   ```bash
   sudo spctl --master-enable
   ```

**Rosetta 2 Issues (Apple Silicon)**

**Symptoms**

- QB64 won't run on M1/M2 Mac

**Solutions**

1. Install Rosetta 2
   ```bash
   softwareupdate --install-rosetta
   ```
2. Use QB64 Phoenix Edition (native ARM support)

**Linux Issues**

**Missing Libraries**

**Symptoms**

- "error while loading shared libraries"

**Solutions**

```bash
# Ubuntu/Debian
sudo apt-get install libgl1-mesa-dev libx11-dev libxrandr-dev

# Fedora
sudo dnf install mesa-libGL-devel libX11-devel libXrandr-devel

# Arch
sudo pacman -S mesa libx11 libxrandr
```

**Permission Problems**

**Symptoms**

- Cannot execute QB64
- Cannot write output files

**Solutions**

```bash
# Make QB64 executable
chmod +x ~/qb64/qb64

# Fix ownership
sudo chown -R $USER:$USER ~/qb64

# Fix permissions
chmod -R 755 ~/qb64
```

### Getting More Help

**Still Having Issues?**

1. **Check Output Panel**
   - View > Output
   - Select "QBasic Nexus" from dropdown
   - Look for error messages
   - Run **QBasic: Show Toolchain Info 🧰** to see which compilers and language server are in use

2. **Enable Debug Logging**
   - Help > Toggle Developer Tools
   - Console tab shows detailed logs

3. **Search Existing Issues**
   - [GitHub Issues](https://github.com/thirawat27/QBasic-Nexus/issues)
   - Someone may have solved your problem

4. **Report a Bug**
   - Include VS Code version
   - Include OS and version
   - Include error messages
   - Include minimal code to reproduce
   - Include steps to reproduce

5. **Ask for Help**
   - GitHub Discussions
   - Include relevant details
   - Be specific about the problem
   - Share error messages and logs

---

## 🤝 Contributing

We welcome retro-enthusiasts, optimization junkies, and modern developers.

Please follow the full contributor workflow in [CONTRIBUTING.md](./CONTRIBUTING.md), including coding standards, PR checklist, and test expectations.

Quick pre-PR checklist:

```bash
npm run lint
npm test
```

---

## 📄 License

MIT License © 2026 Thirawat Sinlapasomsak

---

<div align="center">
  <p>Developed with ❤️ by <a href="https://github.com/thirawat27">Thirawat27</a></p>
  <p>
    <a href="https://github.com/thirawat27/QBasic-Nexus">GitHub</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Report Bug</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Request Feature</a>
  </p>
  <p>
    <sub>If QBasic Nexus brought back incredible memories (or helped you learn something new), please consider leaving a ⭐ on GitHub!</sub>
  </p>
</div>
