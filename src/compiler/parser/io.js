// Auto-extracted Mixin
'use strict';
const { TokenType, BUILTIN_FUNCS } = require('../constants');
module.exports = {
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
    this._emit(
      `_print(${addNewline ? content : 'String(' + content + ')'}, ${addNewline});`,
    );
  },

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
        this._emit(
          `if (isNaN(Number(${name}))) ${name} = 0; else ${name} = Number(${name});`,
        );
      }
    } while (this._matchPunc(','));
  },

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
  },

_parseRead() {
    do {
      const id = this._consume(TokenType.IDENTIFIER);
      if (!id) break;
      const name = id.value;

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
          this._emit(
            `if (!isNaN(${name}[${indices.join('][')}])) ${name}[${indices.join('][')}] = Number(${name}[${indices.join('][')}]);`,
          );
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
  },

_parseRestore() {
    if (this._check(TokenType.IDENTIFIER)) {
      this._advance(); // Consume label (ignored for now)
    }
    this._emit('_restore();');
  },

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
  },

_parseLine() {
    // LINE (x1, y1)-(x2, y2), color, B|BF
    // LINE STEP(x1, y1)-STEP(x2, y2), color
    let x1 = 'null',
      y1 = 'null';
    let step1 = 'false',
      step2 = 'false';

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

    this._emit(
      `await _line(${x1}, ${y1}, ${x2}, ${y2}, ${color}, ${box}, ${fill}, ${step1}, ${step2});`,
    );
  },

_parsePrintString() {
    // _PRINTSTRING (x, y), text
    this._matchPunc('(');
    const x = this._parseExpr();
    this._matchPunc(',');
    const y = this._parseExpr();
    this._matchPunc(')');

    this._matchPunc(',');
    const text = this._parseExpr();

    this._emit(`_runtime.printstring?.(${x}, ${y}, ${text});`);
  },

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
  },

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
  },

_parseFiles() {
    // FILES [filespec]
    let spec = '""';
    if (!this._isStmtEnd()) {
      spec = this._parseExpr();
    }
    this._emit(`await _files(${spec});`);
  }
};
