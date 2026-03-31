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
      const storageName = this._resolveStorageName(name);
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
        this._emit(`var ${storageName} = ${this._makeArrayExpression(typeSpec, dimensions)};`);
      } else {
        this._emit(`var ${storageName} = ${initializer};`);
      }
    } while (this._matchPunc(','));
  },

_parseConst() {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return;
    const storageName = this._resolveStorageName(id.value);
    this._consumeOp('=');
    const val = this._parseExpr();
    this._emit(`const ${storageName} = ${val};`);
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
      const storageName = this._resolveStorageName(name);
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
        if (preserve && this._hasVar(name)) {
          this._emit(
            `${storageName} = ${this._makePreservedArrayExpression(storageName, typeSpec, dimensions)};`,
          );
        } else if (isRedeclaring) {
          this._emit(`${storageName} = ${this._makeArrayExpression(typeSpec, dimensions)};`);
        } else {
          this._addVar(name);
          this._emit(`var ${storageName} = ${this._makeArrayExpression(typeSpec, dimensions)};`);
        }
      } else {
        const initializer = this._getTypeInitializer(typeSpec, false);

        if (isRedeclaring) {
          this._emit(`${storageName} = ${initializer};`);
        } else {
          this._addVar(name);
          this._emit(`var ${storageName} = ${initializer};`);
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
      .map((field) => `${JSON.stringify(field.name)}: ${this._typeSpecToRuntimeLiteral(field.spec)}`)
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
      this._emit(`${this._resolveStorageName(id.value)} = _eraseArray(${this._resolveStorageName(id.value)});`);
    } while (this._matchPunc(','));
  },

  _parseOption() {
    if (!this._matchKw('BASE')) {
      this._recordError('Only OPTION BASE is currently supported.');
      return this._skipToEndOfLine();
    }

    const baseExpr = this._parseExpr();
    if (baseExpr !== '0' && baseExpr !== '1') {
      this._recordError('OPTION BASE only supports literal values 0 or 1.');
    }

    this.optionBase = baseExpr === '1' ? 1 : 0;
    this._emit(`// OPTION BASE ${this.optionBase}`);
  },

_parseDefType(_type) {
    const appliedRanges = [];

    while (!this._isStmtEnd() && !this._isEnd()) {
      const startLetter = this._consumeDefTypeLetter();
      if (!startLetter) {
        this._advance();
        continue;
      }

      let endLetter = startLetter;
      if (this._matchOp('-') || this._matchPunc('-')) {
        const explicitEnd = this._consumeDefTypeLetter();
        if (explicitEnd) {
          endLetter = explicitEnd;
        }
      }

      this._setDefaultTypeLetterRange(_type, startLetter, endLetter);
      appliedRanges.push(
        startLetter === endLetter ? startLetter : `${startLetter}-${endLetter}`,
      );
      this._matchPunc(',');
    }

    this._emit(
      `// DEF${_type} applied to ${appliedRanges.join(', ') || 'no ranges'}`,
    );
  },

  _consumeDefTypeLetter() {
    if (!(this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD))) {
      return '';
    }

    const letter = String(this._peek()?.value || '')
      .trim()
      .charAt(0)
      .toUpperCase();
    if (!/^[A-Z]$/.test(letter)) {
      return '';
    }

    this._advance();
    return letter;
  },

  _setDefaultTypeLetterRange(typeName, startLetter, endLetter) {
    const normalizedType = String(typeName || 'SINGLE').toUpperCase();
    const start = startLetter.charCodeAt(0);
    const end = endLetter.charCodeAt(0);
    const lower = Math.min(start, end);
    const upper = Math.max(start, end);

    if (!this.defaultTypeMap) {
      this.defaultTypeMap = Object.create(null);
    }

    for (let code = lower; code <= upper; code++) {
      this.defaultTypeMap[String.fromCharCode(code)] = normalizedType;
    }
  },

  _arrayDescriptorArgs(dimensions) {
    return dimensions.map(
      (dimension) => `{ lower: ${dimension.lower}, upper: ${dimension.upper} }`,
    );
  },

  _makeArrayExpression(typeSpec, dimensions) {
    return `_makeArray(${[
      this._getTypeInitializer(typeSpec, true),
      ...this._arrayDescriptorArgs(dimensions),
    ].join(', ')})`;
  },

  _makePreservedArrayExpression(storageName, typeSpec, dimensions) {
    return `_redimArrayPreserve(${[
      storageName,
      this._getTypeInitializer(typeSpec, true),
      ...this._arrayDescriptorArgs(dimensions),
    ].join(', ')})`;
  },

  _parseLiteralDimensionValue(expression) {
    const text = String(expression || '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
      return null;
    }

    const numeric = Number(text);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
  },

  _validateDimensionDescriptor(lowerExpr, upperExpr) {
    const lower = this._parseLiteralDimensionValue(lowerExpr);
    const upper = this._parseLiteralDimensionValue(upperExpr);
    if (lower === null || upper === null) {
      return;
    }

    if (upper < lower) {
      this._recordError('Array lower bound cannot exceed upper bound.');
    }
  },

_parseOptionalDimensions() {
    const dimensions = [];

    if (!this._matchPunc('(')) {
      return dimensions;
    }

    do {
      const firstBound = this._parseExpr();
      if (this._matchKw('TO')) {
        const upperBound = this._parseExpr();
        this._validateDimensionDescriptor(firstBound, upperBound);
        dimensions.push({
          lower: firstBound,
          upper: upperBound,
        });
      } else {
        dimensions.push({
          lower: String(this.optionBase || 0),
          upper: firstBound,
        });
      }
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
    const variableName = String(name || '').trim();
    if (variableName.endsWith('$')) {
      return {
        kind: 'string',
        typeName: 'STRING',
      };
    }
    if (variableName.endsWith('%')) {
      return {
        kind: 'scalar',
        typeName: 'INTEGER',
      };
    }
    if (variableName.endsWith('&')) {
      return {
        kind: 'scalar',
        typeName: 'LONG',
      };
    }
    if (variableName.endsWith('!')) {
      return {
        kind: 'scalar',
        typeName: 'SINGLE',
      };
    }
    if (variableName.endsWith('#')) {
      return {
        kind: 'scalar',
        typeName: 'DOUBLE',
      };
    }

    const firstLetter = variableName.charAt(0).toUpperCase();
    const mappedType =
      /^[A-Z]$/.test(firstLetter) && this.defaultTypeMap
        ? this.defaultTypeMap[firstLetter]
        : null;
    if (mappedType === 'STRING') {
      return {
        kind: 'string',
        typeName: 'STRING',
      };
    }

    return {
      kind: 'scalar',
      typeName: mappedType || 'SINGLE',
    };
  },

  _defaultInitializerForName(name) {
    return this._getTypeInitializer(this._defaultTypeSpec(name), false);
  },

  _defaultMetadataForName(name, isArray = false) {
    return this._getTypeMetadata(this._defaultTypeSpec(name), isArray);
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
