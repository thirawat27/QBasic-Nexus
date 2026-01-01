/**
 * QBasic Nexus - Language Data
 * =============================
 * Keyword and function definitions for IntelliSense features.
 * 
 * @author Thirawat27
 * @version 1.0.0
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
    LOCATE: { label: 'LOCATE', detail: 'Position the cursor' },
    COLOR: { label: 'COLOR', detail: 'Set text colors' },

    // Control Flow
    IF: { label: 'IF', detail: 'Conditional statement' },
    THEN: { label: 'THEN', detail: 'Execute if condition is true' },
    ELSE: { label: 'ELSE', detail: 'Alternative branch' },
    ELSEIF: { label: 'ELSEIF', detail: 'Additional condition' },
    END: { label: 'END', detail: 'End a block or program' },
    SELECT: { label: 'SELECT', detail: 'Multi-way branch' },
    CASE: { label: 'CASE', detail: 'Define a case' },

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
    EXIT: { label: 'EXIT', detail: 'Exit loop early' },

    // Variables
    DIM: { label: 'DIM', detail: 'Declare variable/array' },
    AS: { label: 'AS', detail: 'Specify data type' },
    CONST: { label: 'CONST', detail: 'Define constant' },
    SHARED: { label: 'SHARED', detail: 'Share variable with procedures' },
    STATIC: { label: 'STATIC', detail: 'Preserve value between calls' },
    INTEGER: { label: 'INTEGER', detail: '16-bit integer type' },
    LONG: { label: 'LONG', detail: '32-bit integer type' },
    SINGLE: { label: 'SINGLE', detail: '32-bit float type' },
    DOUBLE: { label: 'DOUBLE', detail: '64-bit float type' },
    STRING: { label: 'STRING', detail: 'Text string type' },

    // Procedures
    SUB: { label: 'SUB', detail: 'Define subroutine' },
    FUNCTION: { label: 'FUNCTION', detail: 'Define function' },
    CALL: { label: 'CALL', detail: 'Call subroutine' },
    RETURN: { label: 'RETURN', detail: 'Return from GOSUB' },

    // Operators
    AND: { label: 'AND', detail: 'Logical AND' },
    OR: { label: 'OR', detail: 'Logical OR' },
    NOT: { label: 'NOT', detail: 'Logical NOT' },
    XOR: { label: 'XOR', detail: 'Logical XOR' },
    MOD: { label: 'MOD', detail: 'Modulo operator' },

    // Misc
    SLEEP: { label: 'SLEEP', detail: 'Pause execution' },
    TIMER: { label: 'TIMER', detail: 'Seconds since midnight' },
    REM: { label: 'REM', detail: 'Comment line' },
    SWAP: { label: 'SWAP', detail: 'Exchange values of two variables' }
};

// ============================================================================
// FUNCTIONS
// ============================================================================

const FUNCTIONS = {
    // String Functions
    'MID$': {
        detail: 'Get substring',
        documentation: '**MID$(string, start, length)**\n\nReturns `length` characters starting at `start`.',
        params: ['string', 'start', 'length']
    },
    'LEFT$': {
        detail: 'Get left characters',
        documentation: '**LEFT$(string, n)**\n\nReturns first `n` characters.',
        params: ['string', 'n']
    },
    'RIGHT$': {
        detail: 'Get right characters',
        documentation: '**RIGHT$(string, n)**\n\nReturns last `n` characters.',
        params: ['string', 'n']
    },
    'LEN': {
        detail: 'Get string length',
        documentation: '**LEN(string)**\n\nReturns character count.',
        params: ['string']
    },
    'STR$': {
        detail: 'Number to string',
        documentation: '**STR$(number)**\n\nConverts number to string.',
        params: ['number']
    },
    'VAL': {
        detail: 'String to number',
        documentation: '**VAL(string)**\n\nConverts string to number.',
        params: ['string']
    },
    'UCASE$': {
        detail: 'Uppercase',
        documentation: '**UCASE$(string)**\n\nConverts to uppercase.',
        params: ['string']
    },
    'LCASE$': {
        detail: 'Lowercase',
        documentation: '**LCASE$(string)**\n\nConverts to lowercase.',
        params: ['string']
    },
    'CHR$': {
        detail: 'ASCII to character',
        documentation: '**CHR$(code)**\n\nReturns character for ASCII code.',
        params: ['code']
    },
    'ASC': {
        detail: 'Character to ASCII',
        documentation: '**ASC(string)**\n\nReturns ASCII code of first character.',
        params: ['string']
    },
    'INSTR': {
        detail: 'Find substring',
        documentation: '**INSTR([start,] string, find)**\n\nReturns position of substring.',
        params: ['start', 'string', 'find']
    },
    'LTRIM$': {
        detail: 'Trim left spaces',
        documentation: '**LTRIM$(string)**\n\nRemoves leading spaces.',
        params: ['string']
    },
    'RTRIM$': {
        detail: 'Trim right spaces',
        documentation: '**RTRIM$(string)**\n\nRemoves trailing spaces.',
        params: ['string']
    },
    'SPACE$': {
        detail: 'Create spaces',
        documentation: '**SPACE$(n)**\n\nReturns `n` space characters.',
        params: ['n']
    },
    'STRING$': {
        detail: 'Repeat character',
        documentation: '**STRING$(n, char)**\n\nReturns `n` copies of character.',
        params: ['n', 'char']
    },

    // Math Functions
    'ABS': {
        detail: 'Absolute value',
        documentation: '**ABS(n)**\n\nReturns absolute value.',
        params: ['n']
    },
    'INT': {
        detail: 'Integer (floor)',
        documentation: '**INT(n)**\n\nReturns largest integer ≤ n.',
        params: ['n']
    },
    'FIX': {
        detail: 'Truncate',
        documentation: '**FIX(n)**\n\nTruncates toward zero.',
        params: ['n']
    },
    'SGN': {
        detail: 'Sign',
        documentation: '**SGN(n)**\n\nReturns -1, 0, or 1.',
        params: ['n']
    },
    'SQR': {
        detail: 'Square root',
        documentation: '**SQR(n)**\n\nReturns square root.',
        params: ['n']
    },
    'RND': {
        detail: 'Random number',
        documentation: '**RND**\n\nReturns random 0-1.',
        params: []
    },
    'SIN': {
        detail: 'Sine',
        documentation: '**SIN(radians)**\n\nReturns sine.',
        params: ['radians']
    },
    'COS': {
        detail: 'Cosine',
        documentation: '**COS(radians)**\n\nReturns cosine.',
        params: ['radians']
    },
    'TAN': {
        detail: 'Tangent',
        documentation: '**TAN(radians)**\n\nReturns tangent.',
        params: ['radians']
    },
    'ATN': {
        detail: 'Arctangent',
        documentation: '**ATN(n)**\n\nReturns arctangent in radians.',
        params: ['n']
    },
    'LOG': {
        detail: 'Natural log',
        documentation: '**LOG(n)**\n\nReturns natural logarithm.',
        params: ['n']
    },
    'EXP': {
        detail: 'Exponential',
        documentation: '**EXP(n)**\n\nReturns e^n.',
        params: ['n']
    }
};

module.exports = { KEYWORDS, FUNCTIONS };
