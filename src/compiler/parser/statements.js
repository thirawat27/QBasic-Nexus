// Auto-extracted Mixin
'use strict';
const { TokenType } = require('../constants');

const STATEMENT_DISPATCH = Object.freeze({
  DECLARE(parser) {
    parser._advance();
    return parser._skipToEndOfLine();
  },
  PRINT: (parser) => { parser._advance(); return parser._parsePrint(); },
  INPUT: (parser) => { parser._advance(); return parser._parseInput(); },
  LINE(parser) {
    parser._advance();
    if (parser._matchKw('INPUT')) return parser._parseLineInput();
    return parser._parseLine();
  },
  CIRCLE: (parser) => { parser._advance(); return parser._parseCircle(); },
  PSET: (parser) => { parser._advance(); return parser._parsePset(); },
  PRESET: (parser) => { parser._advance(); return parser._parsePreset(); },
  PAINT: (parser) => { parser._advance(); return parser._parsePaint(); },
  GET(parser) {
    parser._advance();
    return parser._peek()?.type === TokenType.PUNCTUATION && parser._peek()?.value === '#'
      ? parser._parseGetFile()
      : parser._parseGet();
  },
  PUT(parser) {
    parser._advance();
    return parser._peek()?.type === TokenType.PUNCTUATION && parser._peek()?.value === '#'
      ? parser._parsePutFile()
      : parser._parsePut();
  },
  IF: (parser) => { parser._advance(); return parser._parseIf(); },
  ELSEIF: (parser) => { parser._advance(); return parser._parseElseIf(); },
  ELSE: (parser) => { parser._advance(); return parser._parseElse(); },
  END: (parser) => { parser._advance(); return parser._parseEnd(); },
  FOR: (parser) => { parser._advance(); return parser._parseFor(); },
  NEXT: (parser) => { parser._advance(); return parser._parseNext(); },
  DO: (parser) => { parser._advance(); return parser._parseDo(); },
  LOOP: (parser) => { parser._advance(); return parser._parseLoop(); },
  WHILE: (parser) => { parser._advance(); return parser._parseWhile(); },
  WEND: (parser) => { parser._advance(); return parser._parseWend(); },
  SELECT: (parser) => { parser._advance(); return parser._parseSelect(); },
  EXIT: (parser) => { parser._advance(); return parser._parseExit(); },
  STOP(parser) {
    parser._advance();
    return parser._emit('throw "__END__"; // STOP');
  },
  COMMON: (parser) => { parser._advance(); return parser._parseCommon(); },
  OPTION: (parser) => { parser._advance(); return parser._parseOption(); },
  DIM: (parser) => { parser._advance(); return parser._parseDim(); },
  REDIM: (parser) => { parser._advance(); return parser._parseRedim(); },
  STATIC: (parser) => { parser._advance(); return parser._parseStatic(); },
  CONST: (parser) => { parser._advance(); return parser._parseConst(); },
  TYPE: (parser) => { parser._advance(); return parser._parseType(); },
  DATA: (parser) => { parser._advance(); return parser._parseData(); },
  READ: (parser) => { parser._advance(); return parser._parseRead(); },
  RESTORE: (parser) => { parser._advance(); return parser._parseRestore(); },
  FIELD: (parser) => { parser._advance(); return parser._parseField(); },
  SWAP: (parser) => { parser._advance(); return parser._parseSwap(); },
  ERASE: (parser) => { parser._advance(); return parser._parseErase(); },
  LSET: (parser) => { parser._advance(); return parser._parseLsetStatement(); },
  RSET: (parser) => { parser._advance(); return parser._parseRsetStatement(); },
  LET: (parser) => { parser._advance(); return parser._parseAssignment(); },
  CLS(parser) {
    parser._advance();
    return parser._emit('_cls();');
  },
  LOCATE: (parser) => { parser._advance(); return parser._parseLocate(); },
  COLOR: (parser) => { parser._advance(); return parser._parseColor(); },
  SCREEN: (parser) => { parser._advance(); return parser._parseScreen(); },
  WIDTH: (parser) => { parser._advance(); return parser._parseWidth(); },
  BEEP(parser) {
    parser._advance();
    return parser._emit('await _beep();');
  },
  SOUND: (parser) => { parser._advance(); return parser._parseSound(); },
  PLAY: (parser) => { parser._advance(); return parser._parsePlay(); },
  SLEEP: (parser) => { parser._advance(); return parser._parseSleep(); },
  _DELAY: (parser) => { parser._advance(); return parser._parseDelay(); },
  _LIMIT: (parser) => { parser._advance(); return parser._parseLimit(); },
  CONTINUE(parser) {
    parser._advance();
    return parser._emit('continue;');
  },
  _CONTINUE(parser) {
    parser._advance();
    return parser._emit('continue;');
  },
  GOTO: (parser) => { parser._advance(); return parser._parseGoto(); },
  GOSUB: (parser) => { parser._advance(); return parser._parseGosub(); },
  RETURN(parser) {
    parser._advance();
    if (parser._insideRawCapture) {
      parser._rawCaptureContainsJump = true;
    }
    return parser._emit('return;');
  },
  ON: (parser) => { parser._advance(); return parser._parseOnStatement(); },
  RESUME: (parser) => { parser._advance(); return parser._parseResume(); },
  CALL: (parser) => { parser._advance(); return parser._parseCall(); },
  SUB: (parser) => { parser._advance(); return parser._parseSub(); },
  FUNCTION: (parser) => { parser._advance(); return parser._parseFunction(); },
  RANDOMIZE: (parser) => { parser._advance(); return parser._parseRandomize(); },
  DEF(parser) {
    parser._advance();
    if (parser._matchKw('SEG')) return parser._parseDefSeg();
    return parser._parseDefFn();
  },
  OPEN: (parser) => { parser._advance(); return parser._parseOpen(); },
  CLOSE: (parser) => { parser._advance(); return parser._parseClose(); },
  DRAW: (parser) => { parser._advance(); return parser._parseDraw(); },
  VIEW: (parser) => { parser._advance(); return parser._parseView(); },
  WINDOW: (parser) => { parser._advance(); return parser._parseWindow(); },
  PALETTE: (parser) => { parser._advance(); return parser._parsePalette(); },
  PCOPY: (parser) => { parser._advance(); return parser._parsePcopy(); },
  NAME: (parser) => { parser._advance(); return parser._parseName(); },
  KILL: (parser) => { parser._advance(); return parser._parseKill(); },
  MKDIR: (parser) => { parser._advance(); return parser._parseMkdir(); },
  RMDIR: (parser) => { parser._advance(); return parser._parseRmdir(); },
  CHDIR: (parser) => { parser._advance(); return parser._parseChdir(); },
  FILES: (parser) => { parser._advance(); return parser._parseFiles(); },
  SEEK: (parser) => { parser._advance(); return parser._parseSeek(); },
  LOCK: (parser) => { parser._advance(); return parser._parseLock(); },
  UNLOCK: (parser) => { parser._advance(); return parser._parseUnlock(); },
  RESET(parser) {
    parser._advance();
    return parser._emit('await _resetFiles();');
  },
  DEFINT: (parser) => { parser._advance(); return parser._parseDefType('INTEGER'); },
  DEFLNG: (parser) => { parser._advance(); return parser._parseDefType('LONG'); },
  DEFSNG: (parser) => { parser._advance(); return parser._parseDefType('SINGLE'); },
  DEFDBL: (parser) => { parser._advance(); return parser._parseDefType('DOUBLE'); },
  DEFSTR: (parser) => { parser._advance(); return parser._parseDefType('STRING'); },
  LPRINT: (parser) => { parser._advance(); return parser._parseLprint(); },
  WRITE: (parser) => { parser._advance(); return parser._parseWrite(); },
  OUT: (parser) => { parser._advance(); return parser._parseOut(); },
  WAIT: (parser) => { parser._advance(); return parser._parseWait(); },
  POKE: (parser) => { parser._advance(); return parser._parsePoke(); },
  SYSTEM(parser) {
    parser._advance();
    return parser._emit('throw "__END__"; // SYSTEM');
  },
  RUN: (parser) => { parser._advance(); return parser._parseRun(); },
  CHAIN: (parser) => { parser._advance(); return parser._parseChain(); },
  SHELL: (parser) => { parser._advance(); return parser._parseShell(); },
  _SHELL: (parser) => { parser._advance(); return parser._parseShell(); },
  _TITLE: (parser) => { parser._advance(); return parser._parseTitle(); },
  _FULLSCREEN: (parser) => { parser._advance(); return parser._parseFullscreen(); },
  _SCREENMOVE: (parser) => { parser._advance(); return parser._parseScreenMove(); },
  _SCREENICON: (parser) => { parser._advance(); return parser._parseScreenIcon(); },
  _SCREENHIDE: (parser) => { parser._advance(); return parser._parseScreenHide(); },
  _SCREENSHOW: (parser) => { parser._advance(); return parser._parseScreenShow(); },
  _ICON: (parser) => { parser._advance(); return parser._parseIcon(); },
  _DEST: (parser) => { parser._advance(); return parser._parseDest(); },
  _SOURCE: (parser) => { parser._advance(); return parser._parseSource(); },
  _AUTODISPLAY(parser) {
    parser._advance();
    return parser._emit('// _AUTODISPLAY - default in web');
  },
  _FONT: (parser) => { parser._advance(); return parser._parseFont(); },
  _SNDSTOP: (parser) => { parser._advance(); return parser._parseSndStop(); },
  _SNDVOL: (parser) => { parser._advance(); return parser._parseSndVol(); },
  _SNDPAUSE: (parser) => { parser._advance(); return parser._parseSndPause(); },
  _SNDBAL: (parser) => { parser._advance(); return parser._parseSndBal(); },
  _SNDSETPOS: (parser) => { parser._advance(); return parser._parseSndSetPos(); },
  _SNDRAW: (parser) => { parser._advance(); return parser._parseSndRaw(); },
  _MEMGET: (parser) => { parser._advance(); return parser._parseMemGet(); },
  _MEMPUT: (parser) => { parser._advance(); return parser._parseMemPut(); },
  _MEMFREE: (parser) => { parser._advance(); return parser._parseMemFree(); },
  _MEMCOPY: (parser) => { parser._advance(); return parser._parseMemCopy(); },
  _MEMFILL: (parser) => { parser._advance(); return parser._parseMemFill(); },
  _CLIPBOARD: (parser) => { parser._advance(); return parser._parseClipboard(); },
  _PUTIMAGE: (parser) => { parser._advance(); return parser._parsePutImage(); },
  _PRINTSTRING: (parser) => { parser._advance(); return parser._parsePrintString(); },
  _FREEIMAGE: (parser) => { parser._advance(); return parser._parseFreeImage(); },
  _SETALPHA: (parser) => { parser._advance(); return parser._parseSetAlpha(); },
  _CLEARCOLOR: (parser) => { parser._advance(); return parser._parseClearColor(); },
  _MOUSEHIDE(parser) {
    parser._advance();
    return parser._emit('_runtime.mousehide?.();');
  },
  _MOUSESHOW: (parser) => { parser._advance(); return parser._parseMouseShow(); },
  _MOUSEMOVE: (parser) => { parser._advance(); return parser._parseMouseMove(); },
  _KEYCLEAR(parser) {
    parser._advance();
    return parser._emit('_runtime.keyclear?.();');
  },
  _SNDPLAY: (parser) => { parser._advance(); return parser._parseSndPlay(); },
  _SNDLOOP: (parser) => { parser._advance(); return parser._parseSndLoop(); },
  _SNDCLOSE: (parser) => { parser._advance(); return parser._parseSndClose(); },
  _DISPLAY(parser) {
    parser._advance();
    return parser._emit('_runtime.display?.();');
  },
  ERROR: (parser) => { parser._advance(); return parser._parseError(); },
  CLEAR: (parser) => { parser._advance(); return parser._parseClear(); },
  KEY: (parser) => { parser._advance(); return parser._parseKey(); },
  STRIG: (parser) => { parser._advance(); return parser._parseStrig(); },
  TIMER: (parser) => { parser._advance(); return parser._parseTimer(); },
  FRE: (parser) => { parser._advance(); return parser._parseFre(); },
  ENVIRON: (parser) => { parser._advance(); return parser._parseEnviron(); },
  'DATE$': (parser) => { parser._advance(); return parser._parseDate$(); },
  'TIME$': (parser) => { parser._advance(); return parser._parseTime$(); },
  _CONSOLE: (parser) => { parser._advance(); return parser._parseConsole(); },
  _CONSOLETITLE: (parser) => { parser._advance(); return parser._parseConsoleTitle(); },
  _SHELLHIDE: (parser) => { parser._advance(); return parser._parseShellHide(); },
  _ACCEPTFILEDROP: (parser) => { parser._advance(); return parser._parseAcceptFileDrop(); },
  _NEWIMAGE: (parser) => { parser._advance(); return parser._parseNewImage(); },
  _LOADIMAGE: (parser) => { parser._advance(); return parser._parseLoadImage(); },
  _COPYIMAGE: (parser) => { parser._advance(); return parser._parseCopyImage(); },
  _SNDOPEN: (parser) => { parser._advance(); return parser._parseSndOpen(); },
  _SNDPLAYFILE: (parser) => { parser._advance(); return parser._parseSndPlayFile(); },
  _SNDGETPOS: (parser) => { parser._advance(); return parser._parseSndGetPos(); },
  _SNDLEN: (parser) => { parser._advance(); return parser._parseSndLen(); },
  _SNDPLAYING: (parser) => { parser._advance(); return parser._parseSndPlaying(); },
  _MOUSEWHEEL: (parser) => { parser._advance(); return parser._parseMouseWheel(); },
  _MOUSEINPUT: (parser) => { parser._advance(); return parser._parseMouseInput(); },
  _OPENHOST: (parser) => { parser._advance(); return parser._parseOpenHost(); },
  _OPENCLIENT: (parser) => { parser._advance(); return parser._parseOpenClient(); },
  _OPENCONNECTION: (parser) => { parser._advance(); return parser._parseOpenConnection(); },
  _CLOSE: (parser) => { parser._advance(); return parser._parseClose(); },
  _KEYDOWN: (parser) => { parser._advance(); return parser._parseKeyDown(); },
  _KEYHIT: (parser) => { parser._advance(); return parser._parseKeyHit(); },
  _RESIZE: (parser) => { parser._advance(); return parser._parseResize(); },
  'MID$': (parser) => { parser._advance(); return parser._parseMidAssignment(); },
});

module.exports = {
_parseStatement() {
    const token = this._peek();
    if (!token) return;

    if (token.type === TokenType.KEYWORD) {
      const handler = STATEMENT_DISPATCH[token.value];
      if (handler) return handler(this);
      this._advance();
      return;
    }

    if (token.type === TokenType.IDENTIFIER) {
      const next = this.tokens[this.pos + 1];
      if (next?.type === TokenType.PUNCTUATION && next?.value === ':') {
        return this._parseLabel();
      }
      return this._parseAssignment();
    }

    this._advance();
  },

_parseLabel() {
    if (this._insideRawCapture) {
      this._rawCaptureContainsJump = true;
    }
    const label = this._consume(TokenType.IDENTIFIER);
    this._matchPunc(':');
    if (label) {
      const labelName = this._resolveLabelName(label.value);
      // Generate an async function for this label that can be called by GOSUB
      // and set a state variable for GOTO state machine
      this._emit(`// Label: ${label.value}`);
      this._emit(`async function ${labelName}() {`);
      this.indent++;
      this._enterScope('label');

      // Collect statements until next label, SUB, FUNCTION, or RETURN
      while (!this._isEnd()) {
        this._skipNewlines();
        if (this._isEnd()) break;

        // Check for end conditions
        if (this._checkKw('RETURN')) {
          this._advance(); // consume RETURN
          break;
        }

        // Check for next label
        if (this._check(TokenType.IDENTIFIER)) {
          const next = this.tokens[this.pos + 1];
          if (next?.type === TokenType.PUNCTUATION && next?.value === ':') {
            break; // Next label found
          }
        }

        // Check for SUB/FUNCTION definitions
        if (this._checkKw('SUB') || this._checkKw('FUNCTION')) {
          break;
        }

        this._parseStatement();
      }

      this._exitScope();
      this.indent--;
      this._emit(`} // End Label: ${label.value}`);
    }
  },

_parseIf() {
    const cond = this._parseExpr();
    this._consumeKw('THEN');
    const conditionTest = this._buildConditionTest(cond);

    if (!this._isStmtEnd()) {
      this._emit(`if (${conditionTest}) {`);
      this.indent++;
      this._parseStatement();

      if (this._matchKw('ELSE')) {
        this._decIndent();
        this._emit('} else {');
        this.indent++;
        this._parseStatement();
      }

      this.indent--;
      this._emit('} // Single Line IF');
    } else {
      this._emit(`if (${conditionTest}) {`);
      this.indent++;
    }
  },

_parseElseIf() {
    this._decIndent();
    const cond = this._parseExpr();
    this._consumeKw('THEN');
    this._emit(`} else if (${this._buildConditionTest(cond)}) {`);
    this.indent++;
  },

_parseElse() {
    this._decIndent();
    this._emit('} else {');
    this.indent++;
  },

_parseEnd() {
    if (this._matchKw('IF') || this._matchKw('SELECT')) {
      this._decIndent();
      this._emit('} // END IF/SELECT');
    } else if (this._matchKw('SUB')) {
      this.currentProcedure = null;
      this._exitScope();
      this._decIndent();
      this._emit('} // END SUB');
    } else if (this._matchKw('FUNCTION')) {
      if (this.currentFunction) {
        this._emit(`return ${this.currentFunction.resultVar};`);
        this.currentFunction = null;
      }
      this.currentProcedure = null;
      this._exitScope();
      this._decIndent();
      this._emit('} // END FUNCTION');
    } else {
      this._emit('throw "__END__"; // END');
    }
  },

_parseFor() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) this._raiseSyntaxError('Expected variable after FOR');

    const name = id.value;
    this._addVar(name);
    const storageName = this._resolveStorageName(name);

    this._consumeOp('=');
    const start = this._parseExpr();
    this._consumeKw('TO');
    const end = this._parseExpr();

    let step = '1';

    if (this._matchKw('STEP')) {
      step = this._parseExpr();
    }

    // Robust loop condition for dynamic step sign
    this._emit(
      `for (var ${storageName} = ${start}; (${step} >= 0) ? ${storageName} <= ${end} : ${storageName} >= ${end}; ${storageName} += ${step}) {`,
    );
    this.indent++;
  },

_parseNext() {
    if (this._check(TokenType.IDENTIFIER)) this._advance();
    this._decIndent();
    this._emit('}');
  },

_parseDo() {
    if (this._matchKw('WHILE')) {
      const cond = this._parseExpr();
      this._emit(`while (${this._buildConditionTest(cond)}) {`);
    } else if (this._matchKw('UNTIL')) {
      const cond = this._parseExpr();
      this._emit(`while (!(${this._buildConditionTest(cond)})) {`);
    } else {
      this._emit('do {');
    }
    this.indent++;
  },

  _parseLoop() {
    this._decIndent();

    if (this._matchKw('WHILE')) {
      const cond = this._parseExpr();
      this._emit(`} while (${this._buildConditionTest(cond)});`);
    } else if (this._matchKw('UNTIL')) {
      const cond = this._parseExpr();
      this._emit(`} while (!(${this._buildConditionTest(cond)}));`);
    } else {
      this._emit('} while (true);');
    }
  },

_parseWhile() {
    const cond = this._parseExpr();
    this._emit(`while (${this._buildConditionTest(cond)}) {`);
    this.indent++;
  },

_parseWend() {
    this._decIndent();
    this._emit('}');
  },

_parseExit() {
    if (this._matchKw('FOR') || this._matchKw('DO') || this._matchKw('WHILE')) {
      this._emit('break;');
    } else if (this._matchKw('SUB') || this._matchKw('FUNCTION')) {
      this._emit('return;');
    }
  },

  _parseAssignment() {
    const target = this._parseAssignableTarget({
      contextLabel: 'assignment',
    });
    if (!target) return;

    this._consumeOp('=');
    const val = this._wrapAssignmentValue(
      target.name,
      this._parseExpr(),
      target.wrapOptions,
    );
    this._emit(`${target.targetExpr} = ${val};`);
  },

  _parseMidAssignment() {
    this._matchPunc('(');
    const target = this._parseAssignableTarget({
      contextLabel: 'MID$ assignment target',
    });
    this._matchPunc(',');
    const start = this._parseExpr();
    let length = 'undefined';
    if (this._matchPunc(',')) {
      length = this._parseExpr();
    }
    this._matchPunc(')');
    this._consumeOp('=');
    const right = this._parseExpr();

    this._emit(
      `${target.targetExpr} = _midAssign(${target.targetExpr}, ${start}, ${length}, ${right});`
    );
  },

_parseSwap() {
    const left = this._parseAssignableTarget({
      contextLabel: 'SWAP',
    });
    this._matchPunc(',');
    const right = this._parseAssignableTarget({
      contextLabel: 'SWAP',
    });
    const tempVar = `_swap_${this.pos}`;
    const leftAssigned = this._wrapAssignmentValue(
      left.name,
      right.targetExpr,
      left.wrapOptions,
    );
    const rightAssigned = this._wrapAssignmentValue(
      right.name,
      tempVar,
      right.wrapOptions,
    );
    this._emit(`{ const ${tempVar} = ${left.targetExpr}; ${left.targetExpr} = ${leftAssigned}; ${right.targetExpr} = ${rightAssigned}; }`);
  },

_parseSelect() {
    this._consumeKw('CASE');
    const expr = this._parseExpr();

    // Use position for unique variable name
    const tempVar = `_select_${this.pos}`;
    this._emit(`{ const ${tempVar} = ${expr};`);
    this.indent++;

    let firstCase = true;

    // Parse until END SELECT
    while (!this._isEnd()) {
      this._skipNewlines();
      if (this._isEnd()) break;

      // Check for END SELECT
      if (this._checkKw('END')) {
        this._advance(); // consume END
        this._matchKw('SELECT'); // consume SELECT if present
        break;
      }

      if (this._matchKw('CASE')) {
        // End previous case block if this isn't the first
        if (!firstCase) {
          this.indent--;
          this._emit('}');
        }

        if (this._matchKw('ELSE')) {
          if (firstCase) {
            // CASE ELSE without any CASE - unusual but valid
            this._emit('if (true) {');
          } else {
            this._emit('else {');
          }
          firstCase = false;
        } else {
          const conditions = [];
          do {
            if (this._matchKw('IS')) {
              // CASE IS <op> expr
              const op = this._advance().value;
              const rhs = this._parseExpr();
              conditions.push(this._buildComparisonExpression(tempVar, op, rhs));
            } else {
              const lhs = this._parseExpr();
              if (this._matchKw('TO')) {
                // CASE lhs TO high
                const high = this._parseExpr();
                conditions.push(this._buildRangeCondition(tempVar, lhs, high));
              } else {
                conditions.push(this._buildComparisonExpression(tempVar, '=', lhs));
              }
            }
          } while (this._matchPunc(','));

          const branchCondition = this._buildConditionTest(conditions.join(' || '));
          if (firstCase) {
            this._emit(`if (${branchCondition}) {`);
            firstCase = false;
          } else {
            this._emit(`else if (${branchCondition}) {`);
          }
        }

        this.indent++;

        // Parse statements until next CASE or END
        while (
          !this._checkKw('CASE') &&
          !this._checkKw('END') &&
          !this._isEnd()
        ) {
          this._skipNewlines();
          if (this._checkKw('CASE') || this._checkKw('END') || this._isEnd())
            break;
          this._parseStatement();
        }
      } else {
        // Skip unexpected tokens to avoid infinite loop
        this._advance();
      }
    }

    // Close the last case block
    if (!firstCase) {
      this.indent--;
      this._emit('}');
    }

    this.indent--;
    this._emit('}');
  },

_parseSub() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;
    const name = id.value;
    const storageName = this._resolveStorageName(name);

    let args = [];
    if (this._matchPunc('(')) {
      if (!this._matchPunc(')')) {
        do {
          const arg = this._consume(TokenType.IDENTIFIER);
          if (arg) args.push(arg.value);
        } while (this._matchPunc(','));
        this._matchPunc(')');
      }
    }
    const argStorageNames = args.map((argName) => this._resolveStorageName(argName));

    const staticStore = this._encodeStorageName(`static_${name}`);
    this._emit(`const ${staticStore} = Object.create(null);`);
    this._emit(`async function ${storageName}(${argStorageNames.join(', ')}) {`);
    this.indent++;
    this._enterScope();
    this.currentProcedure = { name, storageName, staticStore, kind: 'SUB' };
    args.forEach((a, index) => {
      this._addVar(a);
      this._setStorageOverride(a, argStorageNames[index]);
      const metadata =
        typeof this._defaultMetadataForName === 'function'
          ? this._defaultMetadataForName(a, false)
          : null;
      if (metadata) {
        this._setVarMetadata(a, metadata);
        this._emit(
          `${argStorageNames[index]} = _coerceTypedValue(${this._metadataToRuntimeLiteral(metadata)}, ${argStorageNames[index]});`,
        );
      }
    });
  },

_parseFunction() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;
    const name = id.value;
    const storageName = this._resolveStorageName(name);

    let args = [];
    if (this._matchPunc('(')) {
      if (!this._matchPunc(')')) {
        do {
          const arg = this._consume(TokenType.IDENTIFIER);
          if (arg) args.push(arg.value);
        } while (this._matchPunc(','));
        this._matchPunc(')');
      }
    }
    const argStorageNames = args.map((argName) => this._resolveStorageName(argName));

    const staticStore = this._encodeStorageName(`static_${name}`);
    this._emit(`const ${staticStore} = Object.create(null);`);
    this._emit(`async function ${storageName}(${argStorageNames.join(', ')}) {`);
    this.indent++;
    this._enterScope();
    this.currentProcedure = { name, storageName, staticStore, kind: 'FUNCTION' };
    args.forEach((a, index) => {
      this._addVar(a);
      this._setStorageOverride(a, argStorageNames[index]);
      const metadata =
        typeof this._defaultMetadataForName === 'function'
          ? this._defaultMetadataForName(a, false)
          : null;
      if (metadata) {
        this._setVarMetadata(a, metadata);
        this._emit(
          `${argStorageNames[index]} = _coerceTypedValue(${this._metadataToRuntimeLiteral(metadata)}, ${argStorageNames[index]});`,
        );
      }
    });

    const resultVar = this._encodeStorageName(`result_${name}`);
    this._emit(
      `let ${resultVar} = ${typeof this._defaultInitializerForName === 'function'
        ? this._defaultInitializerForName(name)
        : (name.endsWith('$') ? '""' : '0')};`,
    );
    this.currentFunction = { name, resultVar };
  },

_parseGoto() {
    if (this._insideRawCapture) {
      this._rawCaptureContainsJump = true;
    }
    const label = this._consume(TokenType.IDENTIFIER);
    if (label) {
      const labelName = this._resolveLabelName(label.value);
      // Check if label exists in collected labels
      if (this.labels.has(label.value)) {
        // Use label as function call and throw to break execution flow
        this._emit(`await ${labelName}(); throw "GOTO_${label.value}";`);
      } else {
        // Label not found - emit warning comment
        this._emit(`// GOTO ${label.value} - label not found`);
        this._recordError(
          `GOTO ${label.value}: Label not defined. Make sure label exists as 'labelname:'.`,
        );
      }
    }
  },

_parseGosub() {
    if (this._insideRawCapture) {
      this._rawCaptureContainsJump = true;
    }
    const label = this._consume(TokenType.IDENTIFIER);
    if (label) {
      const labelName = this._resolveLabelName(label.value);
      // Check if label exists
      if (this.labels.has(label.value)) {
        this._emit(`await ${labelName}(); // GOSUB ${label.value}`);
      } else {
        this._emit(
          `await ${labelName}(); // GOSUB ${label.value} (label may be undefined)`,
        );
      }
    }
  },

_parseRandomize() {
    if (!this._isStmtEnd()) {
      const seed = this._parseExpr();
      this._emit(`_randomize(${seed});`);
    } else {
      this._emit('_randomize();');
    }
  },

_parseDelay() {
    // _DELAY seconds
    const seconds = this._parseExpr();
    this._emit(`await _sleep(${seconds} * 1000);`);
  },

_parseLimit() {
    // _LIMIT fps - Frame rate limiter
    const fps = this._parseExpr();
    this._emit(`await _runtime.limit?.(${fps});`);
  },

_parseFreeImage() {
    // _FREEIMAGE imageId
    const id = this._parseExpr();
    this._emit(`_runtime.freeimage?.(${id});`);
  },

_parseMouseShow() {
    // _MOUSESHOW [style]
    let style = '"default"';
    if (!this._isStmtEnd()) {
      style = this._parseExpr();
    }
    this._emit(`_runtime.mouseshow?.(${style});`);
  },

_parseSndPlay() {
    // _SNDPLAY sid
    const sid = this._parseExpr();
    this._emit(`_runtime.sndplay?.(${sid});`);
  },

_parseSndLoop() {
    // _SNDLOOP sid
    const sid = this._parseExpr();
    this._emit(`_runtime.sndloop?.(${sid});`);
  },

_parseSndClose() {
    // _SNDCLOSE sid
    const sid = this._parseExpr();
    this._emit(`_runtime.sndclose?.(${sid});`);
  },

_parseSndRaw() {
    const left = this._parseExpr();
    let right = left;
    if (this._matchPunc(',')) {
      right = this._parseExpr();
    }
    this._emit(`_sndraw(${left}, ${right});`);
  },

_parseDefFn() {
    // DEF FNname(params) = expression
    // Skip FN keyword if present
    this._matchKw('FN');
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;

    const name = `FN${id.value}`;
    const storageName = this._resolveStorageName(name);
    let args = [];

    if (this._matchPunc('(')) {
      if (!this._matchPunc(')')) {
        do {
          const arg = this._consume(TokenType.IDENTIFIER);
          if (arg) args.push(arg.value);
        } while (this._matchPunc(','));
        this._matchPunc(')');
      }
    }
    const argStorageNames = args.map((argName) => this._resolveStorageName(argName));

    this._consumeOp('=');
    const expr = this._parseExpr();

    this._emit(`const ${storageName} = async (${argStorageNames.join(', ')}) => ${expr};`);
  },

_parseDefSeg() {
    if (this._matchOp('=')) {
      const segment = this._parseExpr();
      this._emit(`_defSeg(${segment});`);
      return;
    }

    this._emit('_defSeg();');
  },

_parseCommon() {
    if (!this._matchKw('SHARED')) {
      this._recordError('COMMON without SHARED is not supported yet.');
      return this._skipToEndOfLine();
    }

    if (this.currentScopeKind !== 'global') {
      this._recordError(
        'COMMON SHARED inside SUB/FUNCTION is not supported yet.',
      );
      return this._skipToEndOfLine();
    }

    return this._parseDim({ forceShared: true });
  },

_parseStatic() {
    if (!this.currentProcedure) {
      this._recordError('STATIC is only supported inside SUB/FUNCTION.');
      return this._skipToEndOfLine();
    }

    do {
      const id = this._consume(TokenType.IDENTIFIER);
      if (!id) break;

      const name = id.value;
      const dimensions = this._parseOptionalDimensions();
      const typeSpec = this._parseDeclaredTypeSpec(name);
      const metadata = this._getTypeMetadata(typeSpec, dimensions.length > 0);
      const storageName = `${this.currentProcedure.staticStore}[${JSON.stringify(name)}]`;

      this._addVar(name);
      this._setStorageOverride(name, storageName);
      if (metadata) this._setVarMetadata(name, metadata);

      const initializer =
        dimensions.length > 0
          ? this._makeArrayExpression(typeSpec, dimensions)
          : this._getTypeInitializer(typeSpec, false);

      this._emit(
        `if (!Object.prototype.hasOwnProperty.call(${this.currentProcedure.staticStore}, "${name}")) ${storageName} = ${initializer};`,
      );
    } while (this._matchPunc(','));
  },

_parseLprint() {
    // LPRINT - same as PRINT but to printer (emit to console in web)
    const parts = [];
    let _addNewline = true;
    while (!this._isStmtEnd()) {
      if (this._matchPunc(';')) {
        if (this._isStmtEnd()) _addNewline = false;
      } else if (this._matchPunc(',')) {
        parts.push('"\\t"');
      } else {
        parts.push(this._parseExpr());
      }
    }
    const content = parts.length > 0 ? parts.join(' + ') : '""';
    this._emit(`console.log(${content}); // LPRINT`);
  },

_parseWrite() {
    // WRITE [#filenum,] expr, expr, ...
    // QB64: strings are quoted, numbers are bare, comma-separated (CSV)
    if (this._matchPunc('#')) {
      const fileNum = this._parseExpr();
      this._matchPunc(',');
      const parts = [];
      while (!this._isStmtEnd()) {
        const expr = this._parseExpr();
        // Wrap strings in quotes, numbers bare — matches QB64 WRITE # format
        parts.push(`_writeQuoted(${expr})`);
        this._matchPunc(',');
      }
      const joined = parts.length > 0 ? `[${parts.join(', ')}].join(',')` : '""';
      this._emit(`await _writeFileLine(${fileNum}, ${joined});`);
    } else {
      const parts = [];
      while (!this._isStmtEnd()) {
        const expr = this._parseExpr();
        parts.push(`_writeQuoted(${expr})`);
        this._matchPunc(',');
      }
      const line = parts.length > 0 ? `[${parts.join(', ')}].join(',')` : '""';
      this._emit(`_print(${line}, true);`);
    }
  },

_parseLsetStatement() {
    return this._parseAlignedStringAssignment('_lset');
  },

_parseRsetStatement() {
    return this._parseAlignedStringAssignment('_rset');
  },

_parseAlignedStringAssignment(helperName) {
    const target = this._parseAssignableTarget({
      contextLabel: 'string alignment statement',
    });

    this._consumeOp('=');
    const value = this._parseExpr();
    const lengthExpr =
      target.metadata?.kind === 'fixedString'
        ? target.metadata.length
        : `String(${target.targetExpr} ?? "").length`;

    this._emit(
      `${target.targetExpr} = ${this._wrapAssignmentValue(
        target.name,
        `${helperName}(${value}, ${lengthExpr})`,
        target.wrapOptions,
      )};`,
    );
  },

_parseOut() {
    const port = this._parseExpr();
    this._matchPunc(',');
    const value = this._parseExpr();
    this._emit(`_out(${port}, ${value});`);
  },

_parseWait() {
    const port = this._parseExpr();
    this._matchPunc(',');
    const andVal = this._parseExpr();
    let xorVal = '0';
    if (this._matchPunc(',')) {
      xorVal = this._parseExpr();
    }
    this._emit(`await _wait(${port}, ${andVal}, ${xorVal});`);
  },

_parsePoke() {
    // POKE address, value - memory write (stub)
    const addr = this._parseExpr();
    this._matchPunc(',');
    const value = this._parseExpr();
    this._emit(`_poke(${addr}, ${value});`);
  },

_parseRun() {
    // RUN [program] - restart or run another program
    if (!this._isStmtEnd()) {
      const prog = this._parseExpr();
      this._emit(`throw {type: "RUN", program: ${prog}};`);
    } else {
      this._emit('throw {type: "RUN", restart: true};');
    }
  },

_parseChain() {
    // CHAIN program
    const prog = this._parseExpr();
    this._recordCompatibilityWarning(
      'CHAIN',
      'It is emitted as a runtime handoff object; host code must handle it.',
    );
    this._emit(`throw {type: "CHAIN", program: ${prog}};`);
  },

_parseShell() {
    // SHELL [command]
    if (!this._isStmtEnd()) {
      const cmd = this._parseExpr();
      this._emit(`await _shell(${cmd});`);
    } else {
      this._emit('await _shell();');
    }
  },

_parseTitle() {
    // _TITLE text$
    const title = this._parseExpr();
    this._emit(
      `if (typeof document !== "undefined") document.title = ${title};`,
    );
  },

_parseFullscreen() {
    // _FULLSCREEN [mode]
    let mode = '0';
    if (!this._isStmtEnd()) {
      mode = this._parseExpr();
    }
    this._emit(`_fullscreen(${mode});`);
  },

_parseIcon() {
    // _ICON [handle]
    if (!this._isStmtEnd()) {
      const handle = this._parseExpr();
      this._emit(`_runtime.icon?.(${handle});`);
    } else {
      this._emit('_runtime.icon?.();');
    }
  },

_parseScreenIcon() {
    // _SCREENICON [handle]
    this._recordCompatibilityWarning(
      '_SCREENICON',
      'It only runs when the host runtime exposes screenicon().',
    );
    if (!this._isStmtEnd()) {
      const handle = this._parseExpr();
      this._emit(`_runtime.screenicon?.(${handle});`);
    } else {
      this._emit('_runtime.screenicon?.();');
    }
  },

_parseDest() {
    // _DEST imageHandle
    const handle = this._parseExpr();
    this._emit(`_dest(${handle});`);
  },

_parseSource() {
    // _SOURCE imageHandle
    const handle = this._parseExpr();
    this._emit(`_source(${handle});`);
  },

  _parseFont() {
    // _FONT fontHandle [, imageHandle]
    const font = this._parseExpr();
    let img = 'undefined';
    if (this._matchPunc(',')) {
      img = this._parseExpr();
    }
    this._emit(`_font(${font}, ${img});`);
  },

_parseSndStop() {
    // _SNDSTOP handle
    const handle = this._parseExpr();
    this._emit(`_runtime.sndstop?.(${handle});`);
  },

_parseSndVol() {
    // _SNDVOL handle, volume
    const handle = this._parseExpr();
    this._matchPunc(',');
    const vol = this._parseExpr();
    this._emit(`_runtime.sndvol?.(${handle}, ${vol});`);
  },

_parseSndPause() {
    // _SNDPAUSE handle
    const handle = this._parseExpr();
    this._emit(`_runtime.sndpause?.(${handle});`);
  },

_parseSndBal() {
    // _SNDBAL handle, balance
    const handle = this._parseExpr();
    this._matchPunc(',');
    const bal = this._parseExpr();
    this._emit(`_runtime.sndbal?.(${handle}, ${bal});`);
  },

_parseSndSetPos() {
    // _SNDSETPOS handle, position
    const handle = this._parseExpr();
    this._matchPunc(',');
    const pos = this._parseExpr();
    this._emit(`_runtime.sndsetpos?.(${handle}, ${pos});`);
  },

_parseMemFree() {
    // _MEMFREE memblock
    const mem = this._parseExpr();
    this._emit(`_memfree(${mem});`);
  },

_parseMemGet() {
    // _MEMGET memblock, offset, target
    const mem = this._parseExpr();
    this._matchPunc(',');
    const off = this._parseExpr();
    this._matchPunc(',');
    const target = this._parseAssignableTarget({
      contextLabel: '_MEMGET target',
    });
    const spec =
      typeof this._metadataToRuntimeLiteral === 'function' && target?.metadata
        ? this._metadataToRuntimeLiteral(target.metadata)
        : 'undefined';
    const valueExpr = `_memget(${mem}, ${off}, ${spec}, ${target.targetExpr})`;
    this._emit(
      `${target.targetExpr} = ${this._wrapAssignmentValue(
        target.name,
        valueExpr,
        target.wrapOptions,
      )};`,
    );
  },

_parseMemPut() {
    // _MEMPUT memblock, offset, source
    const mem = this._parseExpr();
    this._matchPunc(',');
    const off = this._parseExpr();
    this._matchPunc(',');
    const source = this._parseValueReference({
      contextLabel: '_MEMPUT source',
    });
    const spec =
      typeof this._metadataToRuntimeLiteral === 'function' && source?.metadata
        ? this._metadataToRuntimeLiteral(source.metadata)
        : 'undefined';
    this._emit(`_memput(${mem}, ${off}, ${source.expr}, ${spec});`);
  },

_parseMemCopy() {
    // _MEMCOPY src, srcOffset, bytes TO dst, dstOffset
    const src = this._parseExpr();
    this._matchPunc(',');
    const srcOff = this._parseExpr();
    this._matchPunc(',');
    const bytes = this._parseExpr();
    this._matchKw('TO');
    const dst = this._parseExpr();
    this._matchPunc(',');
    const dstOff = this._parseExpr();
    this._emit(`_memcopy(${src}, ${srcOff}, ${bytes}, ${dst}, ${dstOff});`);
  },

_parseMemFill() {
    // _MEMFILL mem, offset, bytes, value
    const mem = this._parseExpr();
    this._matchPunc(',');
    const off = this._parseExpr();
    this._matchPunc(',');
    const bytes = this._parseExpr();
    this._matchPunc(',');
    const val = this._parseExpr();
    this._emit(`_memfill(${mem}, ${off}, ${bytes}, ${val});`);
  },

_parseClipboard() {
    // _CLIPBOARD = text$
    this._matchOp('=');
    const text = this._parseExpr();
    this._emit(`await _runtime.clipboard?.(${text});`);
  },

_parseSetAlpha() {
    // _SETALPHA alpha [, color] [, startColor TO endColor] [, imageHandle]
    const alpha = this._parseExpr();
    let color = 'undefined',
      start = 'undefined',
      end = 'undefined',
      img = 'undefined';
    if (this._matchPunc(',')) {
      if (this._check(TokenType.NUMBER) || this._check(TokenType.IDENTIFIER)) {
        const first = this._parseExpr();
        if (this._matchKw('TO')) {
          start = first;
          end = this._parseExpr();
        } else {
          color = first;
        }
      }
      if (this._matchPunc(',')) {
        img = this._parseExpr();
      }
    }
    this._emit(`_setAlpha(${alpha}, ${color}, ${start}, ${end}, ${img});`);
  },

_parseClearColor() {
    // _CLEARCOLOR color [, imageHandle]
    const color = this._parseExpr();
    let img = 'undefined';
    if (this._matchPunc(',')) {
      img = this._parseExpr();
    }
    this._emit(`_clearColor(${color}, ${img});`);
  },

_parseMouseMove() {
    // _MOUSEMOVE x, y
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._recordCompatibilityWarning(
      '_MOUSEMOVE',
      'Browsers and VS Code webviews do not allow programmatic pointer movement.',
    );
    this._emit(
      `// _MOUSEMOVE ${x}, ${y} - cannot programmatically move mouse in browsers`,
    );
  },

_parseResume() {
    if (this._matchKw('NEXT')) {
      this._emit('// RESUME NEXT');
    } else if (
      this._check(TokenType.NUMBER) ||
      this._check(TokenType.IDENTIFIER)
    ) {
      const label = this._advance().value;
      this._emit(`// RESUME ${label}`);
    } else {
      this._emit('// RESUME');
    }
  },

_parseError() {
    const errNum = this._parseExpr();
    this._emit(`throw _qbMakeRuntimeError(${errNum}, undefined, _currentSourceLine);`);
  },

_parseClear() {
    // CLEAR - clears all variables
    this._emit('_clear();');
  },

_parseKey() {
    // KEY n, string$ - sets function key string
    // KEY ON/OFF - shows/hides function key display
    if (this._matchKw('ON') || this._matchKw('OFF')) {
      this._recordCompatibilityWarning(
        'KEY display',
        'Function-key display state is accepted but not rendered.',
      );
      this._emit(`// KEY ${this._prev().value}`);
    } else {
      const keyNum = this._parseExpr();
      this._matchPunc(',');
      const keyStr = this._parseExpr();
      this._emit(`_key(${keyNum}, ${keyStr});`);
    }
  },

_parseStrig() {
    // STRIG(n) - joystick button status
    const button = this._parseExpr();
    this._emit(`_strig(${button});`);
  },

_parseTimer() {
    // TIMER ON/OFF/STOP - timer control
    // TIMER = seconds - sets timer interval
    if (this._matchKw('ON') || this._matchKw('OFF') || this._matchKw('STOP')) {
      this._recordCompatibilityWarning(
        'TIMER event control',
        'Timer event scheduling is accepted but not wired to ON TIMER handlers.',
      );
      this._emit(`// TIMER ${this._prev().value}`);
    } else {
      const seconds = this._parseExpr();
      this._emit(`_timer = ${seconds};`);
    }
  },

_parseFre() {
    // FRE(string$) or FRE(-1) - returns bytes of memory
    if (this._isStmtEnd()) {
      this._emit('_fre(-1);');
    } else {
      const expr = this._parseExpr();
      this._emit(`_fre(${expr});`);
    }
  },

_parseEnviron() {
    // ENVIRON string$ or ENVIRON "name=value"
    if (!this._isStmtEnd()) {
      const envStr = this._parseExpr();
      this._emit(`_environ(${envStr});`);
    }
  },

_parseDate$() {
    // DATE$ = mm-dd-yyyy
    if (this._matchOp('=')) {
      const dateStr = this._parseExpr();
      this._emit(`_dateset(${dateStr});`);
    } else {
      this._emit('_date$');
    }
  },

_parseTime$() {
    // TIME$ = hh:mm:ss
    if (this._matchOp('=')) {
      const timeStr = this._parseExpr();
      this._emit(`_timeset(${timeStr});`);
    } else {
      this._emit('_time$');
    }
  },

_parseConsole() {
    // _CONSOLE ON/OFF
    let mode = 'ON';
    if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
      const value = String(this._peek()?.value || '').toUpperCase();
      if (value === 'OFF' || value === 'ON') {
        mode = value;
        this._advance();
      }
    }
    this._emit(`_console(${JSON.stringify(mode)});`);
  },

_parseConsoleTitle() {
    // _CONSOLETITLE title$
    const title = this._parseExpr();
    this._emit(`_consoletitle(${title});`);
  },

_parseScreenHide() {
    // _SCREENHIDE
    this._emit('_runtime.screenhide?.();');
  },

_parseScreenShow() {
    // _SCREENSHOW
    this._emit('_runtime.screenshow?.();');
  },

_parseShellHide() {
    // _SHELLHIDE command$
    const cmd = this._parseExpr();
    this._emit(`_shellhide(${cmd});`);
  },

_parseAcceptFileDrop() {
    // _ACCEPTFILEDROP ON/OFF
    let mode = 'ON';
    if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
      const value = String(this._peek()?.value || '').toUpperCase();
      if (value === 'OFF' || value === 'ON') {
        mode = value;
        this._advance();
      }
    }
    this._emit(`_acceptfiledrop(${JSON.stringify(mode)});`);
  },

_parseNewImage() {
    // _NEWIMAGE(width, height, mode) or _NEWIMAGE(array, mode)
    const width = this._parseExpr();
    this._matchPunc(',');
    const height = this._parseExpr();
    this._matchPunc(',');
    const mode = this._parseExpr();
    this._emit(`_newimage(${width}, ${height}, ${mode});`);
  },

_parseLoadImage() {
    // _LOADIMAGE(filename$) or _LOADIMAGE(filename$, mode)
    const filename = this._parseExpr();
    let mode = '32';
    if (this._matchPunc(',')) {
      mode = this._parseExpr();
    }
    this._emit(`_loadimage(${filename}, ${mode});`);
  },

_parseCopyImage() {
    // _COPYIMAGE(imageHandle)
    const handle = this._parseExpr();
    this._emit(`_copyimage(${handle});`);
  },

_parseSndOpen() {
    // _SNDOPEN(filename$) or _SNDOPEN(filename$, flags)
    const filename = this._parseExpr();
    let flags = '0';
    if (this._matchPunc(',')) {
      flags = this._parseExpr();
    }
    this._emit(`_sndopen(${filename}, ${flags});`);
  },

_parseSndPlayFile() {
    // _SNDPLAYFILE(filename$, volume)
    const filename = this._parseExpr();
    this._matchPunc(',');
    const volume = this._parseExpr();
    this._emit(`_sndplayfile(${filename}, ${volume});`);
  },

_parseSndGetPos() {
    // _SNDGETPOS(handle)
    const handle = this._parseExpr();
    this._emit(`_sndgetpos(${handle});`);
  },

_parseSndLen() {
    // _SNDLEN(handle)
    const handle = this._parseExpr();
    this._emit(`_sndlen(${handle});`);
  },

_parseSndPlaying() {
    // _SNDPLAYING(handle)
    const handle = this._parseExpr();
    this._emit(`_sndplaying(${handle});`);
  },

_parseMouseWheel() {
    // _MOUSEWHEEL
    this._emit('_mousewheel();');
  },

_parseMouseInput() {
    // _MOUSEINPUT
    this._emit('_mouseinput();');
  },

_parseOpenHost() {
    // _OPENHOST("TCP")
    const protocol = this._parseExpr();
    this._emit(`_openhost(${protocol});`);
  },

_parseOpenClient() {
    // _OPENCLIENT("TCP", address$)
    const protocol = this._parseExpr();
    this._matchPunc(',');
    const address = this._parseExpr();
    this._emit(`_openclient(${protocol}, ${address});`);
  },

_parseOpenConnection() {
    // _OPENCONNECTION(handle)
    const handle = this._parseExpr();
    this._emit(`_openconnection(${handle});`);
  },

_parseKeyDown() {
    // _KEYDOWN(code)
    const code = this._parseExpr();
    this._emit(`_keydown(${code});`);
  },

_parseKeyHit() {
    // _KEYHIT
    this._emit('_keyhit();');
  },

_parseResize() {
    // _RESIZE ON/OFF/STRETCH/SMOOTH
    let mode = 'ON';
    if (this._matchKw('OFF')) {
      mode = 'OFF';
    } else if (this._matchKw('ON')) {
      mode = 'ON';
    } else if (this._check(TokenType.IDENTIFIER)) {
      const value = String(this._peek()?.value || '').toUpperCase();
      if (value === 'STRETCH' || value === 'SMOOTH' || value === 'ON') {
        mode = value;
        this._advance();
      }
    }
    this._emit(`_resize(${JSON.stringify(mode)});`);
  },

_parseOnStatement() {
    if (this._insideRawCapture) {
      this._rawCaptureContainsJump = true;
    }
    // ON expr GOTO/GOSUB label1, label2, ...
    const expr = this._parseExpr();

    if (this._matchKw('GOTO')) {
      const labels = [];
      do {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label) labels.push(label.value);
      } while (this._matchPunc(','));

      this._emit(`// ON ${expr} GOTO ${labels.join(', ')} (limited support)`);
      this._recordError(
        'ON...GOTO not fully supported in JS transpiler. Use QB64 mode.',
      );
    } else if (this._matchKw('GOSUB')) {
      const labels = [];
      do {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label) labels.push(label.value);
      } while (this._matchPunc(','));

      this._emit(
        `{ const _on_idx = ${expr}; if (_on_idx >= 1 && _on_idx <= ${labels.length}) { await [${labels.join(', ')}][_on_idx - 1](); } }`,
      );
    } else if (this._matchKw('ERROR')) {
      // ON ERROR GOTO label
      if (this._matchKw('GOTO')) {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label && label.value !== '0') {
          this._emit(
            `// ON ERROR GOTO ${label.value} (error handling limited in JS)`,
          );
        } else {
          this._emit('// ON ERROR GOTO 0 - disable error handling');
        }
      } else if (this._matchKw('RESUME')) {
        this._matchKw('NEXT');
        this._emit('// ON ERROR RESUME NEXT');
      }
    }
  },


};
