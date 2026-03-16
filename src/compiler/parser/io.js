// Auto-extracted Mixin
'use strict';
const { TokenType } = require('../constants');
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
      this._emit(`await _printFile(${filenum}, \`${line}\\n\`);`);
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

      do {
        const target = this._parseAssignableTarget({
          contextLabel: 'INPUT #',
        });

        this._emit(
          `${target.targetExpr} = ${this._wrapAssignmentValue(
            target.name,
            `await _inputFileToken(${filenum})`,
            target.wrapOptions,
          )};`,
        );

        if (!target.isStringLike && target.metadata?.kind !== 'type') {
          this._emit(
            `if (isNaN(Number(${target.targetExpr}))) ${target.targetExpr} = 0; else ${target.targetExpr} = Number(${target.targetExpr});`,
          );
        }
      } while (this._matchPunc(','));
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
      const target = this._parseAssignableTarget({
        contextLabel: 'INPUT',
      });

      this._emit(
        `${target.targetExpr} = ${this._wrapAssignmentValue(
          target.name,
          `await _input("${escaped}")`,
          target.wrapOptions,
        )};`,
      );

      if (!target.isStringLike && target.metadata?.kind !== 'type') {
        this._emit(
          `if (isNaN(Number(${target.targetExpr}))) ${target.targetExpr} = 0; else ${target.targetExpr} = Number(${target.targetExpr});`,
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
      const target = this._parseAssignableTarget({
        contextLabel: 'READ',
      });
      this._emit(
        `${target.targetExpr} = ${this._wrapAssignmentValue(
          target.name,
          '_read()',
          target.wrapOptions,
        )};`,
      );
      if (!target.isStringLike && target.metadata?.kind !== 'type') {
        this._emit(
          `if (!isNaN(${target.targetExpr})) ${target.targetExpr} = Number(${target.targetExpr});`,
        );
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
    if (this._matchPunc('#')) {
      const filenum = this._parseExpr();
      this._matchPunc(',');

      const target = this._parseAssignableTarget({
        contextLabel: 'LINE INPUT #',
      });

      this._emit(
        `${target.targetExpr} = ${this._wrapAssignmentValue(
          target.name,
          `await _inputFileLine(${filenum})`,
          target.wrapOptions,
        )};`,
      );
      return;
    }

    let prompt = '';

    if (this._check(TokenType.STRING)) {
      prompt = this._consume(TokenType.STRING).value;
      this._matchPunc(',');
      this._matchPunc(';');
    }

    const target = this._parseAssignableTarget({
      contextLabel: 'LINE INPUT',
    });
    const escaped = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    this._emit(
      `${target.targetExpr} = ${this._wrapAssignmentValue(
        target.name,
        `await _input("${escaped}")`,
        target.wrapOptions,
      )};`,
    );
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

    let access = 'undefined';
    let shared = 'false';
    let lockMode = 'undefined';

    while (!this._isStmtEnd() && !this._checkKw('AS')) {
      if (this._matchKw('ACCESS')) {
        if (this._matchKw('READ')) {
          access = this._matchKw('WRITE') ? '"READ WRITE"' : '"READ"';
        } else if (this._matchKw('WRITE')) {
          access = '"WRITE"';
        }
        continue;
      }

      if (this._matchKw('LOCK')) {
        if (this._matchKw('READ')) {
          lockMode = this._matchKw('WRITE') ? '"READ WRITE"' : '"READ"';
        } else if (this._matchKw('WRITE')) {
          lockMode = '"WRITE"';
        }
        continue;
      }

      if (this._matchKw('SHARED')) {
        shared = 'true';
        continue;
      }

      break;
    }

    this._matchKw('AS');
    this._matchPunc('#');
    const fileNum = this._parseExpr();
    let recordLength = 'undefined';

    if (this._matchPunc(',')) {
      if (this._matchKw('LEN')) {
        this._matchOp('=');
        recordLength = this._parseExpr();
      }
    } else if (this._matchKw('LEN')) {
      this._matchOp('=');
      recordLength = this._parseExpr();
    }

    this._emit(
      `await _open(${filename}, "${mode}", ${fileNum}, ${recordLength}, { access: ${access}, shared: ${shared}, lockMode: ${lockMode} });`,
    );
  },

_parseClose() {
    if (this._isStmtEnd()) {
      this._emit('_closeAll();');
      return;
    }

    do {
      this._matchPunc('#');
      const fileNum = this._parseExpr();
      this._emit(`await _close(${fileNum});`);
    } while (this._matchPunc(','));
  },

_parseFiles() {
    // FILES [filespec]
    let spec = '""';
    if (!this._isStmtEnd()) {
      spec = this._parseExpr();
    }
    this._emit(`await _files(${spec});`);
  },

_parseField() {
    this._matchPunc('#');
    const fileNum = this._parseExpr();
    const fields = [];

    if (this._matchPunc(',')) {
      do {
        const length = this._parseExpr();
        this._matchKw('AS');
        const id = this._consume(TokenType.IDENTIFIER);
        if (!id) {
          this._raiseSyntaxError('Expected string variable after FIELD length');
        }

        const name = id.value;
        const storageName = this._resolveStorageName(name);
        this._addVar(name);
        this._setVarMetadata(name, {
          kind: 'fixedString',
          length,
        });

        if (!this._isCurrentFunctionName(name)) {
          this._emit(`if (typeof ${storageName} === "undefined") var ${name} = _fixedString("", ${length});`);
        }
        this._emit(`${storageName} = _fixedString(${storageName}, ${length});`);
        fields.push(
          `{ name: ${JSON.stringify(name)}, length: ${length}, get: () => ${storageName}, set: (value) => { ${storageName} = _fixedString(value, ${length}); } }`,
        );
      } while (this._matchPunc(','));
    }

    this._emit(`_field(${fileNum}, [${fields.join(', ')}]);`);
  },

_parseGetFile() {
    this._matchPunc('#');
    const fileNum = this._parseExpr();
    let position = 'undefined';
    let target = null;

    if (this._matchPunc(',')) {
      if (!this._isStmtEnd() && !(this._peek()?.type === TokenType.PUNCTUATION && this._peek()?.value === ',')) {
        position = this._parseExpr();
      }

      if (this._matchPunc(',')) {
        target = this._parseFileVariableTarget();
      }
    }

    if (!target) {
      this._emit(`await _getFileFields(${fileNum}, ${position});`);
      return;
    }

    const metadataLiteral = this._metadataToRuntimeLiteral(target.metadata);
    const readLength =
      target.metadata?.kind === 'fixedString'
        ? target.metadata.length
        : (target.metadata?.kind === 'scalar' || target.metadata?.kind === 'type')
          ? `_typedValueByteLength(${metadataLiteral})`
          : target.isStringLike
            ? `String(${target.targetExpr} ?? "").length`
            : 'undefined';
    const rawValue = `await _getFileValue(${fileNum}, ${position}, ${readLength}, ${metadataLiteral})`;
    const assignmentValue = this._wrapAssignmentValue(
      target.name,
      rawValue,
      target.wrapOptions,
    );

    this._emit(
      `${target.targetExpr} = ${assignmentValue};`,
    );

    if (!target.isStringLike && target.metadata?.kind !== 'type') {
      this._emit(
        `if (isNaN(Number(${target.targetExpr}))) ${target.targetExpr} = 0; else ${target.targetExpr} = Number(${target.targetExpr});`,
      );
    }
  },

_parsePutFile() {
    this._matchPunc('#');
    const fileNum = this._parseExpr();
    let position = 'undefined';
    let value = 'undefined';
    let metadataLiteral = 'undefined';

    if (this._matchPunc(',')) {
      if (!this._isStmtEnd() && !(this._peek()?.type === TokenType.PUNCTUATION && this._peek()?.value === ',')) {
        position = this._parseExpr();
      }

      if (this._matchPunc(',')) {
        const savedPos = this.pos;
        if (this._check(TokenType.IDENTIFIER)) {
          try {
            const reference = this._parseValueReference({
              contextLabel: 'PUT #',
            });
            if (this._isStmtEnd()) {
              value = reference.expr;
              metadataLiteral = this._metadataToRuntimeLiteral(reference.metadata);
            } else {
              this.pos = savedPos;
              value = this._parseExpr();
            }
          } catch (_error) {
            this.pos = savedPos;
            value = this._parseExpr();
          }
        } else {
          value = this._parseExpr();
        }
      }
    }

    this._emit(`await _putFileValue(${fileNum}, ${position}, ${value}, ${metadataLiteral});`);
  },

_parseFileVariableTarget() {
    return this._parseAssignableTarget({
      contextLabel: 'GET #',
    });
  },

_parsePrintUsing() {
    // PRINT USING format$; expressions
    const format = this._parseExpr();
    this._matchPunc(';');
    
    const parts = [];
    while (!this._isStmtEnd()) {
      if (this._matchPunc(';')) {
        // No newline
      } else if (this._matchPunc(',')) {
        parts.push('"\\t"');
      } else {
        parts.push(this._parseExpr());
      }
    }
    
    const content = parts.length > 0 ? parts.join(' + ') : '""';
    this._emit(`_printusing(${format}, ${content});`);
  },

_parsePrintUsingFile() {
    // PRINT #filenum, USING format$; expressions
    const filenum = this._parseExpr();
    this._matchPunc(',');
    this._matchKw('USING');
    const format = this._parseExpr();
    this._matchPunc(';');
    
    const parts = [];
    while (!this._isStmtEnd()) {
      if (this._matchPunc(';')) {
        // No newline
      } else if (this._matchPunc(',')) {
        parts.push('"\\t"');
      } else {
        parts.push(this._parseExpr());
      }
    }
    
    const content = parts.length > 0 ? parts.join(' + ') : '""';
    this._emit(`_printusingfile(${filenum}, ${format}, ${content});`);
  },

_parseInputDollar() {
    // INPUT$(n, [#]filenum)
    const n = this._parseExpr();
    this._matchPunc(',');
    
    if (this._matchPunc('#')) {
      const filenum = this._parseExpr();
      this._emit(`_inputdollar(${n}, ${filenum});`);
    } else {
      const filenum = this._parseExpr();
      this._emit(`_inputdollar(${n}, ${filenum});`);
    }
  },

_parseSeek() {
    // SEEK #filenum, position
    this._matchPunc('#');
    const fileNum = this._parseExpr();
    this._matchPunc(',');
    const position = this._parseExpr();
    this._emit(`_seek(${fileNum}, ${position});`);
  }
};
