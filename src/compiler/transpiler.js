/**
 * QBasic Nexus - High-Performance Transpiler & Compiler v1.1.0
 * =============================================================
 * The core engine of QBasic Nexus, transforming classic QBasic constructs into 
 * modern, optimized JavaScript. Supports both Node.js (CLI) and Web environments.
 * 
 * 🌟 Core Features v1.1.0:
 * - Full Language Fidelity: Supports legacy QBasic and modern QB64 syntax.
 * - Smart Parsers: Handles complex Control Flow, Graphics (DRAW/PAINT), and Data Structures.
 * - Robust Error Recovery: Continued parsing despite syntax errors with precise reporting.
 * - Integrated VFS: Native-like file operations (OPEN, INPUT#, PRINT#) atop a Virtual File System.
 * - Optimized Codegen: Produces lean, efficient JS with reduced memory footprint.
 * 
 * @author Thirawat27
 * @version 1.1.0
 */

'use strict';

const { TokenType, BUILTIN_FUNCS } = require('./constants');
const Lexer = require('./lexer');

/**
 * Parses tokens and generates JavaScript code.
 */
class Parser {
    /**
     * @param {Array} tokens - List of tokens from Lexer.
     * @param {string} target - 'node' or 'web'.
     */
    constructor(tokens, target = 'node') {
        this.tokens = tokens;
        this.target = target;
        
        this.pos = 0;
        this.indent = 0;
        
        /** @type {string[]} */
        this.output = [];
        
        /** @type {Array<{line: number, message: string, column: number}>} */
        this.errors = [];
        
        /** @type {Set<string>} Global SHARED variables */
        this.scopes = [new Set()]; 
        this.sharedVars = new Set();
        
        /** @type {string[]} DATA statement values */
        this.dataValues = [];
        
        /** @type {string|null} Name of function currently being parsed */
        this.currentFunction = null;
        
        /** @type {Set<string>} Collected labels for GOTO/GOSUB support */
        this.labels = new Set();
        
        /** @type {Map<string, string[]>} Label code blocks for GOTO state machine */
        this.labelBlocks = new Map();
    }

    /**
     * @returns {Set<string>} Current scope's variable set.
     */
    get currentVars() {
        return this.scopes[this.scopes.length - 1];
    }
    
    _addVar(name) {
        this.currentVars.add(name);
    }
    
    _hasVar(name) {
        // Check current scope first
        if (this.currentVars.has(name)) return true;

        // If in global scope (depth 1), no upper scopes to check
        if (this.scopes.length === 1) return false;

        // If in SUB/FUNCTION, only access global variables if they are SHARED
        return this.sharedVars.has(name);
    }
    
    _enterScope() {
        this.scopes.push(new Set());
    }
    
    _exitScope() {
        this.scopes.pop();
    }

    /**
     * Main parsing method.
     * @returns {string} The generated JavaScript code.
     */
    parse() {
        // Pre-pass: Collect all DATA values first
        // This is necessary because DATA statements can appear anywhere in QBasic
        // but must be available for READ statements from the start
        this._collectDataValues();
        
        this._emitHeader();

        while (!this._isEnd()) {
            this._skipNewlines();
            if (this._isEnd()) break;

            try {
                this._parseStatement();
            } catch (e) {
                this._recordError(e.message);
                this._sync();
            }
        }

        this._emitFooter();
        return this.output.join('\n');
    }

    /**
     * Pre-pass to collect all DATA values before main parsing.
     * @private
     */
    _collectDataValues() {
        const savedPos = this.pos;
        
        while (!this._isEnd()) {
            // Collect labels for GOTO/GOSUB support
            if (this._check(TokenType.IDENTIFIER)) {
                const next = this.tokens[this.pos + 1];
                if (next?.type === TokenType.PUNCTUATION && next?.value === ':') {
                    this.labels.add(this._peek().value);
                }
            }
            
            if (this._matchKw('DATA')) {
                do {
                    let val = '0';
                    if (this._check(TokenType.STRING)) val = `"${this._advance().value}"`;
                    else if (this._check(TokenType.NUMBER)) val = this._advance().value;
                    else if (this._check(TokenType.IDENTIFIER)) val = `"${this._advance().value}"`;
                    else if (!this._isStmtEnd()) this._advance();
                    else break;
                    this.dataValues.push(val);
                } while (this._matchPunc(','));
            } else {
                this._advance();
            }
        }
        
        // Reset position for main pass
        this.pos = savedPos;
    }

    // --- Error Handling ---

    _recordError(msg) {
        const tok = this._peek();
        this.errors.push({
            line: (tok?.line || 1) - 1,
            message: msg,
            column: tok?.col || 0
        });
    }

    _sync() {
        this._advance();
        while (!this._isEnd()) {
            if (this._prev()?.type === TokenType.NEWLINE) return;
            if (this._check(TokenType.KEYWORD)) return;
            this._advance();
        }
    }

    // --- Statements ---

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
        if (this._matchKw('STOP')) return this._emit('throw "STOP";');
        
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
        if (this._matchKw('CONTINUE') || this._matchKw('_CONTINUE')) return this._emit('continue;');
        
        // Branching
        if (this._matchKw('GOTO')) return this._parseGoto();
        if (this._matchKw('GOSUB')) return this._parseGosub();
        if (this._matchKw('RETURN')) return this._emit('return;');
        if (this._matchKw('ON')) return this._parseOnStatement();
        if (this._matchKw('RESUME')) return this._parseResume();
        
        // Procedures
        if (this._matchKw('CALL')) return this._parseCall();
        if (this._checkKw('SUB')) { this._advance(); return this._parseSub(); }
        if (this._checkKw('FUNCTION')) { this._advance(); return this._parseFunction(); }
        
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
        if (this._matchKw('SYSTEM')) return this._emit('throw "SYSTEM";');
        if (this._matchKw('RUN')) return this._parseRun();
        if (this._matchKw('CHAIN')) return this._parseChain();
        if (this._matchKw('SHELL') || this._matchKw('_SHELL')) return this._parseShell();
        
        // ============ NEW: QB64 Title/Window ============
        if (this._matchKw('_TITLE')) return this._parseTitle();
        if (this._matchKw('_FULLSCREEN')) return this._parseFullscreen();
        if (this._matchKw('_SCREENMOVE')) return this._parseScreenMove();
        if (this._matchKw('_SCREENICON')) return this._emit('// _SCREENICON - not supported in web');
        if (this._matchKw('_SCREENHIDE')) return this._emit('// _SCREENHIDE - not supported in web');
        if (this._matchKw('_SCREENSHOW')) return this._emit('// _SCREENSHOW - not supported in web');
        if (this._matchKw('_ICON')) return this._parseIcon();
        if (this._matchKw('_DEST')) return this._parseDest();
        if (this._matchKw('_SOURCE')) return this._parseSource();
        if (this._matchKw('_AUTODISPLAY')) return this._emit('// _AUTODISPLAY - default in web');
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
        if (this._matchKw('_MOUSEHIDE')) return this._emit('_runtime.mousehide?.();');
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
    }

    _skipToEndOfLine() {
        while (!this._isStmtEnd() && !this._isEnd()) {
            this._advance();
        }
    }

    _parseLabel() {
        const label = this._consume(TokenType.IDENTIFIER);
        this._matchPunc(':');
        if (label) {
            // Generate an async function for this label that can be called by GOSUB
            // and set a state variable for GOTO state machine
            this._emit(`// Label: ${label.value}`);
            this._emit(`async function ${label.value}() {`);
            this.indent++;
            this._enterScope();
            
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
    }

    _parsePrint() {
        // Handle PRINT #1, ...
        if (this._matchPunc('#')) {
            const filenum = this._parseExpr();
            this._matchPunc(',');
            let line = '';
            
            // Collect all args into a string
            while (!this._isStmtEnd()) {
                const expr = this._parseExpr();
                line += `\${${expr}}`;
                if (!this._isStmtEnd() && !this._matchPunc(',')) { 
                    if (this._matchPunc(';')) {
                        // Suppress newline? handled by emit?
                        // For simplicity in simple VFS, we treat ; as just concat
                    } else {
                         // break; 
                    }
                }
            }
            // Append newline by default unless silenced? 
            // Simplified: always append newline for now
            this._emit(`await _printFileFunc(${filenum}, \`${line}\\n\`);`);
            return;
        }

        const parts = [];
        let addNewline = true;

        while (!this._isStmtEnd()) {
            if (this._matchPunc(';')) {
                if (this._isStmtEnd()) {
                    addNewline = false;
                }
            } else if (this._matchPunc(',')) {
                parts.push('"\\t"');
            } else {
                parts.push(this._parseExpr());
            }
        }

        const content = parts.length > 0 ? parts.join(' + ') : '""';
        // Use abstract _print function for runtime abstraction
        this._emit(`_print(${addNewline ? content : 'String(' + content + ')'}, ${addNewline});`);
    }

    _parseInput() {
        // INPUT #1, var
        if (this._matchPunc('#')) {
            const filenum = this._parseExpr();
            this._matchPunc(',');
            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) throw new Error('Expected variable after INPUT #');
            
            // Generate code to read line and assign
            this._emit(`${id.value} = await _inputFileFunc(${filenum});`);
            return;
        }

        let prompt = '""';

        if (this._check(TokenType.STRING)) {
            prompt = this._consume(TokenType.STRING).value;
            this._matchPunc(',');
            this._matchPunc(';');
        }

        const escaped = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        do {
            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;
            
            const name = id.value;
            if (!this._hasVar(name)) {
                this._addVar(name);
                this._emit(`let ${name} = ${name.endsWith('$') ? '""' : '0'};`);
            }
            
            this._emit(`${name} = await _input("${escaped}");`);
            
            if (!name.endsWith('$')) {
                this._emit(`if (isNaN(Number(${name}))) ${name} = 0; else ${name} = Number(${name});`);
            }
        } while (this._matchPunc(','));
    }

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
    }

    _parseElseIf() {
        this._decIndent();
        const cond = this._parseExpr();
        this._consumeKw('THEN');
        this._emit(`} else if (${cond}) {`);
        this.indent++;
    }

    _parseElse() {
        this._decIndent();
        this._emit('} else {');
        this.indent++;
    }

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
            this._emit('return; // END');
        }
    }

    _parseFor() {
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) throw new Error('Expected variable after FOR');

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
        this._emit(`for (let ${name} = ${start}; (${step} >= 0) ? ${name} <= ${end} : ${name} >= ${end}; ${name} += ${step}) {`);
        this.indent++;
    }

    _parseNext() {
        if (this._check(TokenType.IDENTIFIER)) this._advance();
        this._decIndent();
        this._emit('}');
    }

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
    }

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
    }

    _parseWhile() {
        const cond = this._parseExpr();
        this._emit(`while (${cond}) {`);
        this.indent++;
    }

    _parseWend() {
        this._decIndent();
        this._emit('}');
    }

    _parseDim() {
        let isShared = false;
        do {
            if (this._matchKw('SHARED')) {
                isShared = true;
                continue;
            }

            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;

            const name = id.value;
            this._addVar(name);
            if (isShared) this.sharedVars.add(name);

            const init = name.endsWith('$') ? '""' : '0';

            if (this._matchPunc('(')) {
                const dims = [];
                do {
                    dims.push(this._parseExpr());
                } while (this._matchPunc(','));
                this._matchPunc(')');
                
                // Create multi-dimensional array
                const dimStr = dims.join(', ');
                this._emit(`let ${name} = _makeArray(${init}, ${dimStr});`);
            } else {
                if (this._matchKw('AS')) {
                    if (this._check(TokenType.IDENTIFIER)) {
                        const typeName = this._consume(TokenType.IDENTIFIER).value;
                        if (typeName !== 'INTEGER' && typeName !== 'STRING' && typeName !== 'DOUBLE') {
                            // User defined type
                            this._emit(`let ${name} = ${typeName}();`);
                            continue;
                        }
                    } else {
                        while (!this._isStmtEnd() && !this._matchPunc(',')) this._advance();
                    }
                }
                this._emit(`let ${name} = ${init};`);
            }
        } while (this._matchPunc(','));
    }

    _parseConst() {
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) return;
        this._consumeOp('=');
        const val = this._parseExpr();
        this._emit(`const ${id.value} = ${val};`);
    }

    _parseSleep() {
        let sec = '1';
        if (!this._isStmtEnd()) sec = this._parseExpr();
        this._emit(`await _sleep(${sec} * 1000);`);
    }

    _parseExit() {
        if (this._matchKw('FOR') || this._matchKw('DO') || this._matchKw('WHILE')) {
            this._emit('break;');
        } else if (this._matchKw('SUB') || this._matchKw('FUNCTION')) {
            this._emit('return;');
        }
    }

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
            this._emit(`${name}[${idx}]${suffix} = ${val};`);
            return;
        }

        // Struct/Member assignment (e.g. p1.Name = "Hero")
        if (this._matchPunc('.')) {
             const member = this._consume(TokenType.IDENTIFIER);
             if (member) {
                 this._consumeOp('=');
                 const val = this._parseExpr();
                 this._emit(`${name}.${member.value} = ${val};`);
             }
             return;
        }


        // Simple variable assignment
        if (this._matchOp('=')) {
            const val = this._parseExpr();
            if (!this._hasVar(name)) {
                this._addVar(name);
                this._emit(`let ${name} = ${val};`);
            } else {
                this._emit(`${name} = ${val};`);
            }
        }
    }

    _parseSwap() {
        const id1 = this._consume(TokenType.IDENTIFIER);
        if (!id1) throw new Error('Expected variable for SWAP');
        this._matchPunc(',');
        const id2 = this._consume(TokenType.IDENTIFIER);
        if (!id2) throw new Error('Expected second variable for SWAP');

        const v1 = id1.value;
        const v2 = id2.value;
        this._emit(`[${v1}, ${v2}] = [${v2}, ${v1}];`);
    }

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
                while (!this._checkKw('CASE') && !this._checkKw('END') && !this._isEnd()) {
                    this._skipNewlines();
                    if (this._checkKw('CASE') || this._checkKw('END') || this._isEnd()) break;
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
    }
    
    _parseData() {
        // DATA values are collected in _collectDataValues pre-pass
        // Here we just skip the tokens to avoid duplicates
        do {
            if (this._check(TokenType.STRING)) this._advance();
            else if (this._check(TokenType.NUMBER)) this._advance();
            else if (this._check(TokenType.IDENTIFIER)) this._advance();
            else if (!this._isStmtEnd()) this._advance();
            else break;
        } while (this._matchPunc(','));
    }
    
    _parseRead() {
        do {
            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;
            const name = id.value;
            
            // Debug parsing
            // console.log('Parsed ID:', name, 'Next:', this._peek());

            if (this._check(TokenType.PUNCTUATION) && this._peek().value === '(') {
                // Array element read
                this._matchPunc('(');
                const indices = [];
                do {
                    indices.push(this._parseExpr());
                } while (this._matchPunc(','));
                this._matchPunc(')');
                
                this._emit(`${name}[${indices.join('][')}] = _read();`);
                if (!name.endsWith('$')) {
                    this._emit(`if (!isNaN(${name}[${indices.join('][')}])) ${name}[${indices.join('][')}] = Number(${name}[${indices.join('][')}]);`);
                }
            } else {
                // Simple variable read
                if (!this._hasVar(name)) {
                    this._addVar(name);
                    this._emit(`let ${name} = ${name.endsWith('$') ? '""' : '0'};`);
                }
                
                this._emit(`${name} = _read();`);
                if (!name.endsWith('$')) {
                    this._emit(`if (!isNaN(${name})) ${name} = Number(${name});`);
                }
            }
        } while (this._matchPunc(','));
    }
    
    _parseRestore() {
        if (this._check(TokenType.IDENTIFIER)) {
            this._advance(); // Consume label (ignored for now)
        }
        this._emit('_restore();');
    }

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
        args.forEach(a => this._addVar(a));
    }
    
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
        args.forEach(a => this._addVar(a));
        
        this._addVar(name);
        this._emit(`let ${name} = ${name.endsWith('$') ? '""' : '0'};`);
        this.currentFunction = name;
    }
    
    _parseCall() {
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) return;
        
        let args = [];
        if (this._matchPunc('(')) {
             args = this._parseArgs().split(', '); 
             this._matchPunc(')');
        } else {
             while (!this._isStmtEnd()) {
                 args.push(this._parseExpr());
                 this._matchPunc(','); 
             }
        }
        
        this._emit(`await ${id.value}(${args.join(', ')});`);
    }

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
                this._recordError(`GOTO ${label.value}: Label not defined. Make sure label exists as 'labelname:'.`);
            }
        }
    }

    _parseGosub() {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label) {
            // Check if label exists
            if (this.labels.has(label.value)) {
                this._emit(`await ${label.value}(); // GOSUB ${label.value}`);
            } else {
                this._emit(`await ${label.value}(); // GOSUB ${label.value} (label may be undefined)`);
            }
        }
    }

    _parseLocate() {
        const row = this._parseExpr();
        let col = '1';
        if (this._matchPunc(',')) {
            col = this._parseExpr();
        }
        this._emit(`_locate(${row}, ${col});`);
    }

    _parseColor() {
        const fg = this._parseExpr();
        let bg = '-1';  // -1 means no change
        if (this._matchPunc(',')) {
            if (!this._isStmtEnd()) {
                bg = this._parseExpr();
            }
        }
        this._emit(`_color(${fg}, ${bg});`);
    }

    _parseRandomize() {
        if (!this._isStmtEnd()) {
            const seed = this._parseExpr();
            this._emit(`_randomize(${seed});`);
        } else {
            this._emit('_randomize();');
        }
    }

    _parseRedim() {
        const preserve = this._matchKw('PRESERVE');
        let isShared = false;
        do {

            if (this._matchKw('SHARED')) {
                isShared = true;
                continue;
            }

            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;

            const name = id.value;
            if (isShared) this.sharedVars.add(name);
            
            const init = name.endsWith('$') ? '""' : '0';

            // Check if variable is already declared in current scope
            const isRedeclaring = this.currentVars.has(name);

            if (this._matchPunc('(')) {
                const sizes = [];
                do {
                    sizes.push(this._parseExpr());
                } while (this._matchPunc(','));
                this._matchPunc(')');
                
                if (sizes.length === 1) {
                    if (preserve && this._hasVar(name)) {
                        this._emit(`${name} = [...${name}, ...new Array(Math.max(0, ${sizes[0]} + 1 - ${name}.length)).fill(${init})];`);
                    } else if (isRedeclaring) {
                         this._emit(`${name} = new Array(${sizes[0]} + 1).fill(${init});`);
                    } else {
                        this._addVar(name);
                        this._emit(`let ${name} = new Array(${sizes[0]} + 1).fill(${init});`);
                    }
                } else {
                    // 2D array
                    if (isRedeclaring) {
                         this._emit(`${name} = Array.from({length: ${sizes[0]} + 1}, () => new Array(${sizes[1]} + 1).fill(${init}));`);
                    } else {
                        this._addVar(name);
                        this._emit(`let ${name} = Array.from({length: ${sizes[0]} + 1}, () => new Array(${sizes[1]} + 1).fill(${init}));`);
                    }
                }
            } else {
                if (this._matchKw('AS')) {
                    while (!this._isStmtEnd() && !this._matchPunc(',')) this._advance();
                }
                
                if (isRedeclaring) {
                    this._emit(`${name} = ${init};`);
                } else {
                    this._addVar(name);
                    this._emit(`let ${name} = ${init};`);
                }
            }
        } while (this._matchPunc(','));
    }

    _parseLineInput() {
        let prompt = '';
        
        if (this._check(TokenType.STRING)) {
            prompt = this._consume(TokenType.STRING).value;
            this._matchPunc(',');
            this._matchPunc(';');
        }
        
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) return;
        
        const name = id.value;
        const escaped = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        if (!this._hasVar(name)) {
            this._addVar(name);
            this._emit(`let ${name} = "";`);
        }
        
        this._emit(`${name} = await _input("${escaped}");`);
    }

    _parseType() {
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) return;
        
        const typeName = id.value;
        const fields = [];
        
        this._skipNewlines();
        
        while (!this._checkKw('END') && !this._isEnd()) {
            this._skipNewlines();
            if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
                const fieldTok = this._advance(); // Consume ID or Keyword
                if (fieldTok && fieldTok.value) {
                    let fieldType = 'any';
                    // Check for AS usage
                    if (this._matchKw('AS')) {
                        if (this._check(TokenType.KEYWORD) || this._check(TokenType.IDENTIFIER)) {
                            const typeTok = this._advance();
                            if (typeTok && typeTok.value) {
                                fieldType = typeTok.value;
                            }
                        }
                    }
                    fields.push({ name: fieldTok.value, type: fieldType });
                }
            } else {
                 if (!this._checkKw('END')) this._advance();
            }
            this._skipNewlines();
        }
        
        this._matchKw('END');
        this._matchKw('TYPE');
        
        // Generate a constructor function
        const fieldInits = fields.map(f => {
            const init = f.name.endsWith('$') || f.type.toUpperCase() === 'STRING' ? '""' : '0';
            return `${f.name}: ${init}`;
        }).join(', ');
        
        this._emit(`function ${typeName}() { return { ${fieldInits} }; }`);
    }

    _parseErase() {
        do {
            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;
            this._emit(`${id.value} = [];`);
        } while (this._matchPunc(','));
    }

    _parseScreen() {
        const mode = this._parseExpr();
        this._emit(`_screen(${mode});`);
    }

    _parseWidth() {
        const cols = this._parseExpr();
        let rows = '25';
        if (this._matchPunc(',')) {
            rows = this._parseExpr();
        }
        this._emit(`_width(${cols}, ${rows});`);
    }

    _parseSound() {
        const freq = this._parseExpr();
        this._matchPunc(',');
        const duration = this._parseExpr();
        this._emit(`await _sound(${freq}, ${duration});`);
    }

    _parsePlay() {
        // PLAY "MML string"
        const commands = this._parseExpr();
        this._emit(`await _play(${commands});`);
    }

    _parsePset() {
        // PSET (x, y), color or PSET STEP (x, y), color
        const isStep = this._matchKw('STEP');
        
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        let color = 'undefined';
        if (this._matchPunc(',')) {
            color = this._parseExpr();
        }
        
        this._emit(`await _pset(${x}, ${y}, ${color}, ${isStep});`);
    }

    _parsePreset() {
        // PRESET (x, y), color or PRESET STEP (x, y), color
        const isStep = this._matchKw('STEP');
        
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        let color = 'undefined'; // Runtime handles default
        if (this._matchPunc(',')) {
            color = this._parseExpr();
        }
        
        this._emit(`await _preset(${x}, ${y}, ${color}, ${isStep});`);
    }

    _parseLine() {
        // LINE (x1, y1)-(x2, y2), color, B|BF
        // LINE STEP(x1, y1)-STEP(x2, y2), color
        let x1 = 'null', y1 = 'null';
        let step1 = 'false', step2 = 'false';
        
        // Check if starting point exists
        if (this._matchKw('STEP')) {
            step1 = 'true';
        }
        
        if (this._peek()?.value === '(') {
             this._matchPunc('(');
             x1 = this._parseExpr();
             this._matchPunc(',');
             y1 = this._parseExpr();
             this._matchPunc(')');
        }
        
        this._matchOp('-');
        
        // Check for STEP on second point
        if (this._matchKw('STEP')) {
            step2 = 'true';
        }
        
        this._matchPunc('(');
        const x2 = this._parseExpr();
        this._matchPunc(',');
        const y2 = this._parseExpr();
        this._matchPunc(')');
        
        let color = 'undefined';
        let box = 'false';
        let fill = 'false';
        
        if (this._matchPunc(',')) {
            if (!this._isStmtEnd() && !this._checkKw('B') && !this._checkKw('BF')) {
                color = this._parseExpr();
            }
            
            if (this._matchPunc(',')) {
                // Box param
                if (this._matchKw('B')) {
                    box = 'true';
                } else if (this._matchKw('BF')) {
                    box = 'true';
                    fill = 'true';
                }
            } else if (this._matchKw('B')) {
                box = 'true';
            } else if (this._matchKw('BF')) {
                box = 'true';
                fill = 'true';
            }
        }
        
        this._emit(`await _line(${x1}, ${y1}, ${x2}, ${y2}, ${color}, ${box}, ${fill}, ${step1}, ${step2});`);
    }

    _parseCircle() {
        // CIRCLE (x,y), radius, color or CIRCLE STEP (x,y), radius, color
        const isStep = this._matchKw('STEP');
        
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        this._matchPunc(',');
        const r = this._parseExpr();
        
        let color = 'undefined';
        if (this._matchPunc(',')) {
             color = this._parseExpr();
        }
        
        // Handle arc angles if present (start, end, aspect)
        // Note: These are parsed for syntax compatibility but not yet implemented in runtime
        let _startAngle = 'undefined';
        let _endAngle = 'undefined';
        let _aspect = 'undefined';
        
        if (this._matchPunc(',')) {
             _startAngle = this._parseExpr();
             if (this._matchPunc(',')) {
                 _endAngle = this._parseExpr();
                 if (this._matchPunc(',')) {
                     _aspect = this._parseExpr();
                 }
             }
        }
        
        // Pass all parameters including arc angles for full CIRCLE support
        this._emit(`await _circle(${x}, ${y}, ${r}, ${color}, ${isStep}, ${_startAngle}, ${_endAngle}, ${_aspect});`);
    }

    _parseGet() {
        // GET (x1,y1)-(x2,y2), arrayname
        this._matchPunc('(');
        const x1 = this._parseExpr();
        this._matchPunc(',');
        const y1 = this._parseExpr();
        this._matchPunc(')');
        
        this._matchOp('-');
        
        this._matchPunc('(');
        const x2 = this._parseExpr();
        this._matchPunc(',');
        const y2 = this._parseExpr();
        this._matchPunc(')');
        
        this._matchPunc(',');
        
        // Array or variable name. For now assume simpe variable name as buffer ID
        const id = this._consumeToken().value; 
        
        this._emit(`await _get(${x1}, ${y1}, ${x2}, ${y2}, '${id}');`);
    }

    _parsePut() {
        // PUT (x,y), arrayname, action
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        this._matchPunc(',');
        
        const id = this._consumeToken().value;
        
        let action = 'undefined';
        if (this._matchPunc(',')) {
            action = `"${this._consumeToken().value}"`;
        }
        
        this._emit(`await _put(${x}, ${y}, '${id}', ${action});`);
    }

    _parseDelay() {
        // _DELAY seconds
        const seconds = this._parseExpr();
        this._emit(`await _sleep(${seconds} * 1000);`);
    }

    _parseLimit() {
        // _LIMIT fps - Frame rate limiter
        const fps = this._parseExpr();
        this._emit(`await window.runtime.limit(${fps});`);
    }

    // =========================================================================
    // ADVANCED QB64 COMMANDS
    // =========================================================================

    _parsePutImage() {
        // _PUTIMAGE (dx1, dy1)-(dx2, dy2), srcId, dstId, (sx1, sy1)-(sx2, sy2)
        // Simplified version: _PUTIMAGE (x, y), srcId
        let dx1 = 0, dy1 = 0, dx2 = 'undefined', dy2 = 'undefined';
        let srcId = 'undefined', dstId = 'undefined';
        let sx1 = 'undefined', sy1 = 'undefined', sx2 = 'undefined', sy2 = 'undefined';
        
        if (this._matchPunc('(')) {
            dx1 = this._parseExpr();
            this._matchPunc(',');
            dy1 = this._parseExpr();
            this._matchPunc(')');
            
            if (this._matchOp('-')) {
                this._matchPunc('(');
                dx2 = this._parseExpr();
                this._matchPunc(',');
                dy2 = this._parseExpr();
                this._matchPunc(')');
            }
        }
        
        if (this._matchPunc(',')) {
            srcId = this._parseExpr();
        }
        
        if (this._matchPunc(',')) {
            dstId = this._parseExpr();
        }
        
        // Optional source coordinates
        if (this._matchPunc(',') && this._matchPunc('(')) {
            sx1 = this._parseExpr();
            this._matchPunc(',');
            sy1 = this._parseExpr();
            this._matchPunc(')');
            
            if (this._matchOp('-')) {
                this._matchPunc('(');
                sx2 = this._parseExpr();
                this._matchPunc(',');
                sy2 = this._parseExpr();
                this._matchPunc(')');
            }
        }
        
        this._emit(`window.runtime.putimage(${dx1}, ${dy1}, ${dx2}, ${dy2}, ${srcId}, ${dstId}, ${sx1}, ${sy1}, ${sx2}, ${sy2});`);
    }

    _parsePrintString() {
        // _PRINTSTRING (x, y), text
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        this._matchPunc(',');
        const text = this._parseExpr();
        
        this._emit(`window.runtime.printstring(${x}, ${y}, ${text});`);
    }

    _parseFreeImage() {
        // _FREEIMAGE imageId
        const id = this._parseExpr();
        this._emit(`window.runtime.freeimage(${id});`);
    }

    _parseMouseShow() {
        // _MOUSESHOW [style]
        let style = '"default"';
        if (!this._isStmtEnd()) {
            style = this._parseExpr();
        }
        this._emit(`window.runtime.mouseshow(${style});`);
    }

    _parseSndPlay() {
        // _SNDPLAY sid
        const sid = this._parseExpr();
        this._emit(`window.runtime.sndplay(${sid});`);
    }

    _parseSndLoop() {
        // _SNDLOOP sid
        const sid = this._parseExpr();
        this._emit(`window.runtime.sndloop(${sid});`);
    }

    _parseSndClose() {
        // _SNDCLOSE sid
        const sid = this._parseExpr();
        this._emit(`window.runtime.sndclose(${sid});`);
    }

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
        
        this._emit(`const ${name} = (${args.join(', ')}) => ${expr};`);
    }

    _parseOpen() {
        // OPEN filename FOR mode AS #filenum
        const filename = this._parseExpr();
        
        let mode = 'INPUT';
        if (this._matchKw('FOR')) {
            if (this._matchKw('INPUT')) mode = 'INPUT';
            else if (this._matchKw('OUTPUT')) mode = 'OUTPUT';
            else if (this._matchKw('APPEND')) mode = 'APPEND';
            else if (this._matchKw('BINARY')) mode = 'BINARY';
            else if (this._matchKw('RANDOM')) mode = 'RANDOM';
        }
        
        this._matchKw('AS');
        this._matchPunc('#');
        const fileNum = this._parseExpr();
        
        this._emit(`_open(${filename}, "${mode}", ${fileNum});`);
    }

    _parseClose() {
        if (this._isStmtEnd()) {
            this._emit('_closeAll();');
            return;
        }
        
        do {
            this._matchPunc('#');
            const fileNum = this._parseExpr();
            this._emit(`_close(${fileNum});`);
        } while (this._matchPunc(','));
    }

    // =========================================================================
    // NEW PARSER FUNCTIONS - Additional QBasic/QB64 Commands
    // =========================================================================

    _parseDraw() {
        // DRAW "command string"
        const cmds = this._parseExpr();
        this._emit(`await _draw(${cmds});`);
    }

    _parseView() {
        // VIEW (x1,y1)-(x2,y2), [color], [border]
        // VIEW PRINT [toprow TO bottomrow]
        if (this._matchKw('PRINT')) {
            if (!this._isStmtEnd()) {
                const top = this._parseExpr();
                this._matchKw('TO');
                const bottom = this._parseExpr();
                this._emit(`_viewPrint(${top}, ${bottom});`);
            } else {
                this._emit('_viewPrint();');
            }
            return;
        }
        
        if (this._matchPunc('(')) {
            const x1 = this._parseExpr();
            this._matchPunc(',');
            const y1 = this._parseExpr();
            this._matchPunc(')');
            this._matchOp('-');
            this._matchPunc('(');
            const x2 = this._parseExpr();
            this._matchPunc(',');
            const y2 = this._parseExpr();
            this._matchPunc(')');
            
            let fill = 'undefined', border = 'undefined';
            if (this._matchPunc(',')) {
                if (!this._isStmtEnd()) fill = this._parseExpr();
                if (this._matchPunc(',')) border = this._parseExpr();
            }
            this._emit(`_view(${x1}, ${y1}, ${x2}, ${y2}, ${fill}, ${border});`);
        } else {
            this._emit('_view();');
        }
    }

    _parseWindow() {
        // WINDOW (x1,y1)-(x2,y2) or WINDOW SCREEN (x1,y1)-(x2,y2)
        const screen = this._matchKw('SCREEN');
        if (this._matchPunc('(')) {
            const x1 = this._parseExpr();
            this._matchPunc(',');
            const y1 = this._parseExpr();
            this._matchPunc(')');
            this._matchOp('-');
            this._matchPunc('(');
            const x2 = this._parseExpr();
            this._matchPunc(',');
            const y2 = this._parseExpr();
            this._matchPunc(')');
            this._emit(`_window(${x1}, ${y1}, ${x2}, ${y2}, ${screen});`);
        } else {
            this._emit('_window();');
        }
    }

    _parsePalette() {
        // PALETTE [attrib, color] or PALETTE USING array
        if (this._matchKw('USING')) {
            const arr = this._parseExpr();
            this._emit(`_paletteUsing(${arr});`);
        } else if (!this._isStmtEnd()) {
            const attr = this._parseExpr();
            this._matchPunc(',');
            const color = this._parseExpr();
            this._emit(`_palette(${attr}, ${color});`);
        } else {
            this._emit('_palette();');
        }
    }

    _parsePcopy() {
        // PCOPY src, dst
        const src = this._parseExpr();
        this._matchPunc(',');
        const dst = this._parseExpr();
        this._emit(`_pcopy(${src}, ${dst});`);
    }

    _parseName() {
        // NAME oldname AS newname
        const oldName = this._parseExpr();
        this._matchKw('AS');
        const newName = this._parseExpr();
        this._emit(`await _rename(${oldName}, ${newName});`);
    }

    _parseKill() {
        // KILL filename
        const filename = this._parseExpr();
        this._emit(`await _kill(${filename});`);
    }

    _parseMkdir() {
        // MKDIR dirname
        const dir = this._parseExpr();
        this._emit(`await _mkdir(${dir});`);
    }

    _parseRmdir() {
        // RMDIR dirname
        const dir = this._parseExpr();
        this._emit(`await _rmdir(${dir});`);
    }

    _parseChdir() {
        // CHDIR dirname
        const dir = this._parseExpr();
        this._emit(`await _chdir(${dir});`);
    }

    _parseFiles() {
        // FILES [filespec]
        let spec = '""';
        if (!this._isStmtEnd()) {
            spec = this._parseExpr();
        }
        this._emit(`await _files(${spec});`);
    }

    _parseSeek() {
        // SEEK #filenum, position
        this._matchPunc('#');
        const fileNum = this._parseExpr();
        this._matchPunc(',');
        const pos = this._parseExpr();
        this._emit(`_seek(${fileNum}, ${pos});`);
    }

    _parseLock() {
        // LOCK #filenum, [record] or [start] TO [end]
        this._matchPunc('#');
        const fileNum = this._parseExpr();
        if (!this._isStmtEnd()) {
            this._matchPunc(',');
            const start = this._parseExpr();
            if (this._matchKw('TO')) {
                const end = this._parseExpr();
                this._emit(`_lock(${fileNum}, ${start}, ${end});`);
            } else {
                this._emit(`_lock(${fileNum}, ${start});`);
            }
        } else {
            this._emit(`_lock(${fileNum});`);
        }
    }

    _parseUnlock() {
        // UNLOCK #filenum, [record] or [start] TO [end]
        this._matchPunc('#');
        const fileNum = this._parseExpr();
        if (!this._isStmtEnd()) {
            this._matchPunc(',');
            const start = this._parseExpr();
            if (this._matchKw('TO')) {
                const end = this._parseExpr();
                this._emit(`_unlock(${fileNum}, ${start}, ${end});`);
            } else {
                this._emit(`_unlock(${fileNum}, ${start});`);
            }
        } else {
            this._emit(`_unlock(${fileNum});`);
        }
    }

    _parseDefType(_type) {
        // DEFINT A-Z, DEFLNG A-M, etc.
        // These affect default variable types - emit comment for now
        while (!this._isStmtEnd()) {
            this._advance();
        }
        this._emit(`// DEF${_type} - variable type hints (JavaScript uses dynamic types)`);
    }

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
    }

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
    }

    _parseOut() {
        // OUT port, value - hardware I/O (stub)
        const port = this._parseExpr();
        this._matchPunc(',');
        const value = this._parseExpr();
        this._emit(`/* OUT ${port}, ${value} - hardware I/O not supported */`);
    }

    _parseWait() {
        // WAIT port, and_val [, xor_val] - hardware wait (stub)
        const port = this._parseExpr();
        this._matchPunc(',');
        const andVal = this._parseExpr();
        let xorVal = '0';
        if (this._matchPunc(',')) {
            xorVal = this._parseExpr();
        }
        this._emit(`/* WAIT ${port}, ${andVal}, ${xorVal} - hardware wait not supported */`);
    }

    _parsePoke() {
        // POKE address, value - memory write (stub)
        const addr = this._parseExpr();
        this._matchPunc(',');
        const value = this._parseExpr();
        this._emit(`_poke(${addr}, ${value});`);
    }

    _parseRun() {
        // RUN [program] - restart or run another program
        if (!this._isStmtEnd()) {
            const prog = this._parseExpr();
            this._emit(`throw {type: "RUN", program: ${prog}};`);
        } else {
            this._emit('throw {type: "RUN", restart: true};');
        }
    }

    _parseChain() {
        // CHAIN program
        const prog = this._parseExpr();
        this._emit(`throw {type: "CHAIN", program: ${prog}};`);
    }

    _parseShell() {
        // SHELL [command]
        if (!this._isStmtEnd()) {
            const cmd = this._parseExpr();
            this._emit(`await _shell(${cmd});`);
        } else {
            this._emit('await _shell();');
        }
    }

    _parseTitle() {
        // _TITLE text$
        const title = this._parseExpr();
        this._emit(`document.title = ${title};`);
    }

    _parseFullscreen() {
        // _FULLSCREEN [mode]
        let mode = '0';
        if (!this._isStmtEnd()) {
            mode = this._parseExpr();
        }
        this._emit(`_fullscreen(${mode});`);
    }

    _parseScreenMove() {
        // _SCREENMOVE x, y or _SCREENMOVE _MIDDLE
        if (this._matchKw('_MIDDLE')) {
            this._emit('// _SCREENMOVE _MIDDLE - not supported in web');
        } else {
            const x = this._parseExpr();
            this._matchPunc(',');
            const y = this._parseExpr();
            this._emit(`// _SCREENMOVE ${x}, ${y} - not supported in web`);
        }
    }

    _parseIcon() {
        // _ICON [handle]
        if (!this._isStmtEnd()) {
            const handle = this._parseExpr();
            this._emit(`// _ICON ${handle} - not supported in web`);
        } else {
            this._emit('// _ICON - not supported in web');
        }
    }

    _parseDest() {
        // _DEST imageHandle
        const handle = this._parseExpr();
        this._emit(`_dest(${handle});`);
    }

    _parseSource() {
        // _SOURCE imageHandle
        const handle = this._parseExpr();
        this._emit(`_source(${handle});`);
    }

    _parseFont() {
        // _FONT fontHandle [, imageHandle]
        const font = this._parseExpr();
        let img = 'undefined';
        if (this._matchPunc(',')) {
            img = this._parseExpr();
        }
        this._emit(`_font(${font}, ${img});`);
    }

    _parseSndStop() {
        // _SNDSTOP handle
        const handle = this._parseExpr();
        this._emit(`_runtime.sndstop?.(${handle});`);
    }

    _parseSndVol() {
        // _SNDVOL handle, volume
        const handle = this._parseExpr();
        this._matchPunc(',');
        const vol = this._parseExpr();
        this._emit(`_runtime.sndvol?.(${handle}, ${vol});`);
    }

    _parseSndPause() {
        // _SNDPAUSE handle
        const handle = this._parseExpr();
        this._emit(`_runtime.sndpause?.(${handle});`);
    }

    _parseSndBal() {
        // _SNDBAL handle, balance
        const handle = this._parseExpr();
        this._matchPunc(',');
        const bal = this._parseExpr();
        this._emit(`_runtime.sndbal?.(${handle}, ${bal});`);
    }

    _parseSndSetPos() {
        // _SNDSETPOS handle, position
        const handle = this._parseExpr();
        this._matchPunc(',');
        const pos = this._parseExpr();
        this._emit(`_runtime.sndsetpos?.(${handle}, ${pos});`);
    }

    _parseMemFree() {
        // _MEMFREE memblock
        const mem = this._parseExpr();
        this._emit(`_memfree(${mem});`);
    }

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
    }

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
    }

    _parseClipboard() {
        // _CLIPBOARD = text$
        this._matchOp('=');
        const text = this._parseExpr();
        this._emit(`await navigator.clipboard.writeText(${text});`);
    }

    _parseSetAlpha() {
        // _SETALPHA alpha [, color] [, startColor TO endColor] [, imageHandle]
        const alpha = this._parseExpr();
        let color = 'undefined', start = 'undefined', end = 'undefined', img = 'undefined';
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
    }

    _parseClearColor() {
        // _CLEARCOLOR color [, imageHandle]
        const color = this._parseExpr();
        let img = 'undefined';
        if (this._matchPunc(',')) {
            img = this._parseExpr();
        }
        this._emit(`_clearColor(${color}, ${img});`);
    }

    _parseMouseMove() {
        // _MOUSEMOVE x, y
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._emit(`// _MOUSEMOVE ${x}, ${y} - cannot programmatically move mouse in browsers`);
    }

    _parseResume() {
        if (this._matchKw('NEXT')) {
            this._emit('// RESUME NEXT');
        } else if (this._check(TokenType.NUMBER) || this._check(TokenType.IDENTIFIER)) {
            const label = this._advance().value;
            this._emit(`// RESUME ${label}`);
        } else {
             this._emit('// RESUME');
        }
    }

    _parseError() {
        const errNum = this._parseExpr();
        this._emit(`throw new Error("Error " + ${errNum});`);
    }

    _parseOnStatement() {
        // ON expr GOTO/GOSUB label1, label2, ...
        const expr = this._parseExpr();
        
        if (this._matchKw('GOTO')) {
            const labels = [];
            do {
                const label = this._consume(TokenType.IDENTIFIER);
                if (label) labels.push(label.value);
            } while (this._matchPunc(','));
            
            this._emit(`// ON ${expr} GOTO ${labels.join(', ')} (limited support)`);
            this._recordError('ON...GOTO not fully supported in JS transpiler. Use QB64 mode.');
        } else if (this._matchKw('GOSUB')) {
            const labels = [];
            do {
                const label = this._consume(TokenType.IDENTIFIER);
                if (label) labels.push(label.value);
            } while (this._matchPunc(','));
            
            this._emit(`{ const _on_idx = ${expr}; if (_on_idx >= 1 && _on_idx <= ${labels.length}) { await [${labels.join(', ')}][_on_idx - 1](); } }`);
        } else if (this._matchKw('ERROR')) {
            // ON ERROR GOTO label
            if (this._matchKw('GOTO')) {
                const label = this._consume(TokenType.IDENTIFIER);
                if (label && label.value !== '0') {
                    this._emit(`// ON ERROR GOTO ${label.value} (error handling limited in JS)`);
                } else {
                    this._emit('// ON ERROR GOTO 0 - disable error handling');
                }
            } else if (this._matchKw('RESUME')) {
                this._matchKw('NEXT');
                this._emit('// ON ERROR RESUME NEXT');
            }
        }
    }

    _parseExpr() { return this._parseOr(); }
    _parseOr() {
        let left = this._parseAnd();
        while (this._matchKw('OR')) {
            left = `(${left} || ${this._parseAnd()})`;
        }
        return left;
    }
    _parseAnd() {
        let left = this._parseCompare();
        while (this._matchKw('AND')) {
            left = `(${left} && ${this._parseCompare()})`;
        }
        return left;
    }
    _parseCompare() {
        let left = this._parseAdd();
        while (true) {
            if (this._matchOp('=')) left = `(${left} === ${this._parseAdd()})`;
            else if (this._matchOp('<>')) left = `(${left} !== ${this._parseAdd()})`;
            else if (this._matchOp('<=')) left = `(${left} <= ${this._parseAdd()})`;
            else if (this._matchOp('>=')) left = `(${left} >= ${this._parseAdd()})`;
            else if (this._matchOp('<')) left = `(${left} < ${this._parseAdd()})`;
            else if (this._matchOp('>')) left = `(${left} > ${this._parseAdd()})`;
            else break;
        }
        return left;
    }
    _parseAdd() {
        let left = this._parseMul();
        while (true) {
            if (this._matchOp('+')) left = `(${left} + ${this._parseMul()})`;
            else if (this._matchOp('-')) left = `(${left} - ${this._parseMul()})`;
            else break;
        }
        return left;
    }
    _parseMul() {
        let left = this._parseUnary();
        while (true) {
            if (this._matchOp('*')) left = `(${left} * ${this._parseUnary()})`;
            else if (this._matchOp('/')) left = `(${left} / ${this._parseUnary()})`;
            else if (this._matchOp('\\')) left = `Math.floor(${left} / ${this._parseUnary()})`;
            else if (this._matchOp('^')) left = `Math.pow(${left}, ${this._parseUnary()})`;
            else if (this._matchKw('MOD')) left = `(${left} % ${this._parseUnary()})`;
            else break;
        }
        return left;
    }
    _parseUnary() {
        if (this._matchOp('-')) return `(-${this._parseUnary()})`;
        if (this._matchOp('+')) return this._parseUnary();
        if (this._matchKw('NOT')) return `(!${this._parseUnary()})`;
        return this._parsePrimary();
    }
    _parsePrimary() {
        const tok = this._peek();
        if (!tok) return '0';
        if (this._check(TokenType.NUMBER)) return this._advance().value;
        if (this._check(TokenType.STRING)) {
            const s = this._advance().value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${s}"`;
        }
        if (this._matchPunc('(')) {
            const expr = this._parseExpr();
            this._matchPunc(')');
            return `(${expr})`;
        }
        if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
            const name = this._advance().value;
            const upper = name.toUpperCase();
            const builtin = BUILTIN_FUNCS[upper];
            const fnName = builtin ? `(${builtin})` : name;
            
            if (this._hasVar(name) && this._peek()?.value === '(') {
                this._matchPunc('(');
                const indices = [];
                do {
                    indices.push(this._parseExpr());
                } while (this._matchPunc(','));
                this._matchPunc(')');
                
                // Construct chain: name[i][j]
                const indexStr = indices.map(i => `[${i}]`).join('');

                // Check for member access after array index: arr(1).x
                let suffix = '';
                while (this._matchPunc('.')) {
                    if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
                       suffix += `.${this._advance().value}`;
                    }
                }
                return `${name}${indexStr}${suffix}`;
            }

            if (this._matchPunc('(')) {
                const args = this._parseArgs();
                this._matchPunc(')');
                return `${fnName}(${args})`;
            }
            
            // Check for member access: p1.Name
            if (this._matchPunc('.')) {
                let suffix = '';
                 // First dot consumed
                 if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
                    suffix += `.${this._advance().value}`;
                 }
                 // Chained access?
                 while (this._matchPunc('.')) {
                    if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
                       suffix += `.${this._advance().value}`;
                    }
                 }
                return `${name}${suffix}`;
            }

            // If it's a built-in function (like RND) and no args, call it
            if (builtin && !this._hasVar(name)) {
                return `${fnName}()`; // e.g. Math.random()
            }
            
            return builtin ? fnName : name;
        }
        this._advance();
        return '0';
    }
    _parseArgs() {
        const args = [];
        if (!this._check(TokenType.PUNCTUATION) || this._peek()?.value !== ')') {
            do {
                args.push(this._parseExpr());
            } while (this._matchPunc(','));
        }
        return args.join(', ');
    }

    // --- Helpers ---

    _isEnd() { return this._check(TokenType.EOF); }
    _isStmtEnd() {
        const t = this._peek();
        if (!t || t.type === TokenType.EOF || t.type === TokenType.NEWLINE) return true;
        if (t.type === TokenType.KEYWORD && ['THEN', 'ELSE', 'ELSEIF'].includes(t.value)) return true;
        return false;
    }
    _skipNewlines() { while (this._check(TokenType.NEWLINE)) this._advance(); }
    _peek() { return this.tokens[this.pos] || null; }
    _prev() { return this.pos > 0 ? this.tokens[this.pos - 1] : null; }
    _advance() { if (!this._isEnd()) this.pos++; return this._prev(); }
    _check(type) { return this._peek()?.type === type; }
    _checkKw(kw) { const t = this._peek(); return t?.type === TokenType.KEYWORD && t.value === kw; }
    _matchKw(kw) { if (this._checkKw(kw)) { this._advance(); return true; } return false; }
    _matchOp(op) { const t = this._peek(); if (t?.type === TokenType.OPERATOR && t.value === op) { this._advance(); return true; } return false; }
    _matchPunc(c) { const t = this._peek(); if (t?.type === TokenType.PUNCTUATION && t.value === c) { this._advance(); return true; } return false; }
    _consume(type) { if (this._check(type)) return this._advance(); return null; }
    _consumeKw(kw) { this._matchKw(kw); }
    _consumeOp(op) { this._matchOp(op); }
    
    // Safe token consumer - always advances and returns the token (handles missing _consumeToken calls)
    _consumeToken() {
        if (this._isEnd()) {
            const lastToken = this._prev();
            return { type: 'EOF', value: '', line: lastToken?.line || 1, col: lastToken?.col || 0 };
        }
        const token = this._advance();
        return token || { type: 'UNKNOWN', value: '', line: this._prev()?.line || 1, col: 0 };
    }
    
    _decIndent() { this.indent = Math.max(0, this.indent - 1); }
    _emit(code) { this.output.push('  '.repeat(this.indent) + code); }

    // --- Codegen Headers/Footers ---

    _emitHeader() {
        this.output.push(`// Generated by QBasic Nexus
'use strict';
`);
        
        // Runtime environment abstraction
        if (this.target === 'node') {
            this.output.push(`
const readline = require('readline');
const { spawn } = require('child_process');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function _print(text, newline) {
  if (newline) console.log(text);
  else process.stdout.write(String(text));
}

function _input(prompt) {
  return new Promise(resolve => rl.question(prompt, answer => resolve(answer)));
}

function _cls() {
  console.clear();
}
`);
        } else if (this.target === 'web') {
            this.output.push(`
// Web Runtime Environment (Optimized v1.1.0)
// Safe window check to prevent ReferenceError in non-browser contexts
const _runtime = (typeof window !== 'undefined' && window.runtime) ? window.runtime : {};
const _print = _runtime.print || console.log;
const _input = _runtime.input || prompt;
const _cls = window.runtime?.cls || console.clear;
const _locate = window.runtime?.locate || (() => {});
const _color = window.runtime?.color || (() => {});
const _beep = window.runtime?.beep || (() => {});
const _sound = window.runtime?.sound || (() => {});
const _play = window.runtime?.play || (() => {});
const _screen = window.runtime?.screen || (() => {});
const _width = window.runtime?.width || (() => {});
const _pset = window.runtime?.pset || (() => {});
const _preset = window.runtime?.preset || (() => {});
const _line = window.runtime?.line || (() => {});
const _circle = window.runtime?.circle || (() => {});
const _get = window.runtime?.get || (() => {});
const _put = window.runtime?.put || (() => {});
const _mouseinput = window.runtime?.mouseinput || (() => 0);
const _mousex = window.runtime?.mousex || (() => 0);
const _mousey = window.runtime?.mousey || (() => 0);
const _mousebutton = window.runtime?.mousebutton || (() => 0);
const _timer = window.runtime?.timer || (() => Date.now() / 1000);

// Advanced Image Functions
const _LOADIMAGE = window.runtime?.loadimage || (() => -1);
const _NEWIMAGE = window.runtime?.newimage || (() => -1);
const _COPYIMAGE = window.runtime?.copyimage || (() => -1);
const _FREEIMAGE = window.runtime?.freeimage || (() => {});
const _PUTIMAGE = window.runtime?.putimage || (() => {});
const _PRINTSTRING = window.runtime?.printstring || (() => {});

// Advanced Mouse Functions
const _MOUSEWHEEL = window.runtime?.mousewheel || (() => 0);
const _MOUSEHIDE = window.runtime?.mousehide || (() => {});
const _MOUSESHOW = window.runtime?.mouseshow || (() => {});

// Advanced Keyboard Functions
const _KEYDOWN = window.runtime?.keydown || (() => 0);
const _KEYHIT = window.runtime?.keyhit || (() => 0);
const _KEYCLEAR = window.runtime?.keyclear || (() => {});

// Advanced Sound Functions
const _SNDOPEN = window.runtime?.sndopen || (() => -1);
const _SNDPLAY = window.runtime?.sndplay || (() => {});
const _SNDLOOP = window.runtime?.sndloop || (() => {});
const _SNDCLOSE = window.runtime?.sndclose || (() => {});

// RGB Color Functions
const _RGB32 = window.runtime?.rgb32 || ((r, g, b, a) => ((a||255) << 24) | (r << 16) | (g << 8) | b);
const _RGBA32 = window.runtime?.rgba32 || _RGB32;
const _RED32 = window.runtime?.red32 || ((c) => (c >> 16) & 0xFF);
const _GREEN32 = window.runtime?.green32 || ((c) => (c >> 8) & 0xFF);
const _BLUE32 = window.runtime?.blue32 || ((c) => c & 0xFF);
const _ALPHA32 = window.runtime?.alpha32 || ((c) => (c >> 24) & 0xFF);

// Performance Functions
const _LIMIT = window.runtime?.limit || (async () => {});
const _DISPLAY = window.runtime?.display || (() => {});

// Advanced Math Functions
const _CEIL = window.runtime?.ceil || Math.ceil;
const _ROUND = window.runtime?.round || Math.round;
const _HYPOT = window.runtime?.hypot || Math.hypot;
const _D2R = window.runtime?.d2r || ((d) => d * (Math.PI / 180));
const _R2D = window.runtime?.r2d || ((r) => r * (180 / Math.PI));

// Extended Math Functions (from qbjs-main)
const _ACOS = window.runtime?.acos || Math.acos;
const _ASIN = window.runtime?.asin || Math.asin;
const _ATAN2 = window.runtime?.atan2 || Math.atan2;
const _FIX = window.runtime?.fix || ((x) => x < 0 ? Math.ceil(x) : Math.floor(x));
const _SGN = window.runtime?.sgn || ((x) => x > 0 ? 1 : x < 0 ? -1 : 0);

// String Functions (for convenience)
const _INSTR = window.runtime?.instr || ((a, b, c) => {
  let start = 1, source, search;
  if (c !== undefined) { start = a; source = String(b); search = String(c); }
  else { source = String(a); search = String(b); }
  const idx = source.indexOf(search, start - 1);
  return idx < 0 ? 0 : idx + 1;
});

// System Functions
const _DESKTOPWIDTH = window.runtime?.desktopwidth || (() => window.screen.width);
const _DESKTOPHEIGHT = window.runtime?.desktopheight || (() => window.screen.height);
const _PAINT = window.runtime?.paint || (() => {});

// Frame rate limiter (legacy)
let _lastLimitTime = Date.now();
async function _limit(fps) {
  const frameTime = 1000 / fps;
  const elapsed = Date.now() - _lastLimitTime;
  if (elapsed < frameTime) {
    await new Promise(r => setTimeout(r, frameTime - elapsed));
  }
  _lastLimitTime = Date.now();
}
`);
        }

        this.output.push(`
function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper for multi-dimensional arrays
function _makeArray(init, ...dims) {
   if (dims.length === 0) return init;
   const size = dims[0];
   const rest = dims.slice(1);
   return Array.from({length: size + 1}, () => _makeArray(init, ...rest));
}

// Screen position tracking (for LOCATE)
let _cursorRow = 1, _cursorCol = 1;
`);
        // Node.js specific I/O functions
        if (this.target === 'node') {
            this.output.push(`
function _locate(row, col) {
  _cursorRow = row;
  _cursorCol = col;
  if (typeof process !== 'undefined' && process.stdout?.write) {
    process.stdout.write(\`\\x1b[\${row};\${col}H\`);
  }
}

function _color(fg, bg) {
  const colors = [0, 12, 10, 14, 9, 13, 11, 7, 8, 12, 10, 14, 9, 13, 11, 15];
  if (typeof process !== 'undefined' && process.stdout?.write) {
    const ansiFg = colors[fg % 16] || 7;
    const ansiBg = colors[bg % 16] || 0;
    process.stdout.write(\`\\x1b[38;5;\${ansiFg}m\\x1b[48;5;\${ansiBg}m\`);
  }
}

const _beep = () => _sound(800, 1.82); // Standard BEEP: 800Hz, ~100ms

// High-performance cross-platform sound implementation
// Uses native OS features for fastest possible audio playback
function _sound(freq, duration) {
  // Clamp and validate values
  freq = Math.max(37, Math.min(32767, freq || 800));
  const qbDuration = Math.max(0.01, duration || 1);
  const ms = Math.floor((qbDuration / 18.2) * 1000);
  if (ms <= 0) return Promise.resolve();

  return new Promise(resolve => {
    const timeout = setTimeout(resolve, ms + 100); // Safety timeout
    
    if (process.platform === 'win32') {
      // Windows: Use mshta for instant JavaScript audio (much faster than PowerShell)
      // mshta is pre-installed on all Windows versions and starts instantly
      const jsCode = \`
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = \${Math.floor(freq)};
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.005);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(function() { 
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
          setTimeout(function() { window.close(); }, 20); 
        }, \${ms});
      \`;
      
      const mshta = spawn('mshta', [
        \`javascript:var d=document;d.write('<html><head><script>\${jsCode.replace(/\\n/g, '')}</script></head></html>');d.close();\`
      ], { 
        detached: true, 
        stdio: 'ignore',
        windowsHide: true 
      });
      
      mshta.unref();
      mshta.on('error', () => {
        // Fallback to system bell
        process.stdout.write('\\x07');
        clearTimeout(timeout);
        resolve();
      });
      
      // Don't wait for mshta - it handles its own timing
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, ms);
      
    } else if (process.platform === 'darwin') {
      // macOS: Use afplay with system sounds or sox if available
      // First try sox for frequency control, then fallback to system beep
      const sox = spawn('play', ['-n', 'synth', (ms/1000).toString(), 'square', freq.toString()], {
        stdio: 'ignore'
      });
      
      sox.on('error', () => {
        // sox not available, use system beep
        process.stdout.write('\\x07');
        clearTimeout(timeout);
        setTimeout(resolve, ms);
      });
      
      sox.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
      
    } else {
      // Linux: Try multiple methods in order of preference
      // 1. paplay with generated audio (PulseAudio)
      // 2. beep command
      // 3. System bell
      
      const beep = spawn('beep', ['-f', freq.toString(), '-l', ms.toString()], {
        stdio: 'ignore'
      });
      
      beep.on('error', () => {
        // beep not available, try speaker-test briefly or fall back to bell
        process.stdout.write('\\x07');
        clearTimeout(timeout);
        setTimeout(resolve, ms);
      });
      
      beep.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          process.stdout.write('\\x07');
          setTimeout(resolve, ms);
        } else {
          resolve();
        }
      });
    }
  });
}
`);
        }

        this.output.push(`
const _DATA = [${this.dataValues.join(', ')}];
let _DATA_PTR = 0;

function _read() {
  if (_DATA_PTR >= _DATA.length) throw new Error("Out of DATA");
  return _DATA[_DATA_PTR++];
}

function _restore() {
  _DATA_PTR = 0;
}

// Random number generator with seeding support
let _rndSeed = Date.now();
function _randomize(seed) {
  _rndSeed = seed !== undefined ? seed : Date.now();
}
function _rnd() {
  _rndSeed = (_rndSeed * 9301 + 49297) % 233280;
  return _rndSeed / 233280;
}
`);

        // Screen/Width stubs - only for Node.js (web has them from runtime)
        if (this.target === 'node') {
            this.output.push(`
// Screen mode (stub)
let _screenMode = 0;
function _screen(mode) {
  _screenMode = mode;
}

// Width (stub)
let _screenWidth = 80, _screenHeight = 25;
function _width(cols, rows) {
  _screenWidth = cols;
  _screenHeight = rows || 25;
}
`);
        }

        // Common code for both targets
        this.output.push(`
// INKEY$ support
let _inkeyBuffer = '';
function INKEY() {
  if (typeof window !== 'undefined' && window.runtime && window.runtime['inkey$']) {
      return window.runtime['inkey$']();
  }
  const key = _inkeyBuffer;
  _inkeyBuffer = '';
  return key;
}

// File I/O (stubs for web compatibility)
const _files = {};
let _nextFileNum = 1;

// Mapped to runtime if available
const _openFunc = window.runtime?.open || (() => {});
const _closeFunc = window.runtime?.close || (() => {});
const _printFileFunc = window.runtime?.printFile || (() => {});
const _inputFileFunc = window.runtime?.inputFile || (() => {});

async function _open(filename, mode, filenum) {
  if (typeof window !== 'undefined' && window.runtime) {
      await _openFunc(filename, mode, filenum);
      return;
  }
  _files[filenum] = { filename, mode, data: '', pos: 0, eof: false };
}

async function _close(filenum) {
  if (typeof window !== 'undefined' && window.runtime) {
      await _closeFunc(filenum);
      return;
  }
  delete _files[filenum];
}

async function _closeAll() {
  // If runtime supports closeAll
  for (const f in _files) delete _files[f];
}

// INSTR function with proper 1-based index
function INSTR(start, str, find) {
  if (find === undefined) {
    find = str;
    str = start;
    start = 1;
  }
  const idx = str.indexOf(find, start - 1);
  return idx >= 0 ? idx + 1 : 0;
}

// TRUE/FALSE constants
const TRUE = -1;
const FALSE = 0;

(async () => {
try {
`);
    }

    _emitFooter() {
        this.output.push(`
} catch (e) {
  if (e === "STOP") {
      console.log("Program Stopped");
  } else if (typeof e === 'string' && e.startsWith('GOTO_')) {
      // GOTO jumped - normal execution ended via GOTO
      console.log("Program ended via GOTO");
  } else if (e && e.message) {
      console.error('Runtime Error:', e.message);
      if (typeof window !== 'undefined' && window.runtime?.error) {
          window.runtime.error(e.message);
      }
  }
} finally {
  ${this.target === 'node' ? 'rl.close();' : ''}
}
})();
`);
    }
}

/**
 * Public API for the QBasic Compiler.
 */
class InternalTranspiler {
    /**
     * Transpiles QBasic source code to JavaScript.
     * @param {string} source - QBasic source code.
     * @param {string} target - 'node' or 'web'.
     * @returns {string} Generated JavaScript code.
     */
    transpile(source, target = 'node') {
        // Input validation
        if (source === null || source === undefined) {
            return '// Empty source';
        }
        if (typeof source !== 'string') {
            source = String(source);
        }
        if (source.trim().length === 0) {
            return '// Empty source';
        }
        
        // Validate target
        if (target !== 'node' && target !== 'web') {
            target = 'web';
        }
        
        try {
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            
            // Safety check for token array
            if (!Array.isArray(tokens) || tokens.length === 0) {
                return '// No tokens generated';
            }
            
            const parser = new Parser(tokens, target);
            const result = parser.parse();
            
            // Release tokens back to pool for memory efficiency
            try {
                const TokenPool = require('./lexer').TokenPool;
                if (TokenPool && typeof TokenPool.releaseAll === 'function') {
                    TokenPool.releaseAll(tokens);
                }
            } catch (_e) { /* TokenPool not accessible, ignore */ }
            
            return result;
        } catch (e) {
            console.error('[Transpiler] Compilation error:', e.message);
            return `// Compilation error: ${e.message}\nconsole.error("Compilation failed: ${e.message.replace(/"/g, '\\"')}");`;
        }
    }

    /**
     * Lints the QBasic source code for syntax errors.
     * @param {string} source - QBasic source code.
     * @returns {Array<{line: number, message: string, column: number}>} Array of errors.
     */
    lint(source) {
        // Input validation
        if (!source || typeof source !== 'string' || source.trim().length === 0) {
            return [];
        }
        
        try {
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            
            if (!Array.isArray(tokens) || tokens.length === 0) {
                return [];
            }
            
            const parser = new Parser(tokens, 'node');
            parser.parse();
            return parser.errors || [];
        } catch (e) {
            return [{
                line: 0,
                message: `Lexer/Parser error: ${e.message}`,
                column: 0
            }];
        }
    }
}

module.exports = InternalTranspiler;
