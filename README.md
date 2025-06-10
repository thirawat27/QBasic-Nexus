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
*   **Compile Only 🌀**: Compile your code to create a standalone executable file (`.exe` on Windows, or a plain executable on macOS/Linux).
*   **Cross-Platform Support**: Works seamlessly on Windows, macOS, and Linux.
*   **Status Bar Integration**: Easily access the compile command from an icon in the status bar whenever a `.bas` or `.bi` file is open.
*   **Detailed Output Panel**: View detailed logs, progress, and errors from the compilation process in a dedicated "QBasic Nexus Compiler" output channel.
*   **Integrated Terminal Execution**: Runs the compiled program directly in the VS Code integrated terminal.
*   **Customizable Compiler Arguments**: Pass additional arguments to the QB64 compiler via settings.
*   **Syntax Highlighting & Snippets**: Rich language support for QBasic and QB64.

## ⚙️ Prerequisites

For QBasic Nexus to compile your code using your QB64 installation, ensure QB64 is correctly set up on your system.

*   **All Systems (Windows, macOS, Linux)**:
    *   **QB64 Must Be Installed**: You need to have a working installation of QB64 (preferably QB64 Phoenix Edition from [qb64.com](https://qb64.com/)).
    *   The extension will attempt to auto-detect it. If not found, you'll need to set the path manually (see Configuration section).

*   **macOS (If QB64 requires it)**:
    *   **Xcode Command Line Tools** must be installed if your QB64 version depends on them for C++ compilation.
    *   To install: `xcode-select --install`

*   **Linux (Debian/Ubuntu-based, if QB64 requires it)**:
    *   The **build-essential** package (which includes `g++`) must be installed if your QB64 version depends on it.
    *   To install: `sudo apt-get update && sudo apt-get install build-essential`

*(Note: QB64 Phoenix Edition for Windows typically includes its own MinGW C++ compiler, so no extra C++ tools are usually needed on Windows.)*

## 🚀 Getting Started

1.  **Install QB64**: If you haven't already, download and install QB64 from [https://qb64.com/](https://qb64.com/).
2.  **Install this Extension**: Find "QBasic Nexus" in the VS Code Marketplace and install it.
3.  **Compiler Path Configuration (If Needed)**:
    *   On first activation (or if the path is not set), the extension will try to auto-detect your QB64 installation.
    *   If successful, and you confirm by clicking "Yes, use this path" in the notification, the path will be saved in your global settings.
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
    *   **Action**: Compiles the file. If successful, it runs the program in a new "QBasic Nexus: Run Output" integrated terminal.
    *   **Accessed via**: Command Palette, Right-click context menu.

## 📄 Understanding the Output

*   **Output Panel ("QBasic Nexus Compiler" channel)**:
    *   Shows auto-detection attempts, compiler path information, the exact command being executed, and detailed compilation logs (COMPILE SUCCESSFUL ✅ or COMPILE FAILED ❌, error messages from QB64).
*   **Terminal Panel ("QBasic Nexus: Run Output" tab)**:
    *   Displays the output of your running QBasic program (e.g., from `PRINT` statements) when using "Compile & Run".
*   **Executable File**:
    *   Created in the same directory as your source `.bas` or `.bi` file.

## 🛠️ Configuration

You can configure the extension via VS Code Settings:

*   **Setting ID**: `qbasic-nexus.compilerPath`
    *   **Description**: Full path to your QB64 executable.
        *   Examples:
            *   Windows: `C:\QB64\qb64.exe`
            *   macOS: `/Applications/qb64/qb64` or `~/qb64/qb64`
            *   Linux: `/usr/local/bin/qb64` or `~/qb64/qb64`
        *   Leave empty to trigger auto-detection on startup/setting change (may not always find it if installed in a non-standard location).

*   **Setting ID**: `qbasic-nexus.compilerArgs`
    *   **Description**: Optional additional arguments to pass to the QB64 compiler (e.g., `-w` for more warnings, `-g` for debug symbols, `-prof` for profiling). Arguments should be space-separated.
    *   **Default**: Empty (no additional arguments).

Search for "QBasic Nexus" in VS Code Settings to find these options.

## 🆘 Troubleshooting

If you encounter issues while compiling, try these steps:

1.  **Check the "QBasic Nexus Compiler" Output Panel**:
    *   This is the first place to look! It provides detailed logs from the compilation process and often contains error messages that point to the root cause.
    *   Press `Ctrl+Shift+U` (or `Cmd+Shift+U` on Mac) to open the Output panel, then select "QBasic Nexus Compiler" from the dropdown.

2.  **Issue: "ERROR: C++ compilation failed. Check ./internal/temp/compilelog.txt for details." (Common on Linux/macOS)**
    *   **Cause:** QB64 successfully translated your QBasic code to C++, but it failed to compile that C++ code into an executable. This usually means:
        *   **C++ Compiler Not Installed/Configured:**
            *   **Linux:** Ensure `build-essential` (which includes `g++`) is installed: `sudo apt-get install build-essential`.
            *   **macOS:** Ensure `Xcode Command Line Tools` are installed: `xcode-select --install`.
        *   **C++ Compiler Issues:** Your `g++` or `clang` (on macOS) might be an incompatible version, or there might be PATH configuration problems.
    *   **Solution:**
        1.  **Examine `compilelog.txt`**: This log file is located within your **QB64 installation directory**, inside the `internal/temp/` subfolder (e.g., if QB64 is at `/home/user/qb64/`, the log is at `/home/user/qb64/internal/temp/compilelog.txt`).
        2.  Open this log file and look for specific error messages from `g++` or `clang`.
        3.  If unsure, search for these error messages online or ask in QB64 communities.

3.  **Issue: "QB64 compiler path is not set." or "QB64 compiler not found at the specified path."**
    *   **Cause:** The extension cannot find your QB64 executable.
    *   **Solution:**
        1.  Ensure you have QB64 installed correctly.
        2.  Go to VS Code Settings (search for "QBasic Nexus Compiler Path") and enter the correct, full path to your `qb64.exe` (Windows) or `qb64` (Linux/macOS) file.
        3.  Double-check the path for typos and ensure the file exists at that location.

4.  **Issue: "Failed to set execute permission on QB64" (Common on Linux/macOS with bundled version - less likely with external compiler)**
    *   **Cause:** The QB64 executable file doesn't have execute permissions.
    *   **Solution (Manual Fix):** Open your terminal, navigate to your QB64 installation directory, and run:
        ```sh
        chmod +x ./qb64
        ```
        (This is what QB64's `setup_lnx.sh` or `setup_osx.command` scripts typically do).

5.  **Other Issues:**
    *   Ensure your QBasic code itself has no syntax errors.
    *   Try compiling your `.bas` file directly from the QB64 IDE (if available) to see if it compiles वहां (there) normally. This can help isolate whether the issue is with the code, QB64, or the extension's interaction.

If you still face issues, please open an issue on the [GitHub Repository](https://github.com/thirawat27/qbasic-nexus) (replace with your actual repository URL) and include the full logs from the "QBasic Nexus Compiler" Output Panel and the `compilelog.txt` file (if applicable).

## 📄 License

```

MIT License

Copyright (c) 2025 Thirawat Sinlapasomsak (Replace with your name/year)

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