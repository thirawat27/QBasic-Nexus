/**
 * QBasic Nexus - Transpiler (Parser & Codegen) v1.0.3
 * ==================================================
 * Internal compiler that converts QBasic code to JavaScript.
 * Supports both Node.js (CLI) and Web (Browser/Webview) targets.
 * 
 * Features:
 * - Complete PRINT, INPUT, CLS, LOCATE, COLOR support
 * - SOUND, BEEP, PLAY (MML) audio commands
 * - FOR/NEXT, DO/LOOP, WHILE/WEND, SELECT CASE control flow
 * - SUB/FUNCTION procedures with proper scoping
 * - DATA/READ/RESTORE for data handling
 * - TYPE definitions (user-defined types)
 * - Comprehensive built-in function library
 * 
 * Performance optimizations:
 * - Token caching for repeated lookups
 * - Efficient string concatenation
 * - Minimal object allocation in hot paths
 * 
 * @author Thirawat27
 * @version 1.0.3
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
        
        // Advanced Graphics
        if (this._matchKw('_PUTIMAGE')) return this._parsePutImage();
        if (this._matchKw('_PRINTSTRING')) return this._parsePrintString();
        if (this._matchKw('_FREEIMAGE')) return this._parseFreeImage();
        
        // Advanced Mouse
        if (this._matchKw('_MOUSEHIDE')) return this._emit('window.runtime.mousehide();');
        if (this._matchKw('_MOUSESHOW')) return this._parseMouseShow();
        
        // Advanced Keyboard
        if (this._matchKw('_KEYCLEAR')) return this._emit('window.runtime.keyclear();');
        
        // Advanced Sound
        if (this._matchKw('_SNDPLAY')) return this._parseSndPlay();
        if (this._matchKw('_SNDLOOP')) return this._parseSndLoop();
        if (this._matchKw('_SNDCLOSE')) return this._parseSndClose();
        
        // Performance
        if (this._matchKw('_DISPLAY')) return this._emit('window.runtime.display();');
        
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
            // Labels in JavaScript transpilation have limited support.
            // For GOSUB, we create a callable async function that executes
            // code until RETURN. This is a simplification since true GOTO
            // behavior cannot be replicated in JavaScript.
            this._emit(`// Label: ${label.value}`);
            // Note: Full label support requires QB64 mode
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
                const size = this._parseExpr();
                this._matchPunc(')');
                // Create array with 1-based indexing support (size + 1)
                this._emit(`let ${name} = new Array(${size} + 1).fill(${init});`);
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
            // Note: GOTO/labels have limited support in JS transpilation
            this._emit(`// GOTO ${label.value} (not fully supported in transpiler)`);
            this._recordError(`GOTO ${label.value}: Labels/GOTO not fully supported in JS transpiler. Use QB64 mode for full support.`);
        }
    }

    _parseGosub() {
        const label = this._consume(TokenType.IDENTIFIER);
        if (label) {
            this._emit(`await ${label.value}(); // GOSUB ${label.value}`);
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
                if (fieldTok) {
                    let fieldType = 'any';
                    // Check for AS usage
                    if (this._matchKw('AS')) {
                        if (this._check(TokenType.KEYWORD) || this._check(TokenType.IDENTIFIER)) {
                            fieldType = this._advance().value;
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
        // PSET (x, y), color
        let _isStep = false;
        if (this._matchKw('STEP')) _isStep = true; // Ignored for now
        
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        let color = 'undefined';
        if (this._matchPunc(',')) {
            color = this._parseExpr();
        }
        
        this._emit(`await _pset(${x}, ${y}, ${color});`);
    }

    _parsePreset() {
        // PRESET (x, y), color -> Draws in background color if color omitted
        this._matchPunc('(');
        const x = this._parseExpr();
        this._matchPunc(',');
        const y = this._parseExpr();
        this._matchPunc(')');
        
        let color = 'undefined'; // Runtime handles default
        if (this._matchPunc(',')) {
            color = this._parseExpr();
        }
        
        this._emit(`await _preset(${x}, ${y}, ${color});`);
    }

    _parseLine() {
        // LINE (x1, y1)-(x2, y2), color, B|BF
        let x1 = 'null', y1 = 'null';
        
        // Check if starting point exists: (x1, y1)
        if (this._peek()?.value === '(') {
             this._matchPunc('(');
             x1 = this._parseExpr();
             this._matchPunc(',');
             y1 = this._parseExpr();
             this._matchPunc(')');
        }
        
        this._matchOp('-');
        
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
        
        this._emit(`await _line(${x1}, ${y1}, ${x2}, ${y2}, ${color}, ${box}, ${fill});`);
    }

    _parseCircle() {
        // CIRCLE (x,y), radius, color
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
        
        // Skip arc angles for now if present
        if (this._matchPunc(',')) {
             this._parseExpr(); // start
             if (this._matchPunc(',')) {
                 this._parseExpr(); // end
                 if (this._matchPunc(',')) {
                     this._parseExpr(); // aspect
                 }
             }
        }
        
        this._emit(`await _circle(${x}, ${y}, ${r}, ${color});`);
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
            
            if (this._matchPunc('(')) {
                const args = this._parseArgs();
                this._matchPunc(')');
                return `${fnName}(${args})`;
            }
            if (this._hasVar(name) && this._peek()?.value === '(') {
                this._matchPunc('(');
                const idx = this._parseExpr();
                this._matchPunc(')');
                // Check for member access after array index: arr(1).x
                let suffix = '';
                while (this._matchPunc('.')) {
                    if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
                       suffix += `.${this._advance().value}`;
                    }
                }
                return `${name}[${idx}]${suffix}`;
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
// Web Runtime Environment (Optimized v1.0.2)
const _print = window.runtime?.print || console.log;
const _input = window.runtime?.input || prompt;
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
  } else {
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
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, target);
        return parser.parse();
    }

    /**
     * Lints the QBasic source code for syntax errors.
     * @param {string} source - QBasic source code.
     * @returns {Array<{line: number, message: string, column: number}>} Array of errors.
     */
    lint(source) {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, 'node');
        parser.parse();
        return parser.errors;
    }
}

module.exports = InternalTranspiler;
