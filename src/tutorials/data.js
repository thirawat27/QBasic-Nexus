/**
 * QBasic Nexus - The Ultimate Interactive Tutorial Curriculum
 * Comprehensive guide covering 40+ lessons of QBasic syntax, features, and capabilities.
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

  // ─── STAGE 21: FINAL CAPSTONE PROJECT ──────────────────────────────────────
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
];
