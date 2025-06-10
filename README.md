
<div align="center">
  <img src="./image/QBasicNexus.png" alt="QBasicNexus Icon" width="220" height="220" />
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

For QBasic Nexus to compile your code, your QB64 installation must be correctly set up.

*   **Step 1: Install QB64 Correctly**
    *   **All Systems**: You need a working installation of QB64 from [qb64.com](https://qb64.com/).
    *   **macOS & Linux (Crucial Setup Step)**: After unzipping the QB64 package, you **must run the setup script** included with it. This is a one-time step that prepares the compiler for use. Open a terminal, navigate to the QB64 directory, and run:
        *   On **macOS**: `sh ./setup_osx.command`
        *   On **Linux**: `sh ./setup_lnx.sh`

*   **Step 2: Ensure C++ Compiler is Available (if QB64 requires it)**
    *   **macOS**: **Xcode Command Line Tools** must be installed. To install: `xcode-select --install`
    *   **Linux (Debian/Ubuntu-based)**: The **build-essential** package (including `g++`) must be installed. To install: `sudo apt-get update && sudo apt-get install build-essential`
    *   *(Note: QB64 Phoenix Edition for Windows typically includes its own C++ compiler, so no extra tools are usually needed.)*

## 🚀 Getting Started

1.  **Install & Set Up QB64**:
    *   a. Download and unzip QB64 from [https://qb64.com/](https://qb64.com/).
    *   b. **(Crucial for macOS/Linux)** Open a terminal, navigate into the unzipped QB64 directory, and run the required setup script:
        *   On **macOS**: `sh ./setup_osx.command`
        *   On **Linux**: `sh ./setup_lnx.sh`
    *   *This step is essential as it configures the compiler. The extension will not work without it.*
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
        *   **QB64 Not Set Up Correctly**: You may have missed running the `setup_lnx.sh` or `setup_osx.command` script after unzipping QB64. See the Prerequisites section.
        *   **C++ Compiler Not Installed/Configured:**
            *   **Linux:** Ensure `build-essential` (which includes `g++`) is installed: `sudo apt-get install build-essential`.
            *   **macOS:** Ensure `Xcode Command Line Tools` are installed: `xcode-select --install`.
    *   **Solution:**
        1.  **Examine `compilelog.txt`**: This log file is located within your **QB64 installation directory**, inside the `internal/temp/` subfolder (e.g., if QB64 is at `/home/user/qb64/`, the log is at `/home/user/qb64/internal/temp/compilelog.txt`).
        2.  Open this log file and look for specific error messages from `g++` or `clang`.
        3.  If unsure, search for these error messages online or ask in QB64 communities.

3.  **Issue: "QB64 compiler path is not set." or "QB64 compiler not found at the specified path."**
    *   **Cause:** The extension cannot find your QB64 executable, or it hasn't been made executable by the setup script on Linux/macOS.
    *   **Solution:**
        1.  Ensure you have installed and **correctly set up** QB64 by running its setup script (see Prerequisites).
        2.  Go to VS Code Settings (search for "QBasic Nexus Compiler Path") and enter the correct, full path to your `qb64.exe` (Windows) or `qb64` (Linux/macOS) file.
        3.  Double-check the path for typos and ensure the file exists at that location.

4.  **Issue: "Failed to set execute permission on QB64" (Common on Linux/macOS)**
    *   **Cause:** The QB64 executable file doesn't have execute permissions. This is normally handled by the setup scripts.
    *   **Solution (Manual Fix):** Run the appropriate setup script (`setup_lnx.sh` or `setup_osx.command`) as described in the Prerequisites section. This is the recommended way. Alternatively, you can manually set the permission:
        ```sh
        chmod +x /path/to/your/qb64/qb64
        ```

5.  **Other Issues:**
    *   Ensure your QBasic code itself has no syntax errors.
    *   Try compiling your `.bas` file directly from the QB64 IDE (if available) to see if it compiles there normally. This can help isolate whether the issue is with the code, QB64, or the extension's interaction.

If you still face issues, please open an issue on the [GitHub Repository Issuse](https://github.com/thirawat27/QBasic-Nexus/issues) (replace with your actual repository URL) and include the full logs from the "QBasic Nexus Compiler" Output Panel and the `compilelog.txt` file (if applicable).

## 📄 License

```

MIT License

Copyright (c) 2025 Thirawat Sinlapasomsak

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