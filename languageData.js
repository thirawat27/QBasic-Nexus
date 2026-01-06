/**
 * QBasic Nexus - Language Data
 * =============================
 * Keyword and function definitions for IntelliSense features.
 * 
 * @author Thirawat27
 * @version 1.0.6
 * @license MIT
 */

'use strict';

// ============================================================================
// KEYWORDS
// ============================================================================

const KEYWORDS = {
    // I/O
    PRINT: { label: 'PRINT', detail: 'Output text to the screen' },
    INPUT: { label: 'INPUT', detail: 'Get user input from keyboard' },
    CLS: { label: 'CLS', detail: 'Clear the screen' },
    LOCATE: { label: 'LOCATE', detail: 'Position the cursor at row, column' },
    COLOR: { label: 'COLOR', detail: 'Set foreground and background colors' },
    CSRLIN: { label: 'CSRLIN', detail: 'Returns current cursor row' },
    POS: { label: 'POS', detail: 'Returns current cursor column' },
    BEEP: { label: 'BEEP', detail: 'Produce a beep sound' },

    // Control Flow
    IF: { label: 'IF', detail: 'Conditional statement' },
    THEN: { label: 'THEN', detail: 'Execute if condition is true' },
    ELSE: { label: 'ELSE', detail: 'Alternative branch' },
    ELSEIF: { label: 'ELSEIF', detail: 'Additional condition' },
    END: { label: 'END', detail: 'End a block or program' },
    SELECT: { label: 'SELECT', detail: 'Multi-way branch' },
    CASE: { label: 'CASE', detail: 'Define a case' },
    STOP: { label: 'STOP', detail: 'Stop program execution' },
    SYSTEM: { label: 'SYSTEM', detail: 'Exit program and return to OS' },

    // Loops
    FOR: { label: 'FOR', detail: 'Counting loop' },
    TO: { label: 'TO', detail: 'Loop end value' },
    STEP: { label: 'STEP', detail: 'Loop increment' },
    NEXT: { label: 'NEXT', detail: 'End FOR loop' },
    DO: { label: 'DO', detail: 'Begin DO loop' },
    LOOP: { label: 'LOOP', detail: 'End DO loop' },
    WHILE: { label: 'WHILE', detail: 'Loop while condition' },
    WEND: { label: 'WEND', detail: 'End WHILE loop' },
    UNTIL: { label: 'UNTIL', detail: 'Loop until condition' },
    EXIT: { label: 'EXIT', detail: 'Exit loop/sub/function early' },

    // Variables
    DIM: { label: 'DIM', detail: 'Declare variable/array' },
    AS: { label: 'AS', detail: 'Specify data type' },
    CONST: { label: 'CONST', detail: 'Define constant' },
    SHARED: { label: 'SHARED', detail: 'Share variable with procedures' },
    STATIC: { label: 'STATIC', detail: 'Preserve value between calls' },
    COMMON: { label: 'COMMON', detail: 'Share variables between modules' },
    LET: { label: 'LET', detail: 'Assign value to variable' },
    REDIM: { label: 'REDIM', detail: 'Re-dimension dynamic array' },
    PRESERVE: { label: 'PRESERVE', detail: 'Keep data when using REDIM' },
    ERASE: { label: 'ERASE', detail: 'Clear array' },

    // Data Types
    INTEGER: { label: 'INTEGER', detail: '16-bit signed integer (-32768 to 32767)' },
    LONG: { label: 'LONG', detail: '32-bit signed integer' },
    SINGLE: { label: 'SINGLE', detail: '32-bit floating point' },
    DOUBLE: { label: 'DOUBLE', detail: '64-bit floating point' },
    STRING: { label: 'STRING', detail: 'Text string type' },
    _BIT: { label: '_BIT', detail: 'QB64: 1-bit value' },
    _BYTE: { label: '_BYTE', detail: 'QB64: 8-bit signed integer' },
    _INTEGER64: { label: '_INTEGER64', detail: 'QB64: 64-bit integer' },
    _FLOAT: { label: '_FLOAT', detail: 'QB64: Extended precision float' },
    _UNSIGNED: { label: '_UNSIGNED', detail: 'QB64: Unsigned number modifier' },

    // Procedures
    SUB: { label: 'SUB', detail: 'Define subroutine' },
    FUNCTION: { label: 'FUNCTION', detail: 'Define function' },
    CALL: { label: 'CALL', detail: 'Call subroutine' },
    RETURN: { label: 'RETURN', detail: 'Return from GOSUB' },
    DECLARE: { label: 'DECLARE', detail: 'Declare SUB or FUNCTION' },
    BYVAL: { label: 'BYVAL', detail: 'Pass parameter by value' },
    BYREF: { label: 'BYREF', detail: 'Pass parameter by reference' },

    // Data Statements
    DATA: { label: 'DATA', detail: 'Store data values' },
    READ: { label: 'READ', detail: 'Read data values' },
    RESTORE: { label: 'RESTORE', detail: 'Reset data pointer' },

    // Operators
    AND: { label: 'AND', detail: 'Logical/bitwise AND' },
    OR: { label: 'OR', detail: 'Logical/bitwise OR' },
    NOT: { label: 'NOT', detail: 'Logical/bitwise NOT' },
    XOR: { label: 'XOR', detail: 'Logical/bitwise XOR' },
    MOD: { label: 'MOD', detail: 'Modulo operator' },
    IMP: { label: 'IMP', detail: 'Logical implication' },
    EQV: { label: 'EQV', detail: 'Logical equivalence' },

    // Branching
    GOTO: { label: 'GOTO', detail: 'Jump to label' },
    GOSUB: { label: 'GOSUB', detail: 'Call subroutine at label' },
    ON: { label: 'ON', detail: 'Branch on value or event' },

    // File I/O
    OPEN: { label: 'OPEN', detail: 'Open a file' },
    CLOSE: { label: 'CLOSE', detail: 'Close a file' },
    PRINT_HASH: { label: 'PRINT #', detail: 'Write to file' },
    INPUT_HASH: { label: 'INPUT #', detail: 'Read from file' },
    LINE_INPUT: { label: 'LINE INPUT', detail: 'Read entire line' },
    WRITE: { label: 'WRITE', detail: 'Write data to file' },
    GET: { label: 'GET', detail: 'Read from random access file' },
    PUT: { label: 'PUT', detail: 'Write to random access file' },
    SEEK: { label: 'SEEK', detail: 'Set file position' },
    LOC: { label: 'LOC', detail: 'Get file position' },
    LOF: { label: 'LOF', detail: 'Get file length' },
    EOF: { label: 'EOF', detail: 'Check end of file' },
    KILL: { label: 'KILL', detail: 'Delete file' },
    NAME: { label: 'NAME', detail: 'Rename file' },
    FILES: { label: 'FILES', detail: 'List directory' },
    MKDIR: { label: 'MKDIR', detail: 'Create directory' },
    RMDIR: { label: 'RMDIR', detail: 'Remove directory' },
    CHDIR: { label: 'CHDIR', detail: 'Change directory' },

    // Graphics
    SCREEN: { label: 'SCREEN', detail: 'Set screen mode' },
    PSET: { label: 'PSET', detail: 'Set pixel color' },
    PRESET: { label: 'PRESET', detail: 'Reset pixel' },
    LINE: { label: 'LINE', detail: 'Draw line or box' },
    CIRCLE: { label: 'CIRCLE', detail: 'Draw circle or ellipse' },
    PAINT: { label: 'PAINT', detail: 'Fill area with color' },
    DRAW: { label: 'DRAW', detail: 'Draw using string commands' },
    POINT: { label: 'POINT', detail: 'Get pixel color' },
    VIEW: { label: 'VIEW', detail: 'Set viewport' },
    WINDOW: { label: 'WINDOW', detail: 'Set world coordinates' },
    PALETTE: { label: 'PALETTE', detail: 'Set palette colors' },
    PCOPY: { label: 'PCOPY', detail: 'Copy screen page' },

    // Sound
    SOUND: { label: 'SOUND', detail: 'Play sound' },
    PLAY: { label: 'PLAY', detail: 'Play music string' },

    // Type/Structure
    TYPE: { label: 'TYPE', detail: 'Define user type' },

    // Misc
    SLEEP: { label: 'SLEEP', detail: 'Pause execution' },
    TIMER: { label: 'TIMER', detail: 'Seconds since midnight' },
    REM: { label: 'REM', detail: 'Comment line' },
    SWAP: { label: 'SWAP', detail: 'Exchange values of two variables' },
    DEF: { label: 'DEF', detail: 'Define user function (legacy)' },
    RANDOMIZE: { label: 'RANDOMIZE', detail: 'Seed random number generator' },
    OPTION: { label: 'OPTION', detail: 'Set compiler options' },
    BASE: { label: 'BASE', detail: 'Set array base (0 or 1)' },

    // Error Handling
    ON_ERROR: { label: 'ON ERROR', detail: 'Set error handler' },
    RESUME: { label: 'RESUME', detail: 'Resume after error' },
    ERR: { label: 'ERR', detail: 'Error code' },
    ERL: { label: 'ERL', detail: 'Error line number' },
    ERROR: { label: 'ERROR', detail: 'Simulate error' },

    // QB64 Specific
    _TITLE: { label: '_TITLE', detail: 'QB64: Set window title' },
    _FULLSCREEN: { label: '_FULLSCREEN', detail: 'QB64: Toggle fullscreen' },
    _NEWIMAGE: { label: '_NEWIMAGE', detail: 'QB64: Create new image' },
    _LOADIMAGE: { label: '_LOADIMAGE', detail: 'QB64: Load image file' },
    _PUTIMAGE: { label: '_PUTIMAGE', detail: 'QB64: Display image' },
    _FREEIMAGE: { label: '_FREEIMAGE', detail: 'QB64: Free image memory' },
    _COPYIMAGE: { label: '_COPYIMAGE', detail: 'QB64: Copy image' },
    _SOURCE: { label: '_SOURCE', detail: 'QB64: Set source image' },
    _DEST: { label: '_DEST', detail: 'QB64: Set destination image' },
    _DISPLAY: { label: '_DISPLAY', detail: 'QB64: Update display' },
    _SCREENHIDE: { label: '_SCREENHIDE', detail: 'QB64: Hide window' },
    _SCREENSHOW: { label: '_SCREENSHOW', detail: 'QB64: Show window' },
    _DELAY: { label: '_DELAY', detail: 'QB64: Delay in seconds' },
    _LIMIT: { label: '_LIMIT', detail: 'QB64: Limit FPS' },
    _KEYHIT: { label: '_KEYHIT', detail: 'QB64: Get key press' },
    _KEYDOWN: { label: '_KEYDOWN', detail: 'QB64: Check if key is held' },
    _MOUSEINPUT: { label: '_MOUSEINPUT', detail: 'QB64: Update mouse state' },
    _MOUSEX: { label: '_MOUSEX', detail: 'QB64: Mouse X position' },
    _MOUSEY: { label: '_MOUSEY', detail: 'QB64: Mouse Y position' },
    _MOUSEBUTTON: { label: '_MOUSEBUTTON', detail: 'QB64: Check mouse button' },
    _SNDOPEN: { label: '_SNDOPEN', detail: 'QB64: Open sound file' },
    _SNDPLAY: { label: '_SNDPLAY', detail: 'QB64: Play sound' },
    _SNDSTOP: { label: '_SNDSTOP', detail: 'QB64: Stop sound' },
    _SNDCLOSE: { label: '_SNDCLOSE', detail: 'QB64: Close sound' },
    _PRINTSTRING: { label: '_PRINTSTRING', detail: 'QB64: Print at pixel position' },
    _RGB: { label: '_RGB', detail: 'QB64: Create RGB color' },
    _RGBA: { label: '_RGBA', detail: 'QB64: Create RGBA color' },
    _RGB32: { label: '_RGB32', detail: 'QB64: Create 32-bit RGB color' },
    _RGBA32: { label: '_RGBA32', detail: 'QB64: Create 32-bit RGBA color' },
    _FONT: { label: '_FONT', detail: 'QB64: Set font' },
    _LOADFONT: { label: '_LOADFONT', detail: 'QB64: Load font file' },
    _FREEFONT: { label: '_FREEFONT', detail: 'QB64: Free font memory' },
    _FONTHEIGHT: { label: '_FONTHEIGHT', detail: 'QB64: Get font height' },
    _FONTWIDTH: { label: '_FONTWIDTH', detail: 'QB64: Get font width' },
    _PRINTWIDTH: { label: '_PRINTWIDTH', detail: 'QB64: Get text width in pixels' },
    _CLIPBOARD$: { label: '_CLIPBOARD$', detail: 'QB64: Get/set clipboard text' },
    _CONSOLETITLE: { label: '_CONSOLETITLE', detail: 'QB64: Set console title' },
    _OPENHOST: { label: '_OPENHOST', detail: 'QB64: Open network host' },
    _OPENCLIENT: { label: '_OPENCLIENT', detail: 'QB64: Open network client' },
    _CONNECTED: { label: '_CONNECTED', detail: 'QB64: Check network connection' }
};

// ============================================================================
// FUNCTIONS
// ============================================================================

const FUNCTIONS = {
    // String Functions
    'MID$': {
        detail: 'Get substring',
        documentation: '**MID$(string, start, length)**\n\nReturns `length` characters starting at position `start`.\n\n**Example:**\n```qbasic\ns$ = MID$("Hello World", 7, 5)\n\' Result: "World"\n```',
        params: ['string', 'start', 'length']
    },
    'LEFT$': {
        detail: 'Get left characters',
        documentation: '**LEFT$(string, n)**\n\nReturns the first `n` characters from the left.\n\n**Example:**\n```qbasic\ns$ = LEFT$("Hello", 2)\n\' Result: "He"\n```',
        params: ['string', 'n']
    },
    'RIGHT$': {
        detail: 'Get right characters',
        documentation: '**RIGHT$(string, n)**\n\nReturns the last `n` characters from the right.\n\n**Example:**\n```qbasic\ns$ = RIGHT$("Hello", 2)\n\' Result: "lo"\n```',
        params: ['string', 'n']
    },
    'LEN': {
        detail: 'Get string length',
        documentation: '**LEN(string)**\n\nReturns the number of characters in a string.\n\n**Example:**\n```qbasic\nn = LEN("Hello")\n\' Result: 5\n```',
        params: ['string']
    },
    'STR$': {
        detail: 'Number to string',
        documentation: '**STR$(number)**\n\nConverts a number to its string representation.\n\n**Example:**\n```qbasic\ns$ = STR$(123)\n\' Result: " 123" (with leading space for positive)\n```',
        params: ['number']
    },
    'VAL': {
        detail: 'String to number',
        documentation: '**VAL(string)**\n\nConverts a numeric string to a number.\n\n**Example:**\n```qbasic\nn = VAL("123.45")\n\' Result: 123.45\n```',
        params: ['string']
    },
    'UCASE$': {
        detail: 'Uppercase',
        documentation: '**UCASE$(string)**\n\nConverts all letters to uppercase.\n\n**Example:**\n```qbasic\ns$ = UCASE$("Hello")\n\' Result: "HELLO"\n```',
        params: ['string']
    },
    'LCASE$': {
        detail: 'Lowercase',
        documentation: '**LCASE$(string)**\n\nConverts all letters to lowercase.\n\n**Example:**\n```qbasic\ns$ = LCASE$("Hello")\n\' Result: "hello"\n```',
        params: ['string']
    },
    'CHR$': {
        detail: 'ASCII to character',
        documentation: '**CHR$(code)**\n\nReturns the character for an ASCII code.\n\n**Example:**\n```qbasic\ns$ = CHR$(65)\n\' Result: "A"\n```',
        params: ['code']
    },
    'ASC': {
        detail: 'Character to ASCII',
        documentation: '**ASC(string)**\n\nReturns the ASCII code of the first character.\n\n**Example:**\n```qbasic\nn = ASC("A")\n\' Result: 65\n```',
        params: ['string']
    },
    'INSTR': {
        detail: 'Find substring',
        documentation: '**INSTR([start,] string, find)**\n\nReturns the position of a substring. Returns 0 if not found.\n\n**Example:**\n```qbasic\nn = INSTR("Hello World", "World")\n\' Result: 7\n```',
        params: ['start', 'string', 'find']
    },
    'LTRIM$': {
        detail: 'Trim left spaces',
        documentation: '**LTRIM$(string)**\n\nRemoves leading spaces from a string.\n\n**Example:**\n```qbasic\ns$ = LTRIM$("  Hello")\n\' Result: "Hello"\n```',
        params: ['string']
    },
    'RTRIM$': {
        detail: 'Trim right spaces',
        documentation: '**RTRIM$(string)**\n\nRemoves trailing spaces from a string.\n\n**Example:**\n```qbasic\ns$ = RTRIM$("Hello  ")\n\' Result: "Hello"\n```',
        params: ['string']
    },
    'SPACE$': {
        detail: 'Create spaces',
        documentation: '**SPACE$(n)**\n\nReturns a string of `n` spaces.\n\n**Example:**\n```qbasic\ns$ = SPACE$(5)\n\' Result: "     " (5 spaces)\n```',
        params: ['n']
    },
    'STRING$': {
        detail: 'Repeat character',
        documentation: '**STRING$(n, char)**\n\nReturns a string of `n` copies of a character.\n\n**Example:**\n```qbasic\ns$ = STRING$(5, "*")\n\' Result: "*****"\n```',
        params: ['n', 'char']
    },
    'INKEY$': {
        detail: 'Get keyboard input',
        documentation: '**INKEY$**\n\nReturns a key press without waiting. Empty string if no key pressed.\n\n**Example:**\n```qbasic\nk$ = INKEY$\nIF k$ = CHR$(27) THEN END\n```',
        params: []
    },
    'TAB': {
        detail: 'Tab to column',
        documentation: '**TAB(column)**\n\nMoves cursor to specified column in PRINT statement.\n\n**Example:**\n```qbasic\nPRINT "Name"; TAB(20); "Score"\n```',
        params: ['column']
    },
    'SPC': {
        detail: 'Print spaces',
        documentation: '**SPC(n)**\n\nPrints `n` spaces in PRINT statement.\n\n**Example:**\n```qbasic\nPRINT "A"; SPC(5); "B"\n```',
        params: ['n']
    },
    'LSET': {
        detail: 'Left-justify string',
        documentation: '**LSET var$ = string$**\n\nLeft-justifies string in fixed-length variable.',
        params: ['var$', 'string$']
    },
    'RSET': {
        detail: 'Right-justify string',
        documentation: '**RSET var$ = string$**\n\nRight-justifies string in fixed-length variable.',
        params: ['var$', 'string$']
    },
    'HEX$': {
        detail: 'Decimal to hexadecimal',
        documentation: '**HEX$(number)**\n\nConverts a number to hexadecimal string.\n\n**Example:**\n```qbasic\ns$ = HEX$(255)\n\' Result: "FF"\n```',
        params: ['number']
    },
    'OCT$': {
        detail: 'Decimal to octal',
        documentation: '**OCT$(number)**\n\nConverts a number to octal string.\n\n**Example:**\n```qbasic\ns$ = OCT$(64)\n\' Result: "100"\n```',
        params: ['number']
    },

    // Math Functions
    'ABS': {
        detail: 'Absolute value',
        documentation: '**ABS(n)**\n\nReturns the absolute value of a number.\n\n**Example:**\n```qbasic\nn = ABS(-5)\n\' Result: 5\n```',
        params: ['n']
    },
    'INT': {
        detail: 'Integer (floor)',
        documentation: '**INT(n)**\n\nReturns the largest integer less than or equal to `n`.\n\n**Example:**\n```qbasic\nn = INT(3.7)\n\' Result: 3\nn = INT(-3.7)\n\' Result: -4\n```',
        params: ['n']
    },
    'FIX': {
        detail: 'Truncate',
        documentation: '**FIX(n)**\n\nTruncates toward zero (removes decimal part).\n\n**Example:**\n```qbasic\nn = FIX(-3.7)\n\' Result: -3\n```',
        params: ['n']
    },
    'SGN': {
        detail: 'Sign',
        documentation: '**SGN(n)**\n\nReturns the sign of a number: -1, 0, or 1.\n\n**Example:**\n```qbasic\nn = SGN(-5)\n\' Result: -1\n```',
        params: ['n']
    },
    'SQR': {
        detail: 'Square root',
        documentation: '**SQR(n)**\n\nReturns the square root of a number.\n\n**Example:**\n```qbasic\nn = SQR(16)\n\' Result: 4\n```',
        params: ['n']
    },
    'RND': {
        detail: 'Random number',
        documentation: '**RND[(n)]**\n\nReturns a random number between 0 and 1.\n\n**Example:**\n```qbasic\nRANDOMIZE TIMER\nn = INT(RND * 100) + 1 \' 1 to 100\n```',
        params: []
    },
    'SIN': {
        detail: 'Sine',
        documentation: '**SIN(radians)**\n\nReturns the sine of an angle in radians.\n\n**Example:**\n```qbasic\nn = SIN(3.14159 / 2)\n\' Result: ~1\n```',
        params: ['radians']
    },
    'COS': {
        detail: 'Cosine',
        documentation: '**COS(radians)**\n\nReturns the cosine of an angle in radians.\n\n**Example:**\n```qbasic\nn = COS(0)\n\' Result: 1\n```',
        params: ['radians']
    },
    'TAN': {
        detail: 'Tangent',
        documentation: '**TAN(radians)**\n\nReturns the tangent of an angle in radians.\n\n**Example:**\n```qbasic\nn = TAN(0.785398) \' ~45 degrees\n\' Result: ~1\n```',
        params: ['radians']
    },
    'ATN': {
        detail: 'Arctangent',
        documentation: '**ATN(n)**\n\nReturns the arctangent of a number in radians.\n\n**Example:**\n```qbasic\nPI = 4 * ATN(1)\n```',
        params: ['n']
    },
    'LOG': {
        detail: 'Natural log',
        documentation: '**LOG(n)**\n\nReturns the natural logarithm (base e).\n\n**Example:**\n```qbasic\nn = LOG(2.71828)\n\' Result: ~1\n```',
        params: ['n']
    },
    'EXP': {
        detail: 'Exponential',
        documentation: '**EXP(n)**\n\nReturns e raised to the power of n.\n\n**Example:**\n```qbasic\nn = EXP(1)\n\' Result: ~2.71828\n```',
        params: ['n']
    },
    'CINT': {
        detail: 'Convert to integer',
        documentation: '**CINT(n)**\n\nConverts a number to the nearest integer (rounds).\n\n**Example:**\n```qbasic\nn = CINT(3.6)\n\' Result: 4\n```',
        params: ['n']
    },
    'CLNG': {
        detail: 'Convert to long',
        documentation: '**CLNG(n)**\n\nConverts a number to a long integer.\n\n**Example:**\n```qbasic\nn& = CLNG(123456.7)\n\' Result: 123457\n```',
        params: ['n']
    },
    'CSNG': {
        detail: 'Convert to single',
        documentation: '**CSNG(n)**\n\nConverts a number to single-precision float.\n\n**Example:**\n```qbasic\nn! = CSNG(123.456789)\n```',
        params: ['n']
    },
    'CDBL': {
        detail: 'Convert to double',
        documentation: '**CDBL(n)**\n\nConverts a number to double-precision float.\n\n**Example:**\n```qbasic\nn# = CDBL(123.456789)\n```',
        params: ['n']
    },

    // Array Functions
    'LBOUND': {
        detail: 'Lower bound',
        documentation: '**LBOUND(array[, dimension])**\n\nReturns the lower bound of an array.\n\n**Example:**\n```qbasic\nDIM a(10 TO 20)\nn = LBOUND(a)\n\' Result: 10\n```',
        params: ['array', 'dimension']
    },
    'UBOUND': {
        detail: 'Upper bound',
        documentation: '**UBOUND(array[, dimension])**\n\nReturns the upper bound of an array.\n\n**Example:**\n```qbasic\nDIM a(10 TO 20)\nn = UBOUND(a)\n\' Result: 20\n```',
        params: ['array', 'dimension']
    },

    // System Functions
    'TIMER': {
        detail: 'Seconds since midnight',
        documentation: '**TIMER**\n\nReturns the number of seconds since midnight.\n\n**Example:**\n```qbasic\nstart! = TIMER\n\' ... do something ...\nelapsed! = TIMER - start!\n```',
        params: []
    },
    'DATE$': {
        detail: 'Current date',
        documentation: '**DATE$**\n\nReturns the current date as MM-DD-YYYY.\n\n**Example:**\n```qbasic\nd$ = DATE$\nPRINT d$\n```',
        params: []
    },
    'TIME$': {
        detail: 'Current time',
        documentation: '**TIME$**\n\nReturns the current time as HH:MM:SS.\n\n**Example:**\n```qbasic\nt$ = TIME$\nPRINT t$\n```',
        params: []
    },
    'COMMAND$': {
        detail: 'Command line args',
        documentation: '**COMMAND$[(n)]**\n\nReturns command line arguments.\n\n**Example:**\n```qbasic\nargs$ = COMMAND$\nPRINT "Arguments: "; args$\n```',
        params: ['n']
    },
    'ENVIRON$': {
        detail: 'Environment variable',
        documentation: '**ENVIRON$(varname)**\n\nReturns the value of an environment variable.\n\n**Example:**\n```qbasic\npath$ = ENVIRON$("PATH")\n```',
        params: ['varname']
    },
    'SHELL': {
        detail: 'Run system command',
        documentation: '**SHELL [command$]**\n\nExecutes a system command.\n\n**Example:**\n```qbasic\nSHELL "dir"\n```',
        params: ['command$']
    },

    // File Functions
    'FREEFILE': {
        detail: 'Next free file number',
        documentation: '**FREEFILE**\n\nReturns the next available file number.\n\n**Example:**\n```qbasic\nf% = FREEFILE\nOPEN "data.txt" FOR INPUT AS #f%\n```',
        params: []
    },
    'FILEATTR': {
        detail: 'File attribute',
        documentation: '**FILEATTR(filenumber, attribute)**\n\nReturns file mode or handle.',
        params: ['filenumber', 'attribute']
    },
    'INPUT$': {
        detail: 'Read characters from file',
        documentation: '**INPUT$(n, [#]filenumber)**\n\nReads n characters from a file.\n\n**Example:**\n```qbasic\ndata$ = INPUT$(10, #1)\n```',
        params: ['n', 'filenumber']
    },

    // QB64 Specific Functions
    '_SNDLEN': {
        detail: 'Sound length',
        documentation: '**_SNDLEN(handle)**\n\nReturns the length of a sound in seconds.',
        params: ['handle']
    },
    '_SNDGETPOS': {
        detail: 'Sound position',
        documentation: '**_SNDGETPOS(handle)**\n\nReturns the current playback position.',
        params: ['handle']
    },
    '_WIDTH': {
        detail: 'Screen width',
        documentation: '**_WIDTH[(image)]**\n\nReturns the width of the current or specified image.',
        params: ['image']
    },
    '_HEIGHT': {
        detail: 'Screen height',
        documentation: '**_HEIGHT[(image)]**\n\nReturns the height of the current or specified image.',
        params: ['image']
    }
};

// ============================================================================
// QB64 METACOMMANDS
// ============================================================================

module.exports = { KEYWORDS, FUNCTIONS };
