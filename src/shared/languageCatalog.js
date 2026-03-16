'use strict';

const {
  KEYWORDS: COMPILER_KEYWORDS,
  BUILTIN_FUNCS,
} = require('../compiler/constants');

const DATA_TYPE_KEYWORDS = new Set([
  'INTEGER',
  'LONG',
  'SINGLE',
  'DOUBLE',
  'STRING',
  'ANY',
  '_BIT',
  '_BYTE',
  '_INTEGER64',
  '_FLOAT',
  '_UNSIGNED',
  '_OFFSET',
  '_MEM',
]);

const FILE_MODE_KEYWORDS = new Set([
  'APPEND',
  'BINARY',
  'INPUT',
  'OUTPUT',
  'RANDOM',
  'ACCESS',
  'SHARED',
  'LEN',
  'LOCK',
  'UNLOCK',
]);

const CONTROL_FLOW_KEYWORDS = new Set([
  'IF',
  'THEN',
  'ELSE',
  'ELSEIF',
  'END',
  'SELECT',
  'CASE',
  'FOR',
  'TO',
  'STEP',
  'NEXT',
  'DO',
  'LOOP',
  'WHILE',
  'WEND',
  'UNTIL',
  'EXIT',
  'GOTO',
  'GOSUB',
  'RETURN',
  'ON',
  'STOP',
  'SYSTEM',
  'RUN',
  'CHAIN',
  'CONTINUE',
  'RESUME',
  'ERROR',
]);

const DECLARATION_KEYWORDS = new Set([
  'DIM',
  'REDIM',
  'CONST',
  'LET',
  'AS',
  'DATA',
  'READ',
  'RESTORE',
  'TYPE',
  'ERASE',
  'OPTION',
  'BASE',
  'PRESERVE',
  'LSET',
  'RSET',
  'DEF',
  'FN',
  'COMMON',
  'SHARED',
  'STATIC',
  'DECLARE',
  'SUB',
  'FUNCTION',
  'BYVAL',
  'BYREF',
]);

const GRAPHICS_KEYWORDS = new Set([
  'SCREEN',
  'WIDTH',
  'PSET',
  'PRESET',
  'LINE',
  'CIRCLE',
  'PAINT',
  'DRAW',
  'POINT',
  'VIEW',
  'WINDOW',
  'PALETTE',
  'PCOPY',
  'BLOAD',
  'BSAVE',
]);

const IO_KEYWORDS = new Set([
  'PRINT',
  'INPUT',
  'CLS',
  'LOCATE',
  'COLOR',
  'WRITE',
  'LINE',
  'FILES',
  'OPEN',
  'CLOSE',
  'GET',
  'PUT',
  'SEEK',
  'LOF',
  'LOC',
  'EOF',
  'FREEFILE',
  'MKDIR',
  'RMDIR',
  'CHDIR',
  'NAME',
  'KILL',
  'FIELD',
  'RESET',
  'WAIT',
  'OUT',
  'INP',
  'LPRINT',
  'LPOS',
]);

const LOGICAL_KEYWORDS = new Set([
  'AND',
  'OR',
  'NOT',
  'XOR',
  'EQV',
  'IMP',
  'MOD',
]);

const ZERO_ARG_FUNCTIONS = new Set([
  'COMMAND$',
  'DATE$',
  'FREEFILE',
  'INKEY$',
  'TIMER',
  'TIME$',
  '_AUTODISPLAY',
  '_CAPSLOCK',
  '_CLIPBOARD$',
  '_CONNECTED',
  '_CONNECTIONADDRESS$',
  '_CONSOLEINPUT',
  '_CWD$',
  '_DAY',
  '_DEVICE$',
  '_DEVICES',
  '_DONTWAIT',
  '_DROPPEDFILE$',
  '_EMBEDDED$',
  '_ENVIRONCOUNT',
  '_ERRORMESSAGE$',
  '_EXIT',
  '_EXPLICIT',
  '_EXPLICITARRAY',
  '_FILES$',
  '_FULLPATH$',
  '_HIDE',
  '_HOUR',
  '_ICON',
  '_KEYCLEAR',
  '_KEYHIT',
  '_LASTAXIS',
  '_LASTBUTTON',
  '_LASTWHEEL',
  '_MINUTE',
  '_MONTH',
  '_MOUSEINPUT',
  '_MOUSEMOVE',
  '_MOUSEWHEEL',
  '_MOUSEX',
  '_MOUSEY',
  '_NUMLOCK',
  '_OS$',
  '_PI',
  '_SCROLLLOCK',
  '_SECOND',
  '_STARTDIR$',
  '_TIMER',
  '_TIME$',
  '_TITLE$',
  '_TOTALDROPPEDFILES',
  '_WEEKDAY',
  '_YEAR',
]);

const IMPLEMENTATION_ARITY_MAP = Object.freeze({
  'Math.abs': ['number'],
  'Math.acos': ['number'],
  'Math.asin': ['number'],
  'Math.atan': ['number'],
  'Math.atan2': ['y', 'x'],
  'Math.ceil': ['number'],
  'Math.cos': ['number'],
  'Math.cosh': ['number'],
  'Math.exp': ['number'],
  'Math.floor': ['number'],
  'Math.hypot': ['x', 'y'],
  'Math.log': ['number'],
  'Math.sign': ['number'],
  'Math.sin': ['number'],
  'Math.sinh': ['number'],
  'Math.sqrt': ['number'],
  'Math.tan': ['number'],
  'Math.tanh': ['number'],
  Number: ['value'],
  'String.fromCharCode': ['code'],
  INSTR: ['start', 'string', 'find'],
  _capslock: [],
  _connected: [],
  _connectionaddress$: [],
  _consoletitle: ['title'],
  _consoleinput: [],
  _controlchr: ['code'],
  _copyimage: ['image', 'mode'],
  _cwd$: [],
  _day: [],
  _device$: [],
  _devices: [],
  _droppedfile$: [],
  _embedded$: [],
  _environ$: ['name'],
  _environcount: [],
  _errormessage$: [],
  _explicit: [],
  _explicitarray: [],
  _files$: ['path'],
  _finishdrop: [],
  _fullpath$: ['path'],
  _height: ['image'],
  _hypot: ['x', 'y'],
  _keytostr$: ['keyCode'],
  _leftof$: ['text', 'delimiter'],
  _leftoflast$: ['text', 'delimiter'],
  _loadfont: ['path', 'size'],
  _loadimage: ['path', 'mode'],
  _memcopy: ['source', 'offset', 'bytes'],
  _memexists: ['memBlock'],
  _memfree: ['memBlock'],
  _memget: ['memBlock', 'offset', 'target'],
  _memimage: ['image'],
  _memnew: ['bytes'],
  _memput: ['memBlock', 'offset', 'value'],
  _minute: [],
  _mousebutton: ['button'],
  _month: [],
  _newimage: ['width', 'height', 'mode'],
  _openclient: ['host', 'port'],
  _openconnection: ['handle'],
  _openhost: ['port'],
  _rgb: ['red', 'green', 'blue'],
  _rgba: ['red', 'green', 'blue', 'alpha'],
  _rgb32: ['red', 'green', 'blue'],
  _rgba32: ['red', 'green', 'blue', 'alpha'],
  _rightof$: ['text', 'delimiter'],
  _rightoflast$: ['text', 'delimiter'],
  _screenexists: ['handle'],
  _second: [],
  _selectfolderdialog$: ['title'],
  _sndclose: ['handle'],
  _sndgetpos: ['handle'],
  _sndlen: ['handle'],
  _sndloop: ['handle'],
  _sndopen: ['path'],
  _sndopenraw: ['channels', 'sampleRate', 'bytesPerSample'],
  _sndpause: ['handle'],
  _sndplay: ['handle'],
  _sndplayfile: ['path'],
  _sndplaying: ['handle'],
  _sndraw: ['handle', 'sample'],
  _sndrawdone: ['handle'],
  _sndrawlen: ['handle'],
  _sndrate: ['handle'],
  _sndsetpos: ['handle', 'position'],
  _sndstop: ['handle'],
  _sndvol: ['handle', 'volume'],
  _startdir$: [],
  _time$: [],
  _timer: [],
  _title$: [],
  _totaldroppedfiles: [],
  _trim$: ['text'],
  _width: ['image'],
  _weekday: [],
  _year: [],
});

const EXACT_KEYWORD_DETAIL_HINTS = Object.freeze({
  '$ASSERTS': 'Compiler directive that enables or configures assertion support',
  '$CHECKING': 'Compiler directive that controls runtime checking behavior',
  '$COLOR': 'Compiler directive that selects a default console color mode',
  '$CONSOLE': 'Compiler directive that forces console-style output behavior',
  '$DEBUG': 'Compiler directive that enables debug-oriented compilation behavior',
  '$DYNAMIC': 'Compiler directive that makes arrays dynamic by default',
  '$ELSE': 'Compile-time conditional alternative branch',
  '$ELSEIF': 'Compile-time conditional branch with an extra condition',
  '$END IF': 'Compile-time conditional terminator',
  '$IF': 'Compile-time conditional directive',
  '$INCLUDE': 'Compile-time directive that inserts another source file',
  '$STATIC': 'Compiler directive that makes procedure variables static by default',
  ABSOLUTE: 'Declares storage or procedures at a fixed memory location',
  ACCESS: 'OPEN clause that selects file access permissions',
  APPEND: 'OPEN mode that writes new records at the end of a file',
  BINARY: 'OPEN mode for byte-oriented file access',
  CALLS: 'QuickBASIC keyword used when calling external-language procedures',
  CHAIN: 'Stops the current program and loads another program',
  CLEAR: 'Resets variables, arrays, file buffers, and runtime state',
  _CLIPBOARD: 'QB64 clipboard-access keyword',
  _CONTINUE: 'QB64 loop-control keyword that skips to the next iteration',
  _CV: 'QB64 packed-byte conversion keyword',
  _CVD: 'QB64 DOUBLE conversion keyword for packed-byte data',
  _CVI: 'QB64 INTEGER conversion keyword for packed-byte data',
  _CVL: 'QB64 LONG conversion keyword for packed-byte data',
  _CVS: 'QB64 SINGLE conversion keyword for packed-byte data',
  DEFDBL: 'Sets the default type of matching variable names to DOUBLE',
  DEFINT: 'Sets the default type of matching variable names to INTEGER',
  DEFLNG: 'Sets the default type of matching variable names to LONG',
  DEFSNG: 'Sets the default type of matching variable names to SINGLE',
  DEFSTR: 'Sets the default type of matching variable names to STRING',
  ENVIRON: 'Sets an environment variable or command shell value',
  _EXPLICIT: 'QB64 directive or option related to explicit declarations',
  _EXPLICITARRAY: 'QB64 directive or option related to explicit array declarations',
  FIELD: 'Maps fixed-length variables onto a random-file record buffer',
  FRE: 'Returns available memory or string-space information',
  _GETPTR: 'QB64 memory-pointer query keyword',
  _ICON: 'QB64 keyword that sets or queries the application icon',
  _INPOKE: 'QB64 low-level input/output helper keyword',
  _INSTRREV: 'QB64 reverse string-search keyword',
  INTERRUPT: 'Calls a DOS or BIOS interrupt routine',
  INTERRUPTX: 'Calls a DOS or BIOS interrupt routine with extended registers',
  IOCTL: 'Performs low-level device control on an open file handle',
  'IOCTL$': 'Returns a low-level device control string from an open file handle',
  KEY: 'Defines or enables function-key assignments',
  LOCK: 'Applies a file or record lock to an open shared file',
  OUTPUT: 'OPEN mode that recreates a file for writing',
  OPEN: 'Opens a file or device using the requested mode and access rules',
  PEEK: 'Reads a byte from a memory address',
  POKE: 'Writes a byte to a memory address',
  RANDOM: 'OPEN mode for random-access records',
  SADD: 'Returns the address of a string buffer',
  SEG: 'Works with DEF SEG to select a memory segment',
  SPC: 'PRINT helper that inserts a fixed number of spaces',
  STRIG: 'Joystick trigger event keyword',
  TAB: 'PRINT helper that moves to a target column',
  _TAN: 'QB64 tangent helper keyword',
  UNLOCK: 'Releases a file or record lock on an open shared file',
  USING: 'Formatting clause used by PRINT USING and WRITE-style output',
  USR: 'Calls a machine-language routine through a DEF USR entry point',
  VARPTR: 'Returns the address of a variable',
  VARSEG: 'Returns the segment address of a variable',
});

const EXACT_KEYWORD_SYNTAX_HINTS = Object.freeze({
  '$ASSERTS': '$ASSERTS',
  '$CHECKING': '$CHECKING[: setting]',
  '$COLOR': '$COLOR: mode',
  '$CONSOLE': '$CONSOLE',
  '$DEBUG': '$DEBUG',
  '$DYNAMIC': '$DYNAMIC',
  '$ELSE': '$ELSE',
  '$ELSEIF': '$ELSEIF expression',
  '$END IF': '$END IF',
  '$IF': '$IF expression',
  '$INCLUDE': '$INCLUDE: "path/to/file.bi"',
  '$STATIC': '$STATIC',
  ABSOLUTE: 'name ABSOLUTE address',
  ACCESS: 'OPEN fileSpec FOR mode ACCESS {READ|WRITE|READ WRITE} AS #fileNum',
  APPEND: 'OPEN fileSpec FOR APPEND AS #fileNum',
  BINARY: 'OPEN fileSpec FOR BINARY AS #fileNum',
  CALLS: 'CALLS routineName(arguments)',
  CHAIN: 'CHAIN ["programName"[, lineNumber][, ALL][, DELETE range]]',
  CLEAR: 'CLEAR [, stack][, memory][, segment]',
  _CLIPBOARD: '_CLIPBOARD ...',
  _CONTINUE: '_CONTINUE',
  _CV: '_CV(bytes$)',
  _CVD: '_CVD(bytes$)',
  _CVI: '_CVI(bytes$)',
  _CVL: '_CVL(bytes$)',
  _CVS: '_CVS(bytes$)',
  DEFDBL: 'DEFDBL letterRange',
  DEFINT: 'DEFINT letterRange',
  DEFLNG: 'DEFLNG letterRange',
  DEFSNG: 'DEFSNG letterRange',
  DEFSTR: 'DEFSTR letterRange',
  ENVIRON: 'ENVIRON "NAME=value"',
  _EXPLICIT: '_EXPLICIT',
  _EXPLICITARRAY: '_EXPLICITARRAY',
  FIELD: 'FIELD #fileNum, width AS var$[, ...]',
  FRE: 'FRE(argument)',
  _GETPTR: '_GETPTR(...)',
  _ICON: '_ICON ...',
  _INPOKE: '_INPOKE ...',
  _INSTRREV: '_INSTRREV(text$, find$[, start])',
  INTERRUPT: 'INTERRUPT interruptNumber, inRegs, outRegs',
  INTERRUPTX: 'INTERRUPTX interruptNumber, inRegs, outRegs',
  IOCTL: 'IOCTL #fileNum, controlString$',
  'IOCTL$': 'value$ = IOCTL$(#fileNum)',
  KEY: 'KEY option[, string$]',
  LOCK: 'LOCK #fileNum[, record][ TO record2]',
  OPEN: 'OPEN fileSpec FOR mode [ACCESS access] [LOCK lockMode] AS #fileNum [LEN = recordLength]',
  OUTPUT: 'OPEN fileSpec FOR OUTPUT AS #fileNum',
  PEEK: 'value = PEEK(address)',
  POKE: 'POKE address, value',
  RANDOM: 'OPEN fileSpec FOR RANDOM AS #fileNum LEN = recordLength',
  SADD: 'address = SADD(stringVariable$)',
  SEG: 'DEF SEG = segmentAddress',
  SPC: 'PRINT ... SPC(count) ...',
  STRIG: 'STRIG {(n) ON|OFF|STOP}',
  TAB: 'PRINT ... TAB(column) ...',
  _TAN: '_TAN(angle)',
  UNLOCK: 'UNLOCK #fileNum[, record][ TO record2]',
  USING: 'PRINT USING format$; expressionList',
  USR: 'value = USR(argument)',
  VARPTR: 'address = VARPTR(variable)',
  VARSEG: 'segment = VARSEG(variable)',
  'PRINT #': 'PRINT #fileNum, expressionList',
  'INPUT #': 'INPUT #fileNum, variableList',
  'LINE INPUT': 'LINE INPUT [#fileNum,] stringVariable$',
  'ON ERROR': 'ON ERROR GOTO label | ON ERROR RESUME NEXT',
  _MEM: 'memBlock = _MEM(variableOrHandle)',
  _MEMCOPY: '_MEMCOPY sourceMem, sourceOffset TO destMem, destOffset, bytes',
  _MEMGET: '_MEMGET memBlock, offset, destination',
  _MEMPUT: '_MEMPUT memBlock, offset, source',
  _SNDOPEN: 'soundHandle = _SNDOPEN(path$)',
  _SNDPLAY: '_SNDPLAY soundHandle',
  _SNDSTOP: '_SNDSTOP soundHandle',
  _SNDLEN: 'seconds = _SNDLEN(soundHandle)',
  _OPENHOST: 'hostHandle = _OPENHOST(port)',
  _OPENCLIENT: 'clientHandle = _OPENCLIENT(host$, port)',
  _OPENCONNECTION: 'connHandle = _OPENCONNECTION(hostHandle)',
  _CONNECTED: 'state = _CONNECTED(handle)',
});

const EXACT_KEYWORD_EXAMPLE_HINTS = Object.freeze({
  '$INCLUDE': '```qbasic\n$INCLUDE: "common.bi"\n```',
  ABSOLUTE: '```qbasic\nDIM buffer ABSOLUTE &H8000\n```',
  CALLS: '```qbasic\nCALLS FarRoutine(argument%)\n```',
  CHAIN: '```qbasic\nCHAIN "MENU.BAS"\n```',
  CLEAR: '```qbasic\nCLEAR\n```',
  DEFINT: '```qbasic\nDEFINT A-Z\nscore = 10\n```',
  DEFLNG: '```qbasic\nDEFLNG A-Z\nlargeValue = 500000\n```',
  DEFSNG: '```qbasic\nDEFSNG A-Z\nratio = 0.5\n```',
  DEFDBL: '```qbasic\nDEFDBL A-Z\npiApprox = 3.1415926535\n```',
  DEFSTR: '```qbasic\nDEFSTR A-Z\nname = "QBASIC"\n```',
  ENVIRON: '```qbasic\nENVIRON "QBMODE=RETRO"\n```',
  FIELD: '```qbasic\nOPEN "players.dat" FOR RANDOM AS #1 LEN = 32\nFIELD #1, 20 AS name$, 12 AS score$\n```',
  INTERRUPT: '```qbasic\nINTERRUPT &H10, inRegs, outRegs\n```',
  INTERRUPTX: '```qbasic\nINTERRUPTX &H21, inRegs, outRegs\n```',
  IOCTL: '```qbasic\nIOCTL #1, control$\n```',
  'IOCTL$': '```qbasic\nstatus$ = IOCTL$(#1)\n```',
  KEY: '```qbasic\nKEY 1, "LOAD"\n```',
  LOCK: '```qbasic\nOPEN "shared.dat" FOR RANDOM ACCESS READ WRITE LOCK SHARED AS #1 LEN = 32\nLOCK #1, 1 TO 10\n```',
  UNLOCK: '```qbasic\nUNLOCK #1, 1 TO 10\n```',
  OPEN: '```qbasic\nf% = FREEFILE\nOPEN "scores.dat" FOR RANDOM ACCESS READ WRITE AS #f% LEN = 32\n```',
  'PRINT #': '```qbasic\nPRINT #f%, "Alice", 1200\n```',
  'INPUT #': '```qbasic\nINPUT #f%, name$, score\n```',
  'LINE INPUT': '```qbasic\nLINE INPUT #f%, line$\n```',
  'ON ERROR': '```qbasic\nON ERROR GOTO FileError\nOPEN "data.txt" FOR INPUT AS #1\n```',
  PEEK: '```qbasic\nvalue = PEEK(address)\n```',
  POKE: '```qbasic\nPOKE address, 255\n```',
  SPC: '```qbasic\nPRINT "A"; SPC(5); "B"\n```',
  STRIG: '```qbasic\nSTRIG(0) ON\n```',
  TAB: '```qbasic\nPRINT "Name"; TAB(20); "Score"\n```',
  USING: '```qbasic\nPRINT USING "###,###.00"; total!\n```',
  USR: '```qbasic\nresult = USR(argument)\n```',
  VARPTR: '```qbasic\naddr& = VARPTR(myValue)\n```',
  VARSEG: '```qbasic\nsegment% = VARSEG(myArray(0))\n```',
  _MEM: '```qbasic\nDIM block AS _MEM\nblock = _MEM(myArray())\n```',
  _MEMCOPY: '```qbasic\n_MEMCOPY srcMem, 0 TO dstMem, 0, byteCount\n```',
  _MEMGET: '```qbasic\n_MEMGET memBlock, 0, myValue\n```',
  _MEMPUT: '```qbasic\n_MEMPUT memBlock, 0, myValue\n```',
  _SNDOPEN: '```qbasic\nsound& = _SNDOPEN("laser.wav")\n```',
  _SNDPLAY: '```qbasic\n_SNDPLAY sound&\n```',
  _SNDSTOP: '```qbasic\n_SNDSTOP sound&\n```',
  _SNDLEN: '```qbasic\nseconds! = _SNDLEN(sound&)\n```',
  _OPENHOST: '```qbasic\nhost& = _OPENHOST(8080)\n```',
  _OPENCLIENT: '```qbasic\nclient& = _OPENCLIENT("127.0.0.1", 8080)\n```',
  _OPENCONNECTION: '```qbasic\nconn& = _OPENCONNECTION(host&)\n```',
  _CONNECTED: '```qbasic\nIF _CONNECTED(client&) THEN PRINT "Online"\n```',
});

const EXACT_FUNCTION_PARAM_HINTS = Object.freeze({
  BIN$: ['value'],
  CBOOL: ['value'],
  CSRLIN: [],
  CVD: ['bytes$'],
  CVI: ['bytes$'],
  CVL: ['bytes$'],
  CVS: ['bytes$'],
  DIR$: ['filespec'],
  EOF: ['fileNum'],
  ERL: [],
  ERR: [],
  FALSE: [],
  FILEATTR: ['fileNum', 'attribute'],
  FREEFILE: [],
  INP: ['portNumber'],
  INPUT$: ['count', 'fileNum'],
  LOC: ['fileNum'],
  LOF: ['fileNum'],
  MKD$: ['value'],
  MKI$: ['value'],
  MKL$: ['value'],
  MKS$: ['value'],
  OCT$: ['value'],
  PEEK: ['address'],
  POINT: ['x', 'y'],
  POS: ['dummy'],
  SADD: ['stringVariable'],
  TRUE: [],
  VARPTR: ['variable'],
  'VARPTR$': ['variable'],
  VARSEG: ['variable'],
  _ALPHA: ['colorValue'],
  _ALPHA32: ['colorValue'],
  _AXIS: ['axisNumber'],
  _BIN$: ['value'],
  _BLUE: ['colorValue'],
  _BLUE32: ['colorValue'],
  _BUTTON: ['buttonNumber'],
  _BUTTONCHANGE: ['buttonNumber'],
  _CAPSLOCK: [],
  '_CLIPBOARD$': [],
  _COLORCHOOSERDIALOG: ['initialColor'],
  _CONNECTED: [],
  '_CONNECTIONADDRESS$': [],
  _CONSOLEINPUT: [],
  _CONSOLETITLE: ['title$'],
  _CONTROLCHR: ['code'],
  _COPYIMAGE: ['imageHandle', 'mode'],
  _CV: ['bytes$'],
  _CVD: ['bytes$'],
  _CVI: ['bytes$'],
  _CVL: ['bytes$'],
  _CVS: ['bytes$'],
  '_CWD$': [],
  _DAY: [],
  '_DEVICE$': ['deviceNumber'],
  _DEVICES: [],
  '_DIR$': ['filespec'],
  _DIREXISTS: ['path$'],
  '_DROPPEDFILE$': ['index'],
  '_ENVIRON$': ['name'],
  _ENVIRONCOUNT: [],
  '_ERRORMESSAGE$': ['errorCode'],
  _EXP10: ['value'],
  _EXPLICIT: [],
  _EXPLICITARRAY: [],
  _FILEEXISTS: ['path$'],
  '_FILES$': ['filespec'],
  _FLOOR: ['value'],
  _FONTHEIGHT: ['fontHandle'],
  _FONTWIDTH: ['fontHandle'],
  _FREEFONT: ['fontHandle'],
  '_FULLPATH$': ['path$'],
  _GREEN: ['colorValue'],
  _GREEN32: ['colorValue'],
  _HEIGHT: ['imageHandle'],
  _HOUR: [],
  _INSTRREV: ['text', 'find', 'start'],
  _KEYDOWN: ['scanCode'],
  _KEYHIT: [],
  _LASTAXIS: [],
  _LASTBUTTON: [],
  _LASTWHEEL: [],
  '_LEFTOF$': ['text', 'delimiter'],
  '_LEFTOFLAST$': ['text', 'delimiter'],
  _LOADFONT: ['path$', 'size'],
  _LOADIMAGE: ['path$', 'mode'],
  _LOG10: ['value'],
  _MINUTE: [],
  '_MK$': ['value'],
  '_MKD$': ['value'],
  '_MKI$': ['value'],
  '_MKL$': ['value'],
  '_MKS$': ['value'],
  _MONTH: [],
  _MOUSEBUTTON: ['buttonNumber'],
  _MOUSEINPUT: [],
  _MOUSEWHEEL: [],
  _MOUSEX: [],
  _MOUSEY: [],
  _NEWIMAGE: ['width', 'height', 'mode'],
  _NUMLOCK: [],
  _OPENCLIENT: ['host$', 'port'],
  _OPENCONNECTION: ['handle'],
  _OPENHOST: ['port'],
  '_OS$': [],
  _PI: [],
  _RED: ['colorValue'],
  _RED32: ['colorValue'],
  _RESIZE: [],
  _RESIZEHEIGHT: [],
  _RESIZEWIDTH: [],
  _RGB: ['red', 'green', 'blue'],
  _RGB32: ['red', 'green', 'blue'],
  _RGBA: ['red', 'green', 'blue', 'alpha'],
  _RGBA32: ['red', 'green', 'blue', 'alpha'],
  '_RIGHTOF$': ['text', 'delimiter'],
  '_RIGHTOFLAST$': ['text', 'delimiter'],
  _SCREENEXISTS: ['screenHandle'],
  _SCROLLLOCK: [],
  _SECOND: [],
  '_SELECTFOLDERDIALOG$': ['title$'],
  _SNDGETPOS: ['soundHandle'],
  _SNDLEN: ['soundHandle'],
  _SNDPLAYING: ['soundHandle'],
  '_STARTDIR$': [],
  _TIMER: [],
  _TOTALDROPPEDFILES: [],
  '_TRIM$': ['text'],
  _WEEKDAY: ['timestamp'],
  _WHEEL: ['wheelNumber'],
  _WIDTH: ['imageHandle'],
  _YEAR: ['timestamp'],
});

const EXACT_FUNCTION_DETAIL_HINTS = Object.freeze({
  BIN$: 'Convert a value to its binary string representation',
  CBOOL: 'Convert a value to a BASIC boolean (-1 for true, 0 for false)',
  CSRLIN: 'Return the current text cursor row',
  CVD: 'Decode packed bytes into a DOUBLE value',
  CVI: 'Decode packed bytes into an INTEGER value',
  CVL: 'Decode packed bytes into a LONG value',
  CVS: 'Decode packed bytes into a SINGLE value',
  DIR$: 'Return the next filename that matches a filespec',
  ERL: 'Return the source line number of the most recent error',
  ERR: 'Return the most recent runtime error code',
  FALSE: 'Boolean false constant',
  FILEATTR: 'Return attributes for an open file handle',
  INP: 'Read a byte from an input port in the virtual runtime',
  INPUT$: 'Read a fixed number of characters from a file',
  LOC: 'Return the current position of an open file',
  LOF: 'Return the length of an open file',
  MKD$: 'Encode a numeric value into DOUBLE byte format',
  MKI$: 'Encode a numeric value into INTEGER byte format',
  MKL$: 'Encode a numeric value into LONG byte format',
  MKS$: 'Encode a numeric value into SINGLE byte format',
  PEEK: 'Read a byte from a memory address in the virtual runtime',
  POINT: 'Return the color value of a graphics pixel',
  POS: 'Return the current text cursor column',
  SADD: 'Return the address of a string buffer',
  TRUE: 'Boolean true constant',
  VARPTR: 'Return the address of a variable',
  'VARPTR$': 'Return the address of a variable as a string',
  VARSEG: 'Return the segment address of a variable',
  _ALPHA: 'Extract the alpha component from a QB64 color value',
  _ALPHA32: 'Extract the alpha component from a 32-bit QB64 color value',
  _AXIS: 'Return the current joystick axis value',
  _BLUE: 'Extract the blue component from a QB64 color value',
  _BLUE32: 'Extract the blue component from a 32-bit QB64 color value',
  _BUTTON: 'Return the current state of a device button',
  _BUTTONCHANGE: 'Return whether a device button changed state',
  _CAPSLOCK: 'Return whether Caps Lock is currently enabled',
  '_CLIPBOARD$': 'Read or write text through the system clipboard',
  _COLORCHOOSERDIALOG: 'Open the native color picker dialog',
  _CONNECTED: 'Return whether a network handle is still connected',
  '_CONNECTIONADDRESS$': 'Return the remote address of a network connection',
  _CONSOLEINPUT: 'Read a line from the QB64 console',
  _CONSOLETITLE: 'Set or query the console window title',
  _CONTROLCHR: 'Build a control-character string from a numeric code',
  _COPYIMAGE: 'Duplicate an existing image surface',
  _CV: 'Decode packed bytes into a numeric value',
  _CVD: 'Decode packed bytes into a DOUBLE value',
  _CVI: 'Decode packed bytes into an INTEGER value',
  _CVL: 'Decode packed bytes into a LONG value',
  _CVS: 'Decode packed bytes into a SINGLE value',
  '_CWD$': 'Return the current working directory',
  _DAY: 'Return the day-of-month from the current date or a QB64 timestamp',
  '_DEVICE$': 'Return the name of a device by index',
  _DEVICES: 'Return the number of available input devices',
  '_DIR$': 'Return matching filesystem entries in QB64',
  _DIREXISTS: 'Check whether a directory exists',
  '_DROPPEDFILE$': 'Return a dropped filename by index',
  '_ENVIRON$': 'Return the value of an environment variable',
  _ENVIRONCOUNT: 'Return how many environment strings are available',
  '_ERRORMESSAGE$': 'Return a human-readable message for an error code',
  _EXP10: 'Raise 10 to the specified power',
  _EXPLICIT: 'Return or reflect QB64 explicit-declaration mode',
  _EXPLICITARRAY: 'Return or reflect QB64 explicit-array mode',
  _FILEEXISTS: 'Check whether a file exists',
  '_FILES$': 'Return matching filesystem entries as strings',
  _FLOOR: 'Round a value downward to the nearest integer',
  _FONTHEIGHT: 'Return the pixel height of a font',
  _FONTWIDTH: 'Return the average pixel width of a font',
  _FREEFONT: 'Release a loaded QB64 font resource',
  '_FULLPATH$': 'Resolve a path to its absolute form',
  _GREEN: 'Extract the green component from a QB64 color value',
  _GREEN32: 'Extract the green component from a 32-bit QB64 color value',
  _HEIGHT: 'Return the height of the current screen or image',
  _HOUR: 'Return the hour from the current time or a QB64 timestamp',
  _INSTRREV: 'Search for a substring starting from the end of a string',
  _KEYDOWN: 'Return whether a scan code is currently held down',
  _KEYHIT: 'Return the latest keypress code',
  _LASTAXIS: 'Return the last axis number that changed',
  _LASTBUTTON: 'Return the last button number that changed',
  _LASTWHEEL: 'Return the most recent mouse-wheel delta',
  '_LEFTOF$': 'Return the text to the left of a delimiter',
  '_LEFTOFLAST$': 'Return the text to the left of the last delimiter',
  _LOADFONT: 'Load a font resource from disk',
  _LOADIMAGE: 'Load an image resource from disk',
  _LOG10: 'Return the base-10 logarithm of a value',
  _MINUTE: 'Return the minute from the current time or a QB64 timestamp',
  '_MK$': 'Encode a numeric value into packed-byte format',
  '_MKD$': 'Encode a numeric value into DOUBLE byte format',
  '_MKI$': 'Encode a numeric value into INTEGER byte format',
  '_MKL$': 'Encode a numeric value into LONG byte format',
  '_MKS$': 'Encode a numeric value into SINGLE byte format',
  _MONTH: 'Return the month from the current date or a QB64 timestamp',
  _MOUSEBUTTON: 'Return the current state of a mouse button',
  _MOUSEINPUT: 'Poll QB64 mouse input events',
  _MOUSEWHEEL: 'Return the current mouse-wheel value',
  _MOUSEX: 'Return the current mouse X position',
  _MOUSEY: 'Return the current mouse Y position',
  _NEWIMAGE: 'Create a new image surface',
  _NUMLOCK: 'Return whether Num Lock is currently enabled',
  _OPENCLIENT: 'Open an outbound network client connection',
  _OPENCONNECTION: 'Accept or wrap a network connection handle',
  _OPENHOST: 'Open a listening network host socket',
  '_OS$': 'Return the current operating-system name',
  _PI: 'Return the value of pi',
  _RED: 'Extract the red component from a QB64 color value',
  _RED32: 'Extract the red component from a 32-bit QB64 color value',
  _RESIZE: 'Return whether the window was resized',
  _RESIZEHEIGHT: 'Return the pending resized window height',
  _RESIZEWIDTH: 'Return the pending resized window width',
  _SCREENEXISTS: 'Check whether a screen or image handle is valid',
  _SCROLLLOCK: 'Return whether Scroll Lock is currently enabled',
  _SECOND: 'Return the second from the current time or a QB64 timestamp',
  '_SELECTFOLDERDIALOG$': 'Open the native folder-selection dialog',
  _SNDGETPOS: 'Return the playback position of a sound handle',
  _SNDLEN: 'Return the total length of a sound handle',
  _SNDPLAYING: 'Return whether a sound handle is currently playing',
  '_STARTDIR$': 'Return QB64s startup directory',
  _TIMER: 'Return QB64 timer ticks or elapsed time',
  _TOTALDROPPEDFILES: 'Return how many files were dropped onto the window',
  '_TRIM$': 'Trim leading and trailing spaces from a string',
  _WEEKDAY: 'Return the weekday for the current date or a QB64 timestamp',
  _WHEEL: 'Return the current wheel value for a device',
  _WIDTH: 'Return the width of the current screen or image',
  _YEAR: 'Return the year from the current date or a QB64 timestamp',
});

const EXACT_FUNCTION_EXAMPLE_HINTS = Object.freeze({
  CBOOL: '```qbasic\nflag% = CBOOL(score > 0)\n```',
  CSRLIN: '```qbasic\nrow% = CSRLIN\n```',
  CVD: '```qbasic\nnumber# = CVD(bytes$)\n```',
  CVI: '```qbasic\nvalue% = CVI(bytes$)\n```',
  CVL: '```qbasic\nvalue& = CVL(bytes$)\n```',
  CVS: '```qbasic\nvalue! = CVS(bytes$)\n```',
  FILEATTR: '```qbasic\nmode% = FILEATTR(f%, 1)\n```',
  FREEFILE: '```qbasic\nf% = FREEFILE\n```',
  INPUT$: '```qbasic\ndata$ = INPUT$(16, #f%)\n```',
  LOC: '```qbasic\nposition& = LOC(f%)\n```',
  LOF: '```qbasic\nbytes& = LOF(f%)\n```',
  PEEK: '```qbasic\nvalue = PEEK(address)\n```',
  POS: '```qbasic\ncol% = POS(0)\n```',
  SADD: '```qbasic\naddr& = SADD(buffer$)\n```',
  VARPTR: '```qbasic\naddr& = VARPTR(myValue)\n```',
  'VARPTR$': '```qbasic\naddr$ = VARPTR$(buffer$)\n```',
  VARSEG: '```qbasic\nsegment% = VARSEG(myArray(0))\n```',
  _CLIPBOARD$: '```qbasic\ntext$ = _CLIPBOARD$\n```',
  _CONNECTED: '```qbasic\nIF _CONNECTED(client&) THEN PRINT "Online"\n```',
  _CONNECTIONADDRESS$: '```qbasic\nPRINT _CONNECTIONADDRESS$(client&)\n```',
  _CONSOLETITLE: '```qbasic\n_CONSOLETITLE "QB64 Server"\n```',
  _COPYIMAGE: '```qbasic\ncopy& = _COPYIMAGE(sprite&)\n```',
  _CV: '```qbasic\nvalue = _CV(bytes$)\n```',
  _CVD: '```qbasic\nnumber# = _CVD(bytes$)\n```',
  _CVI: '```qbasic\nvalue% = _CVI(bytes$)\n```',
  _CVL: '```qbasic\nvalue& = _CVL(bytes$)\n```',
  _CVS: '```qbasic\nvalue! = _CVS(bytes$)\n```',
  _DIREXISTS: '```qbasic\nIF _DIREXISTS("assets") THEN PRINT "OK"\n```',
  _FILEEXISTS: '```qbasic\nIF _FILEEXISTS("laser.wav") THEN PRINT "Found"\n```',
  _FULLPATH$: '```qbasic\nPRINT _FULLPATH$("data\\scores.dat")\n```',
  _INSTRREV: '```qbasic\npos% = _INSTRREV(path$, "\\")\n```',
  _LOADFONT: '```qbasic\nfont& = _LOADFONT("retro.ttf", 16)\n```',
  _LOADIMAGE: '```qbasic\nimage& = _LOADIMAGE("ship.png")\n```',
  _NEWIMAGE: '```qbasic\nbuffer& = _NEWIMAGE(320, 200, 32)\n```',
  _OPENCLIENT: '```qbasic\nclient& = _OPENCLIENT("127.0.0.1", 8080)\n```',
  _OPENCONNECTION: '```qbasic\nconn& = _OPENCONNECTION(host&)\n```',
  _OPENHOST: '```qbasic\nhost& = _OPENHOST(8080)\n```',
  _RGB32: '```qbasic\nink& = _RGB32(255, 200, 0)\n```',
  _SNDGETPOS: '```qbasic\nPRINT _SNDGETPOS(sound&)\n```',
  _SNDLEN: '```qbasic\nPRINT _SNDLEN(sound&)\n```',
  _SNDPLAYING: '```qbasic\nIF _SNDPLAYING(sound&) THEN PRINT "Busy"\n```',
  _WIDTH: '```qbasic\nPRINT _WIDTH(buffer&)\n```',
});

function sortTokens(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function normalizeParamName(value, index) {
  const cleaned = String(value || '')
    .trim()
    .replace(/=.*$/, '')
    .replace(/^\.\.\./, '')
    .replace(/[^a-zA-Z0-9_$]/g, '');

  if (cleaned) return cleaned;
  return `arg${index + 1}`;
}

function parseArrowFunctionParams(implementation) {
  if (typeof implementation !== 'string') return null;

  const compact = implementation.trim();
  const wrappedMatch = /^\(\(([^)]*)\)\s*=>/.exec(compact);
  if (wrappedMatch) {
    return wrappedMatch[1]
      .split(',')
      .map((value, index) => normalizeParamName(value, index))
      .filter(Boolean);
  }

  const simpleMatch = /^\(([^)]*)\)\s*=>/.exec(compact);
  if (simpleMatch) {
    return simpleMatch[1]
      .split(',')
      .map((value, index) => normalizeParamName(value, index))
      .filter(Boolean);
  }

  return null;
}

function getKeywordFamily(keyword) {
  if (keyword === 'PRINT #' || keyword === 'INPUT #' || keyword === 'LINE INPUT') {
    return 'io';
  }
  if (keyword === 'ON ERROR') return 'controlFlow';
  if (/^DEF(?:INT|LNG|SNG|DBL|STR)$/.test(keyword)) return 'declaration';
  if (/^(?:PEEK|POKE|VARPTR|VARSEG|SADD|_CV|_CVD|_CVI|_CVL|_CVS|_GETPTR|_SETPTR|_INPOKE)$/.test(keyword)) {
    return 'memory';
  }
  if (/^(?:SPC|TAB|USING|_INSTRREV)$/.test(keyword)) return 'stringValue';
  if (keyword === 'FRE') return 'runtimeState';
  if (/^(?:INTERRUPT|INTERRUPTX|_CLIPBOARD|_ICON|_EXPLICIT|_EXPLICITARRAY)$/.test(keyword)) {
    return 'system';
  }
  if (keyword === '_CONTINUE') return 'controlFlow';
  if (keyword.startsWith('$')) return 'metacommand';
  if (/^_SND/.test(keyword)) return 'sound';
  if (/^_MOUSE/.test(keyword)) return 'mouse';
  if (/^_(?:MEM|OFFSET)/.test(keyword)) return 'memory';
  if (/^_(?:RGB|RGBA|RED|GREEN|BLUE|ALPHA|CLEARCOLOR|SETALPHA|DEFAULTCOLOR|BACKGROUNDCOLOR|PALETTECOLOR|COPYPALETTE)/.test(keyword)) {
    return 'color';
  }
  if (/^_(?:OPENHOST|OPENCLIENT|OPENCONNECTION|CONNECTED|CONNECTIONADDRESS)/.test(keyword)) {
    return 'network';
  }
  if (/^_(?:KEY|BUTTON|AXIS|WHEEL|DEVICE|LAST|MOUSE|CAPSLOCK|NUMLOCK|SCROLLLOCK)/.test(keyword)) {
    return 'inputDevice';
  }
  if (/^_(?:TITLE|FULLSCREEN|NEWIMAGE|LOADIMAGE|FREEIMAGE|COPYIMAGE|PUTIMAGE|DEST|SOURCE|DISPLAY|AUTODISPLAY|SCREEN|WIDTH|HEIGHT|RESIZE|PRINTSTRING|PRINTWIDTH|FONT|LOADFONT|FREEFONT)/.test(keyword)) {
    return 'displayImage';
  }
  if (/^_(?:DATE\$|TIME\$|TIMER|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|WEEKDAY)/.test(keyword)) {
    return 'dateTime';
  }
  if (/^_(?:PI|ROUND|D2R|D2G|R2D|R2G|G2D|G2R|ATAN2|ASIN|ACOS|COSH|SINH|TANH|TAN|SECH|CSCH|COTH|ARCSEC|ARCCSC|ARCCOT|SEC|CSC|COT|HYPOT|CEIL|FLOOR|LOG10|EXP10)/.test(keyword)) {
    return 'math';
  }
  if (/^_(?:FILEEXISTS|DIREXISTS|DIR\$|FILES\$|STARTDIR\$|CWD\$|ENVIRONCOUNT|ENVIRON\$|CLIPBOARD\$|CONSOLE|CONSOLETITLE|CONTROLCHR|TOTALDROPPEDFILES|DROPPEDFILE\$|FINISHDROP|EMBEDDED\$|OS\$|SHELL|DONTWAIT|HIDE|ACCEPTFILEDROP|EXIT|ERROR|ERRORMESSAGE)/.test(keyword)) {
    return 'system';
  }
  if (DATA_TYPE_KEYWORDS.has(keyword)) return 'dataType';
  if (FILE_MODE_KEYWORDS.has(keyword)) return 'fileMode';
  if (CONTROL_FLOW_KEYWORDS.has(keyword)) return 'controlFlow';
  if (DECLARATION_KEYWORDS.has(keyword)) return 'declaration';
  if (GRAPHICS_KEYWORDS.has(keyword)) return 'graphics';
  if (IO_KEYWORDS.has(keyword)) return 'io';
  if (LOGICAL_KEYWORDS.has(keyword)) return 'logical';
  if (keyword.endsWith('$')) return 'stringValue';
  return 'general';
}

function getFunctionFamily(name) {
  if (name === 'TRUE' || name === 'FALSE') return 'booleanConstant';
  if (name === 'CBOOL') return 'booleanConversion';
  if (/^_?CV/.test(name)) return 'packedDecode';
  if (/^_?MK/.test(name)) return 'packedEncode';
  if (/^_SND/.test(name)) return 'sound';
  if (/^_MOUSE/.test(name)) return 'mouse';
  if (/^_(?:KEY|BUTTON|AXIS|WHEEL|DEVICE|LAST|CAPSLOCK|NUMLOCK|SCROLLLOCK)/.test(name)) {
    return 'inputDevice';
  }
  if (/^_(?:RGB|RGBA|RED|GREEN|BLUE|ALPHA)/.test(name)) return 'color';
  if (/^_(?:OPENHOST|OPENCLIENT|OPENCONNECTION|CONNECTED|CONNECTIONADDRESS)/.test(name)) {
    return 'network';
  }
  if (/^_(?:FILEEXISTS|DIREXISTS|DIR\$|FILES\$|FULLPATH\$|STARTDIR\$|CWD\$|SELECTFOLDERDIALOG\$|DROPPEDFILE\$|TOTALDROPPEDFILES|COLORCHOOSERDIALOG)/.test(name) || name === 'DIR$') {
    return 'filesystem';
  }
  if (/^_(?:NEWIMAGE|LOADIMAGE|COPYIMAGE|WIDTH|HEIGHT|SCREENEXISTS|RESIZE|RESIZEWIDTH|RESIZEHEIGHT|LOADFONT|FREEFONT|FONTWIDTH|FONTHEIGHT|CLIPBOARD\$|CONSOLETITLE|CONSOLEINPUT|CONTROLCHR|OS\$)/.test(name)) {
    return 'displaySystem';
  }
  if (/^_(?:DATE\$|TIME\$|TIMER|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|WEEKDAY)/.test(name) || /^(?:DATE\$|TIME\$|TIMER)$/.test(name)) {
    return 'dateTime';
  }
  if (/^(?:ABS|ATN|COS|EXP|INT|FIX|LOG|RND|SGN|SIN|SQR|TAN|CINT|CLNG|CSNG|CDBL|_ACOS|_ASIN|_ATAN2|_COSH|_SINH|_TANH|_SECH|_CSCH|_COTH|_ARCSEC|_ARCCSC|_ARCCOT|_SEC|_CSC|_COT|_HYPOT|_CEIL|_FLOOR|_LOG10|_EXP10|_ROUND|_PI|_D2R|_D2G|_R2D|_R2G|_G2D|_G2R)$/.test(name)) {
    return 'math';
  }
  if (/^(?:LEN|ASC|CHR\$|VAL|STR\$|HEX\$|OCT\$|LEFT\$|RIGHT\$|MID\$|UCASE\$|LCASE\$|LTRIM\$|RTRIM\$|SPACE\$|STRING\$|SPC|TAB|INSTR|_INSTRREV|_TRIM\$|_LEFTOF\$|_RIGHTOF\$|_LEFTOFLAST\$|_RIGHTOFLAST\$|COMMAND\$|ENVIRON\$|INKEY\$|_ENVIRON\$)$/.test(name)) {
    return 'string';
  }
  if (/^(?:LBOUND|UBOUND)$/.test(name)) return 'array';
  if (/^(?:FREEFILE|EOF|LOF|LOC|INPUT\$|FILEATTR)$/.test(name)) return 'file';
  if (/^(?:PEEK|INP|POINT|POS|CSRLIN|ERR|ERL|VARPTR|VARPTR\$|VARSEG|SADD)$/.test(name)) {
    return 'runtimeState';
  }
  if (name.endsWith('$')) return 'string';
  if (name.startsWith('_')) return 'qb64';
  return 'general';
}

function fallbackKeywordDetail(keyword) {
  const exact = EXACT_KEYWORD_DETAIL_HINTS[keyword];
  if (exact) return exact;

  switch (getKeywordFamily(keyword)) {
    case 'metacommand':
      return 'Compile-time metacommand';
    case 'sound':
      return 'QB64 sound and audio keyword';
    case 'mouse':
      return 'QB64 mouse input keyword';
    case 'memory':
      return 'QB64 memory-block keyword';
    case 'color':
      return 'QB64 color-manipulation keyword';
    case 'network':
      return 'QB64 networking keyword';
    case 'inputDevice':
      return 'QB64 keyboard, mouse, or controller keyword';
    case 'displayImage':
      return 'QB64 screen, window, font, or image keyword';
    case 'dateTime':
      return 'QB64 date and time keyword';
    case 'math':
      return 'QB64 math helper keyword';
    case 'runtimeState':
      return 'Runtime-state or memory-inspection keyword';
    case 'system':
      return 'QB64 system and environment keyword';
    case 'dataType':
      return 'Data type keyword';
    case 'fileMode':
      return 'File mode or file-sharing keyword';
    case 'controlFlow':
      return 'Control-flow keyword';
    case 'declaration':
      return 'Declaration or definition keyword';
    case 'graphics':
      return 'Graphics drawing keyword';
    case 'io':
      return 'Input/output keyword';
    case 'logical':
      return 'Logical or bitwise operator';
    case 'stringValue':
      return 'String-oriented keyword or intrinsic value';
    default:
      return 'QBasic/QB64 language keyword';
  }
}

function fallbackFunctionDetail(name) {
  const exact = EXACT_FUNCTION_DETAIL_HINTS[name];
  if (exact) return exact;

  switch (getFunctionFamily(name)) {
    case 'booleanConstant':
      return 'Boolean constant';
    case 'booleanConversion':
      return 'Boolean-conversion function';
    case 'packedDecode':
      return 'Decode packed bytes into a numeric value';
    case 'packedEncode':
      return 'Encode a numeric value into packed bytes';
    case 'sound':
      return 'QB64 sound function';
    case 'mouse':
      return 'QB64 mouse input function';
    case 'inputDevice':
      return 'QB64 device input function';
    case 'color':
      return 'QB64 color function';
    case 'network':
      return 'QB64 networking function';
    case 'filesystem':
      return 'QB64 filesystem function';
    case 'displaySystem':
      return 'QB64 display, image, or system function';
    case 'dateTime':
      return 'Date and time function';
    case 'math':
      return 'Math and numeric function';
    case 'string':
      return 'String-processing function';
    case 'array':
      return 'Array-bound function';
    case 'file':
      return 'File I/O function';
    case 'runtimeState':
      return 'Runtime state or memory-inspection function';
    case 'qb64':
      return 'QB64 built-in function';
    default:
      return 'QBasic/QuickBASIC built-in function';
  }
}

function buildKeywordSyntax(label, family) {
  const exact = EXACT_KEYWORD_SYNTAX_HINTS[label];
  if (exact) return exact;

  switch (family) {
    case 'metacommand':
      return `${label} ...`;
    case 'fileMode':
      return `OPEN fileSpec FOR ${label} AS #fileNum`;
    case 'dataType':
      return `... AS ${label}`;
    case 'logical':
      return `leftExpr ${label} rightExpr`;
    case 'controlFlow':
      return `${label} ...`;
    case 'declaration':
      return `${label} ...`;
    case 'graphics':
      return `${label} ...`;
    case 'io':
      return `${label} ...`;
    case 'sound':
    case 'mouse':
    case 'memory':
    case 'color':
    case 'network':
    case 'inputDevice':
    case 'displayImage':
    case 'dateTime':
    case 'math':
    case 'system':
      return `${label} ...`;
    default:
      return label;
  }
}

function buildKeywordUsageNote(label, family) {
  switch (family) {
    case 'metacommand':
      return 'This directive is evaluated while loading or compiling the source, not during normal statement execution.';
    case 'fileMode':
      return 'Use it as part of an `OPEN` statement to control how the file is created, read, written, or shared.';
    case 'dataType':
      return 'Use it in `DIM`, `REDIM`, `TYPE`, `FUNCTION`, or `SUB` declarations to describe stored values.';
    case 'logical':
      return 'Use it inside expressions and conditions to combine boolean tests or apply bitwise operations.';
    case 'controlFlow':
      return 'Use it to branch, loop, stop, or otherwise change execution order.';
    case 'declaration':
      return 'Use it when declaring symbols, storage, or procedure signatures.';
    case 'graphics':
      return 'Use it while working with classic screen modes, pixels, shapes, or palette state.';
    case 'io':
      return 'Use it for console I/O, file I/O, or other user-visible input/output operations.';
    case 'sound':
      return 'Use it with QB64 audio handles and playback state.';
    case 'mouse':
    case 'inputDevice':
      return 'Use it when polling keyboard, mouse, wheel, joystick, or controller state in QB64.';
    case 'memory':
      return 'Use it when working with QB64 memory blocks, offsets, or low-level data transfers.';
    case 'runtimeState':
      return 'Use it when inspecting runtime memory, cursor state, or other low-level BASIC runtime values.';
    case 'color':
      return 'Use it to create, inspect, or change color values in QB64 graphics code.';
    case 'network':
      return 'Use it to open sockets, accept connections, or inspect network state in QB64.';
    case 'displayImage':
      return 'Use it to manage windows, images, fonts, screen buffers, and drawing targets in QB64.';
    case 'dateTime':
      return 'Use it to query the clock, calendar, or time-based values available from QB64.';
    case 'math':
      return 'Use it when you need the extra math helpers that QB64 adds on top of classic BASIC.';
    case 'system':
      return 'Use it to query or control host-environment features that QB64 exposes.';
    default:
      return 'Use it according to the rules of the active QBasic, QuickBASIC, or QB64 dialect.';
  }
}

function buildKeywordExample(label, family) {
  const exact = EXACT_KEYWORD_EXAMPLE_HINTS[label];
  if (exact) return exact;

  switch (family) {
    case 'sound':
      return `\`\`\`qbasic\n${label} soundHandle\n\`\`\``;
    case 'memory':
      return `\`\`\`qbasic\n${label} ...\n\`\`\``;
    case 'network':
      return `\`\`\`qbasic\n${label} ...\n\`\`\``;
    default:
      return '';
  }
}

function fallbackKeywordDocumentation(label, detail) {
  const family = getKeywordFamily(label);
  const syntax = buildKeywordSyntax(label, family);
  const dialect = label.startsWith('_')
    ? 'QB64'
    : label.startsWith('$')
      ? 'QuickBASIC/QB64 compile-time directive'
      : 'QBasic, QuickBASIC, and QB64';
  const example = buildKeywordExample(label, family);

  return `**${label}**\n\n${detail}.\n\n**Syntax:** \`${syntax}\`\n\n${buildKeywordUsageNote(label, family)}${example ? `\n\n**Example:**\n${example}` : ''}\n\n**Dialect:** ${dialect}.`;
}

function guessFunctionParams(name, implementation) {
  if (ZERO_ARG_FUNCTIONS.has(name)) return [];

  if (EXACT_FUNCTION_PARAM_HINTS[name]) {
    return [...EXACT_FUNCTION_PARAM_HINTS[name]];
  }

  const explicit = IMPLEMENTATION_ARITY_MAP[implementation];
  if (explicit) return [...explicit];

  const direct = IMPLEMENTATION_ARITY_MAP[String(implementation || '').trim()];
  if (direct) return [...direct];

  const parsed = parseArrowFunctionParams(implementation);
  if (parsed && parsed.length > 0) return parsed;

  if (name === 'SHELL') return ['command$'];
  if (name.endsWith('$')) return ['value'];
  return ['value'];
}

function buildFunctionSyntax(name, params) {
  if (name === 'SHELL') return 'SHELL [command$]';
  if (params.length === 0) return name;
  return `${name}(${params.join(', ')})`;
}

function buildFunctionUsageNote(name, family) {
  switch (family) {
    case 'booleanConstant':
      return 'Use it directly in conditions or assignments when you want an explicit BASIC boolean value.';
    case 'booleanConversion':
      return 'Use it when you need to normalize an expression into BASIC boolean form where true is `-1` and false is `0`.';
    case 'packedDecode':
      return 'Use it when reading binary records, memory buffers, or packed numeric strings.';
    case 'packedEncode':
      return 'Use it when writing binary files, random-access records, or memory buffers.';
    case 'sound':
      return 'Use it with sound handles returned by QB64 audio-loading APIs.';
    case 'mouse':
    case 'inputDevice':
      return 'Call it while polling input state inside your main loop or event-processing code.';
    case 'color':
      return 'Use it while building or inspecting QB64 color values for graphics work.';
    case 'network':
      return 'Use it with QB64 networking handles, sockets, and connection state.';
    case 'filesystem':
      return 'Use it to inspect files, directories, or host-side paths exposed by QB64.';
    case 'displaySystem':
      return 'Use it when working with windows, images, fonts, clipboard access, or other QB64 host integrations.';
    case 'dateTime':
      return 'Use it to query the current date/time or extract fields from QB64 timestamps.';
    case 'math':
      return 'Use it inside numeric expressions, geometry, trigonometry, or conversion routines.';
    case 'string':
      return 'Use it to inspect, transform, split, trim, or generate text values.';
    case 'array':
      return 'Use it to discover declared array bounds before iterating over elements.';
    case 'file':
      return 'Use it with file handles opened by `OPEN` when you need file length, position, or direct reads.';
    case 'runtimeState':
      return 'Use it to inspect cursor position, graphics state, memory state, or runtime error information.';
    default:
      return name.startsWith('_')
        ? 'Use it as part of QB64-specific code paths.'
        : 'Use it as part of normal QBasic or QuickBASIC expressions.';
  }
}

function buildFunctionExample(name, family) {
  const exact = EXACT_FUNCTION_EXAMPLE_HINTS[name];
  if (exact) return exact;

  switch (family) {
    case 'sound':
      return `\`\`\`qbasic\nPRINT ${name}(soundHandle)\n\`\`\``;
    case 'network':
      return `\`\`\`qbasic\nPRINT ${name}(handle)\n\`\`\``;
    case 'filesystem':
      return `\`\`\`qbasic\nPRINT ${name}(path$)\n\`\`\``;
    default:
      return '';
  }
}

function fallbackFunctionDocumentation(name, detail, params) {
  const family = getFunctionFamily(name);
  const signature = buildFunctionSyntax(name, params);
  const dialect = name.startsWith('_')
    ? 'QB64'
    : 'QBasic/QuickBASIC';
  const example = buildFunctionExample(name, family);
  return `**${signature}**\n\n${detail}.\n\n${buildFunctionUsageNote(name, family)}${example ? `\n\n**Example:**\n${example}` : ''}\n\n**Dialect:** ${dialect}.`;
}

function buildLanguageCatalog({
  curatedKeywords = {},
  curatedFunctions = {},
} = {}) {
  const keywords = {};
  for (const keyword of sortTokens(COMPILER_KEYWORDS)) {
    const curated = curatedKeywords[keyword];
    const label = curated?.label || keyword;
    const detail = curated?.detail || fallbackKeywordDetail(label);
    keywords[keyword] = {
      label,
      detail,
      documentation:
        curated?.documentation || fallbackKeywordDocumentation(label, detail),
    };
  }

  for (const [key, curated] of Object.entries(curatedKeywords)) {
    const label = curated.label || key;
    const detail = curated.detail || fallbackKeywordDetail(label);
    keywords[key] = {
      label,
      detail,
      documentation:
        curated.documentation || fallbackKeywordDocumentation(label, detail),
    };
  }

  const functionNames = new Set([
    ...Object.keys(BUILTIN_FUNCS),
    ...Object.keys(curatedFunctions),
  ]);

  const functions = {};
  for (const name of sortTokens(functionNames)) {
    const curated = curatedFunctions[name];
    const params = Array.isArray(curated?.params)
      ? [...curated.params]
      : guessFunctionParams(name, BUILTIN_FUNCS[name]);
    const detail = curated?.detail || fallbackFunctionDetail(name);
    functions[name] = {
      detail,
      documentation:
        curated?.documentation || fallbackFunctionDocumentation(name, detail, params),
      params,
    };
  }

  return { KEYWORDS: keywords, FUNCTIONS: functions };
}

module.exports = {
  buildLanguageCatalog,
  guessFunctionParams,
};
