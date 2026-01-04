/**
 * QBasic Nexus - Compiler Constants v1.0.3
 * ======================================
 * Token types, keywords, and built-in function mappings for the compiler.
 * 
 * Production-ready comprehensive QBasic/QB64 support with enhanced
 * function coverage inspired by QBJS.
 * 
 * @author Thirawat27
 * @version 1.0.3
 */

'use strict';

// ============================================================================
// TOKEN TYPES
// ============================================================================

const TokenType = Object.freeze({
    KEYWORD: 'KEYWORD',
    IDENTIFIER: 'IDENTIFIER',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    OPERATOR: 'OPERATOR',
    PUNCTUATION: 'PUNCTUATION',
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
    LABEL: 'LABEL'
});

// ============================================================================
// QBASIC KEYWORDS - Complete list for QBasic and QB64
// ============================================================================

const KEYWORDS = new Set([
    // I/O
    'PRINT', 'INPUT', 'CLS', 'LOCATE', 'COLOR', 'SCREEN', 'WIDTH',
    'WRITE', 'INKEY$', 'CSRLIN', 'POS', 'SPC', 'TAB', 'USING',
    'LPRINT', 'LPOS', 'VIEW', 'PRINT',
    
    // Control Flow
    'IF', 'THEN', 'ELSE', 'ELSEIF', 'END', 'SELECT', 'CASE',
    'FOR', 'TO', 'STEP', 'NEXT', 'DO', 'LOOP', 'WHILE', 'WEND', 'UNTIL',
    'EXIT', 'GOTO', 'GOSUB', 'RETURN', 'ON', 'STOP', 'SYSTEM', 'RUN',
    'CHAIN', 'COMMON', 'SLEEP', 'CONTINUE',
    
    // Procedures
    'SUB', 'FUNCTION', 'CALL', 'DECLARE', 'SHARED', 'STATIC', 'BYVAL', 'BYREF',
    
    // Variables & Data
    'DIM', 'REDIM', 'CONST', 'LET', 'AS', 'DATA', 'READ', 'RESTORE',
    'TYPE', 'SWAP', 'ERASE', 'OPTION', 'BASE', 'PRESERVE',
    'LSET', 'RSET', 'MID$', 'DEF', 'FN',
    
    // Data Types
    'INTEGER', 'LONG', 'SINGLE', 'DOUBLE', 'STRING', 'ANY',
    '_BIT', '_BYTE', '_INTEGER64', '_FLOAT', '_UNSIGNED', '_OFFSET', '_MEM',
    
    // Logical
    'AND', 'OR', 'NOT', 'XOR', 'EQV', 'IMP', 'MOD',
    
    // Misc
    'REM', 'BEEP', 'SOUND', 'PLAY', 'WAIT', 'OUT', 'INP', 'RANDOMIZE',
    'DEF', 'SEG', 'USR',
    
    // File I/O
    'OPEN', 'CLOSE', 'GET', 'PUT', 'SEEK', 'LOF', 'LOC', 'EOF', 'FREEFILE',
    'LOCK', 'UNLOCK', 'NAME', 'KILL', 'MKDIR', 'RMDIR', 'CHDIR', 'FILES',
    'FIELD', 'RESET', 'BINARY', 'RANDOM', 'APPEND', 'OUTPUT', 'ACCESS',
    'SHARED', 'LEN', 'LINE',
    
    // Graphics
    'PSET', 'PRESET', 'CIRCLE', 'PAINT', 'DRAW', 'POINT', 'VIEW', 'WINDOW',
    'PALETTE', 'PCOPY', 'BLOAD', 'BSAVE', 'STEP',
    
    // Error Handling
    'ERROR', 'RESUME', 'ERR', 'ERL',
    
    // Memory
    'PEEK', 'POKE', 'VARPTR', 'VARSEG', 'SADD', 'VARPTR$',
    
    // DEF functions
    'DEFINT', 'DEFLNG', 'DEFSNG', 'DEFDBL', 'DEFSTR',
    
    // QB64 Specific - Screen & Window
    '_TITLE', '_TITLE$', '_FULLSCREEN', '_NEWIMAGE', '_LOADIMAGE', '_FREEIMAGE',
    '_COPYIMAGE', '_PUTIMAGE', '_DEST', '_SOURCE', '_DISPLAY', '_AUTODISPLAY',
    '_LIMIT', '_DELAY', '_SCREENEXISTS', '_WIDTH', '_HEIGHT', '_RESIZE',
    '_RESIZEWIDTH', '_RESIZEHEIGHT', '_SCREENMOVE', '_SCREENPRINT',
    '_PRINTSTRING', '_PRINTWIDTH', '_FONT', '_LOADFONT', '_FREEFONT',
    '_FONTWIDTH', '_FONTHEIGHT', '_SCREENICON', '_SCREENHIDE', '_SCREENSHOW',
    
    // QB64 Specific - Color
    '_RGB', '_RGBA', '_RGB32', '_RGBA32', '_RED', '_GREEN', '_BLUE', '_ALPHA',
    '_CLEARCOLOR', '_SETALPHA', '_DEFAULTCOLOR', '_BACKGROUNDCOLOR',
    '_PALETTECOLOR', '_COPYPALETTE',
    
    // QB64 Specific - Input
    '_KEYHIT', '_KEYDOWN', '_KEYBOARDTYPE', '_DEVICEINPUT', '_LASTWHEEL',
    '_MOUSEINPUT', '_MOUSEX', '_MOUSEY', '_MOUSEBUTTON', '_MOUSEWHEEL',
    '_MOUSEMOVE', '_MOUSESHOW', '_MOUSEHIDE', '_BUTTON', '_BUTTONCHANGE',
    '_AXIS', '_WHEEL', '_DEVICE$', '_DEVICES', '_LASTBUTTON', '_LASTAXIS',
    
    // QB64 Specific - Sound
    '_SNDOPEN', '_SNDPLAY', '_SNDSTOP', '_SNDCLOSE', '_SNDVOL', '_SNDPAUSE',
    '_SNDPLAYING', '_SNDPLAYFILE', '_SNDLOOP', '_SNDBAL', '_SNDRAW', '_SNDRAWLEN',
    '_SNDRATE', '_SNDRAWDONE', '_SNDOPENRAW', '_SNDLEN', '_SNDSETPOS', '_SNDGETPOS',
    
    // QB64 Specific - Memory
    '_MEM', '_MEMIMAGE', '_MEMNEW', '_MEMFREE', '_MEMGET', '_MEMPUT', '_MEMCOPY',
    '_MEMFILL', '_MEMSOUND', '_MEMEXISTS', '_OFFSET',
    
    // QB64 Specific - Network
    '_OPENHOST', '_OPENCLIENT', '_OPENCONNECTION', '_CONNECTED',
    '_CONNECTIONADDRESS$', '_DEVICE', '_DEVICEINPUT',
    
    // QB64 Specific - System
    '_CLIPBOARD$', '_CONTROLCHR', '_CONSOLE', '_CONSOLETITLE', '_CONSOLEINPUT',
    '_EXIT', '_FILEEXISTS', '_DIREXISTS', '_ICON', '_CWD$', '_DIR$', '_STARTDIR$',
    '_OS$', '_SHELL', '_SHELLHIDE', '_DONTWAIT', '_HIDE', '_ACCEPTFILEDROP',
    '_TOTALDROPPEDFILES', '_DROPPEDFILE$', '_FINISHDROP', '_EMBEDDED$',
    '_ENVIRONCOUNT', '_BIN$', '_INSTRREV', '_TRIM$', '_EXPLICIT', '_EXPLICITARRAY',
    '_CONTINUE',
    
    // QB64 Specific - Math
    '_PI', '_ROUND', '_D2R', '_D2G', '_R2D', '_R2G', '_G2D', '_G2R',
    '_ATAN2', '_ASIN', '_ACOS', '_COSH', '_SINH', '_TANH', '_SECH', '_CSCH', '_COTH',
    '_ARCSEC', '_ARCCSC', '_ARCCOT', '_SEC', '_CSC', '_COT', '_HYPOT', '_CEIL',
    
    // QB64 Specific - Data
    '_UNSIGNED', '_FLOAT', '_INTEGER64', '_BIT', '_BYTE', '_OFFSET',
    '_CV', '_CVD', '_CVI', '_CVL', '_CVS', '_MK$', '_MKD$', '_MKI$', '_MKL$', '_MKS$',
    
    // QB64 Specific - Date/Time
    '_DATE$', '_TIME$', '_TIMER', '_YEAR', '_MONTH', '_DAY', '_HOUR',
    '_MINUTE', '_SECOND', '_WEEKDAY'
]);

// ============================================================================
// BUILTIN FUNCTIONS - Enhanced mapping to JavaScript equivalents
// ============================================================================

const BUILTIN_FUNCS = Object.freeze({
    // ========== Math Functions ==========
    'ABS': 'Math.abs',
    'ATN': 'Math.atan',
    'COS': 'Math.cos',
    'EXP': 'Math.exp',
    'INT': 'Math.floor',
    'FIX': 'Math.trunc',
    'LOG': 'Math.log',
    'RND': 'Math.random',
    'SGN': 'Math.sign',
    'SIN': 'Math.sin',
    'SQR': 'Math.sqrt',
    'TAN': 'Math.tan',
    
    // ========== Type Conversion ==========
    'CINT': '(v => { const s = v < 0 ? -1 : 1; const x = Math.abs(v); const r = Math.round(x); return (x % 1 === 0.5 ? r - (r % 2) : r) * s; })',
    'CLNG': '(v => { const s = v < 0 ? -1 : 1; const x = Math.abs(v); const r = Math.round(x); return (x % 1 === 0.5 ? r - (r % 2) : r) * s; })',
    'CSNG': 'Number',
    'CDBL': 'Number',
    'CBOOL': '(v => v ? -1 : 0)',
    
    // ========== String Functions ==========
    'LEN': '(s => String(s).length)',
    'ASC': '(s => s.charCodeAt(0) || 0)',
    'CHR$': 'String.fromCharCode',
    'VAL': '(s => { const n = parseFloat(String(s).trim()); return isNaN(n) ? 0 : n; })',
    'STR$': '(n => n >= 0 ? " " + String(n) : String(n))',
    'HEX$': '(n => Math.abs(Math.floor(n)).toString(16).toUpperCase())',
    'OCT$': '(n => Math.abs(Math.floor(n)).toString(8))',
    
    'LEFT$': '((s, n) => String(s).slice(0, Math.max(0, n)))',
    'RIGHT$': '((s, n) => { s = String(s); return n >= s.length ? s : s.slice(-n); })',
    'MID$': '((s, start, len) => { s = String(s); return len !== undefined ? s.slice(start - 1, start - 1 + len) : s.slice(start - 1); })',
    
    'UCASE$': '(s => String(s).toUpperCase())',
    'LCASE$': '(s => String(s).toLowerCase())',
    'LTRIM$': '(s => String(s).trimStart())',
    'RTRIM$': '(s => String(s).trimEnd())',
    '_TRIM$': '(s => String(s).trim())',
    
    'INSTR': 'INSTR',
    '_INSTRREV': '((s, find, start) => { s = String(s); return start === undefined ? s.lastIndexOf(find) + 1 : s.lastIndexOf(find, start - 1) + 1; })',
    
    'SPACE$': '(n => " ".repeat(Math.max(0, Math.floor(n))))',
    'STRING$': '((n, c) => { const ch = typeof c === "string" ? c : String.fromCharCode(c); return ch.repeat(Math.max(0, Math.floor(n))); })',
    'SPC': '(n => " ".repeat(Math.max(0, Math.floor(n))))',
    'TAB': '(n => " ".repeat(Math.max(0, Math.floor(n) - 1)))',
    
    // ========== Date/Time ==========
    'TIMER': '(() => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000; })',
    'DATE$': '(() => { const d = new Date(); return String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "-" + d.getFullYear(); })',
    'TIME$': '(() => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0"); })',
    
    // ========== QB64 Date/Time ==========
    '_YEAR': '((ts) => ts !== undefined ? new Date(ts * 86400000).getFullYear() : new Date().getFullYear())',
    '_MONTH': '((ts) => ts !== undefined ? new Date(ts * 86400000).getMonth() + 1 : new Date().getMonth() + 1)',
    '_DAY': '((ts) => ts !== undefined ? new Date(ts * 86400000).getDate() : new Date().getDate())',
    '_HOUR': '((ts) => ts !== undefined ? Math.floor((ts % 86400) / 3600) : new Date().getHours())',
    '_MINUTE': '((ts) => ts !== undefined ? Math.floor((ts % 3600) / 60) : new Date().getMinutes())',
    '_SECOND': '((ts) => ts !== undefined ? Math.floor(ts % 60) : new Date().getSeconds())',
    '_WEEKDAY': '((ts) => ts !== undefined ? new Date(ts * 86400000).getDay() + 1 : new Date().getDay() + 1)',
    
    // ========== QB64 Math ==========
    '_PI': '(() => Math.PI)',
    '_D2R': '(d => d * Math.PI / 180)',
    '_R2D': '(r => r * 180 / Math.PI)',
    '_D2G': '(d => d * 10 / 9)',
    '_G2D': '(g => g * 9 / 10)',
    '_R2G': '(r => r * 200 / Math.PI)',
    '_G2R': '(g => g * Math.PI / 200)',
    '_ROUND': '((n, places) => { if (places === undefined) return Math.round(n); const f = Math.pow(10, places); return Math.round(n * f) / f; })',
    '_CEIL': 'Math.ceil',
    '_ATAN2': 'Math.atan2',
    '_ASIN': 'Math.asin',
    '_ACOS': 'Math.acos',
    '_COSH': 'Math.cosh',
    '_SINH': 'Math.sinh',
    '_TANH': 'Math.tanh',
    '_HYPOT': 'Math.hypot',
    '_SEC': '(x => 1 / Math.cos(x))',
    '_CSC': '(x => 1 / Math.sin(x))',
    '_COT': '(x => 1 / Math.tan(x))',
    '_SECH': '(x => 1 / Math.cosh(x))',
    '_CSCH': '(x => 1 / Math.sinh(x))',
    '_COTH': '(x => 1 / Math.tanh(x))',
    '_ARCSEC': '(x => Math.acos(1 / x))',
    '_ARCCSC': '(x => Math.asin(1 / x))',
    '_ARCCOT': '(x => Math.PI / 2 - Math.atan(x))',
    
    // ========== Array Functions ==========
    'LBOUND': '((arr, dim) => 0)',
    'UBOUND': '((arr, dim) => arr.length - 1)',
    
    // ========== System Functions ==========
    'ENVIRON$': '(key => typeof process !== "undefined" && process.env ? process.env[key] || "" : "")',
    'COMMAND$': '(() => typeof process !== "undefined" && process.argv ? process.argv.slice(2).join(" ") : "")',
    
    // ========== File Functions (stubs for web) ==========
    'FREEFILE': '(() => _nextFileNum++)',
    'EOF': '(n => _files[n]?.eof ?? true)',
    'LOF': '(n => _files[n]?.data?.length ?? 0)',
    'LOC': '(n => _files[n]?.pos ?? 0)',
    
    // ========== QB64 System ==========
    '_FILEEXISTS': '(f => false)',
    '_DIREXISTS': '(d => false)',
    '_CWD$': '(() => typeof process !== "undefined" ? process.cwd() : "/")',
    '_OS$': '(() => typeof process !== "undefined" ? process.platform : "web")',
    '_CLIPBOARD$': '(() => "")',
    
    // ========== Boolean Constants ==========
    'TRUE': '(() => -1)',
    'FALSE': '(() => 0)',
    
    // ========== Keyboard Input ==========
    'INKEY$': 'INKEY',
    
    // ========== Screen/Cursor Functions ==========
    'CSRLIN': '(() => typeof window !== "undefined" && window.runtime ? window.runtime.CSRLIN : _cursorRow)',
    'POS': '((n) => typeof window !== "undefined" && window.runtime ? window.runtime.POS : _cursorCol)',
    
    // ========== Binary Functions ==========
    'BIN$': '(n => Math.abs(Math.floor(n)).toString(2))',
    '_BIN$': '(n => Math.abs(Math.floor(n)).toString(2))',
    
    // ========== Color Functions (QB64) ==========
    '_RGB': '((r, g, b) => (255 << 24) | (r << 16) | (g << 8) | b)',
    '_RGBA': '((r, g, b, a) => (a << 24) | (r << 16) | (g << 8) | b)',
    '_RGB32': '((r, g, b) => (255 << 24) | (r << 16) | (g << 8) | b)',
    '_RGBA32': '((r, g, b, a) => (a << 24) | (r << 16) | (g << 8) | b)',
    '_RED': '(c => (c >> 16) & 0xFF)',
    '_GREEN': '(c => (c >> 8) & 0xFF)',
    '_BLUE': '(c => c & 0xFF)',
    '_ALPHA': '(c => (c >> 24) & 0xFF)',
    '_RED32': '(c => (c >> 16) & 0xFF)',
    '_GREEN32': '(c => (c >> 8) & 0xFF)',
    '_BLUE32': '(c => c & 0xFF)',
    '_ALPHA32': '(c => (c >> 24) & 0xFF)',
    
    // ========== Screen Info (QB64) ==========
    '_WIDTH': '((img) => typeof window !== "undefined" && window.runtime ? window.runtime.screenWidth() : 80)',
    '_HEIGHT': '((img) => typeof window !== "undefined" && window.runtime ? window.runtime.screenHeight() : 25)',
    '_FONTHEIGHT': '(() => 16)',
    '_FONTWIDTH': '(() => 8)',
    
    // ========== Additional String Functions ==========
    'INPUT$': '((n, filenum) => { throw new Error("INPUT$ requires file I/O - use QB64 mode"); })',
    'LSET': '((str, len) => String(str).padEnd(len).slice(0, len))',
    'RSET': '((str, len) => String(str).padStart(len).slice(-len))',
    
    // ========== Memory Functions (stubs) ==========
    'PEEK': '((addr) => 0)',
    'VARPTR': '((v) => 0)',
    'VARSEG': '((v) => 0)',
    'SADD': '((s) => 0)',
    
    // ========== Timer Functions (QB64) ==========
    '_TIMER': '((accuracy) => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000; })',
    
    // ========== Sound (stubs for web) ==========
    '_SNDLEN': '((handle) => 0)',
    '_SNDGETPOS': '((handle) => 0)',
    '_SNDPLAYING': '((handle) => 0)',
    
    // ========== Conversion Functions ==========
    '_CV': '((type, str) => 0)',
    '_MK$': '((type, value) => "")'
});

module.exports = {
    TokenType,
    KEYWORDS,
    BUILTIN_FUNCS
};
