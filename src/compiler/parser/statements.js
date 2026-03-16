// Auto-extracted Mixin
'use strict';
const { TokenType } = require('../constants');
module.exports = {
_parseStatement() {
    // Skip DECLARE statements (forward declarations)
    if (this._matchKw('DECLARE')) return this._skipToEndOfLine();

    // I/O Statements
    if (this._matchKw('PRINT')) return this._parsePrint();
    if (this._matchKw('INPUT')) return this._parseInput();
    if (this._matchKw('LINE')) {
      if (this._matchKw('INPUT')) return this._parseLineInput();
      return this._parseLine();
    }
    if (this._matchKw('CIRCLE')) return this._parseCircle();
    if (this._matchKw('PSET')) return this._parsePset();
    if (this._matchKw('PRESET')) return this._parsePreset();
    if (this._matchKw('PAINT')) return this._parsePaint();
    if (this._matchKw('GET')) {
      return this._peek()?.type === TokenType.PUNCTUATION && this._peek()?.value === '#'
        ? this._parseGetFile()
        : this._parseGet();
    }
    if (this._matchKw('PUT')) {
      return this._peek()?.type === TokenType.PUNCTUATION && this._peek()?.value === '#'
        ? this._parsePutFile()
        : this._parsePut();
    }

    // Control Flow
    if (this._matchKw('IF')) return this._parseIf();
    if (this._matchKw('ELSEIF')) return this._parseElseIf();
    if (this._matchKw('ELSE')) return this._parseElse();
    if (this._matchKw('END')) return this._parseEnd();
    if (this._matchKw('FOR')) return this._parseFor();
    if (this._matchKw('NEXT')) return this._parseNext();
    if (this._matchKw('DO')) return this._parseDo();
    if (this._matchKw('LOOP')) return this._parseLoop();
    if (this._matchKw('WHILE')) return this._parseWhile();
    if (this._matchKw('WEND')) return this._parseWend();
    if (this._matchKw('SELECT')) return this._parseSelect();
    if (this._matchKw('EXIT')) return this._parseExit();
    if (this._matchKw('STOP')) return this._emit('throw "__END__"; // STOP');

    // Variables & Data
    if (this._matchKw('COMMON')) return this._parseCommon();
    if (this._matchKw('DIM')) return this._parseDim();
    if (this._matchKw('REDIM')) return this._parseRedim();
    if (this._matchKw('STATIC')) return this._parseStatic();
    if (this._matchKw('CONST')) return this._parseConst();
    if (this._matchKw('TYPE')) return this._parseType();
    if (this._matchKw('DATA')) return this._parseData();
    if (this._matchKw('READ')) return this._parseRead();
    if (this._matchKw('RESTORE')) return this._parseRestore();
    if (this._matchKw('FIELD')) return this._parseField();
    if (this._matchKw('SWAP')) return this._parseSwap();
    if (this._matchKw('ERASE')) return this._parseErase();
    if (this._matchKw('LSET')) return this._parseLsetStatement();
    if (this._matchKw('RSET')) return this._parseRsetStatement();
    if (this._matchKw('LET')) return this._parseAssignment();

    // Screen & I/O
    if (this._matchKw('CLS')) return this._emit('_cls();');
    if (this._matchKw('LOCATE')) return this._parseLocate();
    if (this._matchKw('COLOR')) return this._parseColor();
    if (this._matchKw('SCREEN')) return this._parseScreen();
    if (this._matchKw('WIDTH')) return this._parseWidth();
    if (this._matchKw('BEEP')) return this._emit('await _beep();');
    if (this._matchKw('SOUND')) return this._parseSound();
    if (this._matchKw('PLAY')) return this._parsePlay();
    if (this._matchKw('SLEEP')) return this._parseSleep();
    if (this._matchKw('_DELAY')) return this._parseDelay();
    if (this._matchKw('_LIMIT')) return this._parseLimit();
    if (this._matchKw('CONTINUE') || this._matchKw('_CONTINUE'))
      return this._emit('continue;');

    // Branching
    if (this._matchKw('GOTO')) return this._parseGoto();
    if (this._matchKw('GOSUB')) return this._parseGosub();
    if (this._matchKw('RETURN')) {
      if (this._insideRawCapture) {
        this._rawCaptureContainsJump = true;
      }
      return this._emit('return;');
    }
    if (this._matchKw('ON')) return this._parseOnStatement();
    if (this._matchKw('RESUME')) return this._parseResume();

    // Procedures
    if (this._matchKw('CALL')) return this._parseCall();
    if (this._checkKw('SUB')) {
      this._advance();
      return this._parseSub();
    }
    if (this._checkKw('FUNCTION')) {
      this._advance();
      return this._parseFunction();
    }

    // Misc
    if (this._matchKw('RANDOMIZE')) return this._parseRandomize();
    if (this._matchKw('DEF')) {
      if (this._matchKw('SEG')) return this._parseDefSeg();
      return this._parseDefFn();
    }
    if (this._matchKw('OPEN')) return this._parseOpen();
    if (this._matchKw('CLOSE')) return this._parseClose();

    // ============ NEW: Additional Graphics Commands ============
    if (this._matchKw('DRAW')) return this._parseDraw();
    if (this._matchKw('VIEW')) return this._parseView();
    if (this._matchKw('WINDOW')) return this._parseWindow();
    if (this._matchKw('PALETTE')) return this._parsePalette();
    if (this._matchKw('PCOPY')) return this._parsePcopy();

    // ============ NEW: File System Commands ============
    if (this._matchKw('NAME')) return this._parseName();
    if (this._matchKw('KILL')) return this._parseKill();
    if (this._matchKw('MKDIR')) return this._parseMkdir();
    if (this._matchKw('RMDIR')) return this._parseRmdir();
    if (this._matchKw('CHDIR')) return this._parseChdir();
    if (this._matchKw('FILES')) return this._parseFiles();
    if (this._matchKw('SEEK')) return this._parseSeek();
    if (this._matchKw('LOCK')) return this._parseLock();
    if (this._matchKw('UNLOCK')) return this._parseUnlock();
    if (this._matchKw('RESET')) return this._emit('await _resetFiles();');

    // ============ NEW: DEF Type Commands ============
    if (this._matchKw('DEFINT')) return this._parseDefType('INTEGER');
    if (this._matchKw('DEFLNG')) return this._parseDefType('LONG');
    if (this._matchKw('DEFSNG')) return this._parseDefType('SINGLE');
    if (this._matchKw('DEFDBL')) return this._parseDefType('DOUBLE');
    if (this._matchKw('DEFSTR')) return this._parseDefType('STRING');

    // ============ NEW: I/O Commands ============
    if (this._matchKw('LPRINT')) return this._parseLprint();
    if (this._matchKw('WRITE')) return this._parseWrite();
    if (this._matchKw('OUT')) return this._parseOut();
    if (this._matchKw('WAIT')) return this._parseWait();

    // ============ NEW: Memory Commands ============
    if (this._matchKw('POKE')) return this._parsePoke();

    // ============ NEW: System Commands ============
    if (this._matchKw('SYSTEM')) return this._emit('throw "__END__"; // SYSTEM');
    if (this._matchKw('RUN')) return this._parseRun();
    if (this._matchKw('CHAIN')) return this._parseChain();
    if (this._matchKw('SHELL') || this._matchKw('_SHELL'))
      return this._parseShell();

    // ============ NEW: QB64 Title/Window ============
    if (this._matchKw('_TITLE')) return this._parseTitle();
    if (this._matchKw('_FULLSCREEN')) return this._parseFullscreen();
    if (this._matchKw('_SCREENMOVE')) return this._parseScreenMove();
    if (this._matchKw('_SCREENICON'))
      return this._emit('// _SCREENICON - not supported in web');
    if (this._matchKw('_SCREENHIDE'))
      return this._emit('// _SCREENHIDE - not supported in web');
    if (this._matchKw('_SCREENSHOW'))
      return this._emit('// _SCREENSHOW - not supported in web');
    if (this._matchKw('_ICON')) return this._parseIcon();
    if (this._matchKw('_DEST')) return this._parseDest();
    if (this._matchKw('_SOURCE')) return this._parseSource();
    if (this._matchKw('_AUTODISPLAY'))
      return this._emit('// _AUTODISPLAY - default in web');
    if (this._matchKw('_FONT')) return this._parseFont();

    // ============ NEW: QB64 Sound Commands ============
    if (this._matchKw('_SNDSTOP')) return this._parseSndStop();
    if (this._matchKw('_SNDVOL')) return this._parseSndVol();
    if (this._matchKw('_SNDPAUSE')) return this._parseSndPause();
    if (this._matchKw('_SNDBAL')) return this._parseSndBal();
    if (this._matchKw('_SNDSETPOS')) return this._parseSndSetPos();

    // ============ NEW: QB64 Memory ============
    if (this._matchKw('_MEMFREE')) return this._parseMemFree();
    if (this._matchKw('_MEMCOPY')) return this._parseMemCopy();
    if (this._matchKw('_MEMFILL')) return this._parseMemFill();

    // ============ NEW: QB64 Clipboard ============
    if (this._matchKw('_CLIPBOARD')) return this._parseClipboard();

    // Advanced Graphics
    if (this._matchKw('_PUTIMAGE')) return this._parsePutImage();
    if (this._matchKw('_PRINTSTRING')) return this._parsePrintString();
    if (this._matchKw('_FREEIMAGE')) return this._parseFreeImage();
    if (this._matchKw('_SETALPHA')) return this._parseSetAlpha();
    if (this._matchKw('_CLEARCOLOR')) return this._parseClearColor();

    // Advanced Mouse
    if (this._matchKw('_MOUSEHIDE'))
      return this._emit('_runtime.mousehide?.();');
    if (this._matchKw('_MOUSESHOW')) return this._parseMouseShow();
    if (this._matchKw('_MOUSEMOVE')) return this._parseMouseMove();

    // Advanced Keyboard
    if (this._matchKw('_KEYCLEAR')) return this._emit('_runtime.keyclear?.();');

    // Advanced Sound
    if (this._matchKw('_SNDPLAY')) return this._parseSndPlay();
    if (this._matchKw('_SNDLOOP')) return this._parseSndLoop();
    if (this._matchKw('_SNDCLOSE')) return this._parseSndClose();

    // Performance
    if (this._matchKw('_DISPLAY')) return this._emit('_runtime.display?.();');

    // Error Handling
    if (this._matchKw('ERROR')) return this._parseError();

    // ============ NEW: Additional Commands ============
    if (this._matchKw('CLEAR')) return this._parseClear();
    if (this._matchKw('KEY')) return this._parseKey();
    if (this._matchKw('STRIG')) return this._parseStrig();
    if (this._matchKw('TIMER')) return this._parseTimer();
    if (this._matchKw('FRE')) return this._parseFre();
    if (this._matchKw('ENVIRON')) return this._parseEnviron();
    if (this._matchKw('DATE$')) return this._parseDate$();
    if (this._matchKw('TIME$')) return this._parseTime$();
    if (this._matchKw('ON')) return this._parseOnStatement();
    
    // ============ NEW: QB64 Console Commands ============
    if (this._matchKw('_CONSOLE')) return this._parseConsole();
    if (this._matchKw('_CONSOLETITLE')) return this._parseConsoleTitle();
    if (this._matchKw('_SCREENHIDE')) return this._parseScreenHide();
    if (this._matchKw('_SCREENSHOW')) return this._parseScreenShow();
    if (this._matchKw('_SHELLHIDE')) return this._parseShellHide();
    if (this._matchKw('_ACCEPTFILEDROP')) return this._parseAcceptFileDrop();
    
    // ============ NEW: QB64 Image Commands ============
    if (this._matchKw('_NEWIMAGE')) return this._parseNewImage();
    if (this._matchKw('_LOADIMAGE')) return this._parseLoadImage();
    if (this._matchKw('_COPYIMAGE')) return this._parseCopyImage();
    
    // ============ NEW: QB64 Sound Commands ============
    if (this._matchKw('_SNDOPEN')) return this._parseSndOpen();
    if (this._matchKw('_SNDPLAYFILE')) return this._parseSndPlayFile();
    if (this._matchKw('_SNDSETPOS')) return this._parseSndSetPos();
    if (this._matchKw('_SNDGETPOS')) return this._parseSndGetPos();
    if (this._matchKw('_SNDLEN')) return this._parseSndLen();
    if (this._matchKw('_SNDPLAYING')) return this._parseSndPlaying();
    
    // ============ NEW: QB64 Mouse Commands ============
    if (this._matchKw('_MOUSEMOVE')) return this._parseMouseMove();
    if (this._matchKw('_MOUSEWHEEL')) return this._parseMouseWheel();
    if (this._matchKw('_MOUSEINPUT')) return this._parseMouseInput();
    
    // ============ NEW: QB64 Network Commands ============
    if (this._matchKw('_OPENHOST')) return this._parseOpenHost();
    if (this._matchKw('_OPENCLIENT')) return this._parseOpenClient();
    if (this._matchKw('_OPENCONNECTION')) return this._parseOpenConnection();
    if (this._matchKw('_CLOSE')) return this._parseClose();
    
    // ============ NEW: QB64 Keyboard Commands ============
    if (this._matchKw('_KEYDOWN')) return this._parseKeyDown();
    if (this._matchKw('_KEYHIT')) return this._parseKeyHit();
    
    // ============ NEW: QB64 Resize Commands ============
    if (this._matchKw('_RESIZE')) return this._parseResize();
    
    // Check for label definition (identifier followed by colon)
    if (this._check(TokenType.IDENTIFIER)) {
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
      // Generate an async function for this label that can be called by GOSUB
      // and set a state variable for GOTO state machine
      this._emit(`// Label: ${label.value}`);
      this._emit(`async function ${label.value}() {`);
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

    if (!this._isStmtEnd()) {
      this._emit(`if (${cond}) {`);
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
      this._emit(`if (${cond}) {`);
      this.indent++;
    }
  },

_parseElseIf() {
    this._decIndent();
    const cond = this._parseExpr();
    this._consumeKw('THEN');
    this._emit(`} else if (${cond}) {`);
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
      `for (var ${name} = ${start}; (${step} >= 0) ? ${name} <= ${end} : ${name} >= ${end}; ${name} += ${step}) {`,
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
      this._emit(`while (${cond}) {`);
    } else if (this._matchKw('UNTIL')) {
      const cond = this._parseExpr();
      this._emit(`while (!(${cond})) {`);
    } else {
      this._emit('do {');
    }
    this.indent++;
  },

_parseLoop() {
    this._decIndent();

    if (this._matchKw('WHILE')) {
      const cond = this._parseExpr();
      this._emit(`} while (${cond});`);
    } else if (this._matchKw('UNTIL')) {
      const cond = this._parseExpr();
      this._emit(`} while (!(${cond}));`);
    } else {
      this._emit('} while (true);');
    }
  },

_parseWhile() {
    const cond = this._parseExpr();
    this._emit(`while (${cond}) {`);
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
            conditions.push(`${tempVar} === ${this._parseExpr()}`);
          } while (this._matchPunc(','));

          if (firstCase) {
            this._emit(`if (${conditions.join(' || ')}) {`);
            firstCase = false;
          } else {
            this._emit(`else if (${conditions.join(' || ')}) {`);
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

    const staticStore = `_static_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`;
    this._emit(`const ${staticStore} = Object.create(null);`);
    this._emit(`async function ${name}(${args.join(', ')}) {`);
    this.indent++;
    this._enterScope();
    this.currentProcedure = { name, staticStore, kind: 'SUB' };
    args.forEach((a) => this._addVar(a));
  },

_parseFunction() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;
    const name = id.value;

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

    const staticStore = `_static_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`;
    this._emit(`const ${staticStore} = Object.create(null);`);
    this._emit(`async function ${name}(${args.join(', ')}) {`);
    this.indent++;
    this._enterScope();
    this.currentProcedure = { name, staticStore, kind: 'FUNCTION' };
    args.forEach((a) => this._addVar(a));

    const resultVar = `_result_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`;
    this._emit(`let ${resultVar} = ${name.endsWith('$') ? '""' : '0'};`);
    this.currentFunction = { name, resultVar };
  },

_parseGoto() {
    if (this._insideRawCapture) {
      this._rawCaptureContainsJump = true;
    }
    const label = this._consume(TokenType.IDENTIFIER);
    if (label) {
      // Check if label exists in collected labels
      if (this.labels.has(label.value)) {
        // Use label as function call and throw to break execution flow
        this._emit(`await ${label.value}(); throw "GOTO_${label.value}";`);
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
      // Check if label exists
      if (this.labels.has(label.value)) {
        this._emit(`await ${label.value}(); // GOSUB ${label.value}`);
      } else {
        this._emit(
          `await ${label.value}(); // GOSUB ${label.value} (label may be undefined)`,
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

_parseDefFn() {
    // DEF FNname(params) = expression
    // Skip FN keyword if present
    this._matchKw('FN');
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;

    const name = `FN${id.value}`;
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

    this._consumeOp('=');
    const expr = this._parseExpr();

    this._emit(`const ${name} = async (${args.join(', ')}) => ${expr};`);
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
      const storageName = `${this.currentProcedure.staticStore}.${name}`;

      this._addVar(name);
      this._setStorageOverride(name, storageName);
      if (metadata) this._setVarMetadata(name, metadata);

      const initializer =
        dimensions.length > 0
          ? `_makeArray(${this._getTypeInitializer(typeSpec, true)}, ${dimensions.join(', ')})`
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
    if (this._matchPunc('#')) {
      const fileNum = this._parseExpr();
      this._matchPunc(',');
      const parts = [];
      while (!this._isStmtEnd()) {
        parts.push(this._parseExpr());
        this._matchPunc(',');
      }
      this._emit(`await _writeFile(${fileNum}, ${parts.join(', ')});`);
    } else {
      const parts = [];
      while (!this._isStmtEnd()) {
        parts.push(this._parseExpr());
        this._matchPunc(',');
      }
      this._emit(`_print([${parts.join(', ')}].join(','), true);`);
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
      this._emit(`// _ICON ${handle} - not supported in web`);
    } else {
      this._emit('// _ICON - not supported in web');
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
    this._emit(`throw new Error("Error " + ${errNum});`);
  },

_parseClear() {
    // CLEAR - clears all variables
    this._emit('_clear();');
  },

_parseKey() {
    // KEY n, string$ - sets function key string
    // KEY ON/OFF - shows/hides function key display
    if (this._matchKw('ON') || this._matchKw('OFF')) {
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
    if (this._matchKw('OFF')) mode = 'OFF';
    this._emit(`_console(${mode});`);
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
    if (this._matchKw('OFF')) mode = 'OFF';
    this._emit(`_acceptfiledrop(${mode});`);
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
    if (this._matchKw('OFF') || this._matchKw('STRETCH') || this._matchKw('SMOOTH')) {
      mode = this._prev().value;
    }
    this._emit(`_resize(${mode});`);
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
