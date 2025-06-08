<div align="center">
  <img src="/image/QBasicNexus.png" alt="QBasicNexus Icon" width="250" height="250" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
</div>



This extension bundles the QB64 compiler for Windows, macOS, and Linux, enabling you to get started with QBasic development without any separate installation of QB64.

 <!-- You can replace this with a real screenshot of the extension in action -->

## ✨ Features

*   **Compile & Run**: Compile your QBasic code and run it in the integrated terminal with a single command.
*   **Compile Only**: Compile your code to create a standalone executable file (`.exe` on Windows).
*   **Cross-Platform Support**: Works on Windows, macOS, and Linux.
*   **Bundled Compiler**: No need to install QB64 separately. The necessary compilers are included with the extension.
*   **Status Bar Integration**: Easily access the compile command from an icon in the status bar whenever a `.bas` or `.bi`file is open.
*   **Detailed Output Panel**: View detailed logs, progress, and errors from the compilation process in a dedicated "QB64 Compiler" output channel.
*   **Integrated Terminal Execution**: Runs the compiled program directly in the VS Code integrated terminal.

## ⚙️ Prerequisites

For the bundled QB64 compiler to work correctly, some system-level tools are required.

*   **Windows**:
    *   No prerequisites needed. It works out of the box!

*   **macOS**:
    *   **Xcode Command Line Tools** must be installed.
    *   To install them, open a Terminal and run:
        ```sh
        xcode-select --install
        ```

*   **Linux (Debian/Ubuntu-based)**:
    *   The **build-essential** package (which includes `g++` and other necessary tools) must be installed.
    *   To install it, open a Terminal and run:
        ```sh
        sudo apt-get update && sudo apt-get install build-essential
        ```

## 🚀 Getting Started

1.  Install this extension from the VS Code Marketplace.
2.  Open a QBasic file with a `.bas` or `.bi`  extension.
3.  When a `.bas` or `.bi` file is active, you will see a **`🔥 Compile .BAS (QBasic)`** icon appear in the Status Bar (usually at the bottom-left).
4.  You can execute commands in two ways:

    *   **Method 1: Using the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)**
        *   To **Compile and Run🚀** : Type `QBLegacy.compileAndRun` and press Enter.
        *   To **Compile Only🌀** : Type `QBLegacy.compile` and press Enter.

    *   **Method 2: Clicking the Status Bar Icon**
        *   Clicking the **`🔥 Compile .BAS (QBasic)`** icon in the status bar will trigger the **Compile Only🌀** command.

## 📦 Available Commands

*   `QBLegacy.compile`:
    *   **Title**: Compile QBasic File
    *   **Action**: Compiles the currently active `.bas` or `.bi` file and creates an executable file (e.g., `program.exe` on Windows or `program` on macOS/Linux) in the same directory.

*   `QBLegacy.compileAndRun`:
    *   **Title**: Compile and Run QBasic File
    *   **Action**: First, it compiles the file. If successful, it automatically opens a new terminal named "QB64 Run" and executes the program.

## 📄 Understanding the Output

*   **Output Panel**:
    *   All compilation results (compiler messages, COMPILE SUCCESSFUL `✅` or COMPILE FAILED `❌` status) are displayed in the **Output** panel under the **"QB64 Compiler"** channel.
    *   If compilation fails, this panel will provide detailed error messages to help you debug your code.

*   **Terminal Panel**:
    *   When using the "Compile and Run" command, the output from your running QBasic program (e.g., from `PRINT` statements) will be displayed in the **Terminal** panel under the **"QB64 Run"** tab.

*   **Executable File**:
    *   The compiled application file will be created in the same directory as your source `.bas` or `.bi` file.

## 🛠️ Configuration

This extension is currently not configurable. All settings are pre-defined for ease of use.

## 📄 License

This theme is licensed under the MIT License:


```
MIT License

Copyright (c) 2025 Tiny BMI API

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