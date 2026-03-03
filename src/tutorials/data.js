/**
 * QBasic Nexus - The Ultimate Interactive Tutorial Curriculum
 * Comprehensive guide covering 40+ lessons of QBasic syntax, features, and capabilities.
 */

"use strict"

module.exports = [
  // ─── STAGE 1: BASICS & VARIABLES ──────────────────────────────────────────
  {
    id: "1.1-hello",
    title: "1.1: Hello World",
    objective: 'Print exactly "Hello World" to the screen.',
    description:
      "The PRINT command displays text on the screen. Text must be wrapped in double quotes.",
    template: 'CLS\nPRINT "Hello World"\n',
    matchRegex: /Hello World/,
    hint: 'Use: PRINT "Hello World"',
  },
  {
    id: "1.2-vars",
    title: "1.2: Variables",
    objective:
      'Create a variable named "score" and set it to 100, then print it.',
    description:
      "Variables store data. You can just type a name and use '=' to assign a value.",
    template: "CLS\nscore = 100\nPRINT score\n",
    matchRegex: /100/,
    hint: "Type: score = 100 on one line, then PRINT score on the next.",
  },
  {
    id: "1.3-datatypes",
    title: "1.3: Data Types (DIM)",
    objective:
      'Declare a string variable using DIM, assign it "Nexus", and print it.',
    description:
      "Use the DIM keyword to explicitly declare variables and their types (e.g., AS STRING, AS INTEGER).",
    template:
      'CLS\nDIM playerName AS STRING\nplayerName = "Nexus"\nPRINT playerName\n',
    matchRegex: /Nexus/,
    hint: "Type: DIM playerName AS STRING",
  },
  {
    id: "1.4-input",
    title: "1.4: User Input",
    objective: "Ask for the user's name and print a greeting.",
    description: "INPUT pauses the program to let the user type something.",
    template: 'CLS\nINPUT "What is your name? ", n$\nPRINT "Hi, "; n$\n',
    matchRegex: /(name|hi)/i,
    hint: 'Use INPUT "Prompt ", var$ to get text input.',
  },

  // ─── STAGE 2: MATHEMATICS & LOGIC ─────────────────────────────────────────
  {
    id: "2.1-math",
    title: "2.1: Math Operators",
    objective:
      "Calculate the area of a rectangle (width 5, height 10) and print it.",
    description:
      "QBasic supports +, -, *, / for arithmetic, and ^ for exponents.",
    template: "CLS\nw = 5\nh = 10\narea = w * h\nPRINT area\n",
    matchRegex: /50/,
    hint: "Multiply dimensions using the * operator.",
  },
  {
    id: "2.2-mod",
    title: "2.2: Remainder (MOD)",
    objective: "Find the remainder of 17 divided by 5 and print it.",
    description:
      "The MOD operator returns the remainder of a division. It's useful for finding even/odd numbers.",
    template: "CLS\nremainder = 17 MOD 5\nPRINT remainder\n",
    matchRegex: /2/,
    hint: "Use: 17 MOD 5",
  },
  {
    id: "2.3-boolean",
    title: "2.3: Logical Operators",
    objective: "Use AND to check if both conditions are true. Print 'True'.",
    description: "Use AND, OR, and NOT to combine logical conditions.",
    template:
      'CLS\nHP = 100\nalive = 1\nIF HP > 0 AND alive = 1 THEN\n    PRINT "True"\nEND IF\n',
    matchRegex: /True/i,
    hint: "The IF expression uses AND to require both sides to be true.",
  },

  // ─── STAGE 3: CONTROL FLOW ────────────────────────────────────────────────
  {
    id: "3.1-if",
    title: "3.1: IF...THEN Statements",
    objective: "Print 'Pass' if score is greater than 50.",
    description: "IF evaluates a condition. Always end the block with END IF.",
    template: 'CLS\nscore = 75\nIF score > 50 THEN\n    PRINT "Pass"\nEND IF\n',
    matchRegex: /Pass/i,
    hint: "Write: IF score > 50 THEN ... END IF",
  },
  {
    id: "3.2-elseif",
    title: "3.2: ELSEIF & ELSE",
    objective: "Print 'A' if score >= 90, otherwise print 'B'.",
    description:
      "ELSEIF adds another condition, ELSE catches anything that didn't match.",
    template:
      'CLS\nscore = 85\nIF score >= 90 THEN\n    PRINT "A"\nELSEIF score >= 80 THEN\n    PRINT "B"\nELSE\n    PRINT "C"\nEND IF\n',
    matchRegex: /B/,
    hint: "Score is 85, so it triggers the ELSEIF block.",
  },
  {
    id: "3.3-select",
    title: "3.3: SELECT CASE",
    objective: "Print 'Gold' if rank is 1, using SELECT CASE.",
    description:
      "SELECT CASE is cleaner than multiple IFs when checking the same variable against different values.",
    template:
      'CLS\nrank = 1\nSELECT CASE rank\n    CASE 1\n        PRINT "Gold"\n    CASE 2\n        PRINT "Silver"\n    CASE ELSE\n        PRINT "Bronze"\nEND SELECT\n',
    matchRegex: /Gold/i,
    hint: "Use CASE 1 followed by PRINT",
  },

  // ─── STAGE 4: LOOPS ───────────────────────────────────────────────────────
  {
    id: "4.1-for",
    title: "4.1: FOR Loops",
    objective: "Print numbers 1 to 5 using a FOR...NEXT loop.",
    description: "FOR loops execute a block of code a set number of times.",
    template: "CLS\nFOR i = 1 TO 5\n    PRINT i\nNEXT i\n",
    matchRegex: /1\s*2\s*3\s*4\s*5/,
    hint: "Start with FOR i = 1 TO 5, then PRINT i, end with NEXT i",
  },
  {
    id: "4.2-for-step",
    title: "4.2: FOR Loop with STEP",
    objective: "Count down from 10 to 2 by 2s.",
    description:
      "The STEP keyword changes how much the loop counter increments or decrements.",
    template: "CLS\nFOR i = 10 TO 2 STEP -2\n    PRINT i\nNEXT i\n",
    matchRegex: /10\s*8\s*6\s*4\s*2/,
    hint: "Use STEP -2 to count backwards.",
  },
  {
    id: "4.3-while",
    title: "4.3: WHILE Loops",
    objective: "Create a WHILE loop that prints counting down from 3 to 1.",
    description:
      "WHILE loops run as long as the condition evaluates to true. Remember to update the variable inside!",
    template: "CLS\nx = 3\nWHILE x > 0\n    PRINT x\n    x = x - 1\nWEND\n",
    matchRegex: /3\s*2\s*1/,
    hint: "Use WHILE x > 0 ... WEND",
  },
  {
    id: "4.4-do",
    title: "4.4: DO...LOOP UNTIL",
    objective: "Use a DO LOOP UNTIL structure to print numbers 1 to 3.",
    description:
      "A DO loop with UNTIL at the end will always run at least once before checking the condition.",
    template: "CLS\nx = 1\nDO\n    PRINT x\n    x = x + 1\nLOOP UNTIL x > 3\n",
    matchRegex: /1\s*2\s*3/,
    hint: "The DO block runs at least once before checking the UNTIL condition.",
  },

  // ─── STAGE 5: STRINGS MANIPULATION ────────────────────────────────────────
  {
    id: "5.1-ucase",
    title: "5.1: String Case",
    objective: "Convert 'qbasic' to uppercase and print it.",
    description:
      "UCASE$ converts a string to upper case, LCASE$ to lower case.",
    template: 'CLS\nmsg$ = "qbasic"\nPRINT UCASE$(msg$)\n',
    matchRegex: /QBASIC/,
    hint: "Use UCASE$(var$)",
  },
  {
    id: "5.2-slice",
    title: "5.2: Slicing Strings",
    objective:
      "Print the first 3 letters, then the middle 3, then the last 3 of 'RetroWave'.",
    description:
      "LEFT$(s, n) gets the left part. RIGHT$(s, n) gets the right part. MID$(s, start, length) gets the middle.",
    template:
      'CLS\nword$ = "RetroWave"\nPRINT LEFT$(word$, 3)\nPRINT MID$(word$, 4, 3)\nPRINT RIGHT$(word$, 4)\n',
    matchRegex: /Ret\s*roW\s*Wave/i,
    hint: "Use LEFT$, MID$, and RIGHT$.",
  },
  {
    id: "5.3-len",
    title: "5.3: String Length & Trim",
    objective: "Get the length of the word 'Nexus' and print it.",
    description:
      "LEN() returns the number of characters. LTRIM$ and RTRIM$ remove spaces from the ends.",
    template: 'CLS\nword$ = "Nexus"\nPRINT LEN(word$)\n',
    matchRegex: /5/,
    hint: "Use LEN(word$).",
  },
  {
    id: "5.4-instr",
    title: "5.4: Find Substrings (INSTR)",
    objective: "Find the position of 'b' in 'QBasic' and print it.",
    description:
      "INSTR(string, substring) returns the starting position (1-based index) of the substring.",
    template: 'CLS\npos = INSTR("QBasic", "B")\nPRINT pos\n',
    matchRegex: /2/,
    hint: "The 'B' is the 2nd letter, so it prints 2.",
  },
  {
    id: "5.5-chr",
    title: "5.5: ASCII Codes (CHR$ and ASC)",
    objective: "Print the character for ASCII code 65.",
    description:
      "CHR$(number) turns an ASCII code into a character. ASC(char) does the reverse.",
    template: "CLS\nPRINT CHR$(65)\n",
    matchRegex: /A/,
    hint: "ASCII 65 is capital 'A'.",
  },

  // ─── STAGE 6: MATH EXTRAS & RANDOMNESS ────────────────────────────────────
  {
    id: "6.1-rnd",
    title: "6.1: Random Numbers",
    objective: "Generate and print a random number between 1 and 10.",
    description:
      "RND gives a decimal between 0 and 1. INT rounds down the result. RANDOMIZE TIMER seeds the generator.",
    template: "CLS\nRANDOMIZE TIMER\nr = INT(RND * 10) + 1\nPRINT r\n",
    matchRegex: /^[1-9]$|^10$/,
    hint: "Use INT(RND * 10) + 1 to get numbers 1-10.",
  },
  {
    id: "6.2-math-func",
    title: "6.2: Built-in Math",
    objective: "Print the absolute value of -42, and the square root of 25.",
    description:
      "ABS() returns absolute (positive) value. SQR() returns the square root.",
    template: "CLS\nPRINT ABS(-42)\nPRINT SQR(25)\n",
    matchRegex: /42\s*5/,
    hint: "Use ABS(-42) and SQR(25).",
  },

  // ─── STAGE 7: ARRAYS & CUSTOM TYPES ───────────────────────────────────────
  {
    id: "7.1-arrays",
    title: "7.1: 1D Arrays",
    objective:
      "Create an array for 3 items, assign a value to index 1, and print it.",
    description:
      "An array holds multiple values under one name. Declare with DIM arrayName(size).",
    template:
      'CLS\nDIM inventory(3) AS STRING\ninventory(1) = "Sword"\nPRINT inventory(1)\n',
    matchRegex: /Sword/i,
    hint: "Use DIM inventory(3) AS STRING",
  },
  {
    id: "7.2-2darrays",
    title: "7.2: 2D Arrays (Grid)",
    objective: "Create a 3x3 array (grid), set grid(2,2) to 9, and print it.",
    description:
      "Use commas to add dimensions to arrays, perfect for tile maps or game boards.",
    template:
      "CLS\nDIM grid(3, 3) AS INTEGER\ngrid(2, 2) = 9\nPRINT grid(2, 2)\n",
    matchRegex: /9/,
    hint: "DIM grid(3, 3) creates a 2D array.",
  },
  {
    id: "7.3-types",
    title: "7.3: Custom Data Types (Structs)",
    objective:
      "Create a TYPE 'Player', assign its X property to 10, and print it.",
    description:
      "TYPE...END TYPE allows you to create custom structs holding multiple properties.",
    template:
      "CLS\nTYPE Player\n    X AS INTEGER\n    Y AS INTEGER\nEND TYPE\n\nDIM p1 AS Player\np1.X = 10\nPRINT p1.X\n",
    matchRegex: /10/,
    hint: "Use the dot syntax (p1.X) to access properties inside a TYPE.",
  },

  // ─── STAGE 8: FUNCTIONS AND SUBROUTINES ───────────────────────────────────
  {
    id: "8.1-subs",
    title: "8.1: Subroutines (SUB)",
    objective:
      "Create a SUB to print a greeting, and call it using the CALL keyword.",
    description:
      "SUBs help organize code into reusable blocks that do not return a value.",
    template:
      'CLS\nCALL Greet\n\nSUB Greet\n    PRINT "Welcome, Player!"\nEND SUB\n',
    matchRegex: /Welcome/i,
    hint: "Use CALL to run the SUB block.",
  },
  {
    id: "8.2-funcs",
    title: "8.2: Functions (FUNCTION)",
    objective: "Create a function that adds two numbers, and print the result.",
    description:
      "Functions return a value. Assign the result to the function's own name before END FUNCTION.",
    template:
      "CLS\nPRINT AddNum(5, 7)\n\nFUNCTION AddNum(a, b)\n    AddNum = a + b\nEND FUNCTION\n",
    matchRegex: /12/,
    hint: "Assign AddNum = a + b inside the function.",
  },
  {
    id: "8.3-shared",
    title: "8.3: Global Variables (SHARED)",
    objective: "Use DIM SHARED so a SUB can access a global variable.",
    description:
      "Normally variables inside SUBs are local. Use DIM SHARED to give them global scope.",
    template:
      "CLS\nDIM SHARED lives AS INTEGER\nlives = 3\nCALL TakeDamage\nPRINT lives\n\nSUB TakeDamage\n    lives = lives - 1\nEND SUB\n",
    matchRegex: /2/,
    hint: "DIM SHARED makes 'lives' visible everywhere.",
  },

  // ─── STAGE 9: DATA MANAGEMENT ─────────────────────────────────────────────
  {
    id: "9.1-data",
    title: "9.1: DATA and READ",
    objective: "Read 3 numbers from a DATA block and print the first one.",
    description:
      "DATA stores static values inside the code, and READ loads them sequentially into variables.",
    template: "CLS\nREAD a, b, c\nPRINT a\n\nDATA 10, 20, 30\n",
    matchRegex: /10/,
    hint: "Use READ matching the DATA items.",
  },
  {
    id: "9.2-restore",
    title: "9.2: RESTORE",
    objective: "Use RESTORE to reset the DATA reading pointer.",
    description:
      "RESTORE moves the READ pointer back to the very first DATA statement.",
    template: "CLS\nREAD x\nRESTORE\nREAD y\nPRINT x + y\n\nDATA 50, 60\n",
    matchRegex: /100/,
    hint: "Because of RESTORE, y will read 50 again instead of 60.",
  },

  // ─── STAGE 10: VIRTUAL FILE I/O ───────────────────────────────────────────
  {
    id: "10.1-open-out",
    title: "10.1: Writing to Files",
    objective: "Open a file for output and write 'Hello File' to it.",
    description:
      "QBasic Nexus uses a Virtual File System. OPEN a file FOR OUTPUT to write data using PRINT #.",
    template:
      'CLS\nOPEN "test.txt" FOR OUTPUT AS #1\nPRINT #1, "Hello File"\nCLOSE #1\nPRINT "File Written"\n',
    matchRegex: /File Written/i,
    hint: "Make sure you CLOSE #1 when done.",
  },
  {
    id: "10.2-open-in",
    title: "10.2: Reading from Files",
    objective:
      "Open a file FOR INPUT and read its contents back using INPUT #.",
    description:
      "OPEN ... FOR INPUT AS #1 reads from the file. Use INPUT #1, var$ to read.",
    template:
      'CLS\nOPEN "test.txt" FOR OUTPUT AS #1\nPRINT #1, "SavedData"\nCLOSE #1\n\nOPEN "test.txt" FOR INPUT AS #1\nINPUT #1, myVar$\nCLOSE #1\n\nPRINT myVar$\n',
    matchRegex: /SavedData/i,
    hint: "INPUT # reads comma-separated values, LINE INPUT # reads the whole line.",
  },

  // ─── STAGE 11: TEXT UI & INTERACTION ──────────────────────────────────────
  {
    id: "11.1-locate",
    title: "11.1: LOCATE and COLOR",
    objective:
      "Move the cursor to row 10, col 20 and print text in green (Color 2).",
    description:
      "LOCATE row, col moves the text cursor. COLOR fg, bg changes text colors (0-15).",
    template: 'CLS\nCOLOR 2\nLOCATE 10, 20\nPRINT "Centered Green Text"\n',
    matchRegex: /Centered Green Text/i,
    hint: "Row 1-25, Col 1-80",
  },
  {
    id: "11.2-sleep",
    title: "11.2: SLEEP",
    objective: "Pause the program for 1 second.",
    description: "SLEEP n pauses the execution for n seconds.",
    template: 'CLS\nPRINT "Wait for it..."\nSLEEP 1\nPRINT "Done!"\n',
    matchRegex: /Wait for it\.\.\.\s*Done!/i,
    hint: "SLEEP uses seconds.",
  },

  // ─── STAGE 12: GRAPHICS & MULTIMEDIA ──────────────────────────────────────
  {
    id: "12.1-screen13",
    title: "12.1: Graphics Mode (SCREEN 13)",
    objective: "Change screen mode to 13 and draw a single dot using PSET.",
    description:
      "SCREEN 13 is the classic 320x200 pixel, 256-color VGA mode. PSET draws a pixel.",
    template: 'SCREEN 13\nCOLOR 14\nPSET (160, 100), 10\nPRINT "Graphics ON"\n',
    matchRegex: /Graphics ON/i,
    hint: "Use SCREEN 13 to enter graphics mode.",
  },
  {
    id: "12.2-line",
    title: "12.2: Drawing Lines & Boxes",
    objective: "Draw a straight line and a filled box.",
    description:
      "LINE (x1,y1)-(x2,y2), c draws a line. Add ,B for a box, or ,BF for a solid filled box.",
    template:
      'SCREEN 13\nLINE (10,10)-(50,10), 14\nLINE (60,10)-(100,50), 9, BF\nPRINT "Lines and Boxes"\n',
    matchRegex: /Lines and Boxes/i,
    hint: "BF stands for Box Filled.",
  },
  {
    id: "12.3-circle",
    title: "12.3: Drawing Circles",
    objective: "Draw a circle in the middle of the screen.",
    description: "CIRCLE (x, y), radius, color draws a circle.",
    template: 'SCREEN 13\nCIRCLE (160, 100), 50, 11\nPRINT "Ring"\n',
    matchRegex: /Ring/i,
    hint: "Screen center is roughly (160, 100).",
  },
  {
    id: "12.4-paint",
    title: "12.4: PAINT (Flood Fill)",
    objective: "Draw a circle and fill the inside with a different color.",
    description:
      "PAINT (x, y), fill_color, border_color flood-fills a bounded area.",
    template:
      'SCREEN 13\nCIRCLE (100, 100), 30, 15\nPAINT (100, 100), 10, 15\nPRINT "Filled"\n',
    matchRegex: /Filled/i,
    hint: "PAINT needs a point inside the border, the fill color, and the border color to stop at.",
  },
  {
    id: "12.5-draw",
    title: "12.5: The DRAW Macro",
    objective: "Use the DRAW command to draw a quick shape.",
    description:
      "DRAW accepts a mini language string. U=Up, D=Down, L=Left, R=Right. (e.g., 'U10 R10 D10 L10')",
    template:
      'SCREEN 13\nPSET (100, 100)\nDRAW "U20 R20 D20 L20"\nPRINT "Square drawn"\n',
    matchRegex: /Square drawn/i,
    hint: "DRAW starts from the last graphics position.",
  },

  // ─── STAGE 13: AUDIO & MUSIC ──────────────────────────────────────────────
  {
    id: "13.1-sound",
    title: "13.1: Beeps (SOUND)",
    objective: "Play a frequency of 440Hz for a short duration.",
    description:
      "SOUND frequency, duration plays a bare tone. (Note: In Webview, SOUND requires the user to interact with the screen first to bypass browser audio block).",
    template: 'CLS\nPRINT "Beeping..."\nSOUND 440, 10\n',
    matchRegex: /Beeping/i,
    hint: "440Hz is the A4 note.",
  },
  {
    id: "13.2-play",
    title: "13.2: Music Macros (PLAY)",
    objective: "Play some simple musical notes using PLAY.",
    description:
      "The PLAY command uses a special macro language to play notes sequence (A-G, Octaves, tempo).",
    template: 'CLS\nPRINT "Playing music!"\nPLAY "CDE CDE EDC"\n',
    matchRegex: /Playing music!/i,
    hint: 'PLAY accepts a string like "C D E" to play notes.',
  },
]
