/**
 * QBasic Nexus - Internal Transpiler
 * ====================================
 * Lexer & Recursive Descent Parser for QBasic to JavaScript transpilation.
 * 
 * @author Thirawat27
 * @version 1.0.0
 * @license MIT
 */

'use strict';

// ============================================================================
// CONSTANTS
// ============================================================================

const TokenType = Object.freeze({
    KEYWORD: 'KEYWORD',
    IDENTIFIER: 'IDENTIFIER',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    OPERATOR: 'OPERATOR',
    PUNCTUATION: 'PUNCTUATION',
    NEWLINE: 'NEWLINE',
    EOF: 'EOF'
});

const KEYWORDS = new Set([
    'PRINT', 'INPUT', 'IF', 'THEN', 'ELSE', 'ELSEIF', 'END', 'FOR', 'TO', 'STEP', 'NEXT',
    'DO', 'LOOP', 'WHILE', 'UNTIL', 'DIM', 'AS', 'LET', 'CLS', 'MOD', 'AND', 'OR', 'NOT',
    'SELECT', 'CASE', 'WEND', 'SUB', 'FUNCTION', 'CALL', 'SLEEP', 'CONST', 'SHARED',
    'INTEGER', 'LONG', 'STRING', 'SINGLE', 'DOUBLE', 'GOTO', 'GOSUB', 'RETURN', 'EXIT', 'SWAP',
    'DATA', 'READ', 'RESTORE'
]);

const BUILTIN_FUNCS = Object.freeze({
    'UCASE$': 's => String(s).toUpperCase()',
    'LCASE$': 's => String(s).toLowerCase()',
    'STR$': 'n => " " + n',
    'VAL': 's => parseFloat(s) || 0',
    'LEN': 's => String(s).length',
    'LEFT$': '(s, n) => String(s).substring(0, n)',
    'RIGHT$': '(s, n) => { s = String(s); return s.substring(s.length - n); }',
    'MID$': '(s, start, len) => String(s).substr(start - 1, len)',
    'CHR$': 'n => String.fromCharCode(n)',
    'ASC': 's => String(s).charCodeAt(0) || 0',
    'ABS': 'Math.abs',
    'INT': 'Math.floor',
    'FIX': 'n => Math.trunc(n)',
    'SGN': 'n => n > 0 ? 1 : n < 0 ? -1 : 0',
    'SQR': 'Math.sqrt',
    'RND': '() => Math.random()',
    'SIN': 'Math.sin',
    'COS': 'Math.cos',
    'TAN': 'Math.tan',
    'ATN': 'Math.atan',
    'LOG': 'Math.log',
    'EXP': 'Math.exp',
    'INSTR': '(a, b, c) => { if (typeof a === "string") { c = b; b = a; a = 1; } return String(b).indexOf(c, a - 1) + 1 || 0; }',
    'LTRIM$': 's => String(s).trimStart()',
    'RTRIM$': 's => String(s).trimEnd()',
    'SPACE$': 'n => " ".repeat(Math.max(0, n))',
    'STRING$': '(n, c) => (typeof c === "number" ? String.fromCharCode(c) : c).repeat(n)',
    'TIMER': '() => Date.now() / 1000'
});

// ============================================================================
// TOKEN
// ============================================================================

class Token {
    constructor(type, value, line, col = 0) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}

// ============================================================================
// LEXER
// ============================================================================

class Lexer {
    constructor(source) {
        this.src = source;
        this.len = source.length;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
    }

    tokenize() {
        while (this.pos < this.len) {
            this._scanToken();
        }
        this.tokens.push(new Token(TokenType.EOF, '', this.line, this.col));
        return this.tokens;
    }

    _scanToken() {
        const c = this.src[this.pos];

        // Newline
        if (c === '\n') {
            this.tokens.push(new Token(TokenType.NEWLINE, '\n', this.line, this.col));
            this._advance();
            this.line++;
            this.col = 1;
            return;
        }

        // Whitespace
        if (' \t\r'.includes(c)) {
            this._advance();
            return;
        }

        // Comment
        if (c === "'" || this._isRem()) {
            this._skipLine();
            return;
        }

        // Number
        if (this._isDigit(c) || (c === '.' && this._isDigit(this._peek(1)))) {
            this._scanNumber();
            return;
        }

        // String
        if (c === '"') {
            this._scanString();
            return;
        }

        // Identifier/Keyword
        if (this._isAlpha(c)) {
            this._scanIdentifier();
            return;
        }

        // Punctuation
        if ('(),;:'.includes(c)) {
            this.tokens.push(new Token(TokenType.PUNCTUATION, c, this.line, this.col));
            this._advance();
            return;
        }

        // Operators
        if ('+-*/^=<>\\'.includes(c)) {
            this._scanOperator();
            return;
        }

        // Unknown - skip
        this._advance();
    }

    _scanNumber() {
        const startCol = this.col;
        let val = '';
        let hasDot = false;

        while (this.pos < this.len) {
            const c = this.src[this.pos];
            if (this._isDigit(c)) {
                val += c;
                this._advance();
            } else if (c === '.' && !hasDot) {
                hasDot = true;
                val += c;
                this._advance();
            } else {
                break;
            }
        }

        this.tokens.push(new Token(TokenType.NUMBER, val, this.line, startCol));
    }

    _scanString() {
        const startCol = this.col;
        this._advance(); // Skip opening quote
        let val = '';

        while (this.pos < this.len && this.src[this.pos] !== '"' && this.src[this.pos] !== '\n') {
            val += this.src[this.pos];
            this._advance();
        }

        if (this.src[this.pos] === '"') this._advance();
        this.tokens.push(new Token(TokenType.STRING, val, this.line, startCol));
    }

    _scanIdentifier() {
        const startCol = this.col;
        let val = '';

        while (this.pos < this.len && this._isAlphaNumeric(this.src[this.pos])) {
            val += this.src[this.pos];
            this._advance();
        }

        // Type suffix
        if ('$%&!#'.includes(this.src[this.pos])) {
            val += this.src[this.pos];
            this._advance();
        }

        const upper = val.toUpperCase();
        const type = KEYWORDS.has(upper) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        this.tokens.push(new Token(type, type === TokenType.KEYWORD ? upper : val, this.line, startCol));
    }

    _scanOperator() {
        const c = this.src[this.pos];
        const n = this._peek(1);

        // Two-char operators
        if ((c === '<' || c === '>') && n === '=') {
            this.tokens.push(new Token(TokenType.OPERATOR, c + '=', this.line, this.col));
            this._advance();
            this._advance();
            return;
        }

        if (c === '<' && n === '>') {
            this.tokens.push(new Token(TokenType.OPERATOR, '<>', this.line, this.col));
            this._advance();
            this._advance();
            return;
        }

        this.tokens.push(new Token(TokenType.OPERATOR, c, this.line, this.col));
        this._advance();
    }

    _advance() {
        this.pos++;
        this.col++;
    }

    _peek(offset) {
        const p = this.pos + offset;
        return p < this.len ? this.src[p] : null;
    }

    _isDigit(c) {
        return c >= '0' && c <= '9';
    }

    _isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    }

    _isAlphaNumeric(c) {
        return this._isAlpha(c) || this._isDigit(c) || c === '.';
    }

    _isRem() {
        const sub = this.src.substring(this.pos, this.pos + 3).toUpperCase();
        return sub === 'REM' && (this.pos + 3 >= this.len || ' \t\n'.includes(this.src[this.pos + 3]));
    }

    _skipLine() {
        while (this.pos < this.len && this.src[this.pos] !== '\n') {
            this._advance();
        }
    }
}

// ============================================================================
// PARSER
// ============================================================================

class Parser {
    constructor(tokens, target = 'node') {
        this.tokens = tokens;
        this.pos = 0;
        this.indent = 0;
        this.output = [];
        this.errors = [];
        this.target = target;
        this.target = target;
        this.scopes = [new Set()]; // Stack of scopes
        this.dataValues = [];
    }

    get currentVars() {
        return this.scopes[this.scopes.length - 1];
    }
    
    _addVar(name) {
        this.currentVars.add(name);
    }
    
    _hasVar(name) {
        return this.currentVars.has(name);
    }
    
    _enterScope() {
        this.scopes.push(new Set());
    }
    
    _exitScope() {
        this.scopes.pop();
    }

    parse() {
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
        if (this._matchKw('PRINT')) return this._parsePrint();
        if (this._matchKw('INPUT')) return this._parseInput();
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
        if (this._matchKw('DIM')) return this._parseDim();
        if (this._matchKw('CONST')) return this._parseConst();
        if (this._matchKw('CLS')) return this._emit('console.clear();');
        if (this._matchKw('SLEEP')) return this._parseSleep();
        if (this._matchKw('SELECT')) return this._parseSelect();
        if (this._matchKw('EXIT')) return this._parseExit();
        if (this._matchKw('SWAP')) return this._parseSwap();
        if (this._matchKw('DATA')) return this._parseData();
        if (this._matchKw('READ')) return this._parseRead();
        if (this._matchKw('RESTORE')) return this._parseRestore();
        if (this._matchKw('UB')) return this._parseSub(); // Handling SUB matching logic
        if (this._matchKw('UNCTION')) return this._parseFunction(); // Handling FUNCTION matching logic
        if (this._matchKw('CALL')) return this._parseCall();
        
        // Match SUB/FUNCTION specially since they might not be caught by _matchKw if we check _check first
        if (this._checkKw('SUB')) { this._advance(); return this._parseSub(); }
        if (this._checkKw('FUNCTION')) { this._advance(); return this._parseFunction(); }

        if (this._check(TokenType.IDENTIFIER)) return this._parseAssignment();

        this._advance();
    }

    _parsePrint() {
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
        const fn = addNewline ? 'console.log' : 'process.stdout.write';
        this._emit(`${fn}(${addNewline ? content : 'String(' + content + ')'});`);
    }

    _parseInput() {
        let prompt = '? ';

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
            this._emit(`let ${name} = ${name.endsWith('$') ? '""' : '0'};`);
        }

        this._emit(`${name} = await _input("${escaped}");`);

        if (!name.endsWith('$')) {
            this._emit(`if (!isNaN(${name})) ${name} = Number(${name});`);
        }
    }

    _parseIf() {
        const cond = this._parseExpr();
        this._consumeKw('THEN');

        if (!this._isStmtEnd()) {
            // Single-line IF
            this._emit(`if (${cond}) {`);
            this.indent++;
            this._parseStatement();
            this.indent--;
            this._emit('}');
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
            this._emit('}');
        } else if (this._matchKw('SUB') || this._matchKw('FUNCTION')) {
            this._decIndent();
            this._emit('}');
        } else {
            this._emit('process.exit(0);');
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
        let cmp = '<=';

        if (this._matchKw('STEP')) {
            step = this._parseExpr();
            if (step.trim().startsWith('-')) cmp = '>=';
        }

        this._emit(`for (let ${name} = ${start}; ${name} ${cmp} ${end}; ${name} += ${step}) {`);
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
        do {
            if (this._matchKw('SHARED')) continue;

            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;

            const name = id.value;
            this._addVar(name);
            const init = name.endsWith('$') ? '""' : '0';

            if (this._matchPunc('(')) {
                const size = this._parseExpr();
                this._matchPunc(')');
                this._emit(`let ${name} = new Array(${size} + 1).fill(${init});`);
            } else {
                if (this._matchKw('AS')) {
                    while (!this._isStmtEnd() && !this._matchPunc(',')) this._advance();
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

        // Array element
        if (this._matchPunc('(')) {
            const idx = this._parseExpr();
            this._matchPunc(')');
            this._consumeOp('=');
            const val = this._parseExpr();
            this._emit(`${name}[${idx}] = ${val};`);
            return;
        }

        // Simple assignment
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
        
        // Use destructuring assignment for swap
        this._emit(`[${v1}, ${v2}] = [${v2}, ${v1}];`);
    }

    _parseSelect() {
        this._consumeKw('CASE'); // Handle "SELECT CASE"
        const expr = this._parseExpr();
        
        // Generate a switch statement
        // Note: QBasic SELECT CASE is more powerful than JS switch (ranges, etc.)
        // For this version, we'll map simple cases to switch, and complex ones if/else
        // To be safe and support expressions, we'll use a temporary variable and if/else blocks mostly
        // But for structure, let's try to map to JS switch where possible or just if/else chain
        
        // Strategy: Evaluate expression once, store it, then check cases
        const tempVar = `_select_${this.line}_${this.col}`;
        this._emit(`{ const ${tempVar} = ${expr};`);
        this.indent++;
        
        let firstCase = true;
        
        while (!this._matchKw('END')) { // END SELECT
            this._skipNewlines();
            if (this._isEnd()) break;
            
            if (this._matchKw('CASE')) {
                if (this._matchKw('ELSE')) {
                    this._emit('} else {');
                } else {
                    // Handle "CASE 1, 2, 3" or "CASE IS > 5" (IS not implemented yet) logic
                    // For now, let's support simple values: CASE 1
                    
                    const conditions = [];
                    do {
                        // TODO: Support "IS > 5" or "1 TO 10" parsing here if needed
                        conditions.push(`${tempVar} === ${this._parseExpr()}`);
                    } while (this._matchPunc(','));
                    
                    if (firstCase) {
                        this._emit(`if (${conditions.join(' || ')}) {`);
                        firstCase = false;
                    } else {
                        this._emit(`} else if (${conditions.join(' || ')}) {`);
                    }
                }
                
                this.indent++;
                // Parse statements until next CASE, END SELECT, or EOF
                while (!this._checkKw('CASE') && !this._checkKw('END') && !this._isEnd()) {
                     this._skipNewlines();
                     if (this._checkKw('CASE') || this._checkKw('END')) break;
                     this._parseStatement();
                }
                this.indent--;
            } else if (this._matchKw('END')) {
                 // END SELECT found
                 // Check if it was "END SELECT" specifically
                 if (this._matchKw('SELECT')) break;
                 
                 this._matchKw('SELECT'); 
                 break; 
            } else {
                // Garbage or newlines
                this._advance();
            }
        }
        
        // Close the chain
        if (!firstCase) this._emit('}');
        
        this.indent--;
        this._emit('}'); // Close the scope block
    }
    
    _parseData() {
        do {
            const expr = this._peek(); 
            // DATA values are usually literals (strings/numbers), but can be unquoted strings in BASIC
            // Lexer handles strings and numbers. Unquoted? Lexer sees IDENTIFIER usually.
            
            let val = '0';
            if (this._check(TokenType.STRING)) val = `"${this._advance().value}"`;
            else if (this._check(TokenType.NUMBER)) val = this._advance().value;
            else if (this._check(TokenType.IDENTIFIER)) val = `"${this._advance().value}"`; // Unquoted string
            else this._advance(); // Skip unknown
            
            this.dataValues.push(val);
        } while (this._matchPunc(','));
    }
    
    _parseRead() {
        do {
            const id = this._consume(TokenType.IDENTIFIER);
            if (!id) break;
            const name = id.value;
            
            if (!this._hasVar(name)) {
                this._addVar(name);
                this._emit(`let ${name} = ${name.endsWith('$') ? '""' : '0'};`);
            }
            
            this._emit(`${name} = _read();`);
            if (!name.endsWith('$')) {
                this._emit(`if (!isNaN(${name})) ${name} = Number(${name});`);
            }
        } while (this._matchPunc(','));
    }
    
    _parseRestore() {
        if (this._check(TokenType.IDENTIFIER)) {
            // RESTORE label
            // Not efficiently supported yet in this simple transpiler
            this._advance();
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
        
        // Add args to scope
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
        
        // Return variable
        this._addVar(name);
        this._emit(`let ${name} = ${name.endsWith('$') ? '""' : '0'};`);
        
        // We need to capture the return value at the end. 
        // But _parseEnd handles the closing brace.
        // We handle this by identifying we are in a function end? 
        // No, standard JS returns don't auto-return a variable.
        // We'll rely on the user or we inject `return name;` at END FUNCTION
        // But _parseEnd just emits `}`.
        // Let's modify logic to inject return at the end of block?
        // Easier: Just inject `return name` before every `END FUNCTION` (in proper flow).
        // Actually, we can store `currentFunction` name in class.
        this.currentFunction = name;
    }
    
    _parseCall() {
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) return;
        
        // Parse args (no parens usually required for CALL, but allowed)
        let args = [];
        if (this._matchPunc('(')) {
             args = this._parseArgs().split(', '); // _parseArgs returns string
             this._matchPunc(')');
        } else {
             // scan until statement end
             while (!this._isStmtEnd()) {
                 args.push(this._parseExpr());
                 this._matchPunc(','); // consume comma if present
             }
        }
        
        this._emit(`await ${id.value}(${args.join(', ')});`);
    }

    // Override parser exit to handle Function return
    _parseEnd() {
        if (this._matchKw('IF') || this._matchKw('SELECT')) {
            this._decIndent();
            this._emit('}');
        } else if (this._matchKw('SUB')) {
            this._exitScope();
            this._decIndent();
            this._emit('}');
        } else if (this._matchKw('FUNCTION')) {
            if (this.currentFunction) {
                this._emit(`return ${this.currentFunction};`);
                this.currentFunction = null;
            }
            this._exitScope();
            this._decIndent();
            this._emit('}');
        } else {
            this._emit('process.exit(0);');
        }
    }

    // --- Expressions ---

    _parseExpr() {
        return this._parseOr();
    }

    _parseOr() {
        let left = this._parseAnd();
        while (this._matchKw('OR')) {
            const right = this._parseAnd();
            left = `(${left} || ${right})`;
        }
        return left;
    }

    _parseAnd() {
        let left = this._parseCompare();
        while (this._matchKw('AND')) {
            const right = this._parseCompare();
            left = `(${left} && ${right})`;
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

        // Number
        if (this._check(TokenType.NUMBER)) {
            return this._advance().value;
        }

        // String
        if (this._check(TokenType.STRING)) {
            const s = this._advance().value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${s}"`;
        }

        // Parentheses
        if (this._matchPunc('(')) {
            const expr = this._parseExpr();
            this._matchPunc(')');
            return `(${expr})`;
        }

        // Function or variable
        if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
            const name = this._advance().value;
            const upper = name.toUpperCase();

            // Built-in function
            const builtin = BUILTIN_FUNCS[upper];
            const fnName = builtin ? `(${builtin})` : name;

            // Function call
            if (this._matchPunc('(')) {
                const args = this._parseArgs();
                this._matchPunc(')');
                return `${fnName}(${args})`;
            }

            // Array access
            if (this._hasVar(name) && this._peek()?.value === '(') {
                this._matchPunc('(');
                const idx = this._parseExpr();
                this._matchPunc(')');
                return `${name}[${idx}]`;
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

    _isEnd() {
        return this._check(TokenType.EOF);
    }

    _isStmtEnd() {
        const t = this._peek();
        if (!t || t.type === TokenType.EOF || t.type === TokenType.NEWLINE) return true;
        if (t.type === TokenType.KEYWORD && ['THEN', 'ELSE', 'ELSEIF'].includes(t.value)) return true;
        return false;
    }

    _skipNewlines() {
        while (this._check(TokenType.NEWLINE)) this._advance();
    }

    _peek() {
        return this.tokens[this.pos] || null;
    }

    _prev() {
        return this.pos > 0 ? this.tokens[this.pos - 1] : null;
    }

    _advance() {
        if (!this._isEnd()) this.pos++;
        return this._prev();
    }

    _check(type) {
        return this._peek()?.type === type;
    }

    _checkKw(kw) {
        const t = this._peek();
        return t?.type === TokenType.KEYWORD && t.value === kw;
    }

    _matchKw(kw) {
        if (this._checkKw(kw)) {
            this._advance();
            return true;
        }
        return false;
    }

    _matchOp(op) {
        const t = this._peek();
        if (t?.type === TokenType.OPERATOR && t.value === op) {
            this._advance();
            return true;
        }
        return false;
    }

    _matchPunc(c) {
        const t = this._peek();
        if (t?.type === TokenType.PUNCTUATION && t.value === c) {
            this._advance();
            return true;
        }
        return false;
    }

    _consume(type) {
        if (this._check(type)) return this._advance();
        return null;
    }

    _consumeKw(kw) {
        this._matchKw(kw);
    }

    _consumeOp(op) {
        this._matchOp(op);
    }

    // --- Emit ---

    _decIndent() {
        this.indent = Math.max(0, this.indent - 1);
    }

    _emit(code) {
        this.output.push('  '.repeat(this.indent) + code);
    }

    _emitHeader() {
        this.output.push(`// Generated by QBasic Nexus
'use strict';
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function _input(prompt) {
  return new Promise(resolve => rl.question(prompt, answer => resolve(answer)));
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const _DATA = [${this.dataValues.join(', ')}];
let _DATA_PTR = 0;

function _read() {
  if (_DATA_PTR >= _DATA.length) throw new Error("Out of DATA");
  return _DATA[_DATA_PTR++];
}

function _restore() {
  _DATA_PTR = 0;
}

(async () => {
try {
`);
    }

    _emitFooter() {
        this.output.push(`
} catch (e) {
  console.error('Runtime Error:', e.message);
} finally {
  rl.close();
}
})();
`);
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

class InternalTranspiler {
    transpile(source, target = 'node') {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, target);
        return parser.parse();
    }

    lint(source) {
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, 'node');
        parser.parse();
        return parser.errors;
    }
}

module.exports = InternalTranspiler;
