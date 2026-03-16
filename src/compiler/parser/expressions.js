// Auto-extracted Mixin
'use strict';
const { TokenType, BUILTIN_FUNCS } = require('../constants');
module.exports = {
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
  },

_parseExpr() {
    return this._parseOr();
  },

_parseOr() {
    let left = this._parseAnd();
    while (this._matchKw('OR')) {
      left = `(${left} || ${this._parseAnd()})`;
    }
    return left;
  },

_parseAnd() {
    let left = this._parseCompare();
    while (this._matchKw('AND')) {
      left = `(${left} && ${this._parseCompare()})`;
    }
    return left;
  },

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
  },


_optimizeBinOp(left, right, op) {
    if (typeof left === 'string' && left.startsWith('"') && op === '+') {
      if (typeof right === 'string' && right.startsWith('"')) {
        return '"' + left.slice(1, -1) + right.slice(1, -1) + '"';
      }
    }
    const l = Number(left);
    const r = Number(right);
    if (!isNaN(l) && !isNaN(r)) {
      if (op === '+') return String(l + r);
      if (op === '-') return String(l - r);
      if (op === '*') return String(l * r);
      if (op === '/') return String(l / r);
      if (op === '\\') return String(Math.floor(l / r));
      if (op === '^') return String(Math.pow(l, r));
      if (op === 'MOD') return String(l % r);
    }
    if (op === '\\') return `Math.floor(${left} / ${right})`;
    if (op === '^') return `Math.pow(${left}, ${right})`;
    if (op === 'MOD') return `(${left} % ${right})`;
    return `(${left} ${op} ${right})`;
  },

_parseAdd() {
    let left = this._parseMul();
    while (true) {
      if (this._matchOp('+')) left = this._optimizeBinOp(left, this._parseMul(), '+');
      else if (this._matchOp('-')) left = this._optimizeBinOp(left, this._parseMul(), '-');
      else break;
    }
    return left;
  },

_parseMul() {
    let left = this._parseUnary();
    while (true) {
      if (this._matchOp('*')) left = this._optimizeBinOp(left, this._parseUnary(), '*');
      else if (this._matchOp('/')) left = this._optimizeBinOp(left, this._parseUnary(), '/');
      else if (this._matchOp('\\')) left = this._optimizeBinOp(left, this._parseUnary(), '\\');
      else if (this._matchOp('^')) left = this._optimizeBinOp(left, this._parseUnary(), '^');
      else if (this._matchKw('MOD')) left = this._optimizeBinOp(left, this._parseUnary(), 'MOD');
      else break;
    }
    return left;
  },

_parseUnary() {
    if (this._matchOp('-')) return `(-${this._parseUnary()})`;
    if (this._matchOp('+')) return this._parseUnary();
    if (this._matchKw('NOT')) return `(!${this._parseUnary()})`;
    return this._parsePrimary();
  },

_parsePrimary() {
  const tok = this._peek();
  if (!tok) return '0';
  
  // Handle unexpected EOF gracefully
  if (tok.type === TokenType.EOF) {
    return '0';
  }
  
  if (this._check(TokenType.NUMBER)) return this._advance().value;
  if (this._check(TokenType.STRING)) {
    const s = this._advance()
      .value.replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
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
    const storageName = this._resolveStorageName(name);
    const isCurrentFunctionName = this._isCurrentFunctionName(name);

    if (
      this._hasVar(name) &&
      this._peek()?.value === '(' &&
      !isCurrentFunctionName
    ) {
      this._matchPunc('(');
      const indices = [];
      do {
        indices.push(this._parseExpr());
      } while (this._matchPunc(','));
      this._matchPunc(')');

      // Construct chain: name[i][j]
      const indexStr = indices.map((i) => `[${i}]`).join('');

      // Check for member access after array index: arr(1).x
      let suffix = '';
      while (this._matchPunc('.')) {
        if (
          this._check(TokenType.IDENTIFIER) ||
          this._check(TokenType.KEYWORD)
        ) {
          suffix += `.${this._advance().value}`;
        }
      }
      return `${name}${indexStr}${suffix}`;
    }

    if (this._matchPunc('(')) {
      const args = this._parseArgs();
      this._matchPunc(')');
      return builtin ? `${fnName}(${args})` : `(await ${name}(${args}))`;
    }

    // Check for member access: p1.Name
    if (this._matchPunc('.')) {
      let suffix = '';
      // First dot consumed
      if (
        this._check(TokenType.IDENTIFIER) ||
        this._check(TokenType.KEYWORD)
      ) {
        suffix += `.${this._advance().value}`;
      }
      // Chained access?
      while (this._matchPunc('.')) {
        if (
          this._check(TokenType.IDENTIFIER) ||
          this._check(TokenType.KEYWORD)
        ) {
          suffix += `.${this._advance().value}`;
        }
      }
      return `${name}${suffix}`;
    }

    // If it's a built-in function (like RND) and no args, call it
    if (builtin && !this._hasVar(name)) {
      return `${fnName}()`; // e.g. Math.random()
    }

    // Auto-declare undefined variables with default values
    // This handles cases where variables are used before explicit declaration
    if (!builtin && !this._hasVar(name) && !isCurrentFunctionName) {
      this._addVar(name);
      const defaultValue = name.endsWith('$') ? '""' : '0';
      this._emit(`var ${name} = ${defaultValue}; // Auto-declared`);
    }

    return builtin ? fnName : storageName;
  }
  this._advance();
  return '0';
},

_parseArgs() {
  const args = [];
  if (!this._check(TokenType.PUNCTUATION) || this._peek()?.value !== ')') {
    do {
      args.push(this._parseExpr());
    } while (this._matchPunc(','));
  }
  return args.join(', ');
}
};
