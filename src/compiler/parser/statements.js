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
    if (this._matchKw('PAINT')) return this._parsePaint();
    if (this._matchKw('PSET')) return this._parsePset();
    if (this._matchKw('PRESET')) return this._parsePreset();
    if (this._matchKw('GET')) return this._parseGet();
    if (this._matchKw('PUT')) return this._parsePut();

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
    if (this._matchKw('DIM')) return this._parseDim();
    if (this._matchKw('REDIM')) return this._parseRedim();
    if (this._matchKw('CONST')) return this._parseConst();
    if (this._matchKw('TYPE')) return this._parseType();
    if (this._matchKw('DATA')) return this._parseData();
    if (this._matchKw('READ')) return this._parseRead();
    if (this._matchKw('RESTORE')) return this._parseRestore();
    if (this._matchKw('SWAP')) return this._parseSwap();
    if (this._matchKw('ERASE')) return this._parseErase();
    if (this._matchKw('LSET')) return this._parseLset(false);
    if (this._matchKw('RSET')) return this._parseLset(true);
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
    if (this._matchKw('RETURN')) return this._emit('return;');
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
    if (this._matchKw('DEF')) return this._parseDefFn();
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
    const label = this._consume(TokenType.IDENTIFIER);
    this._matchPunc(':');
    if (label) {
      // Generate an async function for this label that can be called by GOSUB
      // and set a state variable for GOTO state machine
      this._emit(`// Label: ${label.value}`);
      this._emit(`async function ${label.value}() {`);
      this.indent++;

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
      this._exitScope();
      this._decIndent();
      this._emit('} // END SUB');
    } else if (this._matchKw('FUNCTION')) {
      if (this.currentFunction) {
        this._emit(`return ${this.currentFunction};`);
        this.currentFunction = null;
      }
      this._exitScope();
      this._decIndent();
      this._emit('} // END FUNCTION');
    } else {
      this._emit('throw "__END__"; // END');
    }
  },

_parseFor() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) throw new Error('Expected variable after FOR');

    const name = id.value;
    let loopTarget = name;
    if (!this._hasVar(name)) {
      this._addVar(name);
      loopTarget = `var ${name}`;
    }

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
      `for (${loopTarget} = ${start}; (${step} >= 0) ? ${name} <= ${end} : ${name} >= ${end}; ${name} += ${step}) {`,
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
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;

    const name = id.value;

    // Array element assignment or Member Access
    if (this._matchPunc('(')) {
      const idx = this._parseExpr();
      this._matchPunc(')');

      // Check for additional dots (e.g., arr(1).x = 10)
      let suffix = '';
      while (this._matchPunc('.')) {
        const member = this._consume(TokenType.IDENTIFIER);
        if (member) suffix += `.${member.value}`;
      }

      this._consumeOp('=');
      const val = this._parseExpr();

      // Ensure array is declared
      if (!this._hasVar(name)) {
        this._addVar(name);
        this._emitVar(name, '[]');
      }

      this._emit(`${name}[${idx}]${suffix} = ${val};`);
      return;
    }

    // Struct/Member assignment (e.g. p1.Name = "Hero")
    if (this._matchPunc('.')) {
      const member = this._consume(TokenType.IDENTIFIER);
      if (member) {
        this._consumeOp('=');
        const val = this._parseExpr();

        // Ensure struct is declared
        if (!this._hasVar(name)) {
          this._addVar(name);
          this._emitVar(name, '{}');
        }

        this._emit(`${name}.${member.value} = ${val};`);
      }
      return;
    }

    // Simple variable assignment
    if (this._matchOp('=')) {
      const val = this._parseExpr();
      if (!this._hasVar(name)) {
        this._addVar(name);
        this._emitVar(name, val);
      } else {
        this._emit(`${name} = ${val};`);
      }
    }
  },

_parseSwap() {
    const id1 = this._consume(TokenType.IDENTIFIER);
    if (!id1) throw new Error('Expected variable for SWAP');
    this._matchPunc(',');
    const id2 = this._consume(TokenType.IDENTIFIER);
    if (!id2) throw new Error('Expected second variable for SWAP');

    const v1 = id1.value;
    const v2 = id2.value;
    this._emit(`[${v1}, ${v2}] = [${v2}, ${v1}];`);
  },

_parseLset(isRightJustify) {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) throw new Error(`Expected variable after ${isRightJustify ? 'RSET' : 'LSET'}`);

    const name = id.value;
    if (!this._hasVar(name)) {
      this._addVar(name);
      this._emitVar(name, '""');
    }

    this._consumeOp('=');
    const value = this._parseExpr();
    this._emit(
      `${name} = ${isRightJustify ? '_rset' : '_lset'}(${name}, ${value});`,
    );
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

    this._emit(`async function ${name}(${args.join(', ')}) {`);
    this.indent++;
    this._enterScope();
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

    this._emit(`async function ${name}(${args.join(', ')}) {`);
    this.indent++;
    this._enterScope();
    args.forEach((a) => this._addVar(a));

    this._addVar(name);
    this._emitVar(name, name.endsWith('$') ? '""' : '0');
    this.currentFunction = name;
  },

_parseGoto() {
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
    const label = this._consume(TokenType.IDENTIFIER);
    if (label) {
      // Check if label exists
      if (this.labels.has(label.value)) {
        this._emit(`await ${label.value}(); // GOSUB ${label.value}`);
      } else {
        this._emit(
          `// GOSUB ${label.value} - label not found`,
        );
        this._recordError(
          `GOSUB ${label.value}: Label not defined. Make sure label exists as 'labelname:'.`,
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

_parseOut() {
    // OUT port, value - hardware I/O (stub)
    const port = this._parseExpr();
    this._matchPunc(',');
    const value = this._parseExpr();
    this._emit(`/* OUT ${port}, ${value} - hardware I/O not supported */`);
  },

_parseWait() {
    // WAIT port, and_val [, xor_val] - hardware wait (stub)
    const port = this._parseExpr();
    this._matchPunc(',');
    const andVal = this._parseExpr();
    let xorVal = '0';
    if (this._matchPunc(',')) {
      xorVal = this._parseExpr();
    }
    this._emit(
      `/* WAIT ${port}, ${andVal}, ${xorVal} - hardware wait not supported */`,
    );
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
    this._emit(`document.title = ${title};`);
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
    this._emit(`await navigator.clipboard.writeText(${text});`);
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

_parseOnStatement() {
    // ON expr GOTO/GOSUB label1, label2, ...
    const expr = this._parseExpr();

    if (this._matchKw('GOTO')) {
      const labels = [];
      do {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label) {
          labels.push(label.value);
          if (!this.labels.has(label.value)) {
            this._recordError(
              `ON...GOTO ${label.value}: Label not defined. Make sure label exists as 'labelname:'.`,
            );
          }
        }
      } while (this._matchPunc(','));

      this._emit(
        `{ const _on_idx = ${expr}; const _on_targets = [${labels
          .map(
            (label) =>
              `{ fn: (typeof ${label} === "function" ? ${label} : null), name: "${label}" }`,
          )
          .join(', ')}]; if (_on_idx >= 1 && _on_idx <= ${labels.length}) { const _on_target = _on_targets[_on_idx - 1]; if (_on_target.fn) { await _on_target.fn(); throw "GOTO_" + _on_target.name; } } }`,
      );
    } else if (this._matchKw('GOSUB')) {
      const labels = [];
      do {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label) {
          labels.push(label.value);
          if (!this.labels.has(label.value)) {
            this._recordError(
              `ON...GOSUB ${label.value}: Label not defined. Make sure label exists as 'labelname:'.`,
            );
          }
        }
      } while (this._matchPunc(','));

      this._emit(
        `{ const _on_idx = ${expr}; const _on_targets = [${labels
          .map(
            (label) => `(typeof ${label} === "function" ? ${label} : null)`,
          )
          .join(', ')}]; if (_on_idx >= 1 && _on_idx <= ${labels.length}) { const _on_target = _on_targets[_on_idx - 1]; if (_on_target) { await _on_target(); } } }`,
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
