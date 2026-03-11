/**
 * QBasic Nexus - The Ultimate Interactive Tutorial Curriculum
 * Comprehensive guide covering 120 lessons of QBasic syntax, features, and capabilities.
 */

'use strict';

module.exports = [
  // ─── STAGE 1: BASICS & VARIABLES ──────────────────────────────────────────
  {
    id: '1.1-hello',
    title: '1.1: Hello World',
    objective: 'Print exactly "Hello World" to the screen.',
    description:
      'The PRINT command displays text on the screen. Text must be wrapped in double quotes.',
    template: 'CLS\nPRINT "Hello World"\n',
    matchRegex: /Hello World/,
    hint: 'Use: PRINT "Hello World"',
  },
  {
    id: '1.2-vars',
    title: '1.2: Variables',
    objective: 'Create a variable named "score" and set it to 100, then print it.',
    description: "Variables store data. You can just type a name and use '=' to assign a value.",
    template: 'CLS\nscore = 100\nPRINT score\n',
    matchRegex: /100/,
    hint: 'Type: score = 100 on one line, then PRINT score on the next.',
  },
  {
    id: '1.3-datatypes',
    title: '1.3: Data Types (DIM)',
    objective: 'Declare a string variable using DIM, assign it "Nexus", and print it.',
    description:
      'Use the DIM keyword to explicitly declare variables and their types (e.g., AS STRING, AS INTEGER).',
    template: 'CLS\nDIM playerName AS STRING\nplayerName = "Nexus"\nPRINT playerName\n',
    matchRegex: /Nexus/,
    hint: 'Type: DIM playerName AS STRING',
  },
  {
    id: '1.4-input',
    title: '1.4: User Input',
    objective: "Ask for the user's name and print a greeting.",
    description: 'INPUT pauses the program to let the user type something.',
    template: 'CLS\nINPUT "What is your name? ", n$\nPRINT "Hi, "; n$\n',
    matchRegex: /(name|hi)/i,
    hint: 'Use INPUT "Prompt ", var$ to get text input.',
  },

    {
    id: '1.5-locate-color',
    title: '1.5: Screen coordinates & Color',
    objective: 'Print colored text at a specific location.',
    description: 'LOCATE row, col sets text position. COLOR fg sets text color.',
    template: 'CLS\nCOLOR 10\nLOCATE 5, 10\nPRINT "Nexus"\n',
    matchRegex: /Nexus/i,
    hint: 'Use COLOR 10 then LOCATE 5, 10 then PRINT',
  },
  // ─── STAGE 2: MATHEMATICS & LOGIC ─────────────────────────────────────────
  {
    id: '2.1-math',
    title: '2.1: Math Operators',
    objective: 'Calculate the area of a rectangle (width 5, height 10) and print it.',
    description: 'QBasic supports +, -, *, / for arithmetic, and ^ for exponents.',
    template: 'CLS\nw = 5\nh = 10\narea = w * h\nPRINT area\n',
    matchRegex: /50/,
    hint: 'Multiply dimensions using the * operator.',
  },
  {
    id: '2.2-mod',
    title: '2.2: Remainder (MOD)',
    objective: 'Find the remainder of 17 divided by 5 and print it.',
    description:
      "The MOD operator returns the remainder of a division. It's useful for finding even/odd numbers.",
    template: 'CLS\nremainder = 17 MOD 5\nPRINT remainder\n',
    matchRegex: /2/,
    hint: 'Use: 17 MOD 5',
  },
  {
    id: '2.3-boolean',
    title: '2.3: Logical Operators',
    objective: "Use AND to check if both conditions are true. Print 'True'.",
    description: 'Use AND, OR, and NOT to combine logical conditions.',
    template: 'CLS\nHP = 100\nalive = 1\nIF HP > 0 AND alive = 1 THEN\n    PRINT "True"\nEND IF\n',
    matchRegex: /True/i,
    hint: 'The IF expression uses AND to require both sides to be true.',
  },

    {
    id: '2.4-int-fix',
    title: '2.4: Math Functions (INT, FIX)',
    objective: 'Round down negative and positive numbers differently.',
    description: 'INT rounds down to the next lowest integer. FIX just removes the decimal.',
    template: 'CLS\nPRINT INT(-2.5)\nPRINT FIX(-2.5)\n',
    matchRegex: /-3\s*-2/,
    hint: 'INT(-2.5) evaluates to -3. FIX(-2.5) evaluates to -2.',
  },
  // ─── STAGE 3: CONTROL FLOW ────────────────────────────────────────────────
  {
    id: '3.1-if',
    title: '3.1: IF...THEN Statements',
    objective: "Print 'Pass' if score is greater than 50.",
    description: 'IF evaluates a condition. Always end the block with END IF.',
    template: 'CLS\nscore = 75\nIF score > 50 THEN\n    PRINT "Pass"\nEND IF\n',
    matchRegex: /Pass/i,
    hint: 'Write: IF score > 50 THEN ... END IF',
  },
  {
    id: '3.2-elseif',
    title: '3.2: ELSEIF & ELSE',
    objective: "Print 'A' if score >= 90, otherwise print 'B'.",
    description: "ELSEIF adds another condition, ELSE catches anything that didn't match.",
    template:
      'CLS\nscore = 85\nIF score >= 90 THEN\n    PRINT "A"\nELSEIF score >= 80 THEN\n    PRINT "B"\nELSE\n    PRINT "C"\nEND IF\n',
    matchRegex: /B/,
    hint: 'Score is 85, so it triggers the ELSEIF block.',
  },
  {
    id: '3.3-select',
    title: '3.3: SELECT CASE',
    objective: "Print 'Gold' if rank is 1, using SELECT CASE.",
    description:
      'SELECT CASE is cleaner than multiple IFs when checking the same variable against different values.',
    template:
      'CLS\nrank = 1\nSELECT CASE rank\n    CASE 1\n        PRINT "Gold"\n    CASE 2\n        PRINT "Silver"\n    CASE ELSE\n        PRINT "Bronze"\nEND SELECT\n',
    matchRegex: /Gold/i,
    hint: 'Use CASE 1 followed by PRINT',
  },

    {
    id: '3.4-not',
    title: '3.4: Logical NOT',
    objective: 'Reverse a condition using NOT.',
    description: 'NOT reverses the value of a logical expression.',
    template: 'CLS\nflag = 0\nIF NOT flag THEN\n    PRINT "Reversed"\nEND IF\n',
    matchRegex: /Reversed/i,
    hint: 'IF NOT flag evaluates to true when flag is 0.',
  },
  // ─── STAGE 4: LOOPS ───────────────────────────────────────────────────────
  {
    id: '4.1-for',
    title: '4.1: FOR Loops',
    objective: 'Print numbers 1 to 5 using a FOR...NEXT loop.',
    description: 'FOR loops execute a block of code a set number of times.',
    template: 'CLS\nFOR i = 1 TO 5\n    PRINT i\nNEXT i\n',
    matchRegex: /1\s*2\s*3\s*4\s*5/,
    hint: 'Start with FOR i = 1 TO 5, then PRINT i, end with NEXT i',
  },
  {
    id: '4.2-for-step',
    title: '4.2: FOR Loop with STEP',
    objective: 'Count down from 10 to 2 by 2s.',
    description: 'The STEP keyword changes how much the loop counter increments or decrements.',
    template: 'CLS\nFOR i = 10 TO 2 STEP -2\n    PRINT i\nNEXT i\n',
    matchRegex: /10\s*8\s*6\s*4\s*2/,
    hint: 'Use STEP -2 to count backwards.',
  },
  {
    id: '4.3-while',
    title: '4.3: WHILE Loops',
    objective: 'Create a WHILE loop that prints counting down from 3 to 1.',
    description:
      'WHILE loops run as long as the condition evaluates to true. Remember to update the variable inside!',
    template: 'CLS\nx = 3\nWHILE x > 0\n    PRINT x\n    x = x - 1\nWEND\n',
    matchRegex: /3\s*2\s*1/,
    hint: 'Use WHILE x > 0 ... WEND',
  },
  {
    id: '4.4-do',
    title: '4.4: DO...LOOP UNTIL',
    objective: 'Use a DO LOOP UNTIL structure to print numbers 1 to 3.',
    description:
      'A DO loop with UNTIL at the end will always run at least once before checking the condition.',
    template: 'CLS\nx = 1\nDO\n    PRINT x\n    x = x + 1\nLOOP UNTIL x > 3\n',
    matchRegex: /1\s*2\s*3/,
    hint: 'The DO block runs at least once before checking the UNTIL condition.',
  },

    {
    id: '4.5-exit-for',
    title: '4.5: Breaking FOR Loops',
    objective: 'Stop a FOR loop early when i reaches 3.',
    description: 'EXIT FOR breaks out of the loop immediately.',
    template: 'CLS\nFOR i = 1 TO 5\n    IF i = 3 THEN EXIT FOR\n    PRINT i\nNEXT i\n',
    matchRegex: /1\s*2/,
    hint: 'The loop exits before printing 3.',
  },
  {
    id: '4.6-exit-do',
    title: '4.6: Breaking DO Loops',
    objective: 'Use EXIT DO to break out of an infinite DO loop.',
    description: 'Provide an escape hatch for DO LOOPs using EXIT DO.',
    template: 'CLS\nx = 1\nDO\n    PRINT x\n    IF x = 2 THEN EXIT DO\n    x = x + 1\nLOOP\n',
    matchRegex: /1\s*2/,
    hint: 'Print x, check IF x = 2 THEN EXIT DO, then increment x.',
  },
  // ─── STAGE 5: STRINGS MANIPULATION ────────────────────────────────────────
  {
    id: '5.1-ucase',
    title: '5.1: String Case',
    objective: "Convert 'qbasic' to uppercase and print it.",
    description: 'UCASE$ converts a string to upper case, LCASE$ to lower case.',
    template: 'CLS\nmsg$ = "qbasic"\nPRINT UCASE$(msg$)\n',
    matchRegex: /QBASIC/,
    hint: 'Use UCASE$(var$)',
  },
  {
    id: '5.2-slice',
    title: '5.2: Slicing Strings',
    objective: "Print the first 3 letters, then the middle 3, then the last 3 of 'RetroWave'.",
    description:
      'LEFT$(s, n) gets the left part. RIGHT$(s, n) gets the right part. MID$(s, start, length) gets the middle.',
    template:
      'CLS\nword$ = "RetroWave"\nPRINT LEFT$(word$, 3)\nPRINT MID$(word$, 4, 3)\nPRINT RIGHT$(word$, 4)\n',
    matchRegex: /Ret\s*roW\s*Wave/i,
    hint: 'Use LEFT$, MID$, and RIGHT$.',
  },
  {
    id: '5.3-len',
    title: '5.3: String Length & Trim',
    objective: "Get the length of the word 'Nexus' and print it.",
    description:
      'LEN() returns the number of characters. LTRIM$ and RTRIM$ remove spaces from the ends.',
    template: 'CLS\nword$ = "Nexus"\nPRINT LEN(word$)\n',
    matchRegex: /5/,
    hint: 'Use LEN(word$).',
  },
  {
    id: '5.4-instr',
    title: '5.4: Find Substrings (INSTR)',
    objective: "Find the position of 'b' in 'QBasic' and print it.",
    description:
      'INSTR(string, substring) returns the starting position (1-based index) of the substring.',
    template: 'CLS\npos = INSTR("QBasic", "B")\nPRINT pos\n',
    matchRegex: /2/,
    hint: "The 'B' is the 2nd letter, so it prints 2.",
  },
  {
    id: '5.5-chr',
    title: '5.5: ASCII Codes (CHR$ and ASC)',
    objective: 'Print the character for ASCII code 65.',
    description: 'CHR$(number) turns an ASCII code into a character. ASC(char) does the reverse.',
    template: 'CLS\nPRINT CHR$(65)\n',
    matchRegex: /A/,
    hint: "ASCII 65 is capital 'A'.",
  },

    {
    id: '5.6-trim',
    title: '5.6: Trimming Strings',
    objective: 'Remove the extra spaces around a word.',
    description: 'LTRIM$ removes left spaces, RTRIM$ removes right spaces.',
    template: 'CLS\nword$ = "  TrimMe  "\nPRINT LTRIM$(RTRIM$(word$))\n',
    matchRegex: /TrimMe/,
    hint: 'Combine LTRIM$ and RTRIM$ to remove spaces from both sides.',
  },
  {
    id: '5.7-str-val',
    title: '5.7: Numbers to Strings (STR$, VAL)',
    objective: 'Convert a number to a string and back.',
    description: 'STR$ converts number to string. VAL converts string to number.',
    template: 'CLS\nn$ = STR$(123)\nPRINT VAL(n$) * 2\n',
    matchRegex: /246/,
    hint: 'STR$ adds a leading space for positive numbers, VAL parses it.',
  },
  // ─── STAGE 6: MATH EXTRAS & RANDOMNESS ────────────────────────────────────
  {
    id: '6.1-rnd',
    title: '6.1: Random Numbers',
    objective: 'Generate and print a random number between 1 and 10.',
    description:
      'RND gives a decimal between 0 and 1. INT rounds down the result. RANDOMIZE TIMER seeds the generator.',
    template: 'CLS\nRANDOMIZE TIMER\nr = INT(RND * 10) + 1\nPRINT r\n',
    matchRegex: /^[1-9]$|^10$/,
    hint: 'Use INT(RND * 10) + 1 to get numbers 1-10.',
  },
  {
    id: '6.2-math-func',
    title: '6.2: Built-in Math',
    objective: 'Print the absolute value of -42, and the square root of 25.',
    description: 'ABS() returns absolute (positive) value. SQR() returns the square root.',
    template: 'CLS\nPRINT ABS(-42)\nPRINT SQR(25)\n',
    matchRegex: /42\s*5/,
    hint: 'Use ABS(-42) and SQR(25).',
  },

    {
    id: '6.3-trig',
    title: '6.3: Trigonometry (SIN, COS)',
    objective: 'Calculate the sine and cosine of 0.',
    description: 'SIN and COS expect angles in radians.',
    template: 'CLS\nPRINT SIN(0)\nPRINT COS(0)\n',
    matchRegex: /0\s*1/,
    hint: 'SIN(0) is 0, COS(0) is 1.',
  },
  // ─── STAGE 7: ARRAYS & CUSTOM TYPES ───────────────────────────────────────
  {
    id: '7.1-arrays',
    title: '7.1: 1D Arrays',
    objective: 'Create an array for 3 items, assign a value to index 1, and print it.',
    description: 'An array holds multiple values under one name. Declare with DIM arrayName(size).',
    template: 'CLS\nDIM inventory(3) AS STRING\ninventory(1) = "Sword"\nPRINT inventory(1)\n',
    matchRegex: /Sword/i,
    hint: 'Use DIM inventory(3) AS STRING',
  },
  {
    id: '7.2-2darrays',
    title: '7.2: 2D Arrays (Grid)',
    objective: 'Create a 3x3 array (grid), set grid(2,2) to 9, and print it.',
    description: 'Use commas to add dimensions to arrays, perfect for tile maps or game boards.',
    template: 'CLS\nDIM grid(3, 3) AS INTEGER\ngrid(2, 2) = 9\nPRINT grid(2, 2)\n',
    matchRegex: /9/,
    hint: 'DIM grid(3, 3) creates a 2D array.',
  },

    {
    id: '7.3-md-bounds',
    title: '7.3: Array Bounds (Multi-dimension)',
    objective: 'Find the bounds of the 2nd dimension in an array.',
    description: 'Pass the dimension number to LBOUND/UBOUND as the second argument.',
    template: 'CLS\nDIM matrix(1 TO 3, 5 TO 10)\nPRINT UBOUND(matrix, 2)\n',
    matchRegex: /10/,
    hint: 'UBOUND(matrix, 2) returns the upper bound of the 2nd dimension.',
  },
  // ─── STAGE 8: ADVANCED ROUTING ───────────────────────────────────────────
  {
    id: '8.1-goto',
    title: '8.1: Line Labels and Jumping (GOTO)',
    objective: 'Skip over a PRINT statement using GOTO.',
    description:
      'Line Labels let you name a location in code. GOTO jumps execution directly to that label.',
    template:
      'CLS\nGOTO SkipLogic\nPRINT "This should be skipped"\nSkipLogic:\nPRINT "Jump successful"\n',
    matchRegex: /Jump successful/i,
    hint: 'Use GOTO followed by the name of the label (SkipLogic).',
  },
  {
    id: '8.2-gosub',
    title: '8.2: Local Subroutines (GOSUB)',
    objective: 'Jump to a subroutine and return using GOSUB and RETURN.',
    description:
      'GOSUB jumps to a label like GOTO, but it remembers where it came from so RETURN can go back.',
    template:
      'CLS\nPRINT "Start"\nGOSUB MyRoutine\nPRINT "End"\nEND\n\nMyRoutine:\nPRINT "Inside"\nRETURN\n',
    matchRegex: /Start\s*Inside\s*End/,
    hint: 'GOSUB branches to MyRoutine, and RETURN brings execution back.',
  },

    {
    id: '8.3-infinite',
    title: '8.3: Avoiding Call-Stack Crashes',
    objective: 'Use a loop instead of recursive GOSUBs.',
    description: 'Never GOSUB inside a GOSUB indefinitely, it will overflow memory. (QBNexus safely traps this!)',
    template: 'CLS\nx = 1\nSafeLoop:\nPRINT x\nx = x + 1\nIF x < 3 THEN GOTO SafeLoop\n',
    matchRegex: /1\s*2/,
    hint: 'Use GOTO for simple looping rather than infinite GOSUBs.',
  },
  // ─── STAGE 9: DYNAMIC ARRAYS & BOUNDS ────────────────────────────────────
  {
    id: '9.1-redim',
    title: '9.1: Dynamic Arrays (REDIM)',
    objective: 'Create a dynamic array with REDIM, assign a value, and print it.',
    description: 'REDIM creates or resizes an array while the program is running.',
    template:
      'CLS\nsize = 5\nREDIM dynArray(size) AS INTEGER\ndynArray(size) = 99\nPRINT dynArray(size)\n',
    matchRegex: /99/,
    hint: 'Use REDIM instead of DIM when using variables for array sizes.',
  },
  {
    id: '9.2-preserve',
    title: '9.2: Preserving Data',
    objective: 'Resize an array without losing its data using REDIM PRESERVE.',
    description: 'Normal REDIM clears the array. Add PRESERVE to keep existing data.',
    template:
      'CLS\nREDIM arr(2) AS INTEGER\narr(1) = 5\nREDIM PRESERVE arr(4) AS INTEGER\nPRINT arr(1)\n',
    matchRegex: /5/,
    hint: 'Because of PRESERVE, arr(1) will still be 5.',
  },
  {
    id: '9.3-bounds',
    title: '9.3: Finding Array Bounds',
    objective: 'Print the lower and upper bounds of an array.',
    description: 'LBOUND returns the lowest index, UBOUND returns the highest index.',
    template: 'CLS\nDIM arr(1 TO 10) AS INTEGER\nPRINT LBOUND(arr)\nPRINT UBOUND(arr)\n',
    matchRegex: /1\s*10/,
    hint: 'Use LBOUND(arr) and UBOUND(arr).',
  },
  {
    id: '9.4-erase',
    title: '9.4: Clearing Memory (ERASE)',
    objective: 'Use ERASE to clear an array and print index 1.',
    description:
      'ERASE completely resets fixed arrays to 0/empty, or frees memory for dynamic arrays.',
    template: 'CLS\nDIM arr(3) AS INTEGER\narr(1) = 42\nERASE arr\nPRINT arr(1)\n',
    matchRegex: /0/,
    hint: 'After ERASE, arr(1) should be 0.',
  },

  // ─── STAGE 10: CUSTOM PROCEDURES ─────────────────────────────────────────
  {
    id: '10.1-sub',
    title: '10.1: Creating Commands (SUB)',
    objective: 'Create a SUB called Greet that prints "Welcome" and CALL it.',
    description:
      'SUBs act like custom commands. You can call them by name without the CALL keyword in modern BASIC.',
    template: 'CLS\nGreet\nEND\n\nSUB Greet\n    PRINT "Welcome"\nEND SUB\n',
    matchRegex: /Welcome/i,
    hint: 'Just run the template; it demonstrates how SUBs are structured.',
  },
  {
    id: '10.2-function',
    title: '10.2: Creating Functions',
    objective: 'Create a FUNCTION that doubles a number and returns it.',
    description: 'FUNCTIONs return a value. Assign the result to the function name.',
    template:
      'CLS\nPRINT DoubleNum(10)\nEND\n\nFUNCTION DoubleNum(x)\n    DoubleNum = x * 2\nEND FUNCTION\n',
    matchRegex: /20/,
    hint: 'Assigning to DoubleNum returns the value.',
  },

    {
    id: '10.3-byref',
    title: '10.3: Pass By Reference',
    objective: 'Modify a variable inside a SUB so the change is seen outside.',
    description: 'By default, variables are passed by reference, meaning the SUB can alter the original.',
    template: 'CLS\nx = 5\nModify x\nPRINT x\nEND\n\nSUB Modify (v)\n    v = 99\nEND SUB\n',
    matchRegex: /99/,
    hint: 'x becomes 99 because passing by reference linking v to x.',
  },
  {
    id: '10.4-multiple-args',
    title: '10.4: Multiple Arguments',
    objective: 'Create a function that adds two numbers.',
    description: 'Separate parameters with commas.',
    template: 'CLS\nPRINT Add(5, 7)\nEND\n\nFUNCTION Add(a, b)\n    Add = a + b\nEND FUNCTION\n',
    matchRegex: /12/,
    hint: 'Add = a + b',
  },
  // ─── STAGE 11: SCOPE & MODULARITY ────────────────────────────────────────
  {
    id: '11.1-shared',
    title: '11.1: Global Variables (SHARED)',
    objective: 'Make a variable global so a SUB can see it.',
    description:
      'DIM SHARED makes a variable accessible everywhere, including inside SUBs and FUNCTIONs.',
    template:
      'CLS\nDIM SHARED globalVar AS INTEGER\nglobalVar = 77\nShowGlobal\nEND\n\nSUB ShowGlobal\n    PRINT globalVar\nEND SUB\n',
    matchRegex: /77/,
    hint: 'The SUB can see globalVar because of DIM SHARED.',
  },
  {
    id: '11.2-static',
    title: '11.2: Preserving Function State (STATIC)',
    objective: "Use STATIC to remember a variable's value between calls.",
    description:
      "STATIC variables inside a sub/function don't lose their value when the procedure ends.",
    template:
      'CLS\nCountUp\nCountUp\nEND\n\nSUB CountUp\n    STATIC c AS INTEGER\n    c = c + 1\n    PRINT c\nEND SUB\n',
    matchRegex: /1\s*2/,
    hint: 'c remembers its value, so calling CountUp twice prints 1 then 2.',
  },

    {
    id: '11.3-include',
    title: '11.3: Multi-file Projects',
    objective: 'Understand $INCLUDE to split code across multiple files.',
    description: 'Use \'$INCLUDE: \'file.bi\' to merge code. Pretend we do it here.',
    template: 'CLS\nPRINT "Included File Loaded"\n',
    matchRegex: /Included File Loaded/i,
    hint: 'Normally you\'d write \'$INCLUDE: \'library.bi\'',
  },
  // ─── STAGE 12: MANAGING STATIC DATA ──────────────────────────────────────
  {
    id: '12.1-data-read',
    title: '12.1: Storing & Extracting Data',
    objective: 'Read two numbers from a DATA block and print them.',
    description:
      'DATA stores static values in the code. READ pulls them into variables sequentially.',
    template: 'CLS\nREAD a, b\nPRINT a; b\nDATA 10, 20\n',
    matchRegex: /10\s*20/,
    hint: 'READ pulls 10 into a and 20 into b.',
  },
  {
    id: '12.2-restore',
    title: '12.2: Resetting Data Pointers',
    objective: 'Use RESTORE to read the same DATA block twice.',
    description: 'RESTORE resets the internal pointer back to the first DATA statement.',
    template: 'CLS\nREAD x\nPRINT x\nRESTORE\nREAD y\nPRINT y\nDATA 500\n',
    matchRegex: /500\s*500/,
    hint: 'RESTORE makes the next READ start from the beginning again.',
  },

    {
    id: '12.3-data-mix',
    title: '12.3: Mixed DATA Types',
    objective: 'Read a string and a number from DATA.',
    description: 'DATA can contain mix of strings and numbers. READ them into corresponding variable types.',
    template: 'CLS\nREAD n$, a\nPRINT n$; a\nDATA "Age", 30\n',
    matchRegex: /Age\s*30/i,
    hint: 'n$ reads "Age", a reads 30.',
  },
  // ─── STAGE 13: STRUCTURED DATA & TYPES ────────────────────────────────────
  {
    id: '13.1-types',
    title: '13.1: Custom Data Types (TYPE)',
    objective: "Create a TYPE 'Player', assign its X property to 10, and print it.",
    description:
      'TYPE...END TYPE allows you to create custom structs holding multiple properties. Use the dot syntax (p1.X) to access properties.',
    template:
      'CLS\nTYPE Player\n    X AS INTEGER\n    Y AS INTEGER\nEND TYPE\n\nDIM p1 AS Player\np1.X = 10\nPRINT p1.X\n',
    matchRegex: /10/,
    hint: 'p1.X accesses the X property inside the Player type.',
  },
  {
    id: '13.2-fixed-strings',
    title: '13.2: Fixed-Length Strings',
    objective: "Create a fixed-length string of 5 characters, assign 'Hello World', print it.",
    description:
      'A string defined as STRING * N will truncate or pad spaces so it is always exactly N characters long.',
    template: 'CLS\nDIM fixedStr AS STRING * 5\nfixedStr = "Hello World"\nPRINT fixedStr\n',
    matchRegex: /Hello/,
    hint: 'The output will literally just be "Hello" because it gets truncated to 5 bytes.',
  },

    {
    id: '13.3-type-arrays',
    title: '13.3: Arrays of Structures',
    objective: 'Create an array of TYPEs and set index 2.',
    description: 'You can DIM an array AS your custom TYPE.',
    template: 'CLS\nTYPE Point\n  X AS INTEGER\nEND TYPE\nDIM path(3) AS Point\npath(2).X = 50\nPRINT path(2).X\n',
    matchRegex: /50/,
    hint: 'path(2).X accesses the X property of the 2nd element.',
  },
  {
    id: '13.4-nested-types',
    title: '13.4: Nested Types',
    objective: 'Put a TYPE inside another TYPE.',
    description: 'Structures can be composed of other structures.',
    template: 'CLS\nTYPE Vec2\n  X AS INTEGER\nEND TYPE\nTYPE Character\n  Pos AS Vec2\nEND TYPE\nDIM p AS Character\np.Pos.X = 100\nPRINT p.Pos.X\n',
    matchRegex: /100/,
    hint: 'p.Pos.X chains the property accesses.',
  },
  // ─── STAGE 14: SEQUENTIAL FILE I/O ─────────────────────────────────────────
  {
    id: '14.1-open-out',
    title: '14.1: Writing Text to Files',
    objective: "Open a file for output and write 'Hello File' to it.",
    description: 'OPEN a file FOR OUTPUT to write data using PRINT #.',
    template:
      'CLS\nOPEN "test.txt" FOR OUTPUT AS #1\nPRINT #1, "Hello File"\nCLOSE #1\nPRINT "File Written"\n',
    matchRegex: /File Written/i,
    hint: 'Make sure you CLOSE #1 when done.',
  },
  {
    id: '14.2-open-in',
    title: '14.2: Reading from Files',
    objective: 'Open a file FOR INPUT and read its contents back using INPUT #.',
    description: 'OPEN ... FOR INPUT AS #1 reads from the file. Use INPUT #1, var$ to read.',
    template:
      'CLS\nOPEN "test.txt" FOR OUTPUT AS #1\nPRINT #1, "SavedData"\nCLOSE #1\n\nOPEN "test.txt" FOR INPUT AS #1\nINPUT #1, myVar$\nCLOSE #1\n\nPRINT myVar$\n',
    matchRegex: /SavedData/i,
    hint: 'INPUT # reads comma-separated values, LINE INPUT # reads the whole line.',
  },

    {
    id: '14.3-append',
    title: '14.3: Appending to Files',
    objective: 'Open a file FOR APPEND and add text without overwriting.',
    description: 'APPEND adds data to the end of the file instead of wiping it.',
    template: 'CLS\nOPEN "log.txt" FOR APPEND AS #1\nPRINT #1, "New Log"\nCLOSE #1\nPRINT "Appended"\n',
    matchRegex: /Appended/i,
    hint: 'Use FOR APPEND instead of FOR OUTPUT.',
  },
  {
    id: '14.4-eof',
    title: '14.4: Reading to End of File (EOF)',
    objective: 'Use a loop and EOF() to read all lines.',
    description: 'EOF(filenumber) returns true [-1] when there\'s no more data.',
    template: 'CLS\nOPEN "temp.txt" FOR OUTPUT AS #1\nPRINT #1, "A"\nPRINT #1, "B"\nCLOSE #1\n\nOPEN "temp.txt" FOR INPUT AS #1\nDO UNTIL EOF(1)\n    INPUT #1, line$\n    PRINT line$\nLOOP\nCLOSE #1\n',
    matchRegex: /A\s*B/,
    hint: 'DO UNTIL EOF(1) keeps reading until the end.',
  },
  // ─── STAGE 15: RANDOM & BINARY FILE I/O ────────────────────────────────────
  {
    id: '15.1-random',
    title: '15.1: Random Access Files',
    objective: 'Write a TYPE struct to a Random file using PUT #, then read it back with GET #.',
    description:
      'OPEN ... FOR RANDOM allows you to read/write exact blocks using the LEN= argument and the PUT/GET commands.',
    template:
      'CLS\nTYPE ScoreRecord\n    Score AS INTEGER\nEND TYPE\nDIM P1 AS ScoreRecord\nP1.Score = 900\n\nOPEN "save.dat" FOR RANDOM AS #1 LEN = LEN(P1)\nPUT #1, 1, P1\n\nDIM P2 AS ScoreRecord\nGET #1, 1, P2\nCLOSE #1\n\nPRINT P2.Score\n',
    matchRegex: /900/,
    hint: 'We PUT into record 1, then GET from record 1 into a different variable to prove it worked.',
  },
  {
    id: '15.2-legacy-binary',
    title: '15.2: Legacy Binary Conversion',
    objective:
      'Convert the integer 123 into a 2-byte string using MKI$, then convert it back using CVI.',
    description:
      'Legacy BASIC used MKI$, MKL$, MKS$, MKD$ to convert numbers to raw byte strings, and CVI/CVL/CVS/CVD to convert back.',
    template: 'CLS\nbin$ = MKI$(123)\nnum = CVI(bin$)\nPRINT num\n',
    matchRegex: /123/,
    hint: 'MKI$ creates a 2-byte string representation of an integer.',
  },

    {
    id: '15.3-seek',
    title: '15.3: Seeking in Files (SEEK)',
    objective: 'Jump to a specific byte/record using SEEK.',
    description: 'SEEK #fn, position moves the file pointer.',
    template: 'CLS\nOPEN "data.txt" FOR OUTPUT AS #1\nPRINT #1, "ABCDE"\nCLOSE #1\n\nOPEN "data.txt" FOR BINARY AS #1\nSEEK #1, 3\nINPUT #1, chars$\nCLOSE #1\nPRINT chars$\n',
    matchRegex: /CDE/,
    hint: 'SEEK #1, 3 skips A and B.',
  },
  {
    id: '15.4-binary',
    title: '15.4: Open For Binary',
    objective: 'Read exact bytes using OPEN FOR BINARY.',
    description: 'Get raw bytes using GET #.',
    template: 'CLS\nOPEN "raw.bin" FOR BINARY AS #1\nDIM b AS STRING * 1\nGET #1, 1, b\nCLOSE #1\nPRINT "OK"\n',
    matchRegex: /OK/i,
    hint: 'BINARY mode gives complete low-level file control.',
  },
  // ─── STAGE 16: DIRECTORY MANAGEMENT ────────────────────────────────────────
  {
    id: '16.1-mkdir',
    title: '16.1: Creating Folders',
    objective: 'Create a new folder called "data", enter it, and print success.',
    description:
      'You can manage the virtual filesystem with MKDIR (Make Directory), CHDIR (Change Directory), and RMDIR (Remove Directory).',
    template: 'CLS\nMKDIR "data"\nCHDIR "data"\nPRINT "Entered directory"\n',
    matchRegex: /Entered directory/i,
    hint: 'MKDIR creates a folder, CHDIR enters it.',
  },

    {
    id: '16.2-files',
    title: '16.2: Looking up files (FILES)',
    objective: 'Display a list of files in the current directory.',
    description: 'FILES acts like the "dir" or "ls" command.',
    template: 'CLS\nPRINT "Listing..."\nFILES\n',
    matchRegex: /Listing/i,
    hint: 'Just call FILES',
  },
  {
    id: '16.3-kill-name',
    title: '16.3: Renaming and Deleting',
    objective: 'Rename a file with NAME and delete it with KILL.',
    description: 'NAME "old" AS "new" renames. KILL "file" deletes.',
    template: 'CLS\nOPEN "junk.txt" FOR OUTPUT AS #1: CLOSE #1\nNAME "junk.txt" AS "trash.txt"\nKILL "trash.txt"\nPRINT "Cleaned"\n',
    matchRegex: /Cleaned/i,
    hint: 'Create it, rename it, kill it!',
  },
  // ─── STAGE 17: MEMORY & HARDWARE EMULATION ──────────────────────────────────
  {
    id: '17.1-peek-poke',
    title: '17.1: Virtual RAM (PEEK & POKE)',
    objective: 'Set the memory segment, POKE a value into virtual RAM, and PEEK it back out.',
    description:
      'In QBasic Nexus, DEF SEG sets the base memory segment block, POKE writes a byte, and PEEK reads a byte. This is completely safe and emulated!',
    template: 'CLS\nDEF SEG = 0\nPOKE 1040, 255\nval = PEEK(1040)\nPRINT val\n',
    matchRegex: /255/,
    hint: 'The virtual sandbox isolates PEEK/POKE from your real PC memory.',
  },

    {
    id: '17.2-inp-out',
    title: '17.2: Emulated Hardware (INP flow)',
    objective: 'Attempt to read an emulated hardware port using INP.',
    description: 'INP reads a byte from a hardware port. QBNexus safely mocks this.',
    template: 'CLS\nval = INP(&H3DA)\nPRINT "Port polled"\n',
    matchRegex: /Port polled/i,
    hint: 'INP(&H3DA) historically reads the VGA status register.',
  },
  {
    id: '17.3-memcopy',
    title: '17.3: Fast Memory Copy',
    objective: 'Use _MEMCOPY to quickly move memory.',
    description: '_MEMCOPY is a QB64 specific extension for blazing fast memory movement.',
    template: 'CLS\nDIM a(5) AS INTEGER, b(5) AS INTEGER\na(1) = 44\n_MEMCOPY _OFFSET(a(1)), _OFFSET(b(1)), 2\nPRINT b(1)\n',
    matchRegex: /44/i,
    hint: 'It copies the bytes of a(1) directly into b(1).',
  },
  {
    id: '17.4-memfill',
    title: '17.4: Fast Memory Fill',
    objective: 'Use _MEMFILL to quickly initialize memory.',
    description: '_MEMFILL floods a block of memory with a specific byte.',
    template: 'CLS\nDIM a(5) AS INTEGER\n_MEMFILL _OFFSET(a(1)), 2, 0\nPRINT a(1)\n',
    matchRegex: /0/i,
    hint: 'Fills 2 bytes with 0.',
  },
  // ─── STAGE 18: VISUALS & GRAPHICS ─────────────────────────────────────────
  {
    id: '18.1-screen13',
    title: '18.1: Graphics Mode (SCREEN 13)',
    objective: 'Change screen mode to 13 and draw a single dot using PSET.',
    description: 'SCREEN 13 is the classic 320x200 pixel, 256-color VGA mode. PSET draws a pixel.',
    template: 'SCREEN 13\nCOLOR 14\nPSET (160, 100), 10\nPRINT "Graphics ON"\n',
    matchRegex: /Graphics ON/i,
    hint: 'Use SCREEN 13 to enter graphics mode.',
  },
  {
    id: '18.2-line',
    title: '18.2: Drawing Lines & Boxes',
    objective: 'Draw a straight line and a filled box.',
    description:
      'LINE (x1,y1)-(x2,y2), c draws a line. Add ,B for a box, or ,BF for a solid filled box.',
    template:
      'SCREEN 13\nLINE (10,10)-(50,10), 14\nLINE (60,10)-(100,50), 9, BF\nPRINT "Lines and Boxes"\n',
    matchRegex: /Lines and Boxes/i,
    hint: 'BF stands for Box Filled.',
  },
  {
    id: '18.3-circle',
    title: '18.3: Drawing Circles',
    objective: 'Draw a circle in the middle of the screen.',
    description: 'CIRCLE (x, y), radius, color draws a circle.',
    template: 'SCREEN 13\nCIRCLE (160, 100), 50, 11\nPRINT "Ring"\n',
    matchRegex: /Ring/i,
    hint: 'Screen center is roughly (160, 100).',
  },
  {
    id: '18.4-paint',
    title: '18.4: PAINT (Flood Fill)',
    objective: 'Draw a circle and fill the inside with a different color.',
    description: 'PAINT (x, y), fill_color, border_color flood-fills a bounded area.',
    template: 'SCREEN 13\nCIRCLE (100, 100), 30, 15\nPAINT (100, 100), 10, 15\nPRINT "Filled"\n',
    matchRegex: /Filled/i,
    hint: 'PAINT needs a point inside the border, the fill color, and the border color to stop at.',
  },
  {
    id: '18.5-draw',
    title: '18.5: The DRAW Macro',
    objective: 'Use the DRAW command to draw a quick shape.',
    description:
      "DRAW accepts a mini language string. U=Up, D=Down, L=Left, R=Right. (e.g., 'U10 R10 D10 L10')",
    template: 'SCREEN 13\nPSET (100, 100)\nDRAW "U20 R20 D20 L20"\nPRINT "Square drawn"\n',
    matchRegex: /Square drawn/i,
    hint: 'DRAW starts from the last graphics position.',
  },

  // ─── STAGE 19: AUDIO & MUSIC ──────────────────────────────────────────────
  {
    id: '19.1-sound',
    title: '19.1: Beeps (SOUND)',
    objective: 'Play a frequency of 440Hz for a short duration.',
    description:
      'SOUND frequency, duration plays a bare tone. (Note: In Webview, SOUND requires the user to interact with the screen first to bypass browser audio block).',
    template: 'CLS\nPRINT "Beeping..."\nSOUND 440, 10\n',
    matchRegex: /Beeping/i,
    hint: '440Hz is the A4 note.',
  },
  {
    id: '19.2-play',
    title: '19.2: Music Macros (PLAY)',
    objective: 'Play some simple musical notes using PLAY.',
    description:
      'The PLAY command uses a special macro language to play notes sequence (A-G, Octaves, tempo).',
    template: 'CLS\nPRINT "Playing music!"\nPLAY "CDE CDE EDC"\n',
    matchRegex: /Playing music!/i,
    hint: 'PLAY accepts a string like "C D E" to play notes.',
  },

  // ─── STAGE 20: ERROR HANDLING & LIMIT ──────────────────────────────────────
  {
    id: '20.1-on-error',
    title: '20.1: Trapping Errors',
    objective: 'Use ON ERROR GOTO to trap a division by zero error without crashing.',
    description:
      'ON ERROR GOTO allows you to reroute the AST Execution state-machine to an error handler block when a crash occurs. RESUME NEXT returns execution.',
    template:
      'CLS\nON ERROR GOTO ErrorHandler\nx = 10 / 0\nPRINT "Recovered"\nEND\n\nErrorHandler:\n  PRINT "Error Trapped!"\n  RESUME NEXT\n',
    matchRegex: /Error Trapped!\s*Recovered/i,
    hint: 'Because of RESUME NEXT, the code leaps right back to printing "Recovered".',
  },
  {
    id: '20.2-limit',
    title: '20.2: Frame Pacing (_LIMIT)',
    objective: 'Use _LIMIT to prevent a DO loop from consuming 100% CPU.',
    description:
      'Modern QB64 extension _LIMIT 60 tells the engine to run the loop exactly 60 times a second.',
    template: 'CLS\nx = 0\nDO\n  x = x + 1\n  _LIMIT 60\nLOOP UNTIL x = 3\nPRINT "Throttled"\n',
    matchRegex: /Throttled/i,
    hint: '_LIMIT 60 acts like a smart SLEEP command for games.',
  },

    {
    id: '20.3-mouse',
    title: '20.3: Modern Input (_MOUSEINPUT)',
    objective: 'Poll the mouse state.',
    description: '_MOUSEINPUT returns true [-1] if the mouse state changed, and _MOUSEX reads X.',
    template: 'CLS\nWHILE _MOUSEINPUT: WEND\nx = _MOUSEX\nPRINT "Mouse Active"\n',
    matchRegex: /Mouse Active/i,
    hint: 'Emulated environments can track the mouse coordinates.',
  },
  // ─── STAGE 21: CAPSTONE PROJECTS ───────────────────────────────────────────
  {
    id: '21.1-capstone-file',
    title: '21.1: Capstone – Save & Load a High Score',
    objective: 'Write a high score of 9999 to a file, read it back, and print it.',
    description:
      'Combine File I/O, Variables, and Loops into one cohesive program. ' +
      'This exercise mirrors a real save-game system: open a binary-friendly ' +
      'text file, persist data, close it, re-open, read back, and display.',
    template:
      'CLS\n' +
      'DIM score AS INTEGER\n' +
      'score = 9999\n' +
      '\n' +
      "'--- Save ---\n" +
      'OPEN "hiscore.dat" FOR OUTPUT AS #1\n' +
      'PRINT #1, score\n' +
      'CLOSE #1\n' +
      '\n' +
      "'--- Load ---\n" +
      'DIM loaded AS INTEGER\n' +
      'OPEN "hiscore.dat" FOR INPUT AS #1\n' +
      'INPUT #1, loaded\n' +
      'CLOSE #1\n' +
      '\n' +
      'PRINT "High Score:"; loaded\n',
    matchRegex: /High Score:\s*9999/i,
    hint: 'OPEN for OUTPUT writes, OPEN for INPUT reads. Make sure you CLOSE between the two.',
  },
  {
    id: '21.2-capstone-game',
    title: '21.2: Capstone – Putting It All Together',
    objective: 'Build a mini number-guessing game using SUB, RANDOMIZE, RND, and ON ERROR GOTO.',
    description:
      'The ultimate capstone! Your program should: generate a secret number 1–10, ' +
      'let the player guess via INPUT, give Higher/Lower hints in a loop, ' +
      'and print "You Win in N tries!" when they get it. ' +
      'Bonus: Trap any unexpected error with ON ERROR GOTO.',
    template:
      'CLS\n' +
      'RANDOMIZE TIMER\n' +
      'ON ERROR GOTO ErrHandler\n' +
      '\n' +
      'secret = INT(RND * 10) + 1\n' +
      'tries = 0\n' +
      '\n' +
      'DO\n' +
      '    INPUT "Guess (1-10): ", g\n' +
      '    tries = tries + 1\n' +
      '    IF g < secret THEN PRINT "Higher!"\n' +
      '    IF g > secret THEN PRINT "Lower!"\n' +
      'LOOP UNTIL g = secret\n' +
      '\n' +
      'PRINT "You Win in"; tries; "tries!"\n' +
      'END\n' +
      '\n' +
      'ErrHandler:\n' +
      '    PRINT "Error caught!"\n' +
      '    RESUME NEXT\n',
    matchRegex: /You Win in \d+ tries!/i,
    hint: 'The DO...LOOP UNTIL exits only when g equals secret. RESUME NEXT keeps the game alive after any error.',
  },
  // ─── STAGE 22: CONSOLE & KEYBOARD ──────────────────────────────────────────
  {
    id: '22.1-csrlin-pos',
    title: '22.1: Cursor Position (CSRLIN, POS)',
    objective: 'Move the cursor and print the current row plus the current print column.',
    description: 'CSRLIN returns the current text row. POS(0) reports the current print column.',
    template: 'CLS\nLOCATE 4, 10\nPRINT CSRLIN\nPRINT POS(0)\n',
    matchRegex: /4\s*\d+/,
    hint: 'LOCATE changes the cursor. CSRLIN and POS(0) tell you where printing is happening.',
  },
  {
    id: '22.2-tab-spc',
    title: '22.2: Formatted PRINT (TAB, SPC)',
    objective: 'Use TAB and SPC to place gaps between printed values.',
    description: 'TAB(n) jumps to a print column. SPC(n) inserts a fixed number of spaces.',
    template: 'CLS\nPRINT "A"; TAB(5); "B"\nPRINT "C"; SPC(3); "D"\n',
    matchRegex: /A\s+B\s*C\s+D/,
    hint: 'Use semicolons with TAB() and SPC() to keep everything on the same PRINT line.',
  },
  {
    id: '22.3-beep',
    title: '22.3: Simple Alerts (BEEP)',
    objective: 'Play a beep and then print "Beeped".',
    description: 'BEEP is the classic way to make a short alert sound in text-mode BASIC programs.',
    template: 'CLS\nBEEP\nPRINT "Beeped"\n',
    matchRegex: /Beeped/i,
    hint: 'Call BEEP on one line, then PRINT your confirmation message.',
  },
  {
    id: '22.4-inkey',
    title: '22.4: Keyboard Polling (INKEY$)',
    objective: 'Read the keyboard buffer with INKEY$ and print a status message.',
    description: 'INKEY$ checks for a key press without pausing like INPUT does.',
    template: 'CLS\nk$ = INKEY$\nPRINT "Polling keyboard"\n',
    matchRegex: /Polling keyboard/i,
    hint: 'Store INKEY$ in a string variable even if you only want a status message for now.',
  },
  {
    id: '22.5-line-input',
    title: '22.5: Reading Full Lines (LINE INPUT)',
    objective: 'Write one line to a file, read the full line back, and print it.',
    description: 'LINE INPUT reads an entire line of text at once, including spaces.',
    template:
      'CLS\nOPEN "note.txt" FOR OUTPUT AS #1\nPRINT #1, "Hello there"\nCLOSE #1\nOPEN "note.txt" FOR INPUT AS #1\nLINE INPUT #1, text$\nCLOSE #1\nPRINT text$\n',
    matchRegex: /Hello there/i,
    hint: 'Use LINE INPUT #1, text$ after reopening the file for INPUT.',
  },
  // ─── STAGE 23: DECLARATIONS & NUMERIC TYPES ───────────────────────────────
  {
    id: '23.1-const',
    title: '23.1: Constants with CONST',
    objective: 'Create a constant named MAXHP with value 99 and print it.',
    description: 'CONST creates a fixed value that should not change while the program runs.',
    template: 'CLS\nCONST MAXHP = 99\nPRINT MAXHP\n',
    matchRegex: /99/,
    hint: 'Write CONST MAXHP = 99, then PRINT MAXHP.',
  },
  {
    id: '23.2-let-swap',
    title: '23.2: LET and SWAP',
    objective: 'Use LET to assign two values, swap them, then print 2 and 1.',
    description: 'LET is the classic explicit assignment keyword. SWAP exchanges two variables in one statement.',
    template: 'CLS\nLET a = 1\nLET b = 2\nSWAP a, b\nPRINT a\nPRINT b\n',
    matchRegex: /2\s*1/,
    hint: 'Assign with LET, then use SWAP a, b before printing.',
  },
  {
    id: '23.3-numeric-types',
    title: '23.3: LONG, SINGLE, and DOUBLE',
    objective: 'Declare LONG, SINGLE, and DOUBLE variables and print their values.',
    description: 'QBasic offers multiple numeric types so you can balance range, size, and precision.',
    template:
      'CLS\nDIM big AS LONG\nDIM ratio AS SINGLE\nDIM exact AS DOUBLE\nbig = 50000\nratio = 1.5\nexact = 2.25\nPRINT big\nPRINT ratio\nPRINT exact\n',
    matchRegex: /50000\s*1\.5\s*2\.25/,
    hint: 'Use DIM ... AS LONG/SINGLE/DOUBLE before assigning the values.',
  },
  {
    id: '23.4-conversions',
    title: '23.4: Type Conversion Functions',
    objective: 'Use CINT, CLNG, CSNG, and CDBL, then print 3, 7, 3, and 4.',
    description: 'These conversion functions coerce values into a specific numeric type.',
    template: 'CLS\nPRINT CINT(2.6)\nPRINT CLNG(7.4)\nPRINT CSNG(3)\nPRINT CDBL(4)\n',
    matchRegex: /3\s*7\s*3\s*4/,
    hint: 'Each PRINT should call one conversion function directly.',
  },
  {
    id: '23.5-option-base',
    title: '23.5: Array Bases (OPTION BASE)',
    objective: 'Set arrays to start at index 1, store 77 in the first slot, and print it.',
    description: 'OPTION BASE changes the default lower bound of arrays to 0 or 1.',
    template: 'OPTION BASE 1\nDIM nums(3) AS INTEGER\nnums(1) = 77\nPRINT nums(1)\n',
    matchRegex: /77/,
    hint: 'Write OPTION BASE 1 before DIM so the first index becomes 1.',
  },
  // ─── STAGE 24: PROGRAM FLOW & LEGACY LOGIC ────────────────────────────────
  {
    id: '24.1-xor',
    title: '24.1: Bitwise Logic (XOR)',
    objective: 'Use XOR on 5 and 3, then print the result.',
    description: 'XOR returns bits that differ between two values.',
    template: 'CLS\nPRINT 5 XOR 3\n',
    matchRegex: /6/,
    hint: '5 XOR 3 evaluates to 6.',
  },
  {
    id: '24.2-eqv-imp',
    title: '24.2: Logical Equivalence (EQV, IMP)',
    objective: 'Use EQV and IMP to print both "EQV" and "IMP".',
    description: 'EQV checks logical equivalence. IMP performs logical implication.',
    template: 'CLS\nIF (5 EQV 5) THEN PRINT "EQV"\nIF (0 IMP 1) THEN PRINT "IMP"\n',
    matchRegex: /EQV\s*IMP/i,
    hint: 'Make one IF use EQV and another use IMP.',
  },
  {
    id: '24.3-on-goto',
    title: '24.3: Computed Branching (ON GOTO)',
    objective: 'Branch to the second label with ON GOTO and print "TWO".',
    description: 'ON expression GOTO jumps to a label based on a numeric value.',
    template: 'CLS\nx = 2\nON x GOTO One, Two\nOne:\nPRINT "ONE"\nEND\nTwo:\nPRINT "TWO"\n',
    matchRegex: /TWO/i,
    hint: 'When x = 2, the second label is selected.',
  },
  {
    id: '24.4-on-gosub',
    title: '24.4: Menu Calls (ON GOSUB)',
    objective: 'Call the first label with ON GOSUB, then print "Hi" and "Done".',
    description: 'ON expression GOSUB picks a label like a menu system, then returns to the caller.',
    template:
      'CLS\nx = 1\nON x GOSUB Hello, Bye\nPRINT "Done"\nEND\nHello:\nPRINT "Hi"\nRETURN\nBye:\nPRINT "Bye"\nRETURN\n',
    matchRegex: /Hi\s*Done/i,
    hint: 'Use RETURN inside each branch label so execution comes back after the GOSUB.',
  },
  {
    id: '24.5-def-fn',
    title: '24.5: Legacy DEF FN Functions',
    objective: 'Create a one-line function with DEF FN and print 8.',
    description: 'DEF FN is a compact legacy way to define a simple custom function.',
    template: 'CLS\nDEF FNDouble(n) = n * 2\nPRINT FNDouble(4)\n',
    matchRegex: /8/,
    hint: 'Define FNDouble(n) to multiply n by 2.',
  },
  // ─── STAGE 25: TEXT & TIME UTILITIES ──────────────────────────────────────
  {
    id: '25.1-lcase',
    title: '25.1: Lowercase Conversion (LCASE$)',
    objective: 'Convert "QBASIC" to lowercase and print it.',
    description: 'LCASE$ converts letters to lowercase.',
    template: 'CLS\nPRINT LCASE$("QBASIC")\n',
    matchRegex: /qbasic/,
    hint: 'Wrap the source text with LCASE$(...).',
  },
  {
    id: '25.2-space-string',
    title: '25.2: Padding with SPACE$ and STRING$',
    objective: 'Print a bracketed gap with SPACE$, then print four asterisks with STRING$.',
    description: 'SPACE$ repeats spaces. STRING$ repeats a character or ASCII code.',
    template: 'CLS\nPRINT "["; SPACE$(3); "]"\nPRINT STRING$(4, 42)\n',
    matchRegex: /\[\s+\]\s*\*{4}/,
    hint: 'ASCII code 42 is the asterisk character.',
  },
  {
    id: '25.3-hex-oct',
    title: '25.3: Number Formatting (HEX$, OCT$)',
    objective: 'Print FF and 10 by converting 255 and 8.',
    description: 'HEX$ converts to hexadecimal. OCT$ converts to octal.',
    template: 'CLS\nPRINT HEX$(255)\nPRINT OCT$(8)\n',
    matchRegex: /FF\s*10/i,
    hint: 'Use HEX$(255) and OCT$(8).',
  },
  {
    id: '25.4-timer',
    title: '25.4: Timing with TIMER',
    objective: 'Check TIMER and print "Timer OK".',
    description: 'TIMER returns the number of seconds since midnight, including fractions.',
    template: 'CLS\nIF TIMER >= 0 THEN PRINT "Timer OK"\n',
    matchRegex: /Timer OK/i,
    hint: 'Any valid TIMER value will be zero or greater.',
  },
  {
    id: '25.5-date-time',
    title: '25.5: Current Date and Time',
    objective: 'Print DATE$, TIME$, and then print "Clock Ready".',
    description: 'DATE$ returns the current date. TIME$ returns the current time.',
    template: 'CLS\nPRINT DATE$\nPRINT TIME$\nPRINT "Clock Ready"\n',
    matchRegex: /Clock Ready/i,
    hint: 'Print DATE$ and TIME$ before your confirmation line.',
  },
  // ─── STAGE 26: PROCEDURES & SHARED STATE ──────────────────────────────────
  {
    id: '26.1-call',
    title: '26.1: Calling SUBs with CALL',
    objective: 'Use CALL to run a SUB that prints "Hi from CALL".',
    description: 'CALL is the explicit classic syntax for invoking a SUB.',
    template:
      'CLS\nDECLARE SUB Hello()\nCALL Hello\nEND\nSUB Hello\n    PRINT "Hi from CALL"\nEND SUB\n',
    matchRegex: /Hi from CALL/i,
    hint: 'Declare the SUB first, call it, then define it below the main program.',
  },
  {
    id: '26.2-declare',
    title: '26.2: Forward Declarations (DECLARE)',
    objective: 'Declare a FUNCTION before using it, then print 5.',
    description: 'DECLARE lets you reference a SUB or FUNCTION before its definition appears later.',
    template:
      'CLS\nDECLARE FUNCTION AddOne%(n%)\nPRINT AddOne%(4)\nEND\nFUNCTION AddOne%(n%)\n    AddOne% = n% + 1\nEND FUNCTION\n',
    matchRegex: /5/,
    hint: 'Use DECLARE FUNCTION above the main code, then define the function below.',
  },
  {
    id: '26.3-byval',
    title: '26.3: Pass By Value (BYVAL)',
    objective: 'Pass a number BYVAL so the caller still prints 5.',
    description: 'BYVAL passes a copy, so changes inside the SUB do not affect the original variable.',
    template:
      'CLS\nDECLARE SUB AddOne(BYVAL n AS INTEGER)\nx = 5\nCALL AddOne(x)\nPRINT x\nEND\nSUB AddOne(BYVAL n AS INTEGER)\n    n = n + 1\nEND SUB\n',
    matchRegex: /5/,
    hint: 'If BYVAL is working, the printed x stays 5.',
  },
  {
    id: '26.4-byref',
    title: '26.4: Pass By Reference (BYREF)',
    objective: 'Pass a number BYREF so the caller prints 6 after the SUB runs.',
    description: 'BYREF passes the original variable, so changes inside the SUB affect the caller.',
    template:
      'CLS\nDECLARE SUB AddOne(BYREF n AS INTEGER)\nx = 5\nCALL AddOne(x)\nPRINT x\nEND\nSUB AddOne(BYREF n AS INTEGER)\n    n = n + 1\nEND SUB\n',
    matchRegex: /6/,
    hint: 'If BYREF is working, x changes in the calling code too.',
  },
  {
    id: '26.5-common-shared',
    title: '26.5: COMMON SHARED',
    objective: 'Declare a COMMON SHARED variable named total and print 9.',
    description: 'COMMON SHARED exposes variables across modules in classic multi-file BASIC programs.',
    template: 'CLS\nCOMMON SHARED total\ntotal = 9\nPRINT total\n',
    matchRegex: /9/,
    hint: 'Declare COMMON SHARED total, then assign and print it.',
  },
  // ─── STAGE 27: FILE UTILITIES ─────────────────────────────────────────────
  {
    id: '27.1-write',
    title: '27.1: Structured File Output (WRITE #)',
    objective: 'Write "Nexus" and 42 with WRITE #, read the line back, and print it.',
    description: 'WRITE # stores comma-separated values with quotes around strings for easy parsing later.',
    template:
      'CLS\nOPEN "data.txt" FOR OUTPUT AS #1\nWRITE #1, "Nexus", 42\nCLOSE #1\nOPEN "data.txt" FOR INPUT AS #1\nLINE INPUT #1, row$\nCLOSE #1\nPRINT row$\n',
    matchRegex: /Nexus.*42/i,
    hint: 'Use WRITE # to save the values, then LINE INPUT to inspect the stored line.',
  },
  {
    id: '27.2-freefile',
    title: '27.2: Choosing Handles (FREEFILE)',
    objective: 'Ask FREEFILE for an available handle, use it, then print it.',
    description: 'FREEFILE picks an unused file number so you do not hardcode #1, #2, and so on.',
    template:
      'CLS\nf = FREEFILE\nOPEN "auto.txt" FOR OUTPUT AS #f\nPRINT #f, "OK"\nCLOSE #f\nPRINT "Handle"; f\n',
    matchRegex: /Handle\s*\d+/i,
    hint: 'Store FREEFILE in a variable, then use that variable after the # sign.',
  },
  {
    id: '27.3-lof-loc',
    title: '27.3: File Size and Position (LOF, LOC)',
    objective: 'Open a file and print both "Size OK" and "Pos OK".',
    description: 'LOF returns file length. LOC returns the current file position.',
    template:
      'CLS\nOPEN "bytes.txt" FOR OUTPUT AS #1\nPRINT #1, "ABC"\nCLOSE #1\nOPEN "bytes.txt" FOR INPUT AS #1\nIF LOF(1) > 0 THEN PRINT "Size OK"\nIF LOC(1) >= 0 THEN PRINT "Pos OK"\nCLOSE #1\n',
    matchRegex: /Size OK\s*Pos OK/i,
    hint: 'LOF checks file length. LOC checks where the read/write pointer is.',
  },
  {
    id: '27.4-input-dollar',
    title: '27.4: Raw Character Reads (INPUT$)',
    objective: 'Read the first character from a file with INPUT$ and print H.',
    description: 'INPUT$(count, #file) reads an exact number of characters from an open file.',
    template:
      'CLS\nOPEN "chars.txt" FOR OUTPUT AS #1\nPRINT #1, "HELLO"\nCLOSE #1\nOPEN "chars.txt" FOR INPUT AS #1\nPRINT INPUT$(1, #1)\nCLOSE #1\n',
    matchRegex: /H/,
    hint: 'INPUT$(1, #1) reads exactly one character from the file.',
  },
  {
    id: '27.5-rmdir',
    title: '27.5: Removing Directories (RMDIR)',
    objective: 'Create a folder, remove it, and print "Removed".',
    description: 'RMDIR deletes an empty directory.',
    template: 'CLS\nMKDIR "tmp"\nRMDIR "tmp"\nPRINT "Removed"\n',
    matchRegex: /Removed/i,
    hint: 'RMDIR only works if the directory is empty.',
  },
  // ─── STAGE 28: GRAPHICS TOOLKIT ───────────────────────────────────────────
  {
    id: '28.1-preset',
    title: '28.1: Resetting Pixels (PRESET)',
    objective: 'Set a pixel, reset it with PRESET, and print "Cleared".',
    description: 'PRESET changes a pixel back using the background color idea in classic graphics mode.',
    template: 'SCREEN 13\nPSET (10, 10), 12\nPRESET (10, 10)\nPRINT "Cleared"\n',
    matchRegex: /Cleared/i,
    hint: 'Use PSET first so there is a pixel to reset with PRESET.',
  },
  {
    id: '28.2-point',
    title: '28.2: Reading Pixels (POINT)',
    objective: 'Draw a pixel with color 9 and print that color using POINT.',
    description: 'POINT(x, y) returns the color value at a pixel location.',
    template: 'SCREEN 13\nPSET (5, 5), 9\nPRINT POINT(5, 5)\n',
    matchRegex: /9/,
    hint: 'Call POINT with the same coordinates you used for PSET.',
  },
  {
    id: '28.3-view-window',
    title: '28.3: Viewports and World Coordinates',
    objective: 'Set VIEW and WINDOW, draw in mapped coordinates, and print "Mapped".',
    description: 'VIEW clips drawing to a region. WINDOW remaps your coordinate system.',
    template:
      'SCREEN 13\nVIEW (10, 10)-(60, 60)\nWINDOW (0, 0)-(100, 100)\nPSET (50, 50), 14\nPRINT "Mapped"\n',
    matchRegex: /Mapped/i,
    hint: 'Set VIEW first, then WINDOW, then draw using the remapped coordinates.',
  },
  {
    id: '28.4-palette',
    title: '28.4: Palette Changes (PALETTE)',
    objective: 'Change a palette entry and print "Palette Ready".',
    description: 'PALETTE remaps a color entry in classic graphics modes.',
    template: 'SCREEN 13\nPALETTE 1, 10\nPRINT "Palette Ready"\n',
    matchRegex: /Palette Ready/i,
    hint: 'Use PALETTE colorIndex, newValue.',
  },
  {
    id: '28.5-pcopy',
    title: '28.5: Page Copying (PCOPY)',
    objective: 'Copy one graphics page to another and print "Copied".',
    description: 'PCOPY duplicates screen page contents between graphics pages.',
    template: 'SCREEN 13\nPCOPY 0, 1\nPRINT "Copied"\n',
    matchRegex: /Copied/i,
    hint: 'PCOPY sourcePage, destinationPage copies the page contents.',
  },
  // ─── STAGE 29: RUNTIME & DIAGNOSTICS ──────────────────────────────────────
  {
    id: '29.1-environ-command',
    title: '29.1: Environment and Arguments',
    objective: 'Read ENVIRON$ and COMMAND$, then print "Env OK" and "Args Ready".',
    description: 'ENVIRON$ reads environment variables. COMMAND$ returns the command-line arguments.',
    template: 'CLS\nIF LEN(ENVIRON$("PATH")) >= 0 THEN PRINT "Env OK"\na$ = COMMAND$\nPRINT "Args Ready"\n',
    matchRegex: /Env OK\s*Args Ready/i,
    hint: 'Store COMMAND$ in a string variable, even if you only print a status line.',
  },
  {
    id: '29.2-sleep',
    title: '29.2: Pausing with SLEEP',
    objective: 'Print "Wait", pause briefly, then print "Done".',
    description: 'SLEEP pauses execution for a number of seconds in classic BASIC programs.',
    template: 'CLS\nPRINT "Wait"\nSLEEP 1\nPRINT "Done"\n',
    matchRegex: /Wait\s*Done/i,
    hint: 'Use SLEEP 1 for a short one-second pause.',
  },
  {
    id: '29.3-stop',
    title: '29.3: Pausing Execution (STOP)',
    objective: 'Print "Paused" and halt the program with STOP.',
    description: 'STOP halts execution immediately. It is useful while debugging.',
    template: 'CLS\nPRINT "Paused"\nSTOP\n',
    matchRegex: /Paused/i,
    hint: 'Print the message first, then STOP.',
  },
  {
    id: '29.4-system',
    title: '29.4: Exiting with SYSTEM',
    objective: 'Print "Leaving" and end the program with SYSTEM.',
    description: 'SYSTEM exits the running program and returns control to the host environment.',
    template: 'CLS\nPRINT "Leaving"\nSYSTEM\n',
    matchRegex: /Leaving/i,
    hint: 'Print your goodbye message before calling SYSTEM.',
  },
  {
    id: '29.5-error-diagnostics',
    title: '29.5: Raising and Inspecting Errors',
    objective: 'Raise ERROR 9, catch it, then print ERR and ERL.',
    description: 'ERROR triggers a runtime error. ERR gives the error code and ERL gives the line number.',
    template: 'CLS\nON ERROR GOTO Handler\nERROR 9\nEND\nHandler:\nPRINT ERR\nPRINT ERL\nRESUME NEXT\n',
    matchRegex: /9\s*\d+/,
    hint: 'Use ON ERROR GOTO Handler before ERROR 9 so the program can print ERR and ERL.',
  },
  // ─── STAGE 30: ADVANCED GRAPHICS ──────────────────────────────────────────
  {
    id: '30.1-get-put',
    title: '30.1: Sprite Capture (GET/PUT)',
    objective: 'Draw a box, capture it with GET, and print "Captured".',
    description: 'GET captures a rectangular region into an array. PUT draws it back.',
    template: 'SCREEN 13\nDIM sprite(100)\nLINE (10, 10)-(20, 20), 14, BF\nGET (10, 10)-(20, 20), sprite\nPRINT "Captured"\n',
    matchRegex: /Captured/i,
    hint: 'GET stores the pixel data in the array for later use with PUT.',
  },
  {
    id: '30.2-put-modes',
    title: '30.2: PUT Drawing Modes',
    objective: 'Use PUT with XOR mode to draw a sprite.',
    description: 'PUT supports modes: PSET, PRESET, AND, OR, XOR for different blending effects.',
    template: 'SCREEN 13\nDIM sprite(100)\nLINE (5, 5)-(15, 15), 10, BF\nGET (5, 5)-(15, 15), sprite\nPUT (30, 30), sprite, XOR\nPRINT "XOR"\n',
    matchRegex: /XOR/i,
    hint: 'XOR mode allows you to draw and erase sprites by drawing them twice.',
  },
  {
    id: '30.3-screen-modes',
    title: '30.3: Different Screen Modes',
    objective: 'Switch to SCREEN 12 and print "High Res".',
    description: 'QBasic supports multiple screen modes with different resolutions and color depths.',
    template: 'SCREEN 12\nPRINT "High Res"\n',
    matchRegex: /High Res/i,
    hint: 'SCREEN 12 provides 640x480 resolution with 16 colors.',
  },
  {
    id: '30.4-width',
    title: '30.4: Text Width (WIDTH)',
    objective: 'Set text width to 40 columns and print "Narrow".',
    description: 'WIDTH changes the number of text columns on screen.',
    template: 'CLS\nWIDTH 40\nPRINT "Narrow"\n',
    matchRegex: /Narrow/i,
    hint: 'WIDTH 40 sets the screen to 40 columns wide.',
  },
  {
    id: '30.5-bload-bsave',
    title: '30.5: Binary Graphics (BSAVE/BLOAD)',
    objective: 'Save screen memory with BSAVE and print "Saved".',
    description: 'BSAVE saves raw memory to disk. BLOAD loads it back.',
    template: 'SCREEN 13\nDEF SEG = &HA000\nBSAVE "screen.dat", 0, 64000\nPRINT "Saved"\n',
    matchRegex: /Saved/i,
    hint: 'BSAVE stores the video memory segment to a file.',
  },
  // ─── STAGE 31: ADVANCED STRING OPERATIONS ─────────────────────────────────
  {
    id: '31.1-string-compare',
    title: '31.1: String Comparison',
    objective: 'Compare two strings and print "Match" if equal.',
    description: 'Strings can be compared using = operator or INSTR for partial matches.',
    template: 'CLS\na$ = "Test"\nb$ = "Test"\nIF a$ = b$ THEN PRINT "Match"\n',
    matchRegex: /Match/i,
    hint: 'Use the = operator to check if two strings are identical.',
  },
  {
    id: '31.2-reverse-string',
    title: '31.2: Reversing Strings',
    objective: 'Reverse the string "ABC" and print "CBA".',
    description: 'Use a loop with MID$ to extract characters in reverse order.',
    template: 'CLS\ns$ = "ABC"\nr$ = ""\nFOR i = LEN(s$) TO 1 STEP -1\n    r$ = r$ + MID$(s$, i, 1)\nNEXT i\nPRINT r$\n',
    matchRegex: /CBA/,
    hint: 'Loop backwards through the string and concatenate each character.',
  },
  {
    id: '31.3-string-replace',
    title: '31.3: String Replacement',
    objective: 'Replace "old" with "new" in a string.',
    description: 'Use INSTR to find substrings and MID$ to replace them.',
    template: 'CLS\ns$ = "old text"\npos = INSTR(s$, "old")\nIF pos THEN\n    s$ = LEFT$(s$, pos - 1) + "new" + MID$(s$, pos + 3)\nEND IF\nPRINT s$\n',
    matchRegex: /new text/i,
    hint: 'Find the position, then rebuild the string with the replacement.',
  },
  {
    id: '31.4-split-string',
    title: '31.4: Splitting Strings',
    objective: 'Split "A,B,C" by commas and print each part.',
    description: 'Use INSTR in a loop to find delimiters and extract parts.',
    template: 'CLS\ns$ = "A,B,C"\nstart = 1\nDO\n    pos = INSTR(start, s$, ",")\n    IF pos = 0 THEN pos = LEN(s$) + 1\n    PRINT MID$(s$, start, pos - start)\n    start = pos + 1\nLOOP UNTIL start > LEN(s$)\n',
    matchRegex: /A\s*B\s*C/,
    hint: 'Loop through the string finding comma positions.',
  },
  {
    id: '31.5-trim-all',
    title: '31.5: Complete Trimming',
    objective: 'Remove all leading and trailing spaces from "  Text  ".',
    description: 'Combine LTRIM$ and RTRIM$ for complete whitespace removal.',
    template: 'CLS\ns$ = "  Text  "\ns$ = LTRIM$(RTRIM$(s$))\nPRINT "["; s$; "]"\n',
    matchRegex: /\[Text\]/,
    hint: 'Apply LTRIM$ to the result of RTRIM$.',
  },
  // ─── STAGE 32: ADVANCED MATH ──────────────────────────────────────────────
  {
    id: '32.1-exp-log',
    title: '32.1: Exponential and Logarithm',
    objective: 'Calculate e^2 and natural log of e, print both.',
    description: 'EXP(x) calculates e raised to power x. LOG(x) calculates natural logarithm.',
    template: 'CLS\nPRINT EXP(2)\nPRINT LOG(EXP(1))\n',
    matchRegex: /7\.38\d*\s*1/,
    hint: 'EXP(2) is about 7.389. LOG(e) equals 1.',
  },
  {
    id: '32.2-tan-atn',
    title: '32.2: Tangent and Arctangent',
    objective: 'Calculate TAN(0) and ATN(1), print both.',
    description: 'TAN calculates tangent. ATN calculates arctangent (inverse tangent).',
    template: 'CLS\nPRINT TAN(0)\nPRINT ATN(1)\n',
    matchRegex: /0\s*0\.78/,
    hint: 'TAN(0) is 0. ATN(1) is π/4 or about 0.785.',
  },
  {
    id: '32.3-sgn',
    title: '32.3: Sign Function (SGN)',
    objective: 'Print the sign of -5, 0, and 5.',
    description: 'SGN returns -1 for negative, 0 for zero, 1 for positive.',
    template: 'CLS\nPRINT SGN(-5)\nPRINT SGN(0)\nPRINT SGN(5)\n',
    matchRegex: /-1\s*0\s*1/,
    hint: 'SGN extracts just the sign of a number.',
  },
  {
    id: '32.4-randomize-seed',
    title: '32.4: Seeded Random Numbers',
    objective: 'Use RANDOMIZE with a fixed seed to get reproducible random numbers.',
    description: 'RANDOMIZE without TIMER uses a fixed seed for predictable sequences.',
    template: 'CLS\nRANDOMIZE 42\nPRINT INT(RND * 100)\n',
    matchRegex: /\d+/,
    hint: 'Using the same seed produces the same sequence of random numbers.',
  },
  {
    id: '32.5-pi-constant',
    title: '32.5: Calculating Pi',
    objective: 'Calculate Pi using ATN and print it.',
    description: 'Pi can be calculated as 4 * ATN(1).',
    template: 'CLS\npi = 4 * ATN(1)\nPRINT pi\n',
    matchRegex: /3\.14/,
    hint: 'ATN(1) gives π/4, so multiply by 4.',
  },
  // ─── STAGE 33: ADVANCED ARRAYS ────────────────────────────────────────────
  {
    id: '33.1-array-sorting',
    title: '33.1: Bubble Sort',
    objective: 'Sort an array of 3 numbers and print them in order.',
    description: 'Implement a simple bubble sort algorithm.',
    template: 'CLS\nDIM a(3) AS INTEGER\na(1) = 3: a(2) = 1: a(3) = 2\nFOR i = 1 TO 2\n    FOR j = 1 TO 3 - i\n        IF a(j) > a(j + 1) THEN SWAP a(j), a(j + 1)\n    NEXT j\nNEXT i\nFOR i = 1 TO 3\n    PRINT a(i)\nNEXT i\n',
    matchRegex: /1\s*2\s*3/,
    hint: 'Nested loops compare adjacent elements and swap if needed.',
  },
  {
    id: '33.2-array-search',
    title: '33.2: Linear Search',
    objective: 'Search for value 7 in an array and print its index.',
    description: 'Loop through array elements to find a specific value.',
    template: 'CLS\nDIM a(5) AS INTEGER\na(1) = 3: a(2) = 7: a(3) = 9\nFOR i = 1 TO 3\n    IF a(i) = 7 THEN PRINT i: EXIT FOR\nNEXT i\n',
    matchRegex: /2/,
    hint: 'Use EXIT FOR when you find the target value.',
  },
  {
    id: '33.3-array-sum',
    title: '33.3: Array Sum and Average',
    objective: 'Calculate sum and average of array elements.',
    description: 'Loop through array accumulating total, then divide by count.',
    template: 'CLS\nDIM a(3) AS INTEGER\na(1) = 10: a(2) = 20: a(3) = 30\nsum = 0\nFOR i = 1 TO 3\n    sum = sum + a(i)\nNEXT i\nPRINT sum\nPRINT sum / 3\n',
    matchRegex: /60\s*20/,
    hint: 'Accumulate sum in a loop, then divide by element count.',
  },
  {
    id: '33.4-array-max-min',
    title: '33.4: Finding Maximum and Minimum',
    objective: 'Find the largest and smallest values in an array.',
    description: 'Track max and min values while looping through the array.',
    template: 'CLS\nDIM a(4) AS INTEGER\na(1) = 5: a(2) = 2: a(3) = 9: a(4) = 1\nmax = a(1): min = a(1)\nFOR i = 2 TO 4\n    IF a(i) > max THEN max = a(i)\n    IF a(i) < min THEN min = a(i)\nNEXT i\nPRINT max\nPRINT min\n',
    matchRegex: /9\s*1/,
    hint: 'Initialize max and min with first element, then compare rest.',
  },
  {
    id: '33.5-matrix-operations',
    title: '33.5: Matrix Addition',
    objective: 'Add two 2x2 matrices and print the result.',
    description: 'Use nested loops to add corresponding elements.',
    template: 'CLS\nDIM a(2, 2), b(2, 2), c(2, 2) AS INTEGER\na(1, 1) = 1: a(1, 2) = 2\nb(1, 1) = 3: b(1, 2) = 4\nFOR i = 1 TO 2\n    FOR j = 1 TO 2\n        c(i, j) = a(i, j) + b(i, j)\n    NEXT j\nNEXT i\nPRINT c(1, 1); c(1, 2)\n',
    matchRegex: /4\s*6/,
    hint: 'Nested loops iterate through rows and columns.',
  },
  // ─── STAGE 34: ADVANCED FILE OPERATIONS ───────────────────────────────────
  {
    id: '34.1-file-exists',
    title: '34.1: Checking File Existence',
    objective: 'Check if a file exists using error handling.',
    description: 'Try to open a file and catch the error if it does not exist.',
    template: 'CLS\nON ERROR GOTO NotFound\nOPEN "test.txt" FOR INPUT AS #1\nCLOSE #1\nPRINT "Found"\nEND\nNotFound:\nPRINT "Not Found"\nRESUME NEXT\n',
    matchRegex: /Not Found|Found/i,
    hint: 'Use ON ERROR to handle file not found errors.',
  },
  {
    id: '34.2-file-copy',
    title: '34.2: Copying Files',
    objective: 'Copy contents from one file to another.',
    description: 'Read from source file and write to destination file.',
    template: 'CLS\nOPEN "src.txt" FOR OUTPUT AS #1\nPRINT #1, "Data"\nCLOSE #1\nOPEN "src.txt" FOR INPUT AS #1\nOPEN "dst.txt" FOR OUTPUT AS #2\nDO UNTIL EOF(1)\n    LINE INPUT #1, line$\n    PRINT #2, line$\nLOOP\nCLOSE #1, #2\nPRINT "Copied"\n',
    matchRegex: /Copied/i,
    hint: 'Read line by line from source and write to destination.',
  },
  {
    id: '34.3-csv-parsing',
    title: '34.3: Parsing CSV Files',
    objective: 'Read a CSV line and extract fields.',
    description: 'Use INPUT # to read comma-separated values.',
    template: 'CLS\nOPEN "data.csv" FOR OUTPUT AS #1\nWRITE #1, "Name", 25, "City"\nCLOSE #1\nOPEN "data.csv" FOR INPUT AS #1\nINPUT #1, name$, age, city$\nCLOSE #1\nPRINT name$; age; city$\n',
    matchRegex: /Name\s*25\s*City/i,
    hint: 'INPUT # automatically parses comma-separated values.',
  },
  {
    id: '34.4-log-file',
    title: '34.4: Creating Log Files',
    objective: 'Append timestamped entries to a log file.',
    description: 'Use APPEND mode to add entries without overwriting.',
    template: 'CLS\nOPEN "log.txt" FOR APPEND AS #1\nPRINT #1, DATE$; " "; TIME$; " Event"\nCLOSE #1\nPRINT "Logged"\n',
    matchRegex: /Logged/i,
    hint: 'APPEND mode adds to the end of the file.',
  },
  {
    id: '34.5-config-file',
    title: '34.5: Configuration Files',
    objective: 'Save and load configuration settings.',
    description: 'Store key-value pairs in a file.',
    template: 'CLS\nOPEN "config.ini" FOR OUTPUT AS #1\nPRINT #1, "volume=75"\nPRINT #1, "quality=high"\nCLOSE #1\nOPEN "config.ini" FOR INPUT AS #1\nLINE INPUT #1, setting$\nCLOSE #1\nPRINT setting$\n',
    matchRegex: /volume=75/i,
    hint: 'Store settings as text lines in a file.',
  },
  // ─── STAGE 35: GAME PROGRAMMING BASICS ────────────────────────────────────
  {
    id: '35.1-game-loop',
    title: '35.1: Basic Game Loop',
    objective: 'Create a simple game loop that runs 3 iterations.',
    description: 'Game loops continuously update and render until exit condition.',
    template: 'CLS\nframe = 0\nDO\n    frame = frame + 1\n    PRINT "Frame"; frame\n    _LIMIT 60\nLOOP UNTIL frame >= 3\n',
    matchRegex: /Frame\s*1\s*Frame\s*2\s*Frame\s*3/i,
    hint: 'Use DO LOOP with a counter and _LIMIT for frame pacing.',
  },
  {
    id: '35.2-player-movement',
    title: '35.2: Player Movement',
    objective: 'Move a player position based on input simulation.',
    description: 'Update x,y coordinates to simulate movement.',
    template: 'CLS\nx = 10: y = 10\ndirection$ = "right"\nIF direction$ = "right" THEN x = x + 1\nPRINT "X:"; x; "Y:"; y\n',
    matchRegex: /X:\s*11\s*Y:\s*10/i,
    hint: 'Check direction and update coordinates accordingly.',
  },
  {
    id: '35.3-collision-detection',
    title: '35.3: Simple Collision Detection',
    objective: 'Detect if two rectangles overlap.',
    description: 'Check if bounding boxes intersect.',
    template: 'CLS\nx1 = 10: y1 = 10: w1 = 5: h1 = 5\nx2 = 12: y2 = 12: w2 = 5: h2 = 5\nIF x1 < x2 + w2 AND x1 + w1 > x2 AND y1 < y2 + h2 AND y1 + h1 > y2 THEN\n    PRINT "Collision"\nEND IF\n',
    matchRegex: /Collision/i,
    hint: 'Check if rectangles overlap on both X and Y axes.',
  },
  {
    id: '35.4-score-system',
    title: '35.4: Score Tracking',
    objective: 'Implement a score system with display.',
    description: 'Track and display player score.',
    template: 'CLS\nscore = 0\npoints = 100\nscore = score + points\nPRINT "Score:"; score\n',
    matchRegex: /Score:\s*100/i,
    hint: 'Accumulate points into a score variable.',
  },
  {
    id: '35.5-health-system',
    title: '35.5: Health and Lives',
    objective: 'Manage player health and lives.',
    description: 'Track health points and lives remaining.',
    template: 'CLS\nhealth = 100\nlives = 3\ndamage = 30\nhealth = health - damage\nIF health <= 0 THEN\n    lives = lives - 1\n    health = 100\nEND IF\nPRINT "Health:"; health; "Lives:"; lives\n',
    matchRegex: /Health:\s*70\s*Lives:\s*3/i,
    hint: 'Subtract damage from health, reset health and decrement lives when needed.',
  },
];
