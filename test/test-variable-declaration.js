'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const InternalTranspiler = require('../src/compiler/transpiler');

const testCases = [
  {
    name: 'Simple assignment without DIM',
    code: `
      x = 10
      PRINT x
    `,
  },
  {
    name: 'Variable used in expression',
    code: `
      y = x + 5
      PRINT y
    `,
  },
  {
    name: 'Array assignment without DIM',
    code: `
      arr(0) = 10
      arr(1) = 20
      PRINT arr(0)
    `,
  },
  {
    name: 'Struct member assignment',
    code: `
      player.x = 100
      player.y = 200
      PRINT player.x
    `,
  },
  {
    name: 'FOR loop variable remains available after NEXT',
    code: `
      FOR i = 1 TO 2
      NEXT i
      PRINT i
    `,
  },
  {
    name: 'Variable assigned inside FOR remains available after loop',
    code: `
      FOR t = 0 TO 3
        x = t
      NEXT t
      PRINT x
      PRINT t
    `,
  },
  {
    name: 'Variable assigned inside IF remains available after block',
    code: `
      IF 1 THEN
        hit = 42
      END IF
      PRINT hit
    `,
  },
  {
    name: 'LSET and RSET preserve the target width',
    code: `
      a$ = SPACE$(5)
      b$ = SPACE$(5)
      LSET a$ = "X"
      RSET b$ = "X"
      PRINT a$
      PRINT b$
    `,
    exactOutput: ['X    ', '    X'],
  },
  {
    name: 'GOSUB label updates outer-scope variables',
    code: `
      x = 1
      GOSUB SetX
      PRINT x
      END
      SetX:
      x = 2
      RETURN
    `,
    exactOutput: ['2'],
  },
  {
    name: 'Complex expression',
    code: `
      total = price * quantity + tax
      PRINT total
    `,
  },
  {
    name: 'User-defined FUNCTION calls are awaited in expressions',
    code: `
      FUNCTION Add(a, b)
        Add = a + b
      END FUNCTION
      PRINT Add(2, 3)
    `,
    exactOutput: ['5'],
  },
  {
    name: 'Comparisons return QBasic true as -1',
    code: `
      PRINT 1 = 1
      PRINT 1 <> 1
      PRINT 2 > 1
    `,
    exactOutput: ['-1', '0', '-1'],
  },
  {
    name: 'AND OR NOT use bitwise QBasic semantics',
    code: `
      PRINT 1 AND 2
      PRINT 1 OR 2
      PRINT NOT 0
    `,
    exactOutput: ['0', '3', '-1'],
  },
  {
    name: 'XOR EQV IMP use QuickBASIC precedence and semantics',
    code: `
      PRINT 5 XOR 3
      PRINT -1 EQV 0
      PRINT -1 IMP 0
      PRINT 0 IMP 0
    `,
    exactOutput: ['6', '0', '0', '-1'],
  },
  {
    name: 'Exponent precedence matches QBasic',
    code: `
      PRINT 2 * 3 ^ 2
    `,
    expectOutput: '18',
  },
  {
    name: 'PAINT dispatches to runtime',
    code: `
      PAINT (10, 20), 3, 4
    `,
    runtimeOverrides: {
      paint(x, y, fill, border) {
        this.print(`PAINT:${x},${y},${fill},${border}`);
      },
    },
    expectOutput: 'PAINT:10,20,3,4',
  },
  {
    name: 'Advanced runtime-backed statements resolve through web aliases',
    code: `
      pal = 7
      DRAW "C1"
      VIEW PRINT 2 TO 4
      VIEW (1, 2)-(3, 4), 5, 6
      WINDOW SCREEN (0, 0)-(10, 10)
      PALETTE 1, 255
      PALETTE USING pal
      PCOPY 1, 2
      _MEMCOPY 1, 2, 3 TO 4, 5
      _MEMFILL 6, 7, 8, 9
      _SETALPHA 128, 1, 4
      _CLEARCOLOR 0, 5
    `,
    runtimeOverrides: {
      draw(cmds) {
        this.print(`DRAW:${cmds}`);
      },
      viewPrint(top, bottom) {
        this.print(`VIEWPRINT:${top},${bottom}`);
      },
      view(x1, y1, x2, y2, fill, border) {
        this.print(`VIEW:${x1},${y1},${x2},${y2},${fill},${border}`);
      },
      window(x1, y1, x2, y2, screen) {
        this.print(`WINDOW:${x1},${y1},${x2},${y2},${screen}`);
      },
      palette(attr, color) {
        this.print(`PALETTE:${attr},${color}`);
      },
      paletteUsing(value) {
        this.print(`PALETTEUSING:${value}`);
      },
      pcopy(src, dst) {
        this.print(`PCOPY:${src},${dst}`);
      },
      memcopy(src, srcOff, bytes, dst, dstOff) {
        this.print(`MEMCOPY:${src},${srcOff},${bytes},${dst},${dstOff}`);
      },
      memfill(mem, off, bytes, val) {
        this.print(`MEMFILL:${mem},${off},${bytes},${val}`);
      },
      setAlpha(alpha, color, start, end, img) {
        this.print(`SETALPHA:${alpha},${color},${start},${end},${img}`);
      },
      clearColor(color, img) {
        this.print(`CLEARCOLOR:${color},${img}`);
      },
    },
    exactOutput: [
      'DRAW:C1',
      'VIEWPRINT:2,4',
      'VIEW:1,2,3,4,5,6',
      'WINDOW:0,0,10,10,true',
      'PALETTE:1,255',
      'PALETTEUSING:7',
      'PCOPY:1,2',
      'MEMCOPY:1,2,3,4,5',
      'MEMFILL:6,7,8,9',
      'SETALPHA:128,1,undefined,undefined,4',
      'CLEARCOLOR:0,5',
    ],
  },
  {
    name: 'POINT resolves through runtime in expressions',
    code: `
      PRINT POINT(7, 9)
    `,
    runtimeOverrides: {
      point(x, y) {
        return x + y;
      },
    },
    exactOutput: ['16'],
  },
  {
    name: 'Runtime-backed QB64 functions resolve in expressions',
    code: `
      img = _NEWIMAGE(10, 20, 32)
      x = _MOUSEX
      y = _MOUSEY
      sid = _SNDOPEN("laser.wav")
      PRINT img
      PRINT x
      PRINT y
      PRINT sid
    `,
    runtimeOverrides: {
      newimage(width, height, mode) {
        return width + height + mode;
      },
      mousex() {
        return 123;
      },
      mousey() {
        return 456;
      },
      async sndopen(filename) {
        return filename.length;
      },
    },
    exactOutput: ['62', '123', '456', '9'],
  },
  {
    name: 'OPEN and CLOSE await async runtime operations',
    code: `
      OPEN "demo.txt" FOR OUTPUT AS #1
      PRINT "AFTER OPEN"
      CLOSE #1
      PRINT "AFTER CLOSE"
    `,
    runtimeOverrides: {
      async open() {
        this.print('OPEN:START');
        await new Promise((resolve) => setTimeout(resolve, 5));
        this.print('OPEN:END');
      },
      async close() {
        this.print('CLOSE:START');
        await new Promise((resolve) => setTimeout(resolve, 5));
        this.print('CLOSE:END');
      },
    },
    exactOutput: ['OPEN:START', 'OPEN:END', 'AFTER OPEN', 'CLOSE:START', 'CLOSE:END', 'AFTER CLOSE'],
    settleMs: 20,
  },
  {
    name: 'Fallback file I/O works without runtime helpers',
    code: `
      OPEN "demo.txt" FOR OUTPUT AS #1
      PRINT #1, "HELLO"
      CLOSE #1
      OPEN "demo.txt" FOR INPUT AS #1
      INPUT #1, msg$
      CLOSE #1
      PRINT msg$
    `,
    exactOutput: ['HELLO'],
  },
  {
    name: 'RESET closes fallback files and preserves virtual file data',
    code: `
      OPEN "demo.txt" FOR OUTPUT AS #1
      PRINT #1, "RESET"
      RESET
      OPEN "demo.txt" FOR INPUT AS #1
      INPUT #1, msg$
      CLOSE #1
      PRINT msg$
    `,
    exactOutput: ['RESET'],
  },
  {
    name: 'Missing GOSUB label is reported by lint',
    lintCode: `
      GOSUB MissingLabel
      PRINT "still runs"
    `,
    expectLint: 'GOSUB MissingLabel: Label not defined.',
  },
  {
    name: 'Missing ON GOSUB label is reported by lint',
    lintCode: `
      ON 1 GOSUB MissingLabel
    `,
    expectLint: 'ON...GOSUB MissingLabel: Label not defined.',
  },
  {
    name: 'Missing ON GOTO label is reported by lint',
    lintCode: `
      ON 1 GOTO MissingLabel
    `,
    expectLint: 'ON...GOTO MissingLabel: Label not defined.',
  },
  {
    name: 'ON GOTO dispatches to the selected label',
    code: `
      x = 2
      ON x GOTO One, Two
      PRINT "BAD"
      END
      One:
      PRINT "ONE"
      END
      Two:
      PRINT "TWO"
      END
    `,
    exactOutput: ['TWO'],
  },
  {
    name: 'Node target includes graphics stubs',
    transpileCode: `
      SCREEN 12
      CIRCLE (10, 10), 5, 3
      PAINT (10, 10), 3, 1
      PSET (1, 1), 4
    `,
    transpileTarget: 'node',
    expectCodeIncludes: [
      "const _runtime = (typeof globalThis !== 'undefined' && globalThis.runtime) ? globalThis.runtime",
      'const _circle = async () => {};',
      'const _POINT = () => 0;',
      'const _pset = async () => {};',
      'const _PAINT = async () => {};',
      'const _SNDOPEN = async () => -1;',
      'const _MOUSEX = () => 0;',
      'const _resetFiles = async () => {};',
      'const _memcopy = () => {};',
      'const _memfill = () => {};',
      'const _setAlpha = () => {};',
      'const _clearColor = () => {};',
    ],
    expectCodeExcludes: ['const _runtime = {};'],
  },
  ...(fs.existsSync(path.join(__dirname, '..', 'gorillas.bas'))
    ? [
        {
          name: 'gorillas.bas trajectory regression',
          file: path.join(__dirname, '..', 'gorillas.bas'),
          inputs: ['17', '84'],
          expectOutput: 'ชนะ!',
        },
      ]
    : []),
];

function createRuntime(inputs, output, errors) {
  let inputIndex = 0;

  const runtime = {
    print(text) {
      output.push(String(text));
    },
    async input() {
      if (inputIndex >= inputs.length) {
        throw new Error('No more test input');
      }
      const value = inputs[inputIndex];
      inputIndex += 1;
      return String(value);
    },
    cls() {},
    locate() {},
    color() {},
    async beep() {},
    async sound() {},
    async play() {},
    screen() {},
    width() {},
    async pset() {},
    async preset() {},
    async line() {},
    async circle() {},
    async get() {},
    async put() {},
    mouseinput() {
      return 0;
    },
    mousex() {
      return 0;
    },
    mousey() {
      return 0;
    },
    mousebutton() {
      return 0;
    },
    timer() {
      return Date.now() / 1000;
    },
    paint() {},
    async limit() {},
    display() {},
    error(message) {
      errors.push(String(message));
    },
  };

  return runtime;
}

async function executeTranspiled(source, inputs = [], options = {}) {
  const transpiler = new InternalTranspiler();
  const code = transpiler.transpile(source, 'web');
  const output = [];
  const errors = [];
  const runtime = createRuntime(inputs, output, errors);
  Object.assign(runtime, options.runtimeOverrides || {});
  for (const [key, value] of Object.entries(runtime)) {
    if (typeof value === 'function') {
      runtime[key] = value.bind(runtime);
    }
  }

  const processStub = {
    stderr: {
      write(message) {
        const text = String(message).trim();
        if (text) {
          errors.push(text);
        }
      },
    },
    stdout: {
      write() {
        return true;
      },
      once(_event, handler) {
        if (typeof handler === 'function') {
          handler();
        }
      },
    },
    exit() {},
  };

  const context = {
    console: {
      log() {},
      error() {},
      warn() {},
    },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Promise,
    process: processStub,
    runtime,
  };

  context.globalThis = context;
  context.window = context;

  const result = vm.runInNewContext(code, context);
  if (result && typeof result.then === 'function') {
    await result;
  }
  if (options.settleMs) {
    await new Promise((resolve) => setTimeout(resolve, options.settleMs));
  }

  const runtimeError = errors.find((entry) =>
    entry.startsWith('Runtime Error:'),
  );
  if (runtimeError) {
    throw new Error(runtimeError.replace(/^Runtime Error:\s*/, ''));
  }
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return { code, output };
}

async function testVariableDeclaration() {
  console.log('Testing variable declaration and scope');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    try {
      if (test.lintCode) {
        const transpiler = new InternalTranspiler();
        const errors = transpiler.lint(test.lintCode);
        if (!errors.some((entry) => entry.message.includes(test.expectLint))) {
          throw new Error(`Expected lint error containing "${test.expectLint}"`);
        }
        console.log(`PASS ${test.name}`);
        passed += 1;
        continue;
      }

      if (test.transpileCode) {
        const transpiler = new InternalTranspiler();
        const code = transpiler.transpile(
          test.transpileCode,
          test.transpileTarget || 'web',
        );
        for (const expected of test.expectCodeIncludes || []) {
          if (!code.includes(expected)) {
            throw new Error(`Expected generated code to include "${expected}"`);
          }
        }
        for (const unexpected of test.expectCodeExcludes || []) {
          if (code.includes(unexpected)) {
            throw new Error(
              `Expected generated code to exclude "${unexpected}"`,
            );
          }
        }
        console.log(`PASS ${test.name}`);
        passed += 1;
        continue;
      }

      const source = test.file
        ? fs.readFileSync(test.file, 'utf8')
        : test.code;
      const { output } = await executeTranspiled(source, test.inputs || [], {
        runtimeOverrides: test.runtimeOverrides,
        settleMs: test.settleMs,
      });

      if (
        test.expectOutput &&
        !output.some((line) => line.includes(test.expectOutput))
      ) {
        throw new Error(`Expected output containing "${test.expectOutput}"`);
      }

      if (test.exactOutput) {
        const actual = JSON.stringify(output);
        const expected = JSON.stringify(test.exactOutput);
        if (actual !== expected) {
          throw new Error(`Expected output ${expected}, got ${actual}`);
        }
      }

      console.log(`PASS ${test.name}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL ${test.name}`);
      console.log(`  ${error.message}`);
      failed += 1;
    }
  }

  console.log('='.repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

if (require.main === module) {
  testVariableDeclaration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  executeTranspiled,
  testVariableDeclaration,
};
