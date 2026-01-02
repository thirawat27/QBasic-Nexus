<div align="center">
  <img src="./image/QBasicNexus.png" alt="QBasicNexus Icon" width="220" height="220" />
</div>
<div align="center">
  <h1>QBasic Nexus ⚙️</h1>
  <p><strong>The Ultimate QBasic/QB64 Development Environment for VS Code</strong></p>
  <p>Version 1.0.2</p>
</div>

<p>
A powerful, feature-rich extension that transforms VS Code into a complete QBasic/QB64 IDE. Get syntax highlighting, intelligent code completion, real-time error checking, code folding, refactoring tools, and seamless compilation - all in one package.
</p>

<br>

## 📖 Table of Contents

- [Features](#-features)
- [Quick Start Guide](#-quick-start-guide)
- [Usage Examples](#-usage-examples)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Configuration](#%EF%B8%8F-configuration)
- [Snippets Reference](#-snippets-reference)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

<br>

## ✨ Features

### 🔧 Dual Compilation Modes

QBasic Nexus offers two ways to run your code:

| Mode | Description | Best For |
|------|-------------|----------|
| **QB64 Mode** | Compile to native executable using QB64 | Production, performance-critical apps |
| **Internal JS Transpiler** | Convert to JavaScript and run via Node.js | Quick testing, when QB64 is unavailable |

**Example - Switching Modes:**

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "QBasic Nexus Compiler Mode"
3. Choose your preferred mode

### 🚀 Compile & Run

Run your QBasic programs with a single keystroke!

**Example:**

```qbasic
' Save this as hello.bas
CLS
PRINT "Hello, QBasic Nexus!"
PRINT "Press any key to exit..."
DO: LOOP UNTIL INKEY$ <> ""
```

Then press `F5` to compile and run!

### ✨ IntelliSense & Auto-Completion

Get intelligent suggestions as you type. The extension understands:

- **Keywords**: `IF`, `FOR`, `SUB`, `FUNCTION`, etc.
- **Built-in Functions**: `LEFT$`, `MID$`, `SIN`, `COS`, etc.
- **Your Variables**: Automatically detects DIM declarations
- **Your Procedures**: Shows your SUBs and FUNCTIONs

**Example - Auto-Completion in Action:**

```qbasic
' Type "PRI" and press Ctrl+Space
' You'll see suggestions like:
'   PRINT - Output text to the screen
'   PRINT # - Write to file

' Type "MID" and you'll see:
'   MID$ - Get substring
'   With parameter hints: MID$(string, start, length)
```

### 📁 Code Folding

Collapse code blocks for easier navigation in large files.

**Foldable Blocks:**
- `SUB ... END SUB`
- `FUNCTION ... END FUNCTION`
- `TYPE ... END TYPE`
- `IF ... END IF`
- `FOR ... NEXT`
- `DO ... LOOP`
- `SELECT CASE ... END SELECT`
- Comment blocks

**Example:**

```qbasic
SUB DrawMenu          ' Click the [-] to collapse this entire SUB
    CLS
    PRINT "1. Start Game"
    PRINT "2. Options"
    PRINT "3. Exit"
END SUB               ' The SUB collapses from SUB to END SUB
```

### 🔄 Rename Symbol (F2)

Rename any variable, SUB, or FUNCTION across your entire file with one command.

**Example:**

```qbasic
DIM playerScore AS INTEGER    ' Put cursor on "playerScore"
playerScore = 100             ' Press F2
PRINT playerScore             ' Type "score" and press Enter
                              ' All instances are renamed!
```

**Before:**
```qbasic
DIM playerScore AS INTEGER
playerScore = 100
IF playerScore > 50 THEN PRINT "High score!"
```

**After pressing F2 and typing "score":**
```qbasic
DIM score AS INTEGER
score = 100
IF score > 50 THEN PRINT "High score!"
```

### 🔍 Find All References (Shift+F12)

Quickly find everywhere a variable or function is used.

**Example:**

```qbasic
DIM lives AS INTEGER          ' <- Shift+F12 here
lives = 3
IF lives > 0 THEN
    lives = lives - 1         ' All these lines will be listed
    PRINT "Lives: "; lives
END IF
```

### 💡 Document Highlights

When you click on a variable, all other uses of that variable are automatically highlighted.

**Example:**

Click on `score` in line 1, and all `score` references glow:

```qbasic
DIM score AS INTEGER    ' <- Click here
score = 0               ' Highlighted
score = score + 10      ' Both "score" highlighted
PRINT score             ' Highlighted
```

### ⚡ Quick Fix Actions

When you have an error, QBasic Nexus can suggest fixes!

**Example 1 - Missing DIM:**

```qbasic
x = 10    ' Error: 'x' is not defined
```

💡 Quick Fix appears: **"Add 'DIM x'"**

Click it and the code becomes:

```qbasic
DIM x
x = 10
```

**Example 2 - Missing THEN:**

```qbasic
IF score > 100    ' Error: THEN expected
    PRINT "Winner!"
END IF
```

💡 Quick Fix: **"Add 'THEN'"**

### 📦 Extract to SUB

Select multiple lines of code and extract them into a reusable SUB.

**Example - Before:**

```qbasic
CLS
PRINT "════════════════════"
PRINT "    MAIN MENU"
PRINT "════════════════════"
PRINT "1. New Game"
PRINT "2. Exit"
```

**Select lines 2-6, right-click → "Extract to SUB", name it "DrawHeader":**

```qbasic
CLS
CALL DrawHeader

SUB DrawHeader
    PRINT "════════════════════"
    PRINT "    MAIN MENU"
    PRINT "════════════════════"
    PRINT "1. New Game"
    PRINT "2. Exit"
END SUB
```

### 💬 Toggle Comment (Ctrl+/)

Quickly comment or uncomment selected lines.

**Example:**

```qbasic
FOR i = 1 TO 10       ' Select these 3 lines
    PRINT i           ' Press Ctrl+/
NEXT i
```

**Result:**

```qbasic
' FOR i = 1 TO 10
'     PRINT i
' NEXT i
```

Press `Ctrl+/` again to uncomment.

### 📊 Code Statistics

View detailed statistics about your code directly in the status bar.

**What it shows:**
- Total lines of code (excluding comments and blanks)
- Number of SUBs
- Number of FUNCTIONs

**Detailed view** (`Ctrl+Shift+I`):

```
📊 Code Statistics

📄 Lines
- Total: 250
- Code: 180
- Comments: 45
- Blank: 25

🔧 Structures
- SUBs: 8
- FUNCTIONs: 3
- TYPEs: 2
- CONSTs: 5
- DIMs: 15
- Labels: 2

💾 Size: 6.25 KB
```

### 🎨 Syntax Highlighting

Beautiful, accurate syntax highlighting for all QBasic/QB64 constructs:

- **Keywords** in blue
- **Strings** in orange
- **Numbers** in light green
- **Comments** in gray/italic
- **Built-in functions** in purple
- **Operators** in red

### 📋 70+ Code Snippets

Speed up coding with ready-to-use templates!

**Example - Type `gameloop` + Tab:**

```qbasic
' Game Loop Template
DIM running AS INTEGER
running = -1 ' TRUE

DO WHILE running
    ' Handle input
    
    ' Update game state
    
    ' Render
    CLS

    _DISPLAY
    
    ' Check for exit
    IF _KEYHIT = 27 THEN running = 0 ' ESC to exit
    
    _LIMIT 60 ' Limit to 60 FPS
LOOP
```

**Example - Type `menu` + Tab:**

```qbasic
DIM choice AS INTEGER

DO
    CLS
    PRINT "═══════════════════════"
    PRINT "       MAIN MENU"
    PRINT "═══════════════════════"
    PRINT
    PRINT "  1. Option 1"
    PRINT "  2. Option 2"
    PRINT "  3. Option 3"
    PRINT "  0. Exit"
    PRINT
    INPUT "Enter choice: ", choice
    
    SELECT CASE choice
        CASE 1
            ' Handle option 1
        CASE 2
            ' Handle option 2
        CASE 3
            ' Handle option 3
    END SELECT
LOOP UNTIL choice = 0
```

---

## 🚀 Quick Start Guide

### Step 1: Install QB64 (Optional but Recommended)

1. Download QB64 from [qb64phoenix.com](https://www.qb64phoenix.com/)
2. Extract to a folder (e.g., `C:\QB64\`)
3. **macOS/Linux only**: Run the setup script:
   ```sh
   # macOS
   sh ./setup_osx.command
   
   # Linux
   sh ./setup_lnx.sh
   ```

### Step 2: Install QBasic Nexus Extension

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "QBasic Nexus"
4. Click Install

### Step 3: Configure (First Time Only)

1. Open any `.bas` file
2. If QB64 is needed, click the warning in status bar
3. Set the path to your QB64 executable

### Step 4: Write and Run!

Create a new file `test.bas`:

```qbasic
' My First QBasic Program
CLS
PRINT "Welcome to QBasic Nexus!"
PRINT
INPUT "What is your name? ", name$
PRINT
PRINT "Hello, "; name$; "!"
PRINT "Press any key to exit..."
SLEEP
```

Press `F5` to run!

---

## 📝 Usage Examples

### Example 1: Simple Calculator

```qbasic
' Simple Calculator
' Demonstrates INPUT, SELECT CASE, and basic operations

CLS
PRINT "═══════════════════════════════"
PRINT "      SIMPLE CALCULATOR"
PRINT "═══════════════════════════════"
PRINT

INPUT "Enter first number: ", num1
INPUT "Enter second number: ", num2
PRINT
PRINT "Operations: + - * /"
INPUT "Enter operation: ", op$

SELECT CASE op$
    CASE "+"
        result = num1 + num2
    CASE "-"
        result = num1 - num2
    CASE "*"
        result = num1 * num2
    CASE "/"
        IF num2 <> 0 THEN
            result = num1 / num2
        ELSE
            PRINT "Error: Division by zero!"
            END
        END IF
    CASE ELSE
        PRINT "Unknown operation!"
        END
END SELECT

PRINT
PRINT "Result: "; num1; " "; op$; " "; num2; " = "; result
```

### Example 2: Graphics Demo (QB64)

```qbasic
' Graphics Demo - Bouncing Ball
' Requires QB64 mode

SCREEN _NEWIMAGE(800, 600, 32)
_TITLE "Bouncing Ball Demo"

' Ball properties
DIM x AS SINGLE, y AS SINGLE
DIM dx AS SINGLE, dy AS SINGLE
DIM radius AS INTEGER

x = 400: y = 300
dx = 5: dy = 3
radius = 20

DO
    CLS
    
    ' Draw ball
    CIRCLE (x, y), radius, _RGB32(255, 100, 100)
    PAINT (x, y), _RGB32(255, 100, 100), _RGB32(255, 100, 100)
    
    ' Move ball
    x = x + dx
    y = y + dy
    
    ' Bounce off walls
    IF x - radius < 0 OR x + radius > 800 THEN dx = -dx
    IF y - radius < 0 OR y + radius > 600 THEN dy = -dy
    
    _DISPLAY
    _LIMIT 60
LOOP UNTIL _KEYHIT = 27 ' ESC to exit
```

### Example 3: File Operations

```qbasic
' File Operations Example
' Read and write text files

DIM f AS INTEGER
DIM line$ AS STRING

' Write to file
f = FREEFILE
OPEN "notes.txt" FOR OUTPUT AS #f
PRINT #f, "Line 1: Hello, World!"
PRINT #f, "Line 2: QBasic is fun!"
PRINT #f, "Line 3: File I/O example"
CLOSE #f
PRINT "File written successfully!"
PRINT

' Read from file
IF _FILEEXISTS("notes.txt") THEN
    f = FREEFILE
    OPEN "notes.txt" FOR INPUT AS #f
    PRINT "File contents:"
    PRINT "─────────────────────"
    DO UNTIL EOF(f)
        LINE INPUT #f, line$
        PRINT line$
    LOOP
    CLOSE #f
ELSE
    PRINT "File not found!"
END IF
```

### Example 4: Using SUB and FUNCTION

```qbasic
' SUB and FUNCTION Example
' Demonstrates modular programming

DECLARE SUB DrawBox (x1%, y1%, x2%, y2%)
DECLARE FUNCTION Factorial& (n%)

CLS

' Use the DrawBox SUB
CALL DrawBox(5, 2, 40, 10)

' Use the Factorial FUNCTION
PRINT
FOR i = 1 TO 10
    PRINT i; "! = "; Factorial(i)
NEXT i

END

SUB DrawBox (x1%, y1%, x2%, y2%)
    ' Draws a box using ASCII characters
    LOCATE y1%, x1%
    PRINT CHR$(218); STRING$(x2% - x1% - 1, 196); CHR$(191)
    
    FOR row = y1% + 1 TO y2% - 1
        LOCATE row, x1%
        PRINT CHR$(179); SPACE$(x2% - x1% - 1); CHR$(179)
    NEXT row
    
    LOCATE y2%, x1%
    PRINT CHR$(192); STRING$(x2% - x1% - 1, 196); CHR$(217)
END SUB

FUNCTION Factorial& (n%)
    IF n% <= 1 THEN
        Factorial = 1
    ELSE
        Factorial = n% * Factorial(n% - 1)
    END IF
END FUNCTION
```

---

## ⌨️ Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| **Compile & Run** | `F5` | `F5` |
| **Compile Only** | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| **Toggle Comment** | `Ctrl+/` | `Cmd+/` |
| **Rename Symbol** | `F2` | `F2` |
| **Find All References** | `Shift+F12` | `Shift+F12` |
| **Go to Definition** | `F12` or `Ctrl+Click` | `F12` or `Cmd+Click` |
| **Show Code Statistics** | `Ctrl+Shift+I` | `Cmd+Shift+I` |
| **Format Document** | `Shift+Alt+F` | `Shift+Option+F` |
| **Show Suggestions** | `Ctrl+Space` | `Cmd+Space` |
| **Quick Fix** | `Ctrl+.` | `Cmd+.` |

---

## 🛠️ Configuration

Access settings via `File` → `Preferences` → `Settings` → search "QBasic Nexus"

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `compilerPath` | `null` | Full path to QB64 executable |
| `compilerMode` | `QB64 (Recommended)` | Compilation mode |
| `compilerArgs` | `""` | Additional QB64 arguments |
| `enableLinting` | `true` | Real-time syntax checking |
| `lintDelay` | `500` | Milliseconds before linting |
| `autoFormatOnSave` | `false` | Auto-format on save |

### Example Settings (settings.json)

```json
{
    "qbasic-nexus.compilerPath": "C:\\QB64\\qb64.exe",
    "qbasic-nexus.compilerMode": "QB64 (Recommended)",
    "qbasic-nexus.compilerArgs": "-w",
    "qbasic-nexus.enableLinting": true,
    "qbasic-nexus.lintDelay": 300
}
```

---

## 📋 Snippets Reference

Type the prefix and press `Tab` to insert:

### Program Templates

| Prefix | Description |
|--------|-------------|
| `newqb64` | QB64 program template with screen setup |
| `newclassic` | Classic QBasic program template |
| `gameloop` | Game loop with input, update, render |

### Control Structures

| Prefix | Description |
|--------|-------------|
| `if` | IF...THEN...END IF |
| `ifelse` | IF...THEN...ELSE...END IF |
| `ifelseif` | IF...ELSEIF...ELSE...END IF |
| `select` | SELECT CASE block |
| `for` | FOR...NEXT loop |
| `forstep` | FOR...NEXT with STEP |
| `forrev` | FOR...NEXT counting down |
| `dowhile` | DO WHILE...LOOP |
| `dountil` | DO UNTIL...LOOP |
| `while` | WHILE...WEND |

### Procedures

| Prefix | Description |
|--------|-------------|
| `sub` | SUB procedure |
| `subnp` | SUB without parameters |
| `function` | FUNCTION procedure |

### Variables & Types

| Prefix | Description |
|--------|-------------|
| `dim` | DIM array |
| `dim2d` | DIM 2D array |
| `dimvar` | DIM variable |
| `type` | TYPE definition |
| `const` | CONST declaration |

### I/O Operations

| Prefix | Description |
|--------|-------------|
| `print` | PRINT statement |
| `input` | INPUT statement |
| `readfile` | Complete file reading loop |
| `writefile` | Write to file |

### Graphics (QB64)

| Prefix | Description |
|--------|-------------|
| `screensetup` | Screen initialization |
| `line` | Draw line |
| `circle` | Draw circle |
| `box` | Draw box outline |
| `boxf` | Draw filled box |
| `rgb` | _RGB32 color |
| `rgba` | _RGBA32 color |

### Sound & Multimedia (QB64)

| Prefix | Description |
|--------|-------------|
| `loadsound` | Load and play sound |
| `loadfont` | Load TrueType font |
| `qb64image` | Load and display image |

### Utilities

| Prefix | Description |
|--------|-------------|
| `random` | Random number generation |
| `menu` | Complete menu system |
| `yesno` | Yes/No prompt |
| `waitkey` | Wait for keypress |
| `keycheck` | Keyboard input handler |
| `mousecheck` | Mouse input handler |

### Math Functions

| Prefix | Description |
|--------|-------------|
| `pi` | PI constant |
| `deg2rad` | Degrees to radians function |
| `rad2deg` | Radians to degrees function |
| `clamp` | Clamp value function |
| `lerp` | Linear interpolation function |
| `distance2d` | 2D distance function |

---

## 🆘 Troubleshooting

### Common Issues

#### "QB64 compiler path is not set"

**Solution:**
1. Open Settings (`Ctrl+,`)
2. Search "QBasic Nexus Compiler Path"
3. Enter the full path to qb64.exe

**Example paths:**
- Windows: `C:\QB64\qb64.exe`
- macOS: `/Applications/QB64/qb64`
- Linux: `/home/user/qb64/qb64`

#### "C++ compilation failed" (Linux/macOS)

**Cause:** Missing C++ compiler or QB64 not set up.

**Solution:**
```sh
# Install C++ compiler
# Ubuntu/Debian:
sudo apt-get install build-essential

# macOS:
xcode-select --install

# Then run QB64 setup:
cd /path/to/qb64
sh ./setup_lnx.sh    # Linux
sh ./setup_osx.command  # macOS
```

#### Linting is too slow

**Solution:** Increase the lint delay:
1. Open Settings
2. Search "QBasic Nexus Lint Delay"
3. Increase the value (e.g., 1000 ms)

#### IntelliSense not working

**Try these steps:**
1. Reload VS Code (`Ctrl+Shift+P` → "Reload Window")
2. Ensure the file has `.bas`, `.bi`, or `.bm` extension
3. Check that the extension is enabled

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
  <p>Made with ❤️ for the QBasic community</p>
  <p>
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Report Bug</a> •
    <a href="https://github.com/thirawat27/QBasic-Nexus/issues">Request Feature</a>
  </p>
</div>