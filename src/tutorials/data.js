/**
 * QBasic Nexus - The Ultimate Interactive Tutorial Curriculum
 * Comprehensive guide covering 120+ lessons of QBasic syntax, features, and capabilities.
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
    objective:
      'Create a variable named "score" and set it to 100, then print it.',
    description:
      "Variables store data. You can just type a name and use '=' to assign a value.",
    template: 'CLS\nscore = 100\nPRINT score\n',
    matchRegex: /100/,
    hint: 'Type: score = 100 on one line, then PRINT score on the next.',
  },
  {
    id: '1.3-datatypes',
    title: '1.3: Data Types (DIM)',
    objective:
      'Declare a string variable using DIM, assign it "Nexus", and print it.',
    description:
      'Use the DIM keyword to explicitly declare variables and their types (e.g., AS STRING, AS INTEGER).',
    template:
      'CLS\nDIM playerName AS STRING\nplayerName = "Nexus"\nPRINT playerName\n',
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

  // ─── STAGE 2: MATHEMATICS & LOGIC ─────────────────────────────────────────
  {
    id: '2.1-math',
    title: '2.1: Math Operators',
    objective:
      'Calculate the area of a rectangle (width 5, height 10) and print it.',
    description:
      'QBasic supports +, -, *, / for arithmetic, and ^ for exponents.',
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
    template:
      'CLS\nHP = 100\nalive = 1\nIF HP > 0 AND alive = 1 THEN\n    PRINT "True"\nEND IF\n',
    matchRegex: /True/i,
    hint: 'The IF expression uses AND to require both sides to be true.',
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
    description:
      "ELSEIF adds another condition, ELSE catches anything that didn't match.",
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
    description:
      'The STEP keyword changes how much the loop counter increments or decrements.',
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

  // ─── STAGE 5: STRINGS MANIPULATION ────────────────────────────────────────
  {
    id: '5.1-ucase',
    title: '5.1: String Case',
    objective: "Convert 'qbasic' to uppercase and print it.",
    description:
      'UCASE$ converts a string to upper case, LCASE$ to lower case.',
    template: 'CLS\nmsg$ = "qbasic"\nPRINT UCASE$(msg$)\n',
    matchRegex: /QBASIC/,
    hint: 'Use UCASE$(var$)',
  },
  {
    id: '5.2-slice',
    title: '5.2: Slicing Strings',
    objective:
      "Print the first 3 letters, then the middle 3, then the last 3 of 'RetroWave'.",
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
    description:
      'CHR$(number) turns an ASCII code into a character. ASC(char) does the reverse.',
    template: 'CLS\nPRINT CHR$(65)\n',
    matchRegex: /A/,
    hint: "ASCII 65 is capital 'A'.",
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
    description:
      'ABS() returns absolute (positive) value. SQR() returns the square root.',
    template: 'CLS\nPRINT ABS(-42)\nPRINT SQR(25)\n',
    matchRegex: /42\s*5/,
    hint: 'Use ABS(-42) and SQR(25).',
  },

  // ─── STAGE 7: ARRAYS & CUSTOM TYPES ───────────────────────────────────────
  {
    id: '7.1-arrays',
    title: '7.1: 1D Arrays',
    objective:
      'Create an array for 3 items, assign a value to index 1, and print it.',
    description:
      'An array holds multiple values under one name. Declare with DIM arrayName(size).',
    template:
      'CLS\nDIM inventory(3) AS STRING\ninventory(1) = "Sword"\nPRINT inventory(1)\n',
    matchRegex: /Sword/i,
    hint: 'Use DIM inventory(3) AS STRING',
  },
  {
    id: '7.2-2darrays',
    title: '7.2: 2D Arrays (Grid)',
    objective: 'Create a 3x3 array (grid), set grid(2,2) to 9, and print it.',
    description:
      'Use commas to add dimensions to arrays, perfect for tile maps or game boards.',
    template:
      'CLS\nDIM grid(3, 3) AS INTEGER\ngrid(2, 2) = 9\nPRINT grid(2, 2)\n',
    matchRegex: /9/,
    hint: 'DIM grid(3, 3) creates a 2D array.',
  },
  {
    id: '7.3-types',
    title: '7.3: Custom Data Types (Structs)',
    objective:
      "Create a TYPE 'Player', assign its X property to 10, and print it.",
    description:
      'TYPE...END TYPE allows you to create custom structs holding multiple properties.',
    template:
      'CLS\nTYPE Player\n    X AS INTEGER\n    Y AS INTEGER\nEND TYPE\n\nDIM p1 AS Player\np1.X = 10\nPRINT p1.X\n',
    matchRegex: /10/,
    hint: 'Use the dot syntax (p1.X) to access properties inside a TYPE.',
  },

  // ─── STAGE 8: FUNCTIONS AND SUBROUTINES ───────────────────────────────────
  {
    id: '8.1-subs',
    title: '8.1: Subroutines (SUB)',
    objective:
      'Create a SUB to print a greeting, and call it using the CALL keyword.',
    description:
      'SUBs help organize code into reusable blocks that do not return a value.',
    template:
      'CLS\nCALL Greet\n\nSUB Greet\n    PRINT "Welcome, Player!"\nEND SUB\n',
    matchRegex: /Welcome/i,
    hint: 'Use CALL to run the SUB block.',
  },
  {
    id: '8.2-funcs',
    title: '8.2: Functions (FUNCTION)',
    objective: 'Create a function that adds two numbers, and print the result.',
    description:
      "Functions return a value. Assign the result to the function's own name before END FUNCTION.",
    template:
      'CLS\nPRINT AddNum(5, 7)\n\nFUNCTION AddNum(a, b)\n    AddNum = a + b\nEND FUNCTION\n',
    matchRegex: /12/,
    hint: 'Assign AddNum = a + b inside the function.',
  },
  {
    id: '8.3-shared',
    title: '8.3: Global Variables (SHARED)',
    objective: 'Use DIM SHARED so a SUB can access a global variable.',
    description:
      'Normally variables inside SUBs are local. Use DIM SHARED to give them global scope.',
    template:
      'CLS\nDIM SHARED lives AS INTEGER\nlives = 3\nCALL TakeDamage\nPRINT lives\n\nSUB TakeDamage\n    lives = lives - 1\nEND SUB\n',
    matchRegex: /2/,
    hint: "DIM SHARED makes 'lives' visible everywhere.",
  },

  // ─── STAGE 9: DATA MANAGEMENT ─────────────────────────────────────────────
  {
    id: '9.1-data',
    title: '9.1: DATA and READ',
    objective: 'Read 3 numbers from a DATA block and print the first one.',
    description:
      'DATA stores static values inside the code, and READ loads them sequentially into variables.',
    template: 'CLS\nREAD a, b, c\nPRINT a\n\nDATA 10, 20, 30\n',
    matchRegex: /10/,
    hint: 'Use READ matching the DATA items.',
  },
  {
    id: '9.2-restore',
    title: '9.2: RESTORE',
    objective: 'Use RESTORE to reset the DATA reading pointer.',
    description:
      'RESTORE moves the READ pointer back to the very first DATA statement.',
    template: 'CLS\nREAD x\nRESTORE\nREAD y\nPRINT x + y\n\nDATA 50, 60\n',
    matchRegex: /100/,
    hint: 'Because of RESTORE, y will read 50 again instead of 60.',
  },

  // ─── STAGE 10: VIRTUAL FILE I/O ───────────────────────────────────────────
  {
    id: '10.1-open-out',
    title: '10.1: Writing to Files',
    objective: "Open a file for output and write 'Hello File' to it.",
    description:
      'QBasic Nexus uses a Virtual File System. OPEN a file FOR OUTPUT to write data using PRINT #.',
    template:
      'CLS\nOPEN "test.txt" FOR OUTPUT AS #1\nPRINT #1, "Hello File"\nCLOSE #1\nPRINT "File Written"\n',
    matchRegex: /File Written/i,
    hint: 'Make sure you CLOSE #1 when done.',
  },
  {
    id: '10.2-open-in',
    title: '10.2: Reading from Files',
    objective:
      'Open a file FOR INPUT and read its contents back using INPUT #.',
    description:
      'OPEN ... FOR INPUT AS #1 reads from the file. Use INPUT #1, var$ to read.',
    template:
      'CLS\nOPEN "test.txt" FOR OUTPUT AS #1\nPRINT #1, "SavedData"\nCLOSE #1\n\nOPEN "test.txt" FOR INPUT AS #1\nINPUT #1, myVar$\nCLOSE #1\n\nPRINT myVar$\n',
    matchRegex: /SavedData/i,
    hint: 'INPUT # reads comma-separated values, LINE INPUT # reads the whole line.',
  },

  // ─── STAGE 11: TEXT UI & INTERACTION ──────────────────────────────────────
  {
    id: '11.1-locate',
    title: '11.1: LOCATE and COLOR',
    objective:
      'Move the cursor to row 10, col 20 and print text in green (Color 2).',
    description:
      'LOCATE row, col moves the text cursor. COLOR fg, bg changes text colors (0-15).',
    template: 'CLS\nCOLOR 2\nLOCATE 10, 20\nPRINT "Centered Green Text"\n',
    matchRegex: /Centered Green Text/i,
    hint: 'Row 1-25, Col 1-80',
  },
  {
    id: '11.2-sleep',
    title: '11.2: SLEEP',
    objective: 'Pause the program for 1 second.',
    description: 'SLEEP n pauses the execution for n seconds.',
    template: 'CLS\nPRINT "Wait for it..."\nSLEEP 1\nPRINT "Done!"\n',
    matchRegex: /Wait for it\.\.\.\s*Done!/i,
    hint: 'SLEEP uses seconds.',
  },

  // ─── STAGE 12: GRAPHICS & MULTIMEDIA ──────────────────────────────────────
  {
    id: '12.1-screen13',
    title: '12.1: Graphics Mode (SCREEN 13)',
    objective: 'Change screen mode to 13 and draw a single dot using PSET.',
    description:
      'SCREEN 13 is the classic 320x200 pixel, 256-color VGA mode. PSET draws a pixel.',
    template: 'SCREEN 13\nCOLOR 14\nPSET (160, 100), 10\nPRINT "Graphics ON"\n',
    matchRegex: /Graphics ON/i,
    hint: 'Use SCREEN 13 to enter graphics mode.',
  },
  {
    id: '12.2-line',
    title: '12.2: Drawing Lines & Boxes',
    objective: 'Draw a straight line and a filled box.',
    description:
      'LINE (x1,y1)-(x2,y2), c draws a line. Add ,B for a box, or ,BF for a solid filled box.',
    template:
      'SCREEN 13\nLINE (10,10)-(50,10), 14\nLINE (60,10)-(100,50), 9, BF\nPRINT "Lines and Boxes"\n',
    matchRegex: /Lines and Boxes/i,
    hint: 'BF stands for Box Filled.',
  },
  {
    id: '12.3-circle',
    title: '12.3: Drawing Circles',
    objective: 'Draw a circle in the middle of the screen.',
    description: 'CIRCLE (x, y), radius, color draws a circle.',
    template: 'SCREEN 13\nCIRCLE (160, 100), 50, 11\nPRINT "Ring"\n',
    matchRegex: /Ring/i,
    hint: 'Screen center is roughly (160, 100).',
  },
  {
    id: '12.4-paint',
    title: '12.4: PAINT (Flood Fill)',
    objective: 'Draw a circle and fill the inside with a different color.',
    description:
      'PAINT (x, y), fill_color, border_color flood-fills a bounded area.',
    template:
      'SCREEN 13\nCIRCLE (100, 100), 30, 15\nPAINT (100, 100), 10, 15\nPRINT "Filled"\n',
    matchRegex: /Filled/i,
    hint: 'PAINT needs a point inside the border, the fill color, and the border color to stop at.',
  },
  {
    id: '12.5-draw',
    title: '12.5: The DRAW Macro',
    objective: 'Use the DRAW command to draw a quick shape.',
    description:
      "DRAW accepts a mini language string. U=Up, D=Down, L=Left, R=Right. (e.g., 'U10 R10 D10 L10')",
    template:
      'SCREEN 13\nPSET (100, 100)\nDRAW "U20 R20 D20 L20"\nPRINT "Square drawn"\n',
    matchRegex: /Square drawn/i,
    hint: 'DRAW starts from the last graphics position.',
  },

  // ─── STAGE 13: AUDIO & MUSIC ──────────────────────────────────────────────
  {
    id: '13.1-sound',
    title: '13.1: Beeps (SOUND)',
    objective: 'Play a frequency of 440Hz for a short duration.',
    description:
      'SOUND frequency, duration plays a bare tone. (Note: In Webview, SOUND requires the user to interact with the screen first to bypass browser audio block).',
    template: 'CLS\nPRINT "Beeping..."\nSOUND 440, 10\n',
    matchRegex: /Beeping/i,
    hint: '440Hz is the A4 note.',
  },
  {
    id: '13.2-play',
    title: '13.2: Music Macros (PLAY)',
    objective: 'Play some simple musical notes using PLAY.',
    description:
      'The PLAY command uses a special macro language to play notes sequence (A-G, Octaves, tempo).',
    template: 'CLS\nPRINT "Playing music!"\nPLAY "CDE CDE EDC"\n',
    matchRegex: /Playing music!/i,
    hint: 'PLAY accepts a string like "C D E" to play notes.',
  },

  // ─── STAGE 14: CLASSIC QBASIC TOOLS ───────────────────────────────────────
  {
    id: '14.1-const',
    title: '14.1: Constants (CONST)',
    objective: 'Create a constant named MAX_HP with value 99, and print it.',
    description:
      'CONST defines a fixed value that should not change later in the program.',
    template: 'CLS\nCONST MAX_HP = 99\nPRINT MAX_HP\n',
    matchRegex: /99/,
    hint: 'Use CONST MAX_HP = 99 on its own line.',
  },
  {
    id: '14.2-swap',
    title: '14.2: Swapping Variables',
    objective: 'Swap the values of a and b, then print them in the new order.',
    description:
      'SWAP exchanges the contents of two variables without needing a temporary variable.',
    template: 'CLS\na = 5\nb = 9\nSWAP a, b\nPRINT a\nPRINT b\n',
    matchRegex: /9\s*5/,
    hint: 'Use SWAP a, b after assigning the original values.',
  },
  {
    id: '14.3-gosub',
    title: '14.3: GOSUB and RETURN',
    objective:
      'Jump to a label with GOSUB, print a line there, then RETURN and print another line.',
    description:
      'GOSUB jumps to a label and RETURN brings execution back to the line after the GOSUB call.',
    template:
      'CLS\nGOSUB Intro\nPRINT "Back in main"\nEND\n\nIntro:\nPRINT "Inside subroutine"\nRETURN\n',
    matchRegex: /Inside subroutine\s*Back in main/i,
    hint: 'Use a label ending with : and return with RETURN.',
  },
  {
    id: '14.4-on-goto',
    title: '14.4: ON...GOTO',
    objective: 'Use ON choice GOTO to jump to the second label and print "Second".',
    description:
      'ON expr GOTO chooses a label based on the numeric value of the expression.',
    template:
      'CLS\nchoice = 2\nON choice GOTO FirstLabel, SecondLabel, ThirdLabel\nEND\n\nFirstLabel:\nPRINT "First"\nEND\nSecondLabel:\nPRINT "Second"\nEND\nThirdLabel:\nPRINT "Third"\nEND\n',
    matchRegex: /Second/i,
    hint: 'Set choice = 2 so the second label runs.',
  },

  // ─── STAGE 15: FILES & TEXT LAYOUT ────────────────────────────────────────
  {
    id: '15.1-freefile',
    title: '15.1: FREEFILE',
    objective: 'Use FREEFILE to get a file number, write to a file, and print that file number.',
    description:
      'FREEFILE returns the next available file handle, which is useful when you do not want to hardcode #1, #2, etc.',
    template:
      'CLS\nslot = FREEFILE\nOPEN "stats.txt" FOR OUTPUT AS #slot\nPRINT #slot, "42"\nCLOSE #slot\nPRINT slot\n',
    matchRegex: /\d+/,
    hint: 'Store FREEFILE in a variable first, then use AS #slot.',
  },
  {
    id: '15.2-files',
    title: '15.2: Listing Virtual Files',
    objective: 'Create a file, then list the virtual directory contents using FILES.',
    description:
      'FILES displays the current files stored in the Virtual File System used by QBasic Nexus.',
    template:
      'CLS\nOPEN "save1.txt" FOR OUTPUT AS #1\nPRINT #1, "Slot 1"\nCLOSE #1\nFILES\nPRINT "Listed"\n',
    matchRegex: /(save1\.txt|Listed)/i,
    hint: 'Write a file first so FILES has something to show.',
  },
  {
    id: '15.3-tab-spc',
    title: '15.3: TAB and SPC',
    objective: 'Use TAB and SPC to align three values on one line.',
    description:
      'TAB(n) moves output toward a column position, while SPC(n) inserts a fixed number of spaces.',
    template: 'CLS\nPRINT "A"; TAB(10); "B"; SPC(3); "C"\n',
    matchRegex: /A\s+B\s+C/,
    hint: 'Put TAB(10) between A and B, then SPC(3) before C.',
  },
  {
    id: '15.4-width',
    title: '15.4: WIDTH',
    objective: 'Change the text layout width and then print a confirmation message.',
    description:
      'WIDTH changes the screen text dimensions, which is useful for menu layouts and dashboards.',
    template: 'CLS\nWIDTH 40, 20\nPRINT "Custom layout ready"\n',
    matchRegex: /Custom layout ready/i,
    hint: 'Try WIDTH 40, 20 before the PRINT line.',
  },

  // ─── STAGE 16: MORE GRAPHICS COMMANDS ─────────────────────────────────────
  {
    id: '16.1-preset',
    title: '16.1: PRESET',
    objective: 'Set a pixel with PSET, reset it with PRESET, then print a confirmation.',
    description:
      'PRESET clears a pixel back to the background color, acting like the inverse of PSET.',
    template:
      'SCREEN 13\nPSET (20, 20), 14\nPRESET (20, 20)\nPRINT "Pixel reset"\n',
    matchRegex: /Pixel reset/i,
    hint: 'Use PRESET on the same coordinates you used with PSET.',
  },
  {
    id: '16.2-point',
    title: '16.2: Reading Pixels with POINT',
    objective: 'Draw a pixel, read its color using POINT, and print the color value.',
    description:
      'POINT(x, y) returns the current color at a screen coordinate.',
    template: 'SCREEN 13\nPSET (30, 30), 12\nPRINT POINT(30, 30)\n',
    matchRegex: /12/,
    hint: 'Draw first with PSET, then read it back using POINT.',
  },
  {
    id: '16.3-box-outline',
    title: '16.3: Outline Boxes',
    objective: 'Draw an outlined box using LINE with the B option.',
    description:
      'LINE can draw rectangles too. Add ,B to draw only the border of the box.',
    template:
      'SCREEN 13\nLINE (40, 40)-(120, 90), 15, B\nPRINT "Outline box"\n',
    matchRegex: /Outline box/i,
    hint: 'Use the B flag at the end of the LINE command.',
  },

  // ─── STAGE 17: SOUND EXTRAS ───────────────────────────────────────────────
  {
    id: '17.1-beep',
    title: '17.1: The BEEP Command',
    objective: 'Trigger the classic BEEP and print a message before it.',
    description:
      'BEEP plays the traditional system beep and is the quickest way to add feedback in text programs.',
    template: 'CLS\nPRINT "Classic beep"\nBEEP\n',
    matchRegex: /Classic beep/i,
    hint: 'Print first, then call BEEP on the next line.',
  },

  // ─── STAGE 18: DEEPER PROGRAM STRUCTURE ───────────────────────────────────
  {
    id: '18.1-sub-params',
    title: '18.1: SUB Parameters',
    objective: 'Create a SUB that accepts a name and level, then print both values.',
    description:
      'SUB parameters let you pass values into reusable code blocks without depending only on global variables.',
    template:
      'CLS\nCALL GreetPlayer("Nexus", 3)\n\nSUB GreetPlayer(name$, level)\n    PRINT name$\n    PRINT level\nEND SUB\n',
    matchRegex: /Nexus\s*3/i,
    hint: 'Define the SUB with parameters in parentheses, then CALL it with matching values.',
  },
  {
    id: '18.2-data-strings',
    title: '18.2: Reading String DATA',
    objective: 'Read two strings from DATA and print both of them.',
    description:
      'DATA can store text values too, which makes it useful for dialogue, labels, and lookup tables.',
    template:
      'CLS\nREAD hero$, class$\nPRINT hero$\nPRINT class$\n\nDATA "Aria", "Mage"\n',
    matchRegex: /Aria\s*Mage/i,
    hint: 'Use quoted strings inside DATA when storing text.',
  },
  {
    id: '18.3-lset-rset',
    title: '18.3: LSET and RSET',
    objective: 'Left-align one string and right-align another inside 5-character fields.',
    description:
      'LSET pads text to the right, while RSET pads text to the left. Both are useful for text tables and reports.',
    template:
      'CLS\nleftField$ = SPACE$(5)\nrightField$ = SPACE$(5)\nLSET leftField$ = "X"\nRSET rightField$ = "X"\nPRINT "["; leftField$; "]"\nPRINT "["; rightField$; "]"\n',
    matchRegex: /\[\s*X\s*\]/,
    hint: 'Prepare both strings with SPACE$(5) before using LSET and RSET.',
  },

  // ─── STAGE 19: CONTROL FLOW VARIANTS ─────────────────────────────────────
  {
    id: '19.1-let',
    title: '19.1: Explicit LET',
    objective: 'Assign a value using the LET keyword, then print it.',
    description:
      'LET is optional in QBasic, but it is still valid grammar when you want assignment to read more explicitly.',
    template: 'CLS\nLET total = 42\nPRINT total\n',
    matchRegex: /42/,
    hint: 'Write LET total = 42 before PRINT total.',
  },
  {
    id: '19.2-single-line-if',
    title: '19.2: Single-Line IF',
    objective: 'Use a single-line IF...THEN...ELSE to print the correct grade.',
    description:
      'QBasic allows IF statements to fit on one line when the logic is short enough.',
    template: 'CLS\nscore = 95\nIF score >= 90 THEN PRINT "A" ELSE PRINT "B"\n',
    matchRegex: /A/,
    hint: 'Put both PRINT branches on the same line after THEN and ELSE.',
  },
  {
    id: '19.3-do-while',
    title: '19.3: DO WHILE',
    objective: 'Use DO WHILE to print 1 through 3.',
    description:
      'DO WHILE checks the condition before each loop iteration, similar to a top-tested loop.',
    template: 'CLS\nx = 1\nDO WHILE x <= 3\n    PRINT x\n    x = x + 1\nLOOP\n',
    matchRegex: /1\s*2\s*3/,
    hint: 'Start with DO WHILE x <= 3 and finish with LOOP.',
  },
  {
    id: '19.4-loop-while',
    title: '19.4: LOOP WHILE',
    objective: 'Use LOOP WHILE to print 1 through 3.',
    description:
      'With LOOP WHILE, the condition is checked at the bottom of the loop body.',
    template: 'CLS\nx = 1\nDO\n    PRINT x\n    x = x + 1\nLOOP WHILE x <= 3\n',
    matchRegex: /1\s*2\s*3/,
    hint: 'Place the condition after LOOP WHILE.',
  },
  {
    id: '19.5-continue',
    title: '19.5: CONTINUE',
    objective: 'Skip the value 3 inside a FOR loop and print the other values.',
    description:
      'CONTINUE jumps straight to the next iteration of the current loop.',
    template:
      'CLS\nFOR i = 1 TO 5\n    IF i = 3 THEN CONTINUE\n    PRINT i\nNEXT i\n',
    matchRegex: /1\s*2\s*4\s*5/,
    hint: 'Check for i = 3, then call CONTINUE before PRINT.',
  },

  // ─── STAGE 20: DECLARATIONS & PROCEDURES ─────────────────────────────────
  {
    id: '20.1-declare-sub',
    title: '20.1: DECLARE SUB',
    objective: 'Forward-declare a SUB, call it, and define it later in the file.',
    description:
      'DECLARE lets you call a SUB before its full definition appears lower in the program.',
    template:
      'DECLARE SUB ShowBanner()\nCLS\nCALL ShowBanner\n\nSUB ShowBanner\n    PRINT "Declared SUB"\nEND SUB\n',
    matchRegex: /Declared SUB/i,
    hint: 'Use DECLARE SUB ShowBanner() before the CALL line.',
  },
  {
    id: '20.2-declare-function',
    title: '20.2: DECLARE FUNCTION',
    objective: 'Forward-declare a FUNCTION and print its return value.',
    description:
      'DECLARE FUNCTION is the function equivalent of a forward declaration.',
    template:
      'DECLARE FUNCTION AddTen(n)\nCLS\nPRINT AddTen(5)\n\nFUNCTION AddTen(n)\n    AddTen = n + 10\nEND FUNCTION\n',
    matchRegex: /15/,
    hint: 'Declare the function first, then define it later.',
  },
  {
    id: '20.3-def-fn',
    title: '20.3: DEF FN',
    objective: 'Define a short custom function with DEF FN and print the result.',
    description:
      'DEF FN is the classic single-expression way to define small helper functions.',
    template: 'CLS\nDEF FN Double(x) = x * 2\nPRINT FNDouble(6)\n',
    matchRegex: /12/,
    hint: 'Use DEF FN Name(args) = expression, then call FNName(...).',
  },
  {
    id: '20.4-exit-sub',
    title: '20.4: EXIT SUB',
    objective: 'Leave a SUB early after printing a warning message.',
    description:
      'EXIT SUB ends the current SUB immediately and returns control to the caller.',
    template:
      'CLS\nCALL CheckValue(-1)\n\nSUB CheckValue(v)\n    IF v < 0 THEN\n        PRINT "Negative"\n        EXIT SUB\n    END IF\n    PRINT "Positive"\nEND SUB\n',
    matchRegex: /Negative/i,
    hint: 'Use EXIT SUB inside the IF block to stop the routine early.',
  },
  {
    id: '20.5-exit-function',
    title: '20.5: EXIT FUNCTION',
    objective: 'Return early from a function after setting the function result.',
    description:
      'EXIT FUNCTION stops the current function immediately once you have assigned the return value.',
    template:
      'CLS\nPRINT ClampLow(-3)\n\nFUNCTION ClampLow(n)\n    IF n < 0 THEN\n        ClampLow = 0\n        EXIT FUNCTION\n    END IF\n    ClampLow = n\nEND FUNCTION\n',
    matchRegex: /0/,
    hint: 'Assign the function name first, then call EXIT FUNCTION.',
  },

  // ─── STAGE 21: ARRAYS, REDIM, AND TYPE HINTS ─────────────────────────────
  {
    id: '21.1-redim',
    title: '21.1: REDIM',
    objective: 'Resize an array with REDIM, assign a value, and print it.',
    description:
      'REDIM changes the size of a dynamic array after it has already been declared.',
    template:
      'CLS\nDIM scores(0) AS INTEGER\nREDIM scores(3)\nscores(3) = 99\nPRINT scores(3)\n',
    matchRegex: /99/,
    hint: 'Declare first, then REDIM to the size you need.',
  },
  {
    id: '21.2-redim-preserve',
    title: '21.2: REDIM PRESERVE',
    objective: 'Grow an array while keeping an existing value.',
    description:
      'REDIM PRESERVE expands an array without discarding the values already stored inside it.',
    template:
      'CLS\nDIM nums(1) AS INTEGER\nnums(1) = 7\nREDIM PRESERVE nums(3)\nPRINT nums(1)\n',
    matchRegex: /7/,
    hint: 'Use PRESERVE when you do not want the old contents to disappear.',
  },
  {
    id: '21.3-erase',
    title: '21.3: ERASE Arrays',
    objective: 'Clear an array with ERASE and print a confirmation message.',
    description:
      'ERASE resets an array so you can reuse it without its previous data.',
    template:
      'CLS\nDIM inventory(2) AS STRING\ninventory(1) = "Potion"\nERASE inventory\nPRINT "Inventory cleared"\n',
    matchRegex: /Inventory cleared/i,
    hint: 'Use ERASE inventory after you are done with the stored values.',
  },
  {
    id: '21.4-defint',
    title: '21.4: DEFINT',
    objective: 'Apply DEFINT and then print an implicitly typed numeric variable.',
    description:
      'DEFINT changes the default type for variables whose names begin with a chosen letter range.',
    template: 'DEFINT A-Z\nCLS\nscore = 100\nPRINT score\n',
    matchRegex: /100/,
    hint: 'Use DEFINT A-Z at the top to affect the default numeric type.',
  },
  {
    id: '21.5-defstr',
    title: '21.5: DEFSTR',
    objective: 'Apply DEFSTR and then print an implicitly typed string variable.',
    description:
      'DEFSTR changes the default type so matching variable names behave like strings.',
    template: 'DEFSTR A-C\nCLS\ncity = "Bangkok"\nPRINT city\n',
    matchRegex: /Bangkok/i,
    hint: 'Use DEFSTR A-C before assigning text to city.',
  },

  // ─── STAGE 22: ADVANCED FILE SYSTEM GRAMMAR ──────────────────────────────
  {
    id: '22.1-append',
    title: '22.1: APPEND Mode',
    objective: 'Open a file in APPEND mode and add a second line to it.',
    description:
      'APPEND opens an existing file and places the write position at the end.',
    template:
      'CLS\nOPEN "log.txt" FOR OUTPUT AS #1\nPRINT #1, "Line 1"\nCLOSE #1\nOPEN "log.txt" FOR APPEND AS #1\nPRINT #1, "Line 2"\nCLOSE #1\nPRINT "Appended"\n',
    matchRegex: /Appended/i,
    hint: 'Use FOR APPEND the second time you open the file.',
  },
  {
    id: '22.2-eof-loop',
    title: '22.2: EOF Loops',
    objective: 'Read a file line by line until EOF returns true.',
    description:
      'EOF(fileNum) is the classic way to know when you have reached the end of a file.',
    template:
      'CLS\nOPEN "scores.txt" FOR OUTPUT AS #1\nPRINT #1, "10"\nPRINT #1, "20"\nCLOSE #1\nOPEN "scores.txt" FOR INPUT AS #1\nWHILE NOT EOF(1)\n    INPUT #1, row$\n    PRINT row$\nWEND\nCLOSE #1\n',
    matchRegex: /10\s*20/,
    hint: 'Loop while NOT EOF(1), then INPUT #1 into a string variable.',
  },
  {
    id: '22.3-seek-loc',
    title: '22.3: SEEK and LOC',
    objective: 'Move a file position with SEEK and print the current position using LOC.',
    description:
      'SEEK changes the current file position, and LOC reports where that position is now.',
    template:
      'CLS\nOPEN "seek.txt" FOR OUTPUT AS #1\nPRINT #1, "ABCDE"\nCLOSE #1\nOPEN "seek.txt" FOR INPUT AS #1\nSEEK #1, 1\nPRINT LOC(1)\nCLOSE #1\n',
    matchRegex: /0|1/,
    hint: 'Call SEEK #1, 1 and then print LOC(1).',
  },
  {
    id: '22.4-lof',
    title: '22.4: LOF',
    objective: 'Print the logical file length using LOF.',
    description:
      'LOF(fileNum) returns the length of the file associated with the handle.',
    template:
      'CLS\nOPEN "size.txt" FOR OUTPUT AS #1\nPRINT #1, "12345"\nCLOSE #1\nOPEN "size.txt" FOR INPUT AS #1\nPRINT LOF(1)\nCLOSE #1\n',
    matchRegex: /\d+/,
    hint: 'Open the file again, then print LOF(1).',
  },
  {
    id: '22.5-reset',
    title: '22.5: RESET',
    objective: 'Open multiple files and then close every handle at once using RESET.',
    description:
      'RESET is the global reset command for file handles in classic file I/O flows.',
    template:
      'CLS\nOPEN "a.txt" FOR OUTPUT AS #1\nPRINT #1, "A"\nOPEN "b.txt" FOR OUTPUT AS #2\nPRINT #2, "B"\nRESET\nPRINT "Handles reset"\n',
    matchRegex: /Handles reset/i,
    hint: 'Use RESET after both files are open.',
  },
  {
    id: '22.6-name',
    title: '22.6: NAME',
    objective: 'Rename a file using NAME ... AS ... and list the files.',
    description:
      'NAME oldName AS newName renames an existing file in the virtual file system.',
    template:
      'CLS\nOPEN "oldname.txt" FOR OUTPUT AS #1\nPRINT #1, "rename me"\nCLOSE #1\nNAME "oldname.txt" AS "newname.txt"\nFILES\n',
    matchRegex: /newname\.txt/i,
    hint: 'Use NAME "oldname.txt" AS "newname.txt".',
  },
  {
    id: '22.7-kill',
    title: '22.7: KILL',
    objective: 'Delete a file with KILL and print a confirmation message.',
    description:
      'KILL removes a file from the file system when you no longer need it.',
    template:
      'CLS\nOPEN "temp.txt" FOR OUTPUT AS #1\nPRINT #1, "delete me"\nCLOSE #1\nKILL "temp.txt"\nPRINT "Deleted"\n',
    matchRegex: /Deleted/i,
    hint: 'Create the file first, then remove it with KILL.',
  },
  {
    id: '22.8-directories',
    title: '22.8: MKDIR, CHDIR, and RMDIR',
    objective: 'Create a directory, move into it, list files, then remove it.',
    description:
      'These directory commands form the classic grammar for working with folders.',
    template:
      'CLS\nMKDIR "SAVE"\nCHDIR "SAVE"\nFILES\nCHDIR ".."\nRMDIR "SAVE"\nPRINT "Directory commands"\n',
    matchRegex: /Directory commands/i,
    hint: 'Use MKDIR, CHDIR, then return with CHDIR ".." before RMDIR.',
  },

  // ─── STAGE 23: OUTPUT, VIEWS, AND GRAPHICS HELPERS ───────────────────────
  {
    id: '23.1-write',
    title: '23.1: WRITE',
    objective: 'Output multiple comma-separated values using WRITE.',
    description:
      'WRITE formats a list of values in a CSV-like style, unlike PRINT which is looser.',
    template: 'CLS\nWRITE "Nexus", 42, 3.14\n',
    matchRegex: /Nexus|42/,
    hint: 'Put several expressions after WRITE, separated by commas.',
  },
  {
    id: '23.2-print-separators',
    title: '23.2: PRINT Separators',
    objective: 'Use semicolons and commas inside PRINT to control spacing.',
    description:
      'Semicolons keep output tight, while commas move output forward in columns.',
    template: 'CLS\nPRINT "A"; "B"; "C"\nPRINT "1", "2", "3"\n',
    matchRegex: /ABC|1/,
    hint: 'Use both ; and , in two separate PRINT lines.',
  },
  {
    id: '23.3-view-print',
    title: '23.3: VIEW PRINT',
    objective: 'Restrict text output to a text window using VIEW PRINT.',
    description:
      'VIEW PRINT changes the rows that regular text output is allowed to use.',
    template: 'CLS\nVIEW PRINT 5 TO 10\nPRINT "Inside text window"\n',
    matchRegex: /Inside text window/i,
    hint: 'Try VIEW PRINT 5 TO 10 before the PRINT line.',
  },
  {
    id: '23.4-view',
    title: '23.4: VIEW Graphics Window',
    objective: 'Create a graphics viewport and print a confirmation message.',
    description:
      'VIEW sets the active graphics rectangle and can optionally specify fill and border colors.',
    template:
      'SCREEN 13\nVIEW (20, 20)-(120, 100), 1, 15\nPRINT "Viewport set"\n',
    matchRegex: /Viewport set/i,
    hint: 'Use VIEW (x1, y1)-(x2, y2), fill, border.',
  },
  {
    id: '23.5-window',
    title: '23.5: WINDOW SCREEN',
    objective: 'Define a graphics coordinate window using WINDOW SCREEN.',
    description:
      'WINDOW SCREEN maps your drawing coordinates onto the screen coordinate system.',
    template:
      'SCREEN 13\nWINDOW SCREEN (0, 0)-(319, 199)\nPRINT "Window ready"\n',
    matchRegex: /Window ready/i,
    hint: 'Use WINDOW SCREEN followed by two coordinate pairs.',
  },
  {
    id: '23.6-palette',
    title: '23.6: PALETTE',
    objective: 'Change a palette entry and print a confirmation line.',
    description:
      'PALETTE changes the active color mapping used by the current graphics mode.',
    template: 'SCREEN 13\nPALETTE 1, 12\nPRINT "Palette changed"\n',
    matchRegex: /Palette changed/i,
    hint: 'Use PALETTE attribute, color.',
  },
  {
    id: '23.7-palette-using',
    title: '23.7: PALETTE USING',
    objective: 'Apply a palette from an array using PALETTE USING.',
    description:
      'PALETTE USING is the array-based form of palette assignment.',
    template:
      'SCREEN 13\nDIM pal(3) AS INTEGER\nPALETTE USING pal\nPRINT "Palette from array"\n',
    matchRegex: /Palette from array/i,
    hint: 'Create an array first, then call PALETTE USING pal.',
  },
  {
    id: '23.8-pcopy',
    title: '23.8: PCOPY',
    objective: 'Copy one display page to another using PCOPY.',
    description:
      'PCOPY is the page-copy command used in double-buffered graphics workflows.',
    template: 'SCREEN 13\nPCOPY 0, 1\nPRINT "Page copied"\n',
    matchRegex: /Page copied/i,
    hint: 'Use PCOPY sourcePage, destinationPage.',
  },

  // ─── STAGE 24: LOW-LEVEL AND EXTENDED COMMANDS ────────────────────────────
  {
    id: '24.1-get-put',
    title: '24.1: GET and PUT',
    objective: 'Capture an image region with GET and draw it elsewhere with PUT.',
    description:
      'GET stores pixels in a buffer, and PUT draws that buffer back onto the screen.',
    template:
      'SCREEN 13\nDIM sprite(10) AS INTEGER\nGET (10, 10)-(20, 20), sprite\nPUT (40, 40), sprite\nPRINT "Sprite moved"\n',
    matchRegex: /Sprite moved/i,
    hint: 'Use the same buffer variable in both GET and PUT.',
  },
  {
    id: '24.2-line-step',
    title: '24.2: LINE with STEP',
    objective: 'Draw a line relative to the current graphics position using STEP.',
    description:
      'STEP makes the coordinates relative to the current graphics cursor instead of absolute.',
    template:
      'SCREEN 13\nPSET (100, 100), 15\nLINE STEP (0, 0)-STEP (20, 20), 10\nPRINT "Step line"\n',
    matchRegex: /Step line/i,
    hint: 'Place STEP before each coordinate pair you want to be relative.',
  },
  {
    id: '24.3-circle-step',
    title: '24.3: CIRCLE with STEP',
    objective: 'Draw a circle relative to the current graphics position using STEP.',
    description:
      'CIRCLE can also use STEP to treat the center point as relative.',
    template:
      'SCREEN 13\nPSET (160, 100), 15\nCIRCLE STEP (0, 0), 20, 14\nPRINT "Step circle"\n',
    matchRegex: /Step circle/i,
    hint: 'Use PSET first, then CIRCLE STEP from that point.',
  },
  {
    id: '24.4-lock-unlock',
    title: '24.4: LOCK and UNLOCK',
    objective: 'Lock a file handle, unlock it, and print a confirmation.',
    description:
      'LOCK and UNLOCK are the classic file record locking commands.',
    template:
      'CLS\nOPEN "records.txt" FOR OUTPUT AS #1\nPRINT #1, "demo"\nCLOSE #1\nOPEN "records.txt" FOR INPUT AS #1\nLOCK #1\nUNLOCK #1\nCLOSE #1\nPRINT "Lock tested"\n',
    matchRegex: /Lock tested/i,
    hint: 'Open the file, LOCK #1, then UNLOCK #1 before closing it.',
  },
  {
    id: '24.5-poke',
    title: '24.5: POKE',
    objective: 'Write a value with POKE and print a confirmation message.',
    description:
      'POKE is the classic low-level memory write command in DOS-era BASIC.',
    template: 'CLS\nPOKE 1024, 255\nPRINT "POKE sent"\n',
    matchRegex: /POKE sent/i,
    hint: 'Use POKE address, value.',
  },
  {
    id: '24.6-wait-out',
    title: '24.6: WAIT and OUT',
    objective: 'Write to a port with OUT, then wait on it with WAIT.',
    description:
      'These hardware-oriented statements are part of old-school BASIC grammar for direct device access.',
    template: 'CLS\nOUT 888, 1\nWAIT 888, 1\nPRINT "Hardware stubs"\n',
    matchRegex: /Hardware stubs/i,
    hint: 'Write OUT first, then WAIT on the same port.',
  },
  {
    id: '24.7-shell',
    title: '24.7: SHELL',
    objective: 'Run a shell command and print a status message.',
    description:
      'SHELL launches an operating system command from inside the BASIC program.',
    template: 'CLS\nSHELL "DIR"\nPRINT "Shell requested"\n',
    matchRegex: /Shell requested/i,
    hint: 'Pass a command string after SHELL.',
  },
  {
    id: '24.8-stop',
    title: '24.8: STOP',
    objective: 'Use STOP to halt program execution after printing a line.',
    description:
      'STOP halts execution immediately without needing END PROGRAM syntax.',
    template: 'CLS\nPRINT "Stopping now"\nSTOP\n',
    matchRegex: /Stopping now/i,
    hint: 'Place STOP after the last line you want to run.',
  },

  // ─── STAGE 25: SYSTEM, RESTART, AND ERROR GRAMMAR ────────────────────────
  {
    id: '25.1-system',
    title: '25.1: SYSTEM',
    objective: 'End the program with SYSTEM after printing a line.',
    description:
      'SYSTEM exits the running BASIC program and returns control to the environment.',
    template: 'CLS\nPRINT "Leaving program"\nSYSTEM\n',
    matchRegex: /Leaving program/i,
    hint: 'Use SYSTEM on the final line to exit cleanly.',
  },
  {
    id: '25.2-run',
    title: '25.2: RUN',
    objective: 'Use RUN to restart the program flow.',
    description:
      'RUN is the classic restart command, and it can also be used with another program name.',
    template: 'CLS\nPRINT "Restart requested"\nRUN\n',
    matchRegex: /Restart requested/i,
    hint: 'Use RUN by itself for a restart request.',
  },
  {
    id: '25.3-chain',
    title: '25.3: CHAIN',
    objective: 'Demonstrate the CHAIN syntax for loading another program.',
    description:
      'CHAIN transfers control to another BASIC program file.',
    template: 'CLS\nPRINT "Loading next program"\nCHAIN "chapter2.bas"\n',
    matchRegex: /Loading next program/i,
    hint: 'Use CHAIN followed by the name of another program file.',
  },
  {
    id: '25.4-randomize-seed',
    title: '25.4: RANDOMIZE with a Seed',
    objective: 'Set a fixed random seed, generate one random number, and print it.',
    description:
      'RANDOMIZE can accept an explicit numeric seed when you want repeatable random sequences.',
    template: 'CLS\nRANDOMIZE 1234\nPRINT INT(RND * 10) + 1\n',
    matchRegex: /\d+/,
    hint: 'Use RANDOMIZE 1234 before calling RND.',
  },
  {
    id: '25.5-error',
    title: '25.5: ERROR',
    objective: 'Raise a custom runtime error after printing a warning line.',
    description:
      'ERROR n triggers a numbered error, which is useful when learning error-handling grammar.',
    template: 'CLS\nPRINT "About to raise an error"\nERROR 5\n',
    matchRegex: /About to raise an error/i,
    hint: 'Place ERROR 5 after the message line.',
  },
  {
    id: '25.6-on-error',
    title: '25.6: ON ERROR, ERROR, and RESUME NEXT',
    objective: 'Set an error handler label, raise an error, then resume execution.',
    description:
      'This lesson demonstrates the classic trio of ON ERROR GOTO, ERROR, and RESUME NEXT.',
    template:
      'CLS\nON ERROR GOTO Handler\nPRINT "Before error"\nERROR 5\nPRINT "After resume"\nEND\n\nHandler:\nPRINT "Recovered"\nRESUME NEXT\n',
    matchRegex: /Recovered|After resume/i,
    hint: 'Use ON ERROR GOTO Handler, then create a Handler: label with RESUME NEXT.',
  },

  // ─── STAGE 26: MORE FLOW CONTROL GRAMMAR ─────────────────────────────────
  {
    id: '26.1-wend',
    title: '26.1: WEND',
    objective: 'Use a WHILE loop that ends with WEND, then print a completion line.',
    description:
      'WEND is the classic closing keyword paired with WHILE in older BASIC loops.',
    template:
      'CLS\ncount = 1\nWHILE count <= 3\nPRINT count\ncount = count + 1\nWEND\nPRINT "WEND complete"\n',
    matchRegex: /WEND complete/i,
    hint: 'Finish the WHILE loop with WEND, then print a final confirmation line.',
  },
  {
    id: '26.2-exit-for',
    title: '26.2: EXIT FOR',
    objective: 'Leave a FOR loop early with EXIT FOR and print a confirmation.',
    description:
      'EXIT FOR breaks out of the current FOR...NEXT loop immediately.',
    template:
      'CLS\nFOR i = 1 TO 10\nPRINT i\nIF i = 4 THEN EXIT FOR\nNEXT i\nPRINT "Loop exited"\n',
    matchRegex: /Loop exited/i,
    hint: 'Put EXIT FOR inside an IF when the loop reaches the value you want.',
  },
  {
    id: '26.3-exit-do',
    title: '26.3: EXIT DO',
    objective: 'Leave a DO loop early with EXIT DO and print a confirmation line.',
    description:
      'EXIT DO is the direct way to break out of a DO...LOOP block.',
    template:
      'CLS\ni = 0\nDO\ni = i + 1\nPRINT i\nIF i = 3 THEN EXIT DO\nLOOP\nPRINT "DO loop exited"\n',
    matchRegex: /DO loop exited/i,
    hint: 'Use EXIT DO inside the loop when your stop condition is met.',
  },
  {
    id: '26.4-call',
    title: '26.4: CALL',
    objective: 'Invoke a SUB explicitly with CALL.',
    description:
      'CALL is the older explicit syntax for running a SUB procedure.',
    template:
      'CLS\nSUB ShowMessage\nPRINT "Called by CALL"\nEND SUB\n\nCALL ShowMessage\n',
    matchRegex: /Called by CALL/i,
    hint: 'Define a SUB, then call it with CALL ShowMessage.',
  },
  {
    id: '26.5-end',
    title: '26.5: END',
    objective: 'Stop the program with END after printing a line.',
    description:
      'END terminates the running program immediately, so later lines do not run.',
    template: 'CLS\nPRINT "Program finished"\nEND\nPRINT "This line should not run"\n',
    matchRegex: /Program finished/i,
    hint: 'Place END after the last line you want to execute.',
  },
  {
    id: '26.6-on-gosub',
    title: '26.6: ON...GOSUB',
    objective: 'Dispatch to one of several subroutine labels with ON...GOSUB.',
    description:
      'ON expr GOSUB picks a label by index, runs it, and then returns to the next line.',
    template:
      'CLS\nchoice = 2\nON choice GOSUB FirstChoice, SecondChoice\nPRINT "Returned from subroutine"\nEND\n\nFirstChoice:\nPRINT "First branch"\nRETURN\n\nSecondChoice:\nPRINT "Second branch"\nRETURN\n',
    matchRegex: /Second branch|Returned from subroutine/i,
    hint: 'Set choice to 1 or 2, then list matching labels after ON choice GOSUB.',
  },

  // ─── STAGE 27: EXTRA DECLARATION AND FILE GRAMMAR ────────────────────────
  {
    id: '27.1-deflng',
    title: '27.1: DEFLNG',
    objective: 'Assign a long integer value after setting a DEFLNG rule.',
    description:
      'DEFLNG makes variables in a letter range default to LONG unless you declare them differently.',
    template: 'CLS\nDEFLNG A-Z\naCount = 123456\nPRINT aCount\n',
    matchRegex: /123456/,
    hint: 'Use DEFLNG A-Z before assigning a large whole number.',
  },
  {
    id: '27.2-defsng',
    title: '27.2: DEFSNG',
    objective: 'Assign a single-precision value after setting DEFSNG.',
    description:
      'DEFSNG changes the default type for a letter range to SINGLE.',
    template: 'CLS\nDEFSNG A-Z\nratio = 1.5\nPRINT ratio\n',
    matchRegex: /1\.5/,
    hint: 'Use DEFSNG A-Z, then assign a decimal value like 1.5.',
  },
  {
    id: '27.3-defdbl',
    title: '27.3: DEFDBL',
    objective: 'Assign a double-precision value after setting DEFDBL.',
    description:
      'DEFDBL changes the default type for matching variable names to DOUBLE.',
    template: 'CLS\nDEFDBL A-Z\npiValue = 3.14159\nPRINT piValue\n',
    matchRegex: /3\.14159/,
    hint: 'Use DEFDBL A-Z before assigning a higher-precision decimal.',
  },
  {
    id: '27.4-line-input',
    title: '27.4: LINE INPUT',
    objective: 'Read an entire line of text with LINE INPUT and echo it back.',
    description:
      'LINE INPUT captures a whole line, including spaces, into a string variable.',
    template:
      'CLS\nLINE INPUT "Type a full sentence: "; sentence$\nPRINT "Captured: "; sentence$\n',
    matchRegex: /Captured:/i,
    hint: 'Use LINE INPUT with a string variable so spaces stay intact.',
  },
  {
    id: '27.5-lprint',
    title: '27.5: LPRINT',
    objective: 'Send a line to the printer stream and print a confirmation on screen.',
    description:
      'LPRINT writes to the printer output channel instead of the normal screen.',
    template: 'CLS\nLPRINT "Printer line"\nPRINT "Printer line sent"\n',
    matchRegex: /Printer line sent/i,
    hint: 'Use LPRINT for the printer output and PRINT for the screen confirmation.',
  },
  {
    id: '27.6-close-all',
    title: '27.6: CLOSE',
    objective: 'Open multiple files, close them all with CLOSE, and print a confirmation.',
    description:
      'CLOSE without a file number closes every open file handle at once.',
    template:
      'CLS\nOPEN "a.txt" FOR OUTPUT AS #1\nOPEN "b.txt" FOR OUTPUT AS #2\nPRINT #1, "A"\nPRINT #2, "B"\nCLOSE\nPRINT "All files closed"\n',
    matchRegex: /All files closed/i,
    hint: 'Leave out the file number after CLOSE to close every open handle.',
  },
  {
    id: '27.7-open-binary',
    title: '27.7: OPEN ... FOR BINARY',
    objective: 'Open a file in BINARY mode, close it, and print a confirmation.',
    description:
      'BINARY mode is the raw byte-oriented file mode in classic BASIC file I/O.',
    template:
      'CLS\nOPEN "data.bin" FOR BINARY AS #1\nCLOSE #1\nPRINT "Binary file opened"\n',
    matchRegex: /Binary file opened/i,
    hint: 'Use OPEN "file" FOR BINARY AS #1, then CLOSE #1.',
  },
  {
    id: '27.8-open-random',
    title: '27.8: OPEN ... FOR RANDOM',
    objective: 'Open a file in RANDOM mode, close it, and print a confirmation.',
    description:
      'RANDOM mode is the record-based file mode used for structured file access.',
    template:
      'CLS\nOPEN "records.dat" FOR RANDOM AS #1\nCLOSE #1\nPRINT "Random file opened"\n',
    matchRegex: /Random file opened/i,
    hint: 'Use OPEN "records.dat" FOR RANDOM AS #1, then close the handle.',
  },

  // ─── STAGE 28: REMAINING OPERATORS AND BUILT-INS ─────────────────────────
  {
    id: '28.1-int-div',
    title: '28.1: Integer Division',
    objective: 'Use the backslash operator to divide 7 by 2 and print the integer result.',
    description:
      'The backslash operator performs integer division by discarding the remainder.',
    template: 'CLS\nPRINT 7 \\ 2\n',
    matchRegex: /3/,
    hint: 'Use the integer division operator: 7 \\ 2',
  },
  {
    id: '28.2-xor-not',
    title: '28.2: XOR and NOT',
    objective: 'Demonstrate XOR and NOT, then print a confirmation line.',
    description:
      'XOR and NOT are part of BASIC logical and bitwise expression grammar.',
    template:
      'CLS\nPRINT 5 XOR 3\nPRINT NOT 0\nPRINT "Logic complete"\n',
    matchRegex: /Logic complete/i,
    hint: 'Print both 5 XOR 3 and NOT 0 before the confirmation line.',
  },
  {
    id: '28.3-eqv-imp',
    title: '28.3: EQV and IMP',
    objective: 'Use EQV and IMP in expressions, then print a confirmation line.',
    description:
      'EQV and IMP are classic BASIC logical operators that still belong to the language grammar.',
    template:
      'CLS\nPRINT 5 EQV 3\nPRINT 5 IMP 3\nPRINT "EQV IMP ready"\n',
    matchRegex: /EQV IMP ready/i,
    hint: 'Print one EQV example and one IMP example, then add a final status line.',
  },
  {
    id: '28.4-hex-oct-bin',
    title: '28.4: HEX$, OCT$, and BIN$',
    objective: 'Convert numbers to hexadecimal, octal, and binary strings.',
    description:
      'These built-ins format numbers in alternate bases without manual math.',
    template:
      'CLS\nPRINT HEX$(255)\nPRINT OCT$(8)\nPRINT BIN$(10)\nPRINT "Base conversion ready"\n',
    matchRegex: /Base conversion ready/i,
    hint: 'Use HEX$, OCT$, and BIN$ on three separate PRINT lines.',
  },
  {
    id: '28.5-lbound-ubound',
    title: '28.5: LBOUND and UBOUND',
    objective: 'Declare an array, print its lower and upper bounds, and confirm.',
    description:
      'LBOUND and UBOUND tell you the valid index range for an array dimension.',
    template:
      'CLS\nDIM values(5) AS INTEGER\nPRINT LBOUND(values)\nPRINT UBOUND(values)\nPRINT "Bounds checked"\n',
    matchRegex: /Bounds checked/i,
    hint: 'Create an array first, then print LBOUND(values) and UBOUND(values).',
  },
  {
    id: '28.6-date-time-timer',
    title: '28.6: DATE$, TIME$, and TIMER',
    objective: 'Print the current date, time, and timer value.',
    description:
      'These built-ins provide classic BASIC access to the system clock.',
    template:
      'CLS\nPRINT DATE$\nPRINT TIME$\nPRINT TIMER\nPRINT "Clock values ready"\n',
    matchRegex: /Clock values ready/i,
    hint: 'Print DATE$, TIME$, and TIMER before the final confirmation line.',
  },
];
