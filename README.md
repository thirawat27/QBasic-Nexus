<div align="center">
  <img src="./image/QBasicNexus.png" alt="QBasicNexus Icon" width="250" height="250" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
</div>

<p>
Enhances QBasic development in VS Code with syntax highlighting, code snippets, and robust support for your <strong>externally installed QB64 compiler</strong>. Features include auto-detection of your QB64 installation or manual path configuration.
</p>

<br>

## ✨ Features

*   **Flexible QB64 Integration**:
    *   **Auto-Detection**: Attempts to automatically find your existing QB64 installation on startup.
    *   **Manual Configuration**: Allows you to specify the exact path to your QB64 executable via VS Code settings.
*   **Compile & Run 🚀**: Compile your QBasic code and run it in the integrated terminal with a single command.
*   **Compile Only 🔥**: Compile your code to create a standalone executable file (`.exe` on Windows, or a plain executable on macOS/Linux).
*   **Cross-Platform Support**: Works seamlessly on Windows, macOS, and Linux.
*   **Status Bar Integration**: Easily access the compile command from an icon in the status bar whenever a `.bas` or `.bi` file is open.
*   **Detailed Output Panel**: View detailed logs, progress, and errors from the compilation process in a dedicated "QB64 Compiler" output channel.
*   **Integrated Terminal Execution**: Runs the compiled program directly in the VS Code integrated terminal.
*   **Syntax Highlighting & Snippets**: Rich language support for QBasic and QB64.

## ⚙️ Prerequisites

For QBasic Nexus to compile your code using your QB64 installation, ensure QB64 is correctly set up on your system.

*   **All Systems (Windows, macOS, Linux)**:
    *   **QB64 Must Be Installed**: You need to have a working installation of QB64 (preferably QB64 Phoenix Edition from [qb64.org](https://qb64.org)).
    *   The extension will attempt to auto-detect it. If not found, you'll need to set the path manually (see Configuration section).

*   **macOS (If QB64 requires it)**:
    *   **Xcode Command Line Tools** must be installed if your QB64 version depends on them for C++ compilation.
    *   To install: `xcode-select --install`

*   **Linux (Debian/Ubuntu-based, if QB64 requires it)**:
    *   The **build-essential** package (which includes `g++`) must be installed if your QB64 version depends on it.
    *   To install: `sudo apt-get update && sudo apt-get install build-essential`

*(Note: QB64 Phoenix Edition for Windows typically includes its own MinGW C++ compiler, so no extra C++ tools are usually needed on Windows.)*

## 🚀 Getting Started

1.  **Install QB64**: If you haven't already, download and install QB64 from [qb64.org](https://qb64.org).
2.  **Install this Extension**: Find "QBasic Nexus" in the VS Code Marketplace and install it.
3.  **Compiler Path Configuration (If Needed)**:
    *   On first activation, the extension will try to auto-detect your QB64 installation.
    *   If successful, and you confirm, the path will be saved in your settings.
    *   If auto-detection fails, or you prefer to set it manually:
        1.  Open VS Code Settings (`Ctrl+,` or `Cmd+,`).
        2.  Search for `QBasic Nexus Compiler Path`.
        3.  Enter the **full, absolute path** to your `qb64.exe` (Windows) or `qb64` (macOS/Linux) executable.
            *   Example Windows: `C:\QB64\qb64.exe`
            *   Example macOS: `/Applications/qb64/qb64`
            *   Example Linux: `/home/youruser/qb64/qb64`
4.  **Open a QBasic File**: Open a file with a `.bas` or `.bi` extension.
5.  **Using the Extension**:
    *   When a `.bas` or `.bi` file is active and the compiler path is set, you'll see a **`🔥 Compile .BAS`** icon in the Status Bar.
    *   If the path is not set, the Status Bar will show **`⚠️ Set QB64 Path`**. Clicking it will open the settings.

## 📦 Available Commands

*   `qbasic-nexus.compile`:
    *   **Title in Palette/Menu**: `Compile .BAS file 🌀`
    *   **Action**: Compiles the currently active `.bas` or `.bi` file. Creates an executable in the same directory.
    *   **Accessed via**: Command Palette, Right-click context menu, Status Bar icon.

*   `qbasic-nexus.compileAndRun`:
    *   **Title in Palette/Menu**: `Compile & Run .BAS file 🚀`
    *   **Action**: Compiles the file. If successful, it runs the program in a new "QB64 Run 🏃‍♂️‍➡️" integrated terminal.
    *   **Accessed via**: Command Palette, Right-click context menu.

## 📄 Understanding the Output

*   **Output Panel ("QB64 Compiler" channel)**:
    *   Shows auto-detection attempts, compiler path information, and detailed compilation logs (COMPILE SUCCESSFUL ✅ or COMPILE FAILED ❌, error messages).
*   **Terminal Panel ("QB64 Run 🏃‍♂️‍➡️" tab)**:
    *   Displays the output of your running QBasic program when using "Compile & Run".
*   **Executable File**:
    *   Created in the same directory as your source `.bas` or `.bi` file.

## 🛠️ Configuration

The primary configuration is setting the path to your QB64 compiler:

*   **Setting ID**: `qbasic-nexus.compilerPath`
*   **Description**: Full path to your QB64 executable.
    *   Examples:
        *   Windows: `C:\QB64\qb64.exe`
        *   macOS: `/Applications/qb64/qb64` or `~/qb64/qb64`
        *   Linux: `/usr/local/bin/qb64` or `~/qb64/qb64`
    *   Leave empty to trigger auto-detection on startup/setting change.

You can access this via VS Code Settings (search for "QBasic Nexus Compiler Path").

## 📄 License

```
MIT License

Copyright (c) 2025 Thirawat  Sinlapasomsak

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