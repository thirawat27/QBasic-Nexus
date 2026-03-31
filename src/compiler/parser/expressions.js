// Auto-extracted Mixin
'use strict';
const { TokenType, BUILTIN_FUNCS } = require('../constants');
module.exports = {
_parseCall() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;
    const storageName = this._isCurrentFunctionName(id.value)
      ? (this.currentProcedure?.storageName || this._resolveStorageName(id.value))
      : this._resolveStorageName(id.value);

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

    this._emit(`await ${storageName}(${args.join(', ')});`);
  },

_parseExpr() {
    return this._parseImp();
  },

  _parseImp() {
    let left = this._parseEqv();
    while (this._matchKw('IMP')) {
      left = `_qbImp(${left}, ${this._parseEqv()})`;
    }
    return left;
  },

  _parseEqv() {
    let left = this._parseXor();
    while (this._matchKw('EQV')) {
      left = `_qbEqv(${left}, ${this._parseXor()})`;
    }
    return left;
  },

  _parseXor() {
    let left = this._parseOr();
    while (this._matchKw('XOR')) {
      left = `_qbXor(${left}, ${this._parseOr()})`;
    }
    return left;
  },

_parseOr() {
    let left = this._parseAnd();
    while (this._matchKw('OR')) {
      left = `_qbOr(${left}, ${this._parseAnd()})`;
    }
    return left;
  },

_parseAnd() {
    let left = this._parseCompare();
    while (this._matchKw('AND')) {
      left = `_qbAnd(${left}, ${this._parseCompare()})`;
    }
    return left;
  },

_parseCompare() {
    let left = this._parseAdd();
    while (true) {
      if (this._matchOp('=')) left = this._buildComparisonExpression(left, '=', this._parseAdd());
      else if (this._matchOp('<>')) left = this._buildComparisonExpression(left, '<>', this._parseAdd());
      else if (this._matchOp('<=')) left = this._buildComparisonExpression(left, '<=', this._parseAdd());
      else if (this._matchOp('>=')) left = this._buildComparisonExpression(left, '>=', this._parseAdd());
      else if (this._matchOp('<')) left = this._buildComparisonExpression(left, '<', this._parseAdd());
      else if (this._matchOp('>')) left = this._buildComparisonExpression(left, '>', this._parseAdd());
      else break;
    }
    return left;
  },

  _buildComparisonExpression(left, operator, right) {
    const helperByOperator = {
      '=': '_qbEq',
      '<>': '_qbNe',
      '<': '_qbLt',
      '<=': '_qbLe',
      '>': '_qbGt',
      '>=': '_qbGe',
    };

    const helper = helperByOperator[operator] || '_qbEq';
    return `${helper}(${left}, ${right})`;
  },

  _buildRangeCondition(target, lower, upper) {
    return `_qbAnd(${this._buildComparisonExpression(target, '>=', lower)}, ${this._buildComparisonExpression(target, '<=', upper)})`;
  },

  _buildConditionTest(expression) {
    return `_qbCond(${expression})`;
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
      if (op === '+') {
        const total = l + r;
        return Number.isFinite(total) ? String(total) : `_qbAdd(${left}, ${right})`;
      }
      if (op === '-') {
        const total = l - r;
        return Number.isFinite(total) ? String(total) : `_qbSub(${left}, ${right})`;
      }
      if (op === '*') {
        const total = l * r;
        return Number.isFinite(total) ? String(total) : `_qbMul(${left}, ${right})`;
      }
      if (op === '/') return r === 0 ? `_qbDiv(${left}, ${right})` : String(l / r);
      if (op === '\\') {
        return r === 0 ? `_qbIntDiv(${left}, ${right})` : String(Math.trunc(l / r));
      }
      if (op === '^') {
        const total = Math.pow(l, r);
        return Number.isFinite(total) ? String(total) : `_qbPow(${left}, ${right})`;
      }
      if (op === 'MOD') {
        return r === 0
          ? `_qbMod(${left}, ${right})`
          : String(Math.trunc(l) % Math.trunc(r));
      }
    }
    if (op === '+') return `_qbAdd(${left}, ${right})`;
    if (op === '-') return `_qbSub(${left}, ${right})`;
    if (op === '*') return `_qbMul(${left}, ${right})`;
    if (op === '/') return `_qbDiv(${left}, ${right})`;
    if (op === '\\') return `_qbIntDiv(${left}, ${right})`;
    if (op === '^') return `_qbPow(${left}, ${right})`;
    if (op === 'MOD') return `_qbMod(${left}, ${right})`;
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
    if (this._matchKw('NOT')) return `_qbNot(${this._parseUnary()})`;
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
    const storageName = this._resolveStorageName(name);
    const isCurrentFunctionName = this._isCurrentFunctionName(name);
    const callableName = isCurrentFunctionName
      ? (this.currentProcedure?.storageName || storageName)
      : storageName;
    const fnName = builtin ? `(${builtin})` : callableName;

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

      // Check for member access after array index: arr(1).x
      let suffix = '';
      while (this._matchPunc('.')) {
        if (
          this._check(TokenType.IDENTIFIER) ||
          this._check(TokenType.KEYWORD)
        ) {
          suffix += this._memberAccessFragment(this._advance().value);
        }
      }
      return `(_qbArrayGet(${storageName}, ${indices.join(', ')}))${suffix}`;
    }

    if (this._matchPunc('(')) {
      const args = this._parseArgs();
      this._matchPunc(')');
      return builtin ? `${fnName}(${args})` : `(await ${callableName}(${args}))`;
    }

    // Check for member access: p1.Name
    if (this._matchPunc('.')) {
      let suffix = '';
      // First dot consumed
      if (
        this._check(TokenType.IDENTIFIER) ||
        this._check(TokenType.KEYWORD)
      ) {
        suffix += this._memberAccessFragment(this._advance().value);
      }
      // Chained access?
      while (this._matchPunc('.')) {
        if (
          this._check(TokenType.IDENTIFIER) ||
          this._check(TokenType.KEYWORD)
        ) {
          suffix += this._memberAccessFragment(this._advance().value);
        }
      }
      return `${storageName}${suffix}`;
    }

    // If it's a built-in function (like RND) and no args, call it
    if (builtin && !this._hasVar(name)) {
      return `${fnName}()`; // e.g. Math.random()
    }

    // Auto-declare undefined variables with default values
    // This handles cases where variables are used before explicit declaration
    if (!builtin && !this._hasVar(name) && !isCurrentFunctionName) {
      this._addVar(name);
      if (typeof this._defaultMetadataForName === 'function') {
        this._setVarMetadata(name, this._defaultMetadataForName(name, false));
      }
      const defaultValue =
        typeof this._defaultInitializerForName === 'function'
          ? this._defaultInitializerForName(name)
          : (name.endsWith('$') ? '""' : '0');
      this._emit(`var ${storageName} = ${defaultValue}; // Auto-declared`);
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
