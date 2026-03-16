// Auto-extracted Mixin
'use strict';
const { TokenType } = require('../constants');

const NUMERIC_TYPES = new Set([
  'INTEGER',
  'LONG',
  'SINGLE',
  'DOUBLE',
  'ANY',
  '_BIT',
  '_BYTE',
  '_INTEGER64',
  '_FLOAT',
  '_UNSIGNED',
  '_OFFSET',
  '_MEM',
]);

module.exports = {
_parseDim(options = {}) {
    let isShared = Boolean(options.forceShared);
    do {
      if (!options.forceShared && this._matchKw('SHARED')) {
        isShared = true;
        continue;
      }

      const id = this._consume(TokenType.IDENTIFIER);
      if (!id) break;

      const name = id.value;
      this._addVar(name);
      if (isShared) this.sharedVars.add(name);

      const dimensions = this._parseOptionalDimensions();
      const typeSpec = this._parseDeclaredTypeSpec(name);
      const metadata = this._getTypeMetadata(typeSpec, dimensions.length > 0);

      if (metadata) {
        if (isShared && this.scopeMetadata[0]) {
          this.scopeMetadata[0].set(name, metadata);
        }
        this._setVarMetadata(name, metadata);
      }

      const initializer = this._getTypeInitializer(
        typeSpec,
        dimensions.length > 0,
      );

      if (dimensions.length > 0) {
        this._emit(`var ${name} = _makeArray(${initializer}, ${dimensions.join(', ')});`);
      } else {
        this._emit(`var ${name} = ${initializer};`);
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
      const isRedeclaring = this.currentVars.has(name);
      const dimensions = this._parseOptionalDimensions();
      const typeSpec = this._parseDeclaredTypeSpec(name);
      const metadata = this._getTypeMetadata(typeSpec, dimensions.length > 0);

      if (isShared) this.sharedVars.add(name);

      if (metadata) {
        if (isShared && this.scopeMetadata[0]) {
          this.scopeMetadata[0].set(name, metadata);
        }
        this._setVarMetadata(name, metadata);
      }

      if (dimensions.length > 0) {
        const initializer = this._getTypeInitializer(typeSpec, true);

        if (preserve && this._hasVar(name) && dimensions.length === 1) {
          this._emit(
            `${name} = [...${name}, ...Array.from({ length: Math.max(0, ${dimensions[0]} + 1 - ${name}.length) }, () => { const _init = ${initializer}; return typeof _init === 'function' ? _init() : _init; })];`,
          );
        } else if (isRedeclaring) {
          this._emit(`${name} = _makeArray(${initializer}, ${dimensions.join(', ')});`);
        } else {
          this._addVar(name);
          this._emit(`var ${name} = _makeArray(${initializer}, ${dimensions.join(', ')});`);
        }
      } else {
        const initializer = this._getTypeInitializer(typeSpec, false);

        if (isRedeclaring) {
          this._emit(`${name} = ${initializer};`);
        } else {
          this._addVar(name);
          this._emit(`var ${name} = ${initializer};`);
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

      if (!(this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD))) {
        if (!this._checkKw('END')) this._advance();
        continue;
      }

      const fieldToken = this._advance();
      const fieldName = fieldToken?.value;
      if (!fieldName) continue;

      if (this._matchPunc('(')) {
        while (!this._isEnd() && !this._matchPunc(')')) {
          this._advance();
        }
      }

      const typeSpec = this._parseDeclaredTypeSpec(fieldName);
      fields.push({
        name: fieldName,
        spec: typeSpec,
      });

      this._skipToEndOfLine();
      this._skipNewlines();
    }

    this._matchKw('END');
    this._matchKw('TYPE');

    const fieldSpec = fields
      .map((field) => `${field.name}: ${this._typeSpecToRuntimeLiteral(field.spec)}`)
      .join(', ');
    const typeDefinition = Object.create(null);

    for (const field of fields) {
      typeDefinition[String(field.name).toUpperCase()] = field.spec;
    }

    this.typeDefinitions.set(String(typeName).toUpperCase(), typeDefinition);

    this._emit(
      `const ${typeName} = _defineType("${typeName}", { ${fieldSpec} });`,
    );
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
  },

_parseOptionalDimensions() {
    const dimensions = [];

    if (!this._matchPunc('(')) {
      return dimensions;
    }

    do {
      dimensions.push(this._parseExpr());
    } while (this._matchPunc(','));
    this._matchPunc(')');

    return dimensions;
  },

_parseDeclaredTypeSpec(name) {
    if (!this._matchKw('AS')) {
      return this._defaultTypeSpec(name);
    }

    if (!(this._check(TokenType.KEYWORD) || this._check(TokenType.IDENTIFIER))) {
      return this._defaultTypeSpec(name);
    }

    const typeToken = this._advance();
    const typeName = typeToken.value;
    const upperType = typeName.toUpperCase();

    if (upperType === 'STRING' && this._matchOp('*')) {
      return {
        kind: 'fixedString',
        typeName: upperType,
        length: this._parseExpr(),
      };
    }

    if (upperType === 'STRING') {
      return {
        kind: 'string',
        typeName: upperType,
      };
    }

    if (NUMERIC_TYPES.has(upperType)) {
      return {
        kind: 'scalar',
        typeName: upperType,
      };
    }

    return {
      kind: 'type',
      typeName,
    };
  },

_defaultTypeSpec(name) {
    if (name.endsWith('$')) {
      return {
        kind: 'string',
        typeName: 'STRING',
      };
    }

    return {
      kind: 'scalar',
      typeName: 'SINGLE',
    };
  },

_getTypeInitializer(typeSpec, forArray = false) {
    switch (typeSpec.kind) {
      case 'fixedString':
        return forArray
          ? `() => _fixedString("", ${typeSpec.length})`
          : `_fixedString("", ${typeSpec.length})`;
      case 'string':
        return '""';
      case 'type':
        return forArray ? `() => ${typeSpec.typeName}()` : `${typeSpec.typeName}()`;
      default:
        return '0';
    }
  },

  _getTypeMetadata(typeSpec, isArray = false) {
    let metadata = null;

    if (typeSpec.kind === 'fixedString') {
      metadata = {
        kind: 'fixedString',
        length: typeSpec.length,
      };
    } else if (typeSpec.kind === 'string') {
      metadata = {
        kind: 'string',
      };
    } else if (typeSpec.kind === 'scalar') {
      metadata = {
        kind: 'scalar',
        typeName: typeSpec.typeName,
      };
    } else if (typeSpec.kind === 'type') {
      metadata = {
        kind: 'type',
        typeName: typeSpec.typeName,
      };
    }

    if (!metadata) {
      return null;
    }

    return isArray
      ? {
        kind: 'array',
        element: metadata,
      }
      : metadata;
  },

_typeSpecToRuntimeLiteral(typeSpec) {
    if (typeSpec.kind === 'fixedString') {
      return `{ kind: "fixedString", length: ${typeSpec.length} }`;
    }

    if (typeSpec.kind === 'string') {
      return '{ kind: "string" }';
    }

    if (typeSpec.kind === 'type') {
      return `{ kind: "type", typeName: "${typeSpec.typeName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" }`;
    }

    return `{ kind: "scalar", typeName: "${typeSpec.typeName}" }`;
  },
};
