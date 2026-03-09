// Auto-extracted Mixin
'use strict';
const { TokenType } = require('../constants');
module.exports = {
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
        this._emitVar(name, `_makeArray(${init}, ${dimStr})`);
      } else {
        if (this._matchKw('AS')) {
          if (this._check(TokenType.IDENTIFIER)) {
            const typeName = this._consume(TokenType.IDENTIFIER).value;
            if (
              typeName !== 'INTEGER' &&
              typeName !== 'STRING' &&
              typeName !== 'DOUBLE'
            ) {
              // User defined type
              this._emitVar(name, `${typeName}()`);
              continue;
            }
          } else {
            while (!this._isStmtEnd() && !this._matchPunc(',')) this._advance();
          }
        }
        this._emitVar(name, init);
      }
    } while (this._matchPunc(','));
  },

_parseConst() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;
    this._consumeOp('=');
    const val = this._parseExpr();
    this._emit(`const ${id.value} = ${val};`);
  },

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
            this._emit(
              `${name} = [...${name}, ...new Array(Math.max(0, ${sizes[0]} + 1 - ${name}.length)).fill(${init})];`,
            );
          } else if (isRedeclaring) {
            this._emit(`${name} = new Array(${sizes[0]} + 1).fill(${init});`);
          } else {
            this._addVar(name);
            this._emitVar(name, `new Array(${sizes[0]} + 1).fill(${init})`);
          }
        } else {
          // 2D array
          if (isRedeclaring) {
            this._emit(
              `${name} = Array.from({length: ${sizes[0]} + 1}, () => new Array(${sizes[1]} + 1).fill(${init}));`,
            );
          } else {
            this._addVar(name);
            this._emitVar(
              name,
              `Array.from({length: ${sizes[0]} + 1}, () => new Array(${sizes[1]} + 1).fill(${init}))`,
            );
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
          this._emitVar(name, init);
        }
      }
    } while (this._matchPunc(','));
  },

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
            if (
              this._check(TokenType.KEYWORD) ||
              this._check(TokenType.IDENTIFIER)
            ) {
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
    const fieldInits = fields
      .map((f) => {
        const init =
          f.name.endsWith('$') || f.type.toUpperCase() === 'STRING' ? '""' : '0';
        return `${f.name}: ${init}`;
      })
      .join(', ');

    this._emit(`function ${typeName}() { return { ${fieldInits} }; }`);
  },

_parseErase() {
    do {
      const id = this._consume(TokenType.IDENTIFIER);
      if (!id) break;
      this._emit(`${id.value} = [];`);
    } while (this._matchPunc(','));
  },

_parseDefType(_type) {
    // DEFINT A-Z, DEFLNG A-M, etc.
    // These affect default variable types - emit comment for now
    while (!this._isStmtEnd()) {
      this._advance();
    }
    this._emit(
      `// DEF${_type} - variable type hints (JavaScript uses dynamic types)`,
    );
  }
};
