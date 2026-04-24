// Auto-extracted Mixin
'use strict';
const { TokenType } = require('../constants');
module.exports = {
  _init(tokens, target = 'node', options = {}) {
    this.tokens = tokens;
    const normalizedTarget = String(target || 'node').toLowerCase();
    this.target = normalizedTarget.startsWith('web') ? 'web' : 'node';
    this.wasmAccelerator =
      Boolean(options.wasmAccelerator) ||
      normalizedTarget === 'node-wasm' ||
      normalizedTarget === 'web-wasm';

    this.pos = 0;
    this.indent = 0;

    /** @type {string[]} Pre-allocate output array for better performance */
    this.output = [];
    // Estimate output size: ~3 lines per token on average
    const estimatedLines = Math.floor(tokens.length * 3);
    if (estimatedLines > 100) {
      this.output = new Array(estimatedLines);
      this.output.length = 0;
    }

    /** @type {Array<{line: number, message: string, column: number}>} */
    this.errors = [];

    /** @type {Set<string>} Global SHARED variables */
    this.scopes = [new Set()];
    this.scopeMetadata = [new Map()];
    this.scopeStorageOverrides = [new Map()];
    this.scopeKinds = ['global'];
    this.sharedVars = new Set();
    this.typeDefinitions = new Map();
    this.defaultTypeMap = Object.create(null);
    this.optionBase = 0;

    /** @type {string[]} DATA statement values */
    this.dataValues = [];

    /** @type {{ name: string, resultVar: string } | null} Current FUNCTION context */
    this.currentFunction = null;
    this.currentProcedure = null;

    /** @type {Set<string>} Collected labels for GOTO/GOSUB support */
    this.labels = new Set();

    /** @type {Map<string, string[]>} Label code blocks for GOTO state machine */
    this.labelBlocks = new Map();

    // Performance optimization: Cache frequently accessed token properties
    this._cachedPeek = null;
    this._cachedPeekPos = -1;
    this._insideRawCapture = false;
    this._rawCaptureContainsJump = false;
    this._pendingLoopClosures = [];
  },

  parse() {
    if (typeof this._parseWithAst === 'function') {
      return this._parseWithAst();
    }

    return this._parseLegacy();
  },

  _parseLegacy() {
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
        this._recordError(e);
        this._sync();
      }
    }

    this._emitFooter();
    return this.output.join('\n');
  },

  get currentVars() {
    return this.scopes[this.scopes.length - 1];
  },

  get currentScopeKind() {
    return this.scopeKinds[this.scopeKinds.length - 1];
  },

  get currentMetadata() {
    return this.scopeMetadata[this.scopeMetadata.length - 1];
  },

  get currentStorageOverrides() {
    return this.scopeStorageOverrides[this.scopeStorageOverrides.length - 1];
  },

  _addVar(name) {
    this.currentVars.add(name);
  },

  _setVarMetadata(name, metadata) {
    if (!metadata) return;
    this.currentMetadata.set(name, metadata);
  },

  _setStorageOverride(name, storageName) {
    if (!storageName) return;
    this.currentStorageOverrides.set(name, storageName);
  },

  _isCurrentFunctionName(name) {
    return this.currentFunction?.name === name;
  },

  _isSafeJavaScriptIdentifier(name) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(name || ''));
  },

  _encodeStorageName(name) {
    const source = String(name || '');
    const suffixMap = {
      '%': '_pct',
      '!': '_sgl',
      '#': '_dbl',
      '&': '_lng',
      '$': '$',
    };

    let encoded = '';
    for (const ch of source) {
      if (/[A-Za-z0-9_$]/.test(ch)) {
        encoded += ch;
      } else if (suffixMap[ch]) {
        encoded += suffixMap[ch];
      } else {
        encoded += `_x${ch.charCodeAt(0).toString(16)}`;
      }
    }

    if (!encoded || !/^[A-Za-z_$]/.test(encoded)) {
      encoded = `_${encoded}`;
    }

    return `__qb_${encoded}`;
  },

  _memberAccessFragment(member) {
    const name = String(member || '');
    return this._isSafeJavaScriptIdentifier(name)
      ? `.${name}`
      : `[${JSON.stringify(name)}]`;
  },

  _resolveLabelName(label) {
    return this._encodeStorageName(`label_${String(label || '')}`);
  },

  _resolveStorageName(name) {
    const storageOverride = this._getStorageOverride(name);
    if (storageOverride) return storageOverride;

    return this._isCurrentFunctionName(name)
      ? this.currentFunction.resultVar
      : (this._isSafeJavaScriptIdentifier(name) ? name : this._encodeStorageName(name));
  },

  _hasVar(name) {
    if (this._isCurrentFunctionName(name)) return true;

    // Check current scope first
    if (this.currentVars.has(name)) return true;

    // If in global scope (depth 1), no upper scopes to check
    if (this.scopes.length === 1) return false;

    // Labels share the surrounding BASIC scope, so they can see outer vars.
    if (this.currentScopeKind === 'label') {
      for (let i = this.scopes.length - 2; i >= 0; i--) {
        if (this.scopes[i].has(name)) return true;
      }
      return false;
    }

    // If in SUB/FUNCTION, only access global variables if they are SHARED
    return this.sharedVars.has(name);
  },

  _getVarMetadata(name) {
    if (this.currentMetadata.has(name)) return this.currentMetadata.get(name);

    if (this.scopeMetadata.length === 1) {
      return null;
    }

    if (this.currentScopeKind === 'label') {
      for (let i = this.scopeMetadata.length - 2; i >= 0; i--) {
        const metadata = this.scopeMetadata[i].get(name);
        if (metadata) return metadata;
      }
      return null;
    }

    if (this.sharedVars.has(name)) {
      return this.scopeMetadata[0].get(name) || null;
    }

    return null;
  },

  _getStorageOverride(name) {
    if (this.currentStorageOverrides.has(name)) {
      return this.currentStorageOverrides.get(name);
    }

    if (this.scopeStorageOverrides.length === 1) {
      return null;
    }

    if (this.currentScopeKind === 'label') {
      for (let i = this.scopeStorageOverrides.length - 2; i >= 0; i--) {
        const storageName = this.scopeStorageOverrides[i].get(name);
        if (storageName) return storageName;
      }
      return null;
    }

    if (this.sharedVars.has(name)) {
      return this.scopeStorageOverrides[0].get(name) || null;
    }

    return null;
  },

  _getTypeDefinition(typeName) {
    if (!typeName) return null;
    return this.typeDefinitions.get(String(typeName).toUpperCase()) || null;
  },

  _initializerForMetadata(metadata, fallback = '0') {
    if (!metadata) return fallback;

    if (metadata.kind === 'fixedString') {
      return `_fixedString("", ${metadata.length})`;
    }

    if (metadata.kind === 'string') {
      return '""';
    }

    if (metadata.kind === 'type') {
      return `${metadata.typeName}()`;
    }

    if (metadata.kind === 'array') {
      return '[]';
    }

    return fallback;
  },

  _metadataToRuntimeLiteral(metadata) {
    if (!metadata) {
      return 'undefined';
    }

    if (metadata.kind === 'fixedString') {
      return `{ kind: "fixedString", length: ${metadata.length} }`;
    }

    if (metadata.kind === 'string') {
      return '{ kind: "string" }';
    }

    if (metadata.kind === 'scalar') {
      return `{ kind: "scalar", typeName: "${String(metadata.typeName || 'SINGLE').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" }`;
    }

    if (metadata.kind === 'type') {
      return `{ kind: "type", typeName: "${String(metadata.typeName || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" }`;
    }

    if (metadata.kind === 'array') {
      return `{ kind: "array", element: ${this._metadataToRuntimeLiteral(metadata.element)} }`;
    }

    return 'undefined';
  },

  _getTargetMetadata(name, options = {}) {
    let metadata = this._getVarMetadata(name);
    if (!metadata) {
      return null;
    }

    if (options.arrayElement) {
      metadata = metadata.kind === 'array' ? metadata.element : metadata?.element;
    }

    const members = Array.isArray(options.members) ? options.members : [];
    for (const member of members) {
      if (!metadata || metadata.kind !== 'type') {
        return null;
      }

      const typeDefinition = this._getTypeDefinition(metadata.typeName);
      const fieldSpec = typeDefinition?.[String(member).toUpperCase()];
      if (!fieldSpec) {
        return null;
      }

      metadata = this._getTypeMetadata(fieldSpec);
    }

    return metadata || null;
  },

  _parseAssignableTarget(options = {}) {
    const contextLabel = options.contextLabel || 'assignment';
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) {
      this._raiseSyntaxError(`Expected variable after ${contextLabel}`);
    }

    const name = id.value;
    const storageName = this._resolveStorageName(name);
    const indices = [];
    const members = [];
    const baseMetadata = this._getVarMetadata(name);

    if (this._matchPunc('(')) {
      do {
        indices.push(this._parseExpr());
      } while (this._matchPunc(','));
      this._matchPunc(')');
    }

    while (this._matchPunc('.')) {
      const member = this._consumeNameToken();
      if (!member) {
        this._raiseSyntaxError(`Expected member name after "." in ${contextLabel}`);
      }
      members.push(member.value);
    }

    const isArrayElement = indices.length > 0;
    const wrapOptions = {};
    if (isArrayElement) wrapOptions.arrayElement = true;
    if (members.length > 0) wrapOptions.members = members.slice();

    const inferredMetadata =
      !baseMetadata &&
      members.length === 0 &&
      typeof this._defaultMetadataForName === 'function'
        ? this._defaultMetadataForName(name, isArrayElement)
        : null;
    if (isArrayElement && inferredMetadata?.kind === 'array') {
      inferredMetadata.autoArray = true;
    }

    const resolvedMetadata = baseMetadata || inferredMetadata;
    const arrayElementMetadata =
      resolvedMetadata?.kind === 'array' ? resolvedMetadata.element : null;
    const arrayElementInitializer = this._initializerForMetadata(
      arrayElementMetadata,
      typeof this._defaultInitializerForName === 'function'
        ? this._defaultInitializerForName(name)
        : (name.endsWith('$') ? '""' : '0'),
    );

    if (!this._hasVar(name) && !this._isCurrentFunctionName(name)) {
      this._addVar(name);
      if (inferredMetadata) {
        this._setVarMetadata(name, inferredMetadata);
      }
      const initializer = isArrayElement
        ? `_autodimArray(${arrayElementInitializer}, ${this.optionBase}, ${indices.join(', ')})`
        : this._initializerForMetadata(
          resolvedMetadata,
          members.length > 0
            ? '{}'
            : (typeof this._defaultInitializerForName === 'function'
              ? this._defaultInitializerForName(name)
              : (name.endsWith('$') ? '""' : '0')),
        );
      this._emit(`var ${storageName} = ${initializer};`);
    } else if (isArrayElement) {
      if (resolvedMetadata?.kind === 'array' && resolvedMetadata.autoArray) {
        this._emit(
          `${storageName} = _ensureAutoArrayBounds(${storageName}, ${arrayElementInitializer}, ${this.optionBase}, ${indices.join(', ')});`,
        );
      } else {
        this._emit(`_qbAssertArrayPath(${storageName}, ${indices.join(', ')});`);
      }
    }

    let targetExpr = storageName;
    if (isArrayElement) {
      for (let i = 0; i < indices.length - 1; i++) {
        const parentPath = `${storageName}${indices
          .slice(0, i + 1)
          .map((index) => `[${index}]`)
          .join('')}`;
        this._emit(`if (!Array.isArray(${parentPath})) ${parentPath} = [];`);
      }

      targetExpr = `${storageName}${indices.map((index) => `[${index}]`).join('')}`;
    }

    if (members.length > 0) {
      const baseTargetMetadata = this._getTargetMetadata(name, {
        arrayElement: isArrayElement,
      });
      const baseObjectInitializer = this._initializerForMetadata(baseTargetMetadata, '{}');
      this._emit(
        `if (${targetExpr} == null || typeof ${targetExpr} !== "object") ${targetExpr} = ${baseObjectInitializer};`,
      );

      let ownerPath = targetExpr;
      for (let i = 0; i < members.length - 1; i++) {
        ownerPath = `${ownerPath}${this._memberAccessFragment(members[i])}`;
        const memberMetadata = this._getTargetMetadata(name, {
          arrayElement: isArrayElement,
          members: members.slice(0, i + 1),
        });
        const memberInitializer = this._initializerForMetadata(memberMetadata, '{}');
        this._emit(
          `if (${ownerPath} == null || typeof ${ownerPath} !== "object") ${ownerPath} = ${memberInitializer};`,
        );
      }

      targetExpr = `${ownerPath}${this._memberAccessFragment(members[members.length - 1])}`;
    }

    return {
      name,
      targetExpr,
      metadata: this._getTargetMetadata(name, wrapOptions),
      isStringLike: this._isStringLike(name, wrapOptions),
      wrapOptions,
      indices,
    };
  },

  _parseValueReference(options = {}) {
    const contextLabel = options.contextLabel || 'value';
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) {
      this._raiseSyntaxError(`Expected variable after ${contextLabel}`);
    }

    const name = id.value;
    const storageName = this._resolveStorageName(name);
    const indices = [];
    const members = [];

    if (this._matchPunc('(')) {
      do {
        indices.push(this._parseExpr());
      } while (this._matchPunc(','));
      this._matchPunc(')');
    }

    while (this._matchPunc('.')) {
      const member = this._consumeNameToken();
      if (!member) {
        this._raiseSyntaxError(`Expected member name after "." in ${contextLabel}`);
      }
      members.push(member.value);
    }

    const wrapOptions = {};
    if (indices.length > 0) wrapOptions.arrayElement = true;
    if (members.length > 0) wrapOptions.members = members.slice();

    return {
      name,
      expr:
        indices.length > 0
          ? `(_qbArrayGet(${storageName}, ${indices.join(', ')}))${members.map((member) => this._memberAccessFragment(member)).join('')}`
          : `${storageName}${members.map((member) => this._memberAccessFragment(member)).join('')}`,
      metadata: this._getTargetMetadata(name, wrapOptions),
      wrapOptions,
    };
  },

  _wrapAssignmentValue(name, valueExpression, options = {}) {
    const targetMetadata = this._getTargetMetadata(name, options);
    if (!targetMetadata) {
      const defaultTypeSpec =
        typeof this._defaultTypeSpec === 'function'
          ? this._defaultTypeSpec(name)
          : null;
      if (defaultTypeSpec && typeof this._typeSpecToRuntimeLiteral === 'function') {
        return `_coerceTypedValue(${this._typeSpecToRuntimeLiteral(defaultTypeSpec)}, ${valueExpression})`;
      }
      return name.endsWith('$') ? `String(${valueExpression})` : valueExpression;
    }

    return `_coerceTypedValue(${this._metadataToRuntimeLiteral(targetMetadata)}, ${valueExpression})`;
  },

  _isStringLike(name, options = {}) {
    if (name.endsWith('$')) return true;

    const targetMetadata = this._getTargetMetadata(name, options);
    const defaultTypeSpec =
      !targetMetadata && typeof this._defaultTypeSpec === 'function'
        ? this._defaultTypeSpec(name)
        : null;

    return (
      targetMetadata?.kind === 'string' ||
      targetMetadata?.kind === 'fixedString' ||
      defaultTypeSpec?.kind === 'string'
    );
  },

  _enterScope(kind = 'local') {
    this.scopes.push(new Set());
    this.scopeMetadata.push(new Map());
    this.scopeStorageOverrides.push(new Map());
    this.scopeKinds.push(kind);
  },

  _exitScope() {
    this.scopes.pop();
    this.scopeMetadata.pop();
    this.scopeStorageOverrides.pop();
    this.scopeKinds.pop();
  },

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
          else if (this._check(TokenType.IDENTIFIER))
            val = `"${this._advance().value}"`;
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
  },

  _recordError(errorOrMessage) {
    const tok = this._peek();
    const message =
      typeof errorOrMessage === 'string'
        ? errorOrMessage
        : errorOrMessage?.message || 'Unknown parser error';
    this.errors.push({
      line:
        typeof errorOrMessage?.line === 'number'
          ? errorOrMessage.line
          : (tok?.line || 1) - 1,
      message,
      column:
        typeof errorOrMessage?.column === 'number'
          ? errorOrMessage.column
          : tok?.col || 0,
      severity: errorOrMessage?.severity || 'error',
      category: errorOrMessage?.category || 'syntax',
    });
  },

  _raiseSyntaxError(message, token = this._peek(), category = 'syntax') {
    const error = new Error(message);
    error.line = (token?.line || 1) - 1;
    error.column = token?.col || 0;
    error.severity = 'error';
    error.category = category;
    throw error;
  },

  _sync() {
    this._advance();
    while (!this._isEnd()) {
      if (this._prev()?.type === TokenType.NEWLINE) return;
      if (this._check(TokenType.KEYWORD)) return;
      this._advance();
    }
  },

  _emit(code) {
    this.output.push('  '.repeat(this.indent) + code);
  },

  _emitSourceTrace(sourceLine) {
    if (!Number.isInteger(sourceLine) || sourceLine < 0) {
      return;
    }
    this._emit(`_qbTrackSourceLine(${sourceLine});`);
  },

  _emitTracked(code, sourceLine) {
    this._emitSourceTrace(sourceLine);
    this._emit(code);
  },

  _emitHeader() {
    this.output.push(`// Generated by QBasic Nexus
'use strict';
`);

    // Runtime environment abstraction
    if (this.target === 'node') {
      this.output.push(`
const readline = require('readline');
const { spawn } = require('child_process');
const _nodeFs = require('fs');
const _nodePath = require('path');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY || false,
  crlfDelay: Infinity,
});

let _nodeCursorCol = 1;
function _print(text, newline) {
  const rawContent = String(text);
  let content = '';
  const parts = rawContent.split('\\x01');
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const type = parts[i][0];
      const val = parseInt(parts[i].substring(1), 10);
      if (type === 'S') {
        const spaces = Math.max(0, val);
        content += ' '.repeat(spaces);
        _nodeCursorCol += spaces;
      } else if (type === 'T') {
        if (val >= _nodeCursorCol) {
          const spaces = val - _nodeCursorCol;
          content += ' '.repeat(spaces);
          _nodeCursorCol += spaces;
        }
      } else if (type === 'Z') {
        const nextZone = Math.floor((_nodeCursorCol - 1) / 14) * 14 + 14 + 1;
        const spaces = nextZone - _nodeCursorCol;
        content += ' '.repeat(spaces);
        _nodeCursorCol += spaces;
      } else {
        content += parts[i];
      }
    } else {
      const str = parts[i];
      content += str;
      const lines = str.split('\\n');
      if (lines.length > 1) {
        _nodeCursorCol = lines[lines.length - 1].length + 1;
      } else {
        _nodeCursorCol += str.length;
      }
    }
  }
  if (newline) _nodeCursorCol = 1;
  text = content;
  if (newline) console.log(text);
  else process.stdout.write(String(text));
}

function _input(prompt) {
  return new Promise(resolve => {
    if (rl.terminal === false || !process.stdin.isTTY) {
      process.stdout.write(prompt || '');
    }
    rl.question(prompt || '', answer => resolve(answer));
  });
}

function _cls() {
  console.clear();
}
`);
    } else if (this.target === 'web') {
      this.output.push(`
// Web Runtime Environment (Optimized)
// Safe runtime reference — works in both browser and Node.js (pkg)
const _runtime = (typeof globalThis !== 'undefined' && globalThis.runtime) ? globalThis.runtime
               : (typeof window   !== 'undefined' && window.runtime)       ? window.runtime
               : {};
const _print = _runtime.print || console.log;
const _input = _runtime.input || (typeof prompt !== 'undefined' ? prompt : (() => ''));
const _cls = _runtime.cls || console.clear;
const _locate = _runtime.locate || (() => {});
const _color = _runtime.color || (() => {});
const _beep = _runtime.beep || (() => {});
const _sound = _runtime.sound || (() => {});
const _play = _runtime.play || (() => {});
const _screen = _runtime.screen || (() => {});
const _width = _runtime.width || (() => {});
const _graphicsPixels = new Map();
let _graphicsCursorX = 0;
let _graphicsCursorY = 0;
function _graphicsPixelKey(x, y) {
  return Math.trunc(Number(x) || 0) + ',' + Math.trunc(Number(y) || 0);
}
async function _defaultPset(x, y, c, isStep) {
  const absX = Math.trunc((isStep ? _graphicsCursorX : 0) + (Number(x) || 0));
  const absY = Math.trunc((isStep ? _graphicsCursorY : 0) + (Number(y) || 0));
  _graphicsPixels.set(_graphicsPixelKey(absX, absY), c === undefined ? 7 : Math.trunc(Number(c) || 0));
  _graphicsCursorX = absX;
  _graphicsCursorY = absY;
}
async function _defaultPreset(x, y, c, isStep) {
  const absX = Math.trunc((isStep ? _graphicsCursorX : 0) + (Number(x) || 0));
  const absY = Math.trunc((isStep ? _graphicsCursorY : 0) + (Number(y) || 0));
  _graphicsPixels.set(_graphicsPixelKey(absX, absY), c === undefined ? 0 : Math.trunc(Number(c) || 0));
  _graphicsCursorX = absX;
  _graphicsCursorY = absY;
}
function _defaultPoint(x, y) {
  if (y === undefined) {
    const selector = Math.trunc(Number(x) || 0);
    if (selector === 0) return _graphicsCursorX;
    if (selector === 1) return _graphicsCursorY;
    return 0;
  }
  return _graphicsPixels.get(_graphicsPixelKey(x, y)) ?? 0;
}
const _pset = _runtime.pset || _defaultPset;
const _preset = _runtime.preset || _defaultPreset;
const _point = _runtime.point || _defaultPoint;
const _line = _runtime.line || (() => {});
const _circle = _runtime.circle || (() => {});
const _get = _runtime.get || (() => {});
const _put = _runtime.put || (() => {});
const _paint = _runtime.paint || (() => {});
const _draw = _runtime.draw || (() => {});
const _view = _runtime.view || (() => {});
const _viewPrint = _runtime.viewPrint || (() => {});
const _window = _runtime.window || (() => {});
const _palette = _runtime.palette || (() => {});
const _paletteUsing = _runtime.paletteUsing || (() => {});
const _pcopy = _runtime.pcopy || (() => {});
const _fullscreen = _runtime.fullscreen || (() => {});
const _dest = _runtime.dest || (() => {});
const _source = _runtime.source || (() => {});
const _font = _runtime.font || (() => {});
const _setAlpha = _runtime.setAlpha || (() => {});
const _clearColor = _runtime.clearColor || (() => {});
const _PAINT = _paint;
const _mouseinput = _runtime.mouseinput || (() => 0);
const _mousex = _runtime.mousex || (() => 0);
const _mousey = _runtime.mousey || (() => 0);
const _mousebutton = _runtime.mousebutton || (() => 0);
const _timer = _runtime.timer || (() => Date.now() / 1000);

// Advanced Image Functions
const _LOADIMAGE = _runtime.loadimage || (() => -1);
const _NEWIMAGE = _runtime.newimage || (() => -1);
const _COPYIMAGE = _runtime.copyimage || (() => -1);
const _FREEIMAGE = _runtime.freeimage || (() => {});
const _PUTIMAGE = _runtime.putimage || (() => {});
const _PRINTSTRING = _runtime.printstring || (() => {});

// Advanced Mouse Functions
const _MOUSEWHEEL = _runtime.mousewheel || (() => 0);
const _MOUSEHIDE = _runtime.mousehide || (() => {});
const _MOUSESHOW = _runtime.mouseshow || (() => {});

// Advanced Keyboard Functions
const _KEYDOWN = _runtime.keydown || (() => 0);
const _KEYHIT = _runtime.keyhit || (() => 0);
const _KEYCLEAR = _runtime.keyclear || (() => {});

// Advanced Sound Functions
const _SNDOPEN = _runtime.sndopen || (() => -1);
const _SNDPLAY = _runtime.sndplay || (() => {});
const _SNDLOOP = _runtime.sndloop || (() => {});
const _SNDCLOSE = _runtime.sndclose || (() => {});

// RGB Color Functions
const _RGB32 = _runtime.rgb32 || ((r, g, b, a) => ((a||255) << 24) | (r << 16) | (g << 8) | b);
const _RGBA32 = _runtime.rgba32 || _RGB32;
const _RED32 = _runtime.red32 || ((c) => (c >> 16) & 0xFF);
const _GREEN32 = _runtime.green32 || ((c) => (c >> 8) & 0xFF);
const _BLUE32 = _runtime.blue32 || ((c) => c & 0xFF);
const _ALPHA32 = _runtime.alpha32 || ((c) => (c >> 24) & 0xFF);

// Performance Functions
const _LIMIT = _runtime.limit || (async () => {});
const _DISPLAY = _runtime.display || (() => {});

// Advanced Math Functions
const _CEIL = _runtime.ceil || Math.ceil;
const _ROUND = _runtime.round || Math.round;
const _HYPOT = _runtime.hypot || Math.hypot;
const _D2R = _runtime.d2r || ((d) => d * (Math.PI / 180));
const _R2D = _runtime.r2d || ((r) => r * (180 / Math.PI));

// Extended Math Functions
const _ACOS = _runtime.acos || Math.acos;
const _ASIN = _runtime.asin || Math.asin;
const _ATAN2 = _runtime.atan2 || Math.atan2;
const _FIX = _runtime.fix || ((x) => x < 0 ? Math.ceil(x) : Math.floor(x));
const _SGN = _runtime.sgn || ((x) => x > 0 ? 1 : x < 0 ? -1 : 0);

// String Functions (for convenience)
const _INSTR = _runtime.instr || ((a, b, c) => {
  let start = 1, source, search;
  if (c !== undefined) { start = a; source = String(b); search = String(c); }
  else { source = String(a); search = String(b); }
  const idx = source.indexOf(search, start - 1);
  return idx < 0 ? 0 : idx + 1;
});

// System Functions
const _DESKTOPWIDTH = _runtime.desktopwidth || (() => (typeof screen !== 'undefined' ? screen.width : 1920));
const _DESKTOPHEIGHT = _runtime.desktopheight || (() => (typeof screen !== 'undefined' ? screen.height : 1080));

// Font System
const _LOADFONT = _runtime.loadfont || (async () => 0);
const _FREEFONT = _runtime.freefont || (() => {});
const _SETFONT  = _runtime.font     || (() => {});
const _FONTWIDTH  = _runtime.fontwidth  || (() => 8);
const _FONTHEIGHT = _runtime.fontheight || (() => 16);

// PRINT USING
const _PRINTUSING = _runtime.printusing || ((fmt, ...v) => String(v.join('')));

// WRITE helpers
const _writeQuoted   = _runtime.writeQuoted   || ((v) => typeof v === 'string' ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const _writeFileLine = typeof _runtime.writeFileLine === 'function'
  ? _runtime.writeFileLine.bind(_runtime)
  : (async (filenum, line) => {
    await _printFile(filenum, String(line ?? '') + '\\n');
  });

// MID$ assignment helper
function _midAssign(target, start, length, replacement) {
  const s = String(target || '');
  const r = String(replacement || '');
  const st = Math.max(0, Math.floor(Number(start)) - 1);
  if (st >= s.length) return s;
  const maxReplaceable = s.length - st;
  let len = length !== undefined ? Math.floor(Number(length)) : r.length;
  len = Math.min(len, r.length, maxReplaceable);
  if (len <= 0) return s;
  return s.substring(0, st) + r.substring(0, len) + s.substring(st + len);
}

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

const _MAIN_MEMORY_SIZE = 1024 * 1024;
const _mainMemory = new Uint8Array(_MAIN_MEMORY_SIZE);
const _ioPorts = new Uint8Array(65536);
let _defSegBase = 0;

function _normalizeByte(value) {
  return Math.trunc(Number(value) || 0) & 0xFF;
}

function _normalizeWord(value) {
  return Math.trunc(Number(value) || 0) & 0xFFFF;
}

function _resolveMemoryAddress(addr) {
  const numeric = Math.trunc(Number(addr) || 0);
  const absolute = _defSegBase + numeric;
  if (absolute < 0) return 0;
  if (absolute >= _mainMemory.length) return _mainMemory.length - 1;
  return absolute;
}

function _coerceMemoryView(target) {
  if (target && target._qbasicMem) {
    if (target.freed) return new Uint8Array(0);
    if (target.view instanceof Uint8Array) return target.view;
  }
  if (target === undefined || target === null || target === 0) {
    return _mainMemory;
  }
  if (target instanceof Uint8Array) return target;
  if (ArrayBuffer.isView(target)) {
    return new Uint8Array(
      target.buffer,
      target.byteOffset,
      target.byteLength,
    );
  }
  if (target instanceof ArrayBuffer) return new Uint8Array(target);
  if (target && target.buffer instanceof ArrayBuffer) {
    const byteOffset = Number(target.byteOffset) || 0;
    const byteLength = Number(target.byteLength) || target.buffer.byteLength;
    return new Uint8Array(target.buffer, byteOffset, byteLength);
  }
  return _mainMemory;
}

function _createMemBlock(view, metadata = {}) {
  const memView = _coerceMemoryView(view);
  return {
    _qbasicMem: true,
    view: memView,
    byteOffset: Number(metadata.byteOffset) || memView.byteOffset || 0,
    byteLength: Number(metadata.byteLength) || memView.length || 0,
    type: metadata.type || '_MEM',
    imageHandle: metadata.imageHandle ?? null,
    sync: typeof metadata.sync === 'function' ? metadata.sync : null,
    freed: false,
  };
}

function _syncMemoryBlock(mem) {
  if (mem && typeof mem.sync === 'function' && !mem.freed) {
    mem.sync();
  }
}

function _peek(addr) {
  return _mainMemory[_resolveMemoryAddress(addr)];
}

function _poke(addr, value) {
  _mainMemory[_resolveMemoryAddress(addr)] = _normalizeByte(value);
}

function _inp(port) {
  return _ioPorts[_normalizeWord(port)];
}

function _out(port, value) {
  _ioPorts[_normalizeWord(port)] = _normalizeByte(value);
  return _ioPorts[_normalizeWord(port)];
}

async function _wait(port, andMask, xorMask) {
  const normalizedPort = _normalizeWord(port);
  const andValue = _normalizeByte(andMask);
  const xorValue = _normalizeByte(xorMask);

  while (((_ioPorts[normalizedPort] ^ xorValue) & andValue) === 0) {
    await _sleep(1);
  }
}

function _defSeg(segment) {
  if (segment === undefined || segment === null || segment === '') {
    _defSegBase = 0;
    return;
  }
  _defSegBase = Math.max(0, Math.trunc(Number(segment) || 0) << 4);
}

function _memnew(bytes) {
  const byteLength = Math.max(0, Math.trunc(Number(bytes) || 0));
  return _createMemBlock(new Uint8Array(byteLength), {
    byteLength,
    type: '_MEMNEW',
  });
}

function _memexists(mem) {
  if (!mem || mem.freed) return 0;
  return _coerceMemoryView(mem).length > 0 ? -1 : 0;
}

function _offset(value) {
  if (value && value._qbasicMem) {
    return Number(value.byteOffset) || 0;
  }
  if (ArrayBuffer.isView(value)) {
    return Number(value.byteOffset) || 0;
  }
  if (value instanceof ArrayBuffer) {
    return 0;
  }
  if (value && value.buffer instanceof ArrayBuffer) {
    return Number(value.byteOffset) || 0;
  }
  return 0;
}

function _mem(value) {
  if (value && value._qbasicMem) {
    return value;
  }
  if (value === undefined || value === null || value === 0) {
    return _createMemBlock(_mainMemory, {
      byteLength: _mainMemory.length,
      type: '_MAINMEM',
    });
  }
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer || value?.buffer instanceof ArrayBuffer) {
    const view = _coerceMemoryView(value);
    return _createMemBlock(view, {
      byteOffset: view.byteOffset || 0,
      byteLength: view.length || 0,
    });
  }
  if (typeof value === 'string') {
    const bytes = _binaryStringToBytes(value);
    return _createMemBlock(bytes, {
      byteLength: bytes.length,
      type: 'STRING',
    });
  }
  if (Array.isArray(value)) {
    const bytes = Uint8Array.from(value.map(_normalizeByte));
    return _createMemBlock(bytes, {
      byteLength: bytes.length,
      type: 'ARRAY',
    });
  }
  return _createMemBlock(_mainMemory, {
    byteLength: _mainMemory.length,
    type: '_MAINMEM',
  });
}

function _memimage(handle) {
  if (typeof _runtime !== 'undefined' && typeof _runtime.memimage === 'function') {
    const block = _runtime.memimage(handle);
    if (block && block._qbasicMem) {
      return block;
    }
  }
  return _memnew(0);
}

function _memfree(mem) {
  if (mem && typeof mem === 'object') {
    mem.freed = true;
    if (mem.view instanceof Uint8Array && mem.type === '_MEMNEW') {
      mem.view = new Uint8Array(0);
      mem.byteLength = 0;
    }
  }
}

function _memcopy(src, srcOff, bytes, dst, dstOff) {
  const sourceView = _coerceMemoryView(src);
  const destinationView = _coerceMemoryView(dst);
  const sourceOffset = Math.max(0, Math.trunc(Number(srcOff) || 0));
  const destinationOffset = Math.max(0, Math.trunc(Number(dstOff) || 0));
  const byteCount = Math.max(0, Math.trunc(Number(bytes) || 0));
  const safeCount = Math.min(
    byteCount,
    Math.max(0, sourceView.length - sourceOffset),
    Math.max(0, destinationView.length - destinationOffset),
  );

  if (safeCount <= 0) return;

  destinationView.set(
    sourceView.slice(sourceOffset, sourceOffset + safeCount),
    destinationOffset,
  );
  _syncMemoryBlock(dst);
}

function _memfill(mem, off, bytes, val) {
  const view = _coerceMemoryView(mem);
  const offset = Math.max(0, Math.trunc(Number(off) || 0));
  const byteCount = Math.max(0, Math.trunc(Number(bytes) || 0));
  const fillValue = _normalizeByte(val);

  if (offset >= view.length || byteCount <= 0) return;

  view.fill(fillValue, offset, Math.min(view.length, offset + byteCount));
  _syncMemoryBlock(mem);
}

function _memread(mem, off, bytes) {
  const view = _coerceMemoryView(mem);
  const offset = Math.max(0, Math.trunc(Number(off) || 0));
  const byteCount = Math.max(0, Math.trunc(Number(bytes) || 0));
  if (offset >= view.length || byteCount <= 0) return '';
  return _bytesToBinaryString(
    view.slice(offset, Math.min(view.length, offset + byteCount)),
  );
}

function _memwrite(mem, off, data) {
  const view = _coerceMemoryView(mem);
  const offset = Math.max(0, Math.trunc(Number(off) || 0));
  const payload = data instanceof Uint8Array ? data : _binaryStringToBytes(String(data ?? ''));
  const safeCount = Math.min(
    payload.length,
    Math.max(0, view.length - offset),
  );

  if (offset >= view.length || safeCount <= 0) return;

  view.set(payload.slice(0, safeCount), offset);
  _syncMemoryBlock(mem);
}

function _memget(mem, off, spec, sampleValue) {
  const fixedLength = _typedValueByteLength(spec);
  const fallbackLength =
    typeof sampleValue === 'string'
      ? sampleValue.length
      : Math.max(0, Math.trunc(Number(sampleValue?.byteLength) || 0));

  if (spec?.kind === 'string' || fixedLength == null) {
    return _memread(mem, off, fallbackLength);
  }

  return _deserializeTypedValue(_memread(mem, off, fixedLength), spec);
}

function _memput(mem, off, value, spec) {
  if (spec?.kind === 'string' || !spec || typeof spec !== 'object') {
    _memwrite(mem, off, String(value ?? ''));
    return;
  }

  _memwrite(mem, off, _serializeTypedValue(value, spec));
}

const _TYPE_REGISTRY = Object.create(null);

function _fixedString(value, length) {
  const maxLength = Math.max(0, Math.trunc(Number(length) || 0));
  const text = String(value ?? '');
  if (text.length >= maxLength) {
    return text.slice(0, maxLength);
  }
  return text.padEnd(maxLength, ' ');
}

function _defaultTypeFieldValue(spec) {
  if (!spec || typeof spec !== 'object') return 0;

  if (spec.kind === 'fixedString') {
    return _fixedString('', spec.length);
  }

  if (spec.kind === 'string') {
    return '';
  }

  if (spec.kind === 'type') {
    return _createTypeInstance(spec.typeName);
  }

  return 0;
}

function _normalizeTypeFieldValue(spec, value) {
  return _coerceTypedValue(spec, value);
}

function _createTypeInstance(typeName, initialValues) {
  const spec = _TYPE_REGISTRY[String(typeName || '').toUpperCase()];

  if (!spec) {
    return initialValues && typeof initialValues === 'object'
      ? { ...initialValues }
      : {};
  }

  const instance = {};
  const values = initialValues && typeof initialValues === 'object'
    ? initialValues
    : {};

  for (const fieldName of Object.keys(spec)) {
    const fieldSpec = spec[fieldName];
    let currentValue = _defaultTypeFieldValue(fieldSpec);

    Object.defineProperty(instance, fieldName, {
      enumerable: true,
      configurable: true,
      get() {
        return currentValue;
      },
      set(value) {
        currentValue = _normalizeTypeFieldValue(fieldSpec, value);
      },
    });

    if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
      currentValue = _normalizeTypeFieldValue(fieldSpec, values[fieldName]);
    }
  }

  return instance;
}

function _defineType(typeName, spec) {
  _TYPE_REGISTRY[String(typeName || '').toUpperCase()] = spec;
  return function(initialValues) {
    return _createTypeInstance(typeName, initialValues);
  };
}

function _bytesToBinaryString(bytes) {
  return Array.from(bytes || [], (value) => String.fromCharCode(value & 0xFF)).join('');
}

function _binaryStringToBytes(data, length) {
  const source = String(data ?? '');
  const size = Math.max(length || 0, source.length);
  const bytes = new Uint8Array(size);
  for (let i = 0; i < source.length && i < size; i++) {
    bytes[i] = source.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

function _scalarTypeName(typeName) {
  return String(typeName || 'SINGLE').toUpperCase().trim();
}

function _normalizeConversionType(typeName) {
  const normalized = _scalarTypeName(typeName).replace(/^_/, '');

  switch (normalized) {
    case 'I':
    case 'INTEGER':
      return 'INTEGER';
    case 'L':
    case 'LONG':
      return 'LONG';
    case 'S':
    case 'SINGLE':
      return 'SINGLE';
    case 'D':
    case 'DOUBLE':
      return 'DOUBLE';
    default:
      return normalized || 'SINGLE';
  }
}

function _typedValueByteLength(spec) {
  if (!spec || typeof spec !== 'object') return null;

  if (spec.kind === 'fixedString') {
    return Math.max(0, Math.floor(Number(spec.length) || 0));
  }

  if (spec.kind === 'string') {
    return null;
  }

  if (spec.kind === 'scalar') {
    switch (_normalizeConversionType(spec.typeName)) {
      case 'BIT':
      case 'BYTE':
      case '_BIT':
      case '_BYTE':
        return 1;
      case 'INTEGER':
        return 2;
      case 'LONG':
      case 'SINGLE':
        return 4;
      case 'DOUBLE':
      case 'FLOAT':
      case '_FLOAT':
      case '_INTEGER64':
      case 'INTEGER64':
      case 'OFFSET':
      case '_OFFSET':
      case 'MEM':
      case '_MEM':
      case 'UNSIGNED':
      case '_UNSIGNED':
      case 'ANY':
      default:
        return 8;
    }
  }

  if (spec.kind === 'type') {
    const typeSpec = _TYPE_REGISTRY[String(spec.typeName || '').toUpperCase()];
    if (!typeSpec) return null;
    let total = 0;
    for (const fieldName of Object.keys(typeSpec)) {
      const fieldLength = _typedValueByteLength(typeSpec[fieldName]);
      if (fieldLength == null) return null;
      total += fieldLength;
    }
    return total;
  }

  return null;
}

function _serializeScalarValue(typeName, value) {
  const normalizedType = _normalizeConversionType(typeName);
  const width = _typedValueByteLength({ kind: 'scalar', typeName: normalizedType }) || 8;
  const buffer = new ArrayBuffer(width);
  const view = new DataView(buffer);
  const numericValue = Number(_coerceScalarValue(normalizedType, value)) || 0;

  switch (normalizedType) {
    case 'BIT':
    case 'BYTE':
    case '_BIT':
    case '_BYTE':
      view.setInt8(0, Math.trunc(numericValue));
      break;
    case 'INTEGER':
      view.setInt16(0, Math.trunc(numericValue), true);
      break;
    case 'LONG':
      view.setInt32(0, Math.trunc(numericValue), true);
      break;
    case 'SINGLE':
      view.setFloat32(0, numericValue, true);
      break;
    case 'INTEGER64':
    case '_INTEGER64':
      if (typeof view.setBigInt64 === 'function') {
        view.setBigInt64(0, BigInt(Math.trunc(numericValue)), true);
        break;
      }
      view.setFloat64(0, numericValue, true);
      break;
    case 'DOUBLE':
    case 'FLOAT':
    case '_FLOAT':
    case 'OFFSET':
    case '_OFFSET':
    case 'MEM':
    case '_MEM':
    case 'UNSIGNED':
    case '_UNSIGNED':
    case 'ANY':
    default:
      view.setFloat64(0, numericValue, true);
      break;
  }

  return _bytesToBinaryString(new Uint8Array(buffer));
}

function _deserializeScalarValue(typeName, data) {
  const normalizedType = _normalizeConversionType(typeName);
  const width = _typedValueByteLength({ kind: 'scalar', typeName: normalizedType }) || 8;
  const bytes = _binaryStringToBytes(data, width);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  switch (normalizedType) {
    case 'BIT':
    case 'BYTE':
    case '_BIT':
    case '_BYTE':
      return view.getInt8(0);
    case 'INTEGER':
      return view.getInt16(0, true);
    case 'LONG':
      return view.getInt32(0, true);
    case 'SINGLE':
      return view.getFloat32(0, true);
    case 'INTEGER64':
    case '_INTEGER64':
      if (typeof view.getBigInt64 === 'function') {
        return Number(view.getBigInt64(0, true));
      }
      return view.getFloat64(0, true);
    case 'DOUBLE':
    case 'FLOAT':
    case '_FLOAT':
    case 'OFFSET':
    case '_OFFSET':
    case 'MEM':
    case '_MEM':
    case 'UNSIGNED':
    case '_UNSIGNED':
    case 'ANY':
    default:
      return view.getFloat64(0, true);
  }
}

function _serializeTypedValue(value, spec) {
  if (!spec || typeof spec !== 'object') {
    return String(value ?? '');
  }

  if (spec.kind === 'fixedString') {
    return _fixedString(value, spec.length);
  }

  if (spec.kind === 'string') {
    return String(value ?? '');
  }

  if (spec.kind === 'scalar') {
    return _serializeScalarValue(spec.typeName, value);
  }

  if (spec.kind === 'type') {
    const typeSpec = _TYPE_REGISTRY[String(spec.typeName || '').toUpperCase()];
    if (!typeSpec) {
      return '';
    }

    const source = value && typeof value === 'object' ? value : {};
    return Object.keys(typeSpec)
      .map((fieldName) => _serializeTypedValue(source[fieldName], typeSpec[fieldName]))
      .join('');
  }

  return String(value ?? '');
}

function _deserializeTypedValue(data, spec) {
  if (!spec || typeof spec !== 'object') {
    return String(data ?? '');
  }

  if (spec.kind === 'fixedString') {
    return _fixedString(data, spec.length);
  }

  if (spec.kind === 'string') {
    return String(data ?? '');
  }

  if (spec.kind === 'scalar') {
    return _deserializeScalarValue(spec.typeName, data);
  }

  if (spec.kind === 'type') {
    const typeSpec = _TYPE_REGISTRY[String(spec.typeName || '').toUpperCase()];
    if (!typeSpec) {
      return _createTypeInstance(spec.typeName);
    }

    let offset = 0;
    const source = String(data ?? '');
    const values = {};
    for (const fieldName of Object.keys(typeSpec)) {
      const fieldSpec = typeSpec[fieldName];
      const fieldLength = _typedValueByteLength(fieldSpec);
      const chunk = fieldLength == null
        ? source.slice(offset)
        : source.slice(offset, offset + fieldLength);
      values[fieldName] = _deserializeTypedValue(chunk, fieldSpec);
      offset += fieldLength == null ? chunk.length : fieldLength;
    }
    return _createTypeInstance(spec.typeName, values);
  }

  return String(data ?? '');
}

function _mki$(value) {
  return _serializeScalarValue('INTEGER', value);
}

function _mkl$(value) {
  return _serializeScalarValue('LONG', value);
}

function _mks$(value) {
  return _serializeScalarValue('SINGLE', value);
}

function _mkd$(value) {
  return _serializeScalarValue('DOUBLE', value);
}

function _cvi(data) {
  return _deserializeScalarValue('INTEGER', data);
}

function _cvl(data) {
  return _deserializeScalarValue('LONG', data);
}

function _cvs(data) {
  return _deserializeScalarValue('SINGLE', data);
}

function _cvd(data) {
  return _deserializeScalarValue('DOUBLE', data);
}

function _mk$(typeName, value) {
  switch (_normalizeConversionType(typeName)) {
    case 'INTEGER':
      return _mki$(value);
    case 'LONG':
      return _mkl$(value);
    case 'DOUBLE':
      return _mkd$(value);
    case 'SINGLE':
    default:
      return _mks$(value);
  }
}

function _cv(typeName, data) {
  switch (_normalizeConversionType(typeName)) {
    case 'INTEGER':
      return _cvi(data);
    case 'LONG':
      return _cvl(data);
    case 'DOUBLE':
      return _cvd(data);
    case 'SINGLE':
    default:
      return _cvs(data);
  }
}

const _QB_ARRAY_BOUNDS = Symbol('qbArrayBounds');

function _normalizeArrayDescriptor(descriptor, fallbackLower = 0) {
  if (descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor)) {
    return {
      lower: Math.trunc(Number(descriptor.lower ?? fallbackLower) || 0),
      upper: Math.trunc(Number(descriptor.upper ?? 0) || 0),
    };
  }

  return {
    lower: Math.trunc(Number(fallbackLower) || 0),
    upper: Math.trunc(Number(descriptor) || 0),
  };
}

function _setArrayBounds(target, bounds) {
  Object.defineProperty(target, _QB_ARRAY_BOUNDS, {
    value: bounds,
    writable: true,
    configurable: true,
  });
  return target;
}

function _arrayBounds(arr) {
  if (!Array.isArray(arr)) return null;
  const bounds = arr[_QB_ARRAY_BOUNDS];
  if (Array.isArray(bounds) && bounds.length > 0) {
    return bounds;
  }

  if ((arr.length || 0) === 0) {
    return null;
  }

  return [{
    lower: 0,
    upper: Math.max(-1, (arr.length || 0) - 1),
  }];
}

function _arrayBoundsForDimension(arr, dim) {
  const bounds = _arrayBounds(arr);
  if (!bounds) {
    throw _qbMakeRuntimeError(Array.isArray(arr) ? 9 : 13, undefined, _currentSourceLine);
  }

  const dimension = dim === undefined ? 1 : Math.trunc(Number(dim) || 0);
  if (dimension < 1 || dimension > bounds.length) {
    throw _qbMakeRuntimeError(9, undefined, _currentSourceLine);
  }

  return bounds[dimension - 1];
}

function _coerceArrayIndex(index) {
  const numeric = Number(index);
  if (!Number.isFinite(numeric)) {
    throw _qbMakeRuntimeError(9, undefined, _currentSourceLine);
  }
  return Math.trunc(numeric);
}

function _autoArrayDescriptor(optionBase, index) {
  const base = _coerceArrayIndex(optionBase);
  const target = _coerceArrayIndex(index);
  return {
    lower: Math.min(base, target),
    upper: Math.max(base, target),
  };
}

function _makeArrayRecursive(init, dims, depth) {
  if (depth >= dims.length) {
    return typeof init === 'function' ? init() : init;
  }

  const descriptor = dims[depth];
  if (descriptor.upper < descriptor.lower) {
    throw _qbMakeRuntimeError(9, undefined, _currentSourceLine);
  }

  const arrayValue = _setArrayBounds(
    [],
    dims.slice(depth).map((bound) => ({ lower: bound.lower, upper: bound.upper })),
  );

  for (let index = descriptor.lower; index <= descriptor.upper; index++) {
    arrayValue[index] = _makeArrayRecursive(init, dims, depth + 1);
  }

  return arrayValue;
}

// Helper for QB-style multi-dimensional arrays with preserved lower/upper bounds
function _makeArray(init, ...dims) {
  if (dims.length === 0) return typeof init === 'function' ? init() : init;
  return _makeArrayRecursive(
    init,
    dims.map((descriptor) => _normalizeArrayDescriptor(descriptor)),
    0,
  );
}

function _mergeArrayDescriptors(bounds, optionBase, indices) {
  return indices.map((index, depth) => {
    const fallback = _autoArrayDescriptor(optionBase, index);
    const current = Array.isArray(bounds) ? bounds[depth] : null;
    if (!current) {
      return fallback;
    }
    return {
      lower: Math.min(current.lower, fallback.lower),
      upper: Math.max(current.upper, fallback.upper),
    };
  });
}

function _copyArrayOverlap(source, target) {
  const sourceBounds = _arrayBounds(source);
  const targetBounds = _arrayBounds(target);
  if (!sourceBounds || !targetBounds) return;

  const sourceHead = sourceBounds[0];
  const targetHead = targetBounds[0];
  const overlapLower = Math.max(sourceHead.lower, targetHead.lower);
  const overlapUpper = Math.min(sourceHead.upper, targetHead.upper);
  if (overlapUpper < overlapLower) return;

  for (let index = overlapLower; index <= overlapUpper; index++) {
    if (
      sourceBounds.length > 1 &&
      targetBounds.length > 1 &&
      Array.isArray(source[index]) &&
      Array.isArray(target[index])
    ) {
      _copyArrayOverlap(source[index], target[index]);
    } else if (Object.prototype.hasOwnProperty.call(source, index)) {
      target[index] = source[index];
    }
  }
}

function _resizeArrayToBounds(source, init, ...dims) {
  const next = _makeArray(init, ...dims);
  if (Array.isArray(source)) {
    _copyArrayOverlap(source, next);
  }
  return next;
}

function _redimArrayPreserve(source, init, ...dims) {
  return _resizeArrayToBounds(source, init, ...dims);
}

function _autodimArray(init, optionBase, ...indices) {
  return _resizeArrayToBounds(
    null,
    init,
    ..._mergeArrayDescriptors(null, optionBase, indices),
  );
}

function _ensureAutoArrayBounds(source, init, optionBase, ...indices) {
  return _resizeArrayToBounds(
    source,
    init,
    ..._mergeArrayDescriptors(_arrayBounds(source), optionBase, indices),
  );
}

function _qbAssertArrayPath(root, ...indices) {
  if (!Array.isArray(root)) {
    throw _qbMakeRuntimeError(9, undefined, _currentSourceLine);
  }

  let current = root;
  for (let depth = 0; depth < indices.length; depth++) {
    const index = _coerceArrayIndex(indices[depth]);
    const bounds = _arrayBoundsForDimension(current, 1);
    if (index < bounds.lower || index > bounds.upper) {
      throw _qbMakeRuntimeError(9, undefined, _currentSourceLine);
    }
    current = current[index];
  }

  return current;
}

function _qbArrayGet(root, ...indices) {
  return _qbAssertArrayPath(root, ...indices);
}

function _eraseArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [];
}

function _lbound(arr, dim) {
  return _arrayBoundsForDimension(arr, dim).lower;
}

function _ubound(arr, dim) {
  return _arrayBoundsForDimension(arr, dim).upper;
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
// Safe cross-environment runtime reference (Node.js / pkg)
const _runtime = (typeof globalThis !== 'undefined' && globalThis.runtime) ? globalThis.runtime
               : (typeof window   !== 'undefined' && window.runtime)       ? window.runtime
               : {};

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

// Graphics compatibility layer for packaged console executables.
// The internal compiler currently targets a Node.js console runtime, so
// graphics commands are treated as no-ops instead of crashing the program.
const _graphicsPixels = new Map();
let _graphicsCursorX = 0, _graphicsCursorY = 0;
function _graphicsPixelKey(x, y) {
  return Math.trunc(Number(x) || 0) + ',' + Math.trunc(Number(y) || 0);
}
async function _pset(x, y, c, isStep) {
  const absX = Math.trunc((isStep ? _graphicsCursorX : 0) + (Number(x) || 0));
  const absY = Math.trunc((isStep ? _graphicsCursorY : 0) + (Number(y) || 0));
  _graphicsPixels.set(_graphicsPixelKey(absX, absY), c === undefined ? 7 : Math.trunc(Number(c) || 0));
  _graphicsCursorX = absX;
  _graphicsCursorY = absY;
}
async function _preset(x, y, c, isStep) {
  const absX = Math.trunc((isStep ? _graphicsCursorX : 0) + (Number(x) || 0));
  const absY = Math.trunc((isStep ? _graphicsCursorY : 0) + (Number(y) || 0));
  _graphicsPixels.set(_graphicsPixelKey(absX, absY), c === undefined ? 0 : Math.trunc(Number(c) || 0));
  _graphicsCursorX = absX;
  _graphicsCursorY = absY;
}
function _point(x, y) {
  if (y === undefined) {
    const selector = Math.trunc(Number(x) || 0);
    if (selector === 0) return _graphicsCursorX;
    if (selector === 1) return _graphicsCursorY;
    return 0;
  }
  return _graphicsPixels.get(_graphicsPixelKey(x, y)) ?? 0;
}
async function _line() {}
async function _circle() {}
async function _get() {}
async function _put() {}
async function _draw() {}
function _paint() {}
function _view() {}
function _viewPrint() {}
function _window() {}
function _palette() {}
function _paletteUsing() {}
function _pcopy() {}
function _fullscreen() {}
function _dest() {}
function _source() {}
function _font() {}
function _setAlpha() {}
function _clearColor() {}
`);
    }

    // Common code for both targets
    this.output.push(`

// INKEY$ support
let _inkeyBuffer = '';
function INKEY() {
  if (typeof _runtime['inkey$'] === 'function') {
      return _runtime['inkey$']();
  }
  const key = _inkeyBuffer;
  _inkeyBuffer = '';
  return key;
}

// File and system helpers
const _fileHandles = Object.create(null);
const _virtualFiles = Object.create(null);
const _virtualDirectories = new Set([
  ${this.target === 'node' ? 'process.cwd()' : '"/"'},
]);
const _lockState = new Map();
let _nextFileNum = 1;
let _currentDir = ${this.target === 'node' ? 'process.cwd()' : '"/"'};
const _startDir = _currentDir;
let _dirSearchPattern = null;
let _dirSearchMatches = [];
let _dirSearchIndex = 0;

const _openFunc = typeof _runtime.open === 'function' ? _runtime.open.bind(_runtime) : null;
const _closeFunc = typeof _runtime.close === 'function' ? _runtime.close.bind(_runtime) : null;
const _printFileFunc = typeof _runtime.printFile === 'function' ? _runtime.printFile.bind(_runtime) : null;
const _inputFileLineFunc = typeof _runtime.inputFileLine === 'function'
  ? _runtime.inputFileLine.bind(_runtime)
  : (typeof _runtime.inputFile === 'function' ? _runtime.inputFile.bind(_runtime) : null);
const _inputFileTokenFunc = typeof _runtime.inputFileToken === 'function'
  ? _runtime.inputFileToken.bind(_runtime)
  : null;
const _inputFileCharsFunc = typeof _runtime.inputFileChars === 'function'
  ? _runtime.inputFileChars.bind(_runtime)
  : null;
const _writeFileFunc = typeof _runtime.writeFile === 'function' ? _runtime.writeFile.bind(_runtime) : null;
const _seekFunc = typeof _runtime.seek === 'function' ? _runtime.seek.bind(_runtime) : null;
const _renameFunc = typeof _runtime.rename === 'function' ? _runtime.rename.bind(_runtime) : null;
const _killFunc = typeof _runtime.kill === 'function' ? _runtime.kill.bind(_runtime) : null;
const _mkdirFunc = typeof _runtime.mkdir === 'function' ? _runtime.mkdir.bind(_runtime) : null;
const _rmdirFunc = typeof _runtime.rmdir === 'function' ? _runtime.rmdir.bind(_runtime) : null;
const _chdirFunc = typeof _runtime.chdir === 'function' ? _runtime.chdir.bind(_runtime) : null;
const _filesFunc = typeof _runtime.files === 'function' ? _runtime.files.bind(_runtime) : null;
const _lockFunc = typeof _runtime.lock === 'function' ? _runtime.lock.bind(_runtime) : null;
const _unlockFunc = typeof _runtime.unlock === 'function' ? _runtime.unlock.bind(_runtime) : null;
const _resetFilesFunc = typeof _runtime.resetFiles === 'function' ? _runtime.resetFiles.bind(_runtime) : null;
const _fileExistsFunc = typeof _runtime.fileexists === 'function' ? _runtime.fileexists.bind(_runtime) : null;
const _dirExistsFunc = typeof _runtime.direxists === 'function' ? _runtime.direxists.bind(_runtime) : null;
const _dirFunc = typeof _runtime['dir$'] === 'function' ? _runtime['dir$'].bind(_runtime) : null;
const _cwdFunc = typeof _runtime['cwd$'] === 'function' ? _runtime['cwd$'].bind(_runtime) : null;
const _startDirFunc = typeof _runtime['startdir$'] === 'function' ? _runtime['startdir$'].bind(_runtime) : null;
const _commandFunc = typeof _runtime['command$'] === 'function' ? _runtime['command$'].bind(_runtime) : null;
const _environFunc = typeof _runtime['environ$'] === 'function' ? _runtime['environ$'].bind(_runtime) : null;
const _lofFunc = typeof _runtime.lof === 'function' ? _runtime.lof.bind(_runtime) : null;
const _locFunc = typeof _runtime.loc === 'function' ? _runtime.loc.bind(_runtime) : null;
const _eofFunc = typeof _runtime.eof === 'function' ? _runtime.eof.bind(_runtime) : null;
const _shellFunc = typeof _runtime.shell === 'function' ? _runtime.shell.bind(_runtime) : null;
const _fieldFunc = typeof _runtime.field === 'function' ? _runtime.field.bind(_runtime) : null;
const _putFileValueFunc = typeof _runtime.putFileValue === 'function' ? _runtime.putFileValue.bind(_runtime) : null;
const _getFileValueFunc = typeof _runtime.getFileValue === 'function' ? _runtime.getFileValue.bind(_runtime) : null;
const _getFileFieldsFunc = typeof _runtime.getFileFields === 'function' ? _runtime.getFileFields.bind(_runtime) : null;

function _lset(value, length) {
  const width = Math.max(0, Math.floor(Number(length) || 0));
  return String(value ?? '').padEnd(width).slice(0, width);
}

function _rset(value, length) {
  const width = Math.max(0, Math.floor(Number(length) || 0));
  if (width === 0) return '';
  return String(value ?? '').padStart(width).slice(-width);
}

function _coerceFileNumber(filenum) {
  const numeric = Math.floor(Number(filenum));
  if (!Number.isFinite(numeric) || numeric < 1) {
    throw _qbMakeRuntimeError(64, undefined, _currentSourceLine);
  }
  return numeric;
}

function _normalizeBasicPath(filename) {
  const rawName = String(filename ?? '').trim();
  if (!rawName) return '';
  ${this.target === 'node'
    ? 'return _nodePath.resolve(_currentDir, rawName);'
    : `const baseDir = String(_currentDir || '/').replace(/\\\\/g, '/');
  const combined = rawName.startsWith('/')
    ? rawName
    : (baseDir.endsWith('/') ? baseDir : baseDir + '/') + rawName;
  const parts = combined.replace(/\\\\/g, '/').split('/');
  const normalized = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }
  return '/' + normalized.join('/');`}
}

function _wildcardToRegex(spec) {
  const pattern = String(spec ?? '*');
  const escaped = pattern.replace(/[.+^$()|[\\]{}\\\\]/g, '\\\\$&');
  return new RegExp(
    '^' +
      escaped
        .replace(/\\*/g, '.*')
        .replace(/\\?/g, '.') +
      '$',
    'i',
  );
}

function _trackVirtualDirectories(filename) {
  if (${this.target === 'node' ? 'true' : 'false'}) {
    return;
  }
  const normalized = _normalizeBasicPath(filename);
  const parts = normalized.split('/').filter(Boolean);
  let current = '';
  _virtualDirectories.add('/');
  for (let i = 0; i < parts.length - 1; i++) {
    current += '/' + parts[i];
    _virtualDirectories.add(current);
  }
}

function _readFallbackFile(filename) {
  const normalized = _normalizeBasicPath(filename);
  ${this.target === 'node'
    ? `if (!_nodeFs.existsSync(normalized)) return '';
  return _nodeFs.readFileSync(normalized, 'utf8');`
    : 'return _virtualFiles[normalized] ?? \'\';'}
}

function _writeFallbackFile(filename, content) {
  const normalized = _normalizeBasicPath(filename);
  ${this.target === 'node'
    ? `_nodeFs.mkdirSync(_nodePath.dirname(normalized), { recursive: true });
  _nodeFs.writeFileSync(normalized, String(content ?? ''), 'utf8');`
    : `_trackVirtualDirectories(normalized);
  _virtualFiles[normalized] = String(content ?? '');`}
}

function _deleteFallbackFile(filename) {
  const normalized = _normalizeBasicPath(filename);
  ${this.target === 'node'
    ? `if (_nodeFs.existsSync(normalized)) {
    _nodeFs.unlinkSync(normalized);
  }`
    : 'delete _virtualFiles[normalized];'}
}

function _renameFallbackFile(oldName, newName) {
  const currentName = _normalizeBasicPath(oldName);
  const nextName = _normalizeBasicPath(newName);
  if (!currentName || !nextName) return;
  ${this.target === 'node'
    ? `if (!_nodeFs.existsSync(currentName)) return;
  _nodeFs.mkdirSync(_nodePath.dirname(nextName), { recursive: true });
  _nodeFs.renameSync(currentName, nextName);`
    : `if (!Object.prototype.hasOwnProperty.call(_virtualFiles, currentName)) return;
  _trackVirtualDirectories(nextName);
  _virtualFiles[nextName] = _virtualFiles[currentName];
  delete _virtualFiles[currentName];`}
}

function _fallbackFileExists(filename) {
  const normalized = _normalizeBasicPath(filename);
  ${this.target === 'node'
    ? 'return _nodeFs.existsSync(normalized) && _nodeFs.statSync(normalized).isFile();'
    : 'return Object.prototype.hasOwnProperty.call(_virtualFiles, normalized);'}
}

function _fallbackDirExists(dirname) {
  const normalized = _normalizeBasicPath(dirname);
  ${this.target === 'node'
    ? 'return _nodeFs.existsSync(normalized) && _nodeFs.statSync(normalized).isDirectory();'
    : 'return _virtualDirectories.has(normalized);'}
}

function _fallbackMkdir(dirname) {
  const normalized = _normalizeBasicPath(dirname);
  if (!normalized) return;
  ${this.target === 'node'
    ? '_nodeFs.mkdirSync(normalized, { recursive: true });'
    : '_virtualDirectories.add(normalized);'}
}

function _fallbackRmdir(dirname) {
  const normalized = _normalizeBasicPath(dirname);
  if (!normalized) return;
  ${this.target === 'node'
    ? `if (_nodeFs.existsSync(normalized)) {
    _nodeFs.rmdirSync(normalized);
  }`
    : '_virtualDirectories.delete(normalized);'}
}

function _listFallbackFiles(spec) {
  const regex = _wildcardToRegex(spec && String(spec).trim().length > 0 ? spec : '*');
  ${this.target === 'node'
    ? `let names = [];
  if (_nodeFs.existsSync(_currentDir)) {
    names = _nodeFs.readdirSync(_currentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  }
  return names.filter((name) => regex.test(name)).sort((left, right) => left.localeCompare(right));`
    : `const prefix = _currentDir === '/' ? '/' : _currentDir + '/';
  return Object.keys(_virtualFiles)
    .filter((name) => name.startsWith(prefix))
    .map((name) => name.slice(prefix.length))
    .filter((name) => name.length > 0 && !name.includes('/'))
    .filter((name) => regex.test(name))
    .sort((left, right) => left.localeCompare(right));`}
}

function _getFileHandle(filenum) {
  return _fileHandles[_coerceFileNumber(filenum)] || null;
}

function _syncFileHandle(handle) {
  if (!handle) return;
  const length = String(handle.data ?? '').length;
  handle.pos = Math.max(0, Math.min(Math.floor(Number(handle.pos) || 0), length));
  handle.eof = handle.pos >= length;
}

function _skipInputSeparators(handle) {
  const data = String(handle.data ?? '');
  while (handle.pos < data.length) {
    const ch = data[handle.pos];
    if (ch === ' ' || ch === '\\t' || ch === '\\r' || ch === '\\n' || ch === ',') {
      handle.pos++;
    } else {
      break;
    }
  }
}

function _freefile() {
  let candidate = 1;
  while (_fileHandles[candidate]) {
    candidate++;
    if (candidate > 255) {
      throw _qbMakeRuntimeError(67, undefined, _currentSourceLine);
    }
  }
  _nextFileNum = Math.max(_nextFileNum, candidate + 1);
  return candidate;
}

function _eof(filenum) {
  try {
    if (_eofFunc) return _eofFunc(filenum) ? -1 : 0;
    const handle = _getFileHandle(filenum);
    return !handle || handle.eof ? -1 : 0;
  } catch (e) {
    return -1;
  }
}

function _lof(filenum) {
  try {
    if (_lofFunc) return Number(_lofFunc(filenum)) || 0;
    const handle = _getFileHandle(filenum);
    return handle ? String(handle.data ?? '').length : 0;
  } catch (e) {
    return 0;
  }
}

function _loc(filenum) {
  try {
    if (_locFunc) return Number(_locFunc(filenum)) || 0;
    const handle = _getFileHandle(filenum);
    return handle ? handle.pos : 0;
  } catch (e) {
    return 0;
  }
}

function _fileexists(filename) {
  try {
    if (!filename) return 0;
    return (_fileExistsFunc ? _fileExistsFunc(filename) : _fallbackFileExists(filename)) ? -1 : 0;
  } catch (e) {
    return 0;
  }
}

function _direxists(dirname) {
  try {
    if (!dirname) return 0;
    return (_dirExistsFunc ? _dirExistsFunc(dirname) : _fallbackDirExists(dirname)) ? -1 : 0;
  } catch (e) {
    return 0;
  }
}

function _cwd$() {
  try {
    return _cwdFunc ? String(_cwdFunc()) : String(_currentDir || '/');
  } catch (e) {
    return '/';
  }
}

function _startdir$() {
  try {
    return _startDirFunc ? String(_startDirFunc()) : String(_startDir || '/');
  } catch (e) {
    return '/';
  }
}

function _command$() {
  try {
    if (_commandFunc) return String(_commandFunc());
    ${this.target === 'node'
      ? 'return process.argv ? process.argv.slice(2).join(" ") : "";'
      : 'return "";'}
  } catch (e) {
    return "";
  }
}

function _environ$(key) {
  try {
    if (_environFunc) return String(_environFunc(key));
    ${this.target === 'node'
      ? 'return process.env ? process.env[String(key)] || "" : "";'
      : 'return "";'}
  } catch (e) {
    return "";
  }
}

function _dir$(spec) {
  try {
    if (_dirFunc) {
      if (spec === undefined) return String(_dirFunc());
      return String(_dirFunc(spec));
    }

    if (spec !== undefined && String(spec).length > 0) {
      _dirSearchPattern = String(spec);
      _dirSearchMatches = _listFallbackFiles(_dirSearchPattern);
      _dirSearchIndex = 0;
    } else if (_dirSearchPattern == null) {
      return '';
    }

    if (_dirSearchIndex >= _dirSearchMatches.length) {
      return '';
    }

    const next = _dirSearchMatches[_dirSearchIndex];
    _dirSearchIndex++;
    return next || '';
  } catch (e) {
    return '';
  }
}

function _normalizeFileAccess(mode, access) {
  const explicit = access === undefined || access === null
    ? ''
    : String(access).toUpperCase().trim();

  if (explicit === 'READ' || explicit === 'WRITE' || explicit === 'READ WRITE') {
    return explicit;
  }

  if (mode === 'INPUT') return 'READ';
  if (mode === 'OUTPUT' || mode === 'APPEND') return 'WRITE';
  return 'READ WRITE';
}

function _assertFileReadable(handle) {
  if (!handle) {
    throw _qbMakeRuntimeError(52, undefined, _currentSourceLine);
  }

  if (handle.access === 'WRITE') {
    throw _qbMakeRuntimeError(54, undefined, _currentSourceLine);
  }
}

function _assertFileWritable(handle) {
  if (!handle) {
    throw _qbMakeRuntimeError(52, undefined, _currentSourceLine);
  }

  if (handle.access === 'READ') {
    throw _qbMakeRuntimeError(54, undefined, _currentSourceLine);
  }
}

function _normalizeLockMode(mode) {
  const normalized = mode === undefined || mode === null
    ? 'READ WRITE'
    : String(mode).toUpperCase().trim();

  if (normalized === 'READ' || normalized === 'WRITE' || normalized === 'READ WRITE') {
    return normalized;
  }

  return 'READ WRITE';
}

function _lockBlocksOperation(lockMode, operation) {
  const normalized = _normalizeLockMode(lockMode);
  return normalized === 'READ WRITE' || (operation === 'read' ? normalized === 'READ' : normalized === 'WRITE');
}

function _getFileLockEntries(filename) {
  const key = String(filename ?? '');
  if (!_lockState.has(key)) {
    _lockState.set(key, []);
  }
  return _lockState.get(key);
}

function _rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const normalizedLeftEnd = leftEnd === undefined || leftEnd === null
    ? Number.POSITIVE_INFINITY
    : leftEnd;
  const normalizedRightEnd = rightEnd === undefined || rightEnd === null
    ? Number.POSITIVE_INFINITY
    : rightEnd;
  return leftStart < normalizedRightEnd && rightStart < normalizedLeftEnd;
}

function _normalizeLockRange(handle, start, end) {
  if (!handle || start === undefined || start === null) {
    return {
      start: 0,
      end: Number.POSITIVE_INFINITY,
    };
  }

  if (handle.mode === 'RANDOM' && handle.recordLength > 0) {
    const startRecord = Math.max(1, Math.floor(Number(start) || 1));
    const endRecord = end === undefined || end === null
      ? startRecord
      : Math.max(startRecord, Math.floor(Number(end) || startRecord));
    return {
      start: (startRecord - 1) * handle.recordLength,
      end: endRecord * handle.recordLength,
    };
  }

  const startPosition = Math.max(1, Math.floor(Number(start) || 1));
  const endPosition = end === undefined || end === null
    ? startPosition
    : Math.max(startPosition, Math.floor(Number(end) || startPosition));
  return {
    start: startPosition - 1,
    end: endPosition,
  };
}

function _assertSharedOpenAllowed(handle) {
  if (!handle) return;

  if (_fileHandles[handle.fileNum]) {
    throw _qbMakeRuntimeError(55, undefined, _currentSourceLine);
  }

  for (const currentHandle of Object.values(_fileHandles)) {
    if (!currentHandle || currentHandle.filename !== handle.filename) {
      continue;
    }

    if (!currentHandle.shared || !handle.shared) {
      throw _qbMakeRuntimeError(55, undefined, _currentSourceLine);
    }
  }
}

function _assertFileLockAllowed(handle, operation, start, length) {
  if (!handle) return;

  const locks = _lockState.get(String(handle.filename ?? ''));
  if (!locks || locks.length === 0) {
    return;
  }

  const normalizedStart = Math.max(0, Math.floor(Number(start) || 0));
  const normalizedEnd =
    length === undefined || length === null || length === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : normalizedStart + Math.max(1, Math.floor(Number(length) || 0));

  for (const lock of locks) {
    if (!lock || lock.owner === handle.fileNum) {
      continue;
    }

    if (!_rangesOverlap(normalizedStart, normalizedEnd, lock.start, lock.end)) {
      continue;
    }

    if (_lockBlocksOperation(lock.mode, operation)) {
      throw new Error(
        operation === 'read'
          ? 'File is locked for reading by another handle.'
          : 'File is locked for writing by another handle.',
      );
    }
  }
}

function _assertOpenLockAllowed(handle) {
  if (!handle) return;

  if (handle.access !== 'WRITE') {
    _assertFileLockAllowed(handle, 'read', 0, Number.POSITIVE_INFINITY);
  }

  if (handle.access !== 'READ') {
    _assertFileLockAllowed(handle, 'write', 0, Number.POSITIVE_INFINITY);
  }
}

function _registerFileLock(handle, start, end, mode, options) {
  if (!handle) return;

  const lockMode = _normalizeLockMode(mode);
  const range = _normalizeLockRange(handle, start, end);
  const locks = _getFileLockEntries(handle.filename);

  for (const lock of locks) {
    if (!lock || lock.owner === handle.fileNum) {
      continue;
    }

    if (!_rangesOverlap(range.start, range.end, lock.start, lock.end)) {
      continue;
    }

    const readConflict =
      _lockBlocksOperation(lock.mode, 'read') && _lockBlocksOperation(lockMode, 'read');
    const writeConflict =
      _lockBlocksOperation(lock.mode, 'write') && _lockBlocksOperation(lockMode, 'write');

    if (readConflict || writeConflict) {
      throw new Error('Requested file lock conflicts with another open handle.');
    }
  }

  locks.push({
    owner: handle.fileNum,
    start: range.start,
    end: range.end,
    mode: lockMode,
    implicit: Boolean(options?.implicit),
  });
}

function _unregisterFileLock(handle, start, end) {
  if (!handle) return;

  const key = String(handle.filename ?? '');
  const locks = _lockState.get(key);
  if (!locks || locks.length === 0) {
    return;
  }

  let remaining = locks;
  if (start === undefined || start === null) {
    remaining = locks.filter((lock) => lock.owner !== handle.fileNum || lock.implicit);
  } else {
    const range = _normalizeLockRange(handle, start, end);
    remaining = locks.filter((lock) => {
      if (lock.owner !== handle.fileNum || lock.implicit) {
        return true;
      }

      return lock.start !== range.start || lock.end !== range.end;
    });
  }

  if (remaining.length === 0) {
    _lockState.delete(key);
    return;
  }

  _lockState.set(key, remaining);
}

function _releaseFileLocks(filenum) {
  const fileNum = _coerceFileNumber(filenum);

  for (const [filename, locks] of _lockState.entries()) {
    const remaining = locks.filter((lock) => lock.owner !== fileNum);
    if (remaining.length === 0) {
      _lockState.delete(filename);
    } else {
      _lockState.set(filename, remaining);
    }
  }
}

function _resolveFileOffset(handle, position) {
  if (position === undefined || position === null) {
    return Math.max(0, Math.floor(Number(handle.pos) || 0));
  }

  const numeric = Math.max(1, Math.floor(Number(position) || 1));
  if (handle.mode === 'RANDOM' && handle.recordLength > 0) {
    return (numeric - 1) * handle.recordLength;
  }
  return numeric - 1;
}

function _overwriteFileData(handle, offset, data) {
  const source = String(handle.data ?? '');
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const payload = String(data ?? '');

  if (start > source.length) {
    handle.data = source + ' '.repeat(start - source.length) + payload;
    return;
  }

  handle.data =
    source.slice(0, start) +
    payload +
    source.slice(start + payload.length);
}

function _fieldRecordLength(handle) {
  if (!handle?.fields || handle.fields.length === 0) return 0;
  return handle.fields.reduce(
    (total, field) => total + Math.max(0, Math.floor(Number(field.length) || 0)),
    0,
  );
}

function _serializeFileValue(handle, value, metadata) {
  let serialized = metadata ? _serializeTypedValue(value, metadata) : String(value ?? '');
  const recordLength = Math.max(
    0,
    Math.floor(Number(handle?.recordLength || _fieldRecordLength(handle)) || 0),
  );

  if (handle?.mode === 'RANDOM' && recordLength > 0) {
    serialized = serialized.length >= recordLength
      ? serialized.slice(0, recordLength)
      : serialized.padEnd(recordLength, ' ');
  }

  return serialized;
}

function _readFileChunk(handle, offset, length) {
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const recordLength = Math.max(
    0,
    Math.floor(Number(handle?.recordLength || _fieldRecordLength(handle)) || 0),
  );
  const source = String(handle?.data ?? '');
  const effectiveLength = length === undefined || length === null
    ? (recordLength > 0 ? recordLength : Math.max(0, source.length - start))
    : Math.max(0, Math.floor(Number(length) || 0));
  return source.slice(start, start + effectiveLength);
}

function _buildFieldRecord(handle) {
  if (!handle?.fields || handle.fields.length === 0) {
    return '';
  }

  return handle.fields
    .map((field) => _fixedString(field.get?.() ?? '', field.length))
    .join('');
}

function _assertInputPastEndAllowed(handle) {
  if (!handle) return;
  if (handle.eof || handle.pos >= String(handle.data ?? '').length) {
    throw _qbMakeRuntimeError(61, undefined, _currentSourceLine);
  }
}

function _applyFieldRecord(handle, data) {
  if (!handle?.fields || handle.fields.length === 0) {
    return;
  }

  let offset = 0;
  const source = String(data ?? '');
  for (const field of handle.fields) {
    const width = Math.max(0, Math.floor(Number(field.length) || 0));
    const chunk = source.slice(offset, offset + width);
    field.set?.(_fixedString(chunk, width));
    offset += width;
  }
}

function _field(filenum, definitions) {
  const fileNum = _coerceFileNumber(filenum);
  const handle = _getFileHandle(fileNum);
  if (!handle) {
    throw _qbMakeRuntimeError(52, undefined, _currentSourceLine);
  }
  if (handle.mode !== 'RANDOM') {
    throw _qbMakeRuntimeError(54, undefined, _currentSourceLine);
  }

  handle.fields = Array.isArray(definitions) ? definitions : [];
  const fieldLength = _fieldRecordLength(handle);
  if (fieldLength > 0 && (!handle.recordLength || handle.recordLength < fieldLength)) {
    handle.recordLength = fieldLength;
  }

  if (_fieldFunc) {
    _fieldFunc(fileNum, definitions);
  }
}

async function _open(filename, mode, filenum, recordLength, options) {
  const fileNum = filenum === undefined ? _freefile() : _coerceFileNumber(filenum);
  const openMode = String(mode || 'INPUT').toUpperCase();
  const normalized = _normalizeBasicPath(filename);
  if (!normalized) {
    throw _qbMakeRuntimeError(63, undefined, _currentSourceLine);
  }
  if (!['INPUT', 'OUTPUT', 'APPEND', 'RANDOM', 'BINARY'].includes(openMode)) {
    throw _qbMakeRuntimeError(54, undefined, _currentSourceLine);
  }
  const normalizedRecordLength = Math.floor(Number(recordLength) || 0);
  if (openMode === 'RANDOM' && normalizedRecordLength < 1) {
    throw _qbMakeRuntimeError(59, undefined, _currentSourceLine);
  }
  const handle = {
    fileNum,
    filename: normalized,
    mode: openMode,
    data: '',
    pos: 0,
    eof: true,
    recordLength: Math.max(0, normalizedRecordLength),
    fields: null,
    access: _normalizeFileAccess(openMode, options?.access),
    shared: Boolean(options?.shared),
    lockMode: options?.lockMode === undefined || options?.lockMode === null
      ? null
      : String(options.lockMode),
  };

  _assertSharedOpenAllowed(handle);
  _assertOpenLockAllowed(handle);

  if (_openFunc) {
    await _openFunc(filename, openMode, fileNum, handle.recordLength, {
      access: handle.access,
      shared: handle.shared,
      lockMode: handle.lockMode,
    });
  } else {
    if (openMode === 'INPUT' && !_fallbackFileExists(normalized)) {
      throw _qbMakeRuntimeError(53, undefined, _currentSourceLine);
    }
    if (openMode === 'OUTPUT') {
      handle.data = '';
    } else {
      handle.data = _readFallbackFile(normalized);
    }
    handle.pos = openMode === 'APPEND' ? String(handle.data ?? '').length : 0;
  }

  _fileHandles[fileNum] = handle;
  if (handle.lockMode) {
    _registerFileLock(handle, undefined, undefined, handle.lockMode, {
      implicit: true,
    });
  }
  _syncFileHandle(handle);
}

async function _close(filenum) {
  const handle = _getFileHandle(filenum);
  if (_closeFunc) {
    await _closeFunc(_coerceFileNumber(filenum));
  } else if (handle) {
    const writeMode =
      handle.mode === 'OUTPUT' ||
      handle.mode === 'APPEND' ||
      handle.mode === 'BINARY' ||
      handle.mode === 'RANDOM';
    if (writeMode) {
      _writeFallbackFile(handle.filename, handle.data);
    }
  }
  _releaseFileLocks(_coerceFileNumber(filenum));
  delete _fileHandles[_coerceFileNumber(filenum)];
}

async function _closeAll() {
  const openFileNumbers = Object.keys(_fileHandles);
  for (const filenum of openFileNumbers) {
    await _close(Number(filenum));
  }
}

async function _printFile(filenum, text) {
  const handle = _getFileHandle(filenum);
  if (!handle) return;
  _assertFileWritable(handle);

  const content = String(text ?? '');
  _assertFileLockAllowed(handle, 'write', handle.pos, Math.max(1, content.length));
  if (_printFileFunc) {
    await _printFileFunc(_coerceFileNumber(filenum), content);
  }
  handle.data =
    String(handle.data ?? '').slice(0, handle.pos) +
    content +
    String(handle.data ?? '').slice(handle.pos);
  handle.pos += content.length;
  _syncFileHandle(handle);
}

async function _writeFile(filenum, ...values) {
  const handle = _getFileHandle(filenum);
  if (!handle) return;
  _assertFileWritable(handle);

  const encoded = values
    .map((value) => {
      if (typeof value === 'string') {
        return '"' + String(value).replace(/"/g, '""') + '"';
      }
      return String(value);
    })
    .join(',') + '\\n';
  _assertFileLockAllowed(handle, 'write', handle.pos, Math.max(1, encoded.length));

  if (_writeFileFunc) {
    await _writeFileFunc(_coerceFileNumber(filenum), ...values);
    if (handle) {
      handle.data =
        String(handle.data ?? '').slice(0, handle.pos) +
        encoded +
        String(handle.data ?? '').slice(handle.pos);
      handle.pos += encoded.length;
      _syncFileHandle(handle);
    }
    return;
  }

  await _printFile(filenum, encoded);
}

async function _putFileValue(filenum, position, value, metadata) {
  const fileNum = _coerceFileNumber(filenum);
  const handle = _getFileHandle(fileNum);
  if (!handle) return;
  _assertFileWritable(handle);

  const offset = _resolveFileOffset(handle, position);
  const payload = value === undefined
    ? _serializeFileValue(handle, _buildFieldRecord(handle))
    : _serializeFileValue(handle, value, metadata);
  _assertFileLockAllowed(handle, 'write', offset, Math.max(1, payload.length));

  if (_putFileValueFunc) {
    await _putFileValueFunc(fileNum, position, payload, metadata);
  }

  _overwriteFileData(handle, offset, payload);
  handle.pos = offset + payload.length;
  _syncFileHandle(handle);
}

async function _inputFileLine(filenum) {
  if (_inputFileLineFunc) {
    const delegatedHandle = _getFileHandle(filenum);
    if (delegatedHandle) {
      _assertFileReadable(delegatedHandle);
      _assertFileLockAllowed(delegatedHandle, 'read', delegatedHandle.pos, Number.POSITIVE_INFINITY);
    }
    return String(await _inputFileLineFunc(_coerceFileNumber(filenum)));
  }

  const handle = _getFileHandle(filenum);
  _assertFileReadable(handle);
  _assertInputPastEndAllowed(handle);
  _assertFileLockAllowed(handle, 'read', handle.pos, Number.POSITIVE_INFINITY);

  const data = String(handle.data ?? '');
  const newlineIndex = data.indexOf('\\n', handle.pos);
  const end = newlineIndex === -1 ? data.length : newlineIndex;
  const line = data.slice(handle.pos, end).replace(/\\r$/, '');
  handle.pos = newlineIndex === -1 ? data.length : newlineIndex + 1;
  _syncFileHandle(handle);
  return line;
}

async function _inputFileToken(filenum) {
  if (_inputFileTokenFunc) {
    const delegatedHandle = _getFileHandle(filenum);
    if (delegatedHandle) {
      _assertFileReadable(delegatedHandle);
      _assertFileLockAllowed(delegatedHandle, 'read', delegatedHandle.pos, Number.POSITIVE_INFINITY);
    }
    return String(await _inputFileTokenFunc(_coerceFileNumber(filenum)));
  }

  const handle = _getFileHandle(filenum);
  _assertFileReadable(handle);
  _assertFileLockAllowed(handle, 'read', handle.pos, Number.POSITIVE_INFINITY);

  const data = String(handle.data ?? '');
  _skipInputSeparators(handle);
  if (handle.pos >= data.length) {
    _syncFileHandle(handle);
    throw _qbMakeRuntimeError(61, undefined, _currentSourceLine);
  }

  let value = '';
  if (data[handle.pos] === '"') {
    handle.pos++;
    while (handle.pos < data.length) {
      const ch = data[handle.pos];
      if (ch === '"') {
        if (data[handle.pos + 1] === '"') {
          value += '"';
          handle.pos += 2;
          continue;
        }
        handle.pos++;
        break;
      }
      value += ch;
      handle.pos++;
    }
  } else {
    const start = handle.pos;
    while (handle.pos < data.length) {
      const ch = data[handle.pos];
      if (ch === ',' || ch === '\\r' || ch === '\\n') {
        break;
      }
      handle.pos++;
    }
    value = data.slice(start, handle.pos).trim();
  }

  while (handle.pos < data.length && (data[handle.pos] === ',' || data[handle.pos] === '\\r' || data[handle.pos] === '\\n')) {
    handle.pos++;
  }

  _syncFileHandle(handle);
  return value;
}

function _input$(count, filenum) {
  const length = Math.max(0, Math.floor(Number(count) || 0));
  if (length === 0) return '';

  if (_inputFileCharsFunc) {
    const delegatedHandle = _getFileHandle(filenum);
    if (delegatedHandle) {
      _assertFileReadable(delegatedHandle);
      _assertFileLockAllowed(delegatedHandle, 'read', delegatedHandle.pos, Math.max(1, length));
    }
    return String(_inputFileCharsFunc(length, _coerceFileNumber(filenum)));
  }

  const handle = _getFileHandle(filenum);
  if (!handle) return '';
  _assertFileReadable(handle);
  _assertFileLockAllowed(handle, 'read', handle.pos, Math.max(1, length));

  const data = String(handle.data ?? '');
  const end = Math.min(handle.pos + length, data.length);
  const chunk = data.slice(handle.pos, end);
  handle.pos = end;
  _syncFileHandle(handle);
  return chunk;
}

async function _getFileValue(filenum, position, length, metadata) {
  const fileNum = _coerceFileNumber(filenum);
  const delegatedHandle = _getFileHandle(fileNum);
  const delegatedOffset = delegatedHandle ? _resolveFileOffset(delegatedHandle, position) : 0;
  const delegatedLength =
    length === undefined || length === null
      ? (_typedValueByteLength(metadata) || (delegatedHandle?.recordLength > 0 ? delegatedHandle.recordLength : Number.POSITIVE_INFINITY))
      : Math.max(1, Math.floor(Number(length) || 0));
  if (_getFileValueFunc) {
    if (delegatedHandle) {
      _assertFileReadable(delegatedHandle);
      _assertFileLockAllowed(delegatedHandle, 'read', delegatedOffset, delegatedLength);
    }
    const runtimeChunk = String(
      await _getFileValueFunc(fileNum, position, delegatedLength, metadata),
    );
    const handle = _getFileHandle(fileNum);
    if (!handle) {
      return metadata ? _deserializeTypedValue(runtimeChunk, metadata) : runtimeChunk;
    }
    const runtimeLength =
      length === undefined || length === null
        ? Math.max(
          0,
          Math.floor(Number(_typedValueByteLength(metadata) || handle.recordLength || runtimeChunk.length) || 0),
        )
        : Math.max(0, Math.floor(Number(length) || 0));
    handle.pos = _resolveFileOffset(handle, position) + runtimeLength;
    _syncFileHandle(handle);
    return metadata ? _deserializeTypedValue(runtimeChunk, metadata) : runtimeChunk;
  }

  const handle = _getFileHandle(fileNum);
  if (!handle) return '';
  _assertFileReadable(handle);

  const offset = _resolveFileOffset(handle, position);
  _assertFileLockAllowed(handle, 'read', offset, delegatedLength);
  const chunk = _readFileChunk(handle, offset, length);
  handle.pos = offset + chunk.length;
  _syncFileHandle(handle);
  return metadata ? _deserializeTypedValue(chunk, metadata) : chunk;
}

async function _getFileFields(filenum, position) {
  const fileNum = _coerceFileNumber(filenum);
  const delegatedHandle = _getFileHandle(fileNum);
  const delegatedOffset = delegatedHandle ? _resolveFileOffset(delegatedHandle, position) : 0;
  const delegatedLength = Math.max(
    1,
    Math.floor(
      Number(delegatedHandle?.recordLength || _fieldRecordLength(delegatedHandle)) || 0,
    ),
  );
  if (_getFileFieldsFunc) {
    if (delegatedHandle) {
      _assertFileReadable(delegatedHandle);
      _assertFileLockAllowed(delegatedHandle, 'read', delegatedOffset, delegatedLength);
    }
    await _getFileFieldsFunc(fileNum, position);
    const handle = _getFileHandle(fileNum);
    if (!handle) return;
    const recordLength = Math.max(
      0,
      Math.floor(Number(handle.recordLength || _fieldRecordLength(handle)) || 0),
    );
    handle.pos = _resolveFileOffset(handle, position) + recordLength;
    _syncFileHandle(handle);
    return;
  }

  const handle = _getFileHandle(fileNum);
  if (!handle) return;
  _assertFileReadable(handle);

  const offset = _resolveFileOffset(handle, position);
  _assertFileLockAllowed(handle, 'read', offset, Math.max(1, delegatedLength));
  const data = _readFileChunk(handle, offset, handle.recordLength || _fieldRecordLength(handle));
  _applyFieldRecord(handle, data);
  handle.pos = offset + data.length;
  _syncFileHandle(handle);
}

function _seek(filenum, pos) {
  const fileNum = _coerceFileNumber(filenum);
  const numericPos = Math.floor(Number(pos));
  if (!Number.isFinite(numericPos) || numericPos < 1) {
    throw _qbMakeRuntimeError(62, undefined, _currentSourceLine);
  }
  if (_seekFunc) {
    _seekFunc(fileNum, pos);
  }
  const handle = _getFileHandle(fileNum);
  if (!handle) {
    throw _qbMakeRuntimeError(52, undefined, _currentSourceLine);
  }
  handle.pos = numericPos - 1;
  _syncFileHandle(handle);
}

async function _rename(oldName, newName) {
  const currentName = _normalizeBasicPath(oldName);
  const nextName = _normalizeBasicPath(newName);
  if (!currentName || !nextName) {
    throw _qbMakeRuntimeError(63, undefined, _currentSourceLine);
  }
  if (!_fileexists(oldName)) {
    throw _qbMakeRuntimeError(53, undefined, _currentSourceLine);
  }
  if (_renameFunc) {
    await _renameFunc(oldName, newName);
  } else {
    _renameFallbackFile(oldName, newName);
  }
  _dirSearchPattern = null;
}

async function _kill(filename) {
  const normalized = _normalizeBasicPath(filename);
  if (!normalized) {
    throw _qbMakeRuntimeError(63, undefined, _currentSourceLine);
  }
  if (!_fileexists(filename)) {
    throw _qbMakeRuntimeError(53, undefined, _currentSourceLine);
  }
  if (_killFunc) {
    await _killFunc(filename);
  } else {
    _deleteFallbackFile(filename);
  }
  _dirSearchPattern = null;
}

async function _mkdir(dirname) {
  const normalized = _normalizeBasicPath(dirname);
  if (!normalized) {
    throw _qbMakeRuntimeError(63, undefined, _currentSourceLine);
  }
  if (_mkdirFunc) {
    await _mkdirFunc(dirname);
  } else {
    _fallbackMkdir(normalized);
  }
}

async function _rmdir(dirname) {
  const normalized = _normalizeBasicPath(dirname);
  if (!normalized) {
    throw _qbMakeRuntimeError(63, undefined, _currentSourceLine);
  }
  if (_rmdirFunc) {
    await _rmdirFunc(dirname);
  } else {
    _fallbackRmdir(normalized);
  }
}

async function _chdir(dirname) {
  if (_chdirFunc) {
    await _chdirFunc(dirname);
    const runtimeDir = _cwdFunc ? _cwdFunc() : dirname;
    if (runtimeDir) {
      _currentDir = _normalizeBasicPath(runtimeDir);
    }
    return;
  }

  const nextDir = _normalizeBasicPath(dirname);
  if (!nextDir) {
    throw _qbMakeRuntimeError(63, undefined, _currentSourceLine);
  }
  if (!_fallbackDirExists(nextDir)) {
    throw _qbMakeRuntimeError(66, undefined, _currentSourceLine);
  }
  _currentDir = nextDir;
}

async function _files(spec) {
  if (_filesFunc) {
    await _filesFunc(spec);
    return;
  }

  const matches = _listFallbackFiles(spec);
  if (matches.length === 0) {
    _print('(no files)', true);
    return;
  }

  for (const file of matches) {
    _print(file, true);
  }
}

function _lock(filenum, start, end) {
  const fileNum = _coerceFileNumber(filenum);
  const handle = _getFileHandle(fileNum);
  if (!handle) {
    throw _qbMakeRuntimeError(52, undefined, _currentSourceLine);
  }

  _registerFileLock(handle, start, end, 'READ WRITE');
  if (_lockFunc) {
    _lockFunc(fileNum, start, end);
  }
}

function _unlock(filenum, start, end) {
  const fileNum = _coerceFileNumber(filenum);
  const handle = _getFileHandle(fileNum);
  if (!handle) {
    throw _qbMakeRuntimeError(52, undefined, _currentSourceLine);
  }

  _unregisterFileLock(handle, start, end);
  if (_unlockFunc) {
    _unlockFunc(fileNum, start, end);
  }
}

async function _resetFiles() {
  if (_resetFilesFunc) {
    await _resetFilesFunc();
  }
  await _closeAll();
}

async function _shell(cmd) {
  if (_shellFunc) {
    await _shellFunc(cmd);
    return;
  }
  ${this.target === 'node'
    ? `await new Promise((resolve, reject) => {
    if (cmd === undefined) {
      const shellBinary =
        process.platform === 'win32'
          ? process.env.ComSpec || 'cmd.exe'
          : process.env.SHELL || '/bin/sh';
      const shellProcess = spawn(shellBinary, {
        cwd: _currentDir,
        stdio: 'inherit',
      });
      shellProcess.on('error', reject);
      shellProcess.on('exit', () => resolve());
      return;
    }

    const shellProcess = spawn(String(cmd), {
      cwd: _currentDir,
      stdio: 'inherit',
      shell: true,
    });
    shellProcess.on('error', reject);
    shellProcess.on('exit', () => resolve());
  });`
    : `console.log('SHELL', cmd || '(interactive)', '- not supported in web');
  if (typeof _runtime.error === 'function') {
    _runtime.error('SHELL command not available in web mode');
  }`}
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

// ========== Additional QBasic Functions ==========

// CLEAR - clears all variables
function _clear() {
  for (const key of Object.keys(_mainMemory)) {
    delete _mainMemory[key];
  }
  for (const key of Object.keys(_ioPorts)) {
    delete _ioPorts[key];
  }
  // Note: In QBasic CLEAR also resets data pointer
  _DATA_PTR = 0;
}

// FRE - returns bytes of free memory
function _fre(expr) {
  if (expr === undefined || expr === -1 || expr === '-1') {
    return _MAIN_MEMORY_SIZE;
  }
  if (typeof expr === 'string') {
    return _MAIN_MEMORY_SIZE - (expr.length || 0);
  }
  return _MAIN_MEMORY_SIZE;
}

// _err - returns last error number
let _lastError = 0;
let _lastErrorLine = 0;
let _currentSourceLine = 0;
function _err() {
  return _lastError;
}

// _erl - returns last error line
function _erl() {
  return _lastErrorLine;
}
function _qbNormalizeSourceLine(sourceLine) {
  const numericLine = Number(sourceLine);
  if (Number.isFinite(numericLine) && numericLine > 0) {
    return Math.max(1, Math.trunc(numericLine));
  }

  const currentLine = Number(_currentSourceLine);
  if (Number.isFinite(currentLine) && currentLine > 0) {
    return Math.max(1, Math.trunc(currentLine));
  }

  return 0;
}
function _qbRememberRuntimeError(errorCode, sourceLine) {
  const numericCode = Math.max(0, Math.trunc(Number(errorCode) || 0));
  const normalizedLine = _qbNormalizeSourceLine(sourceLine);
  _lastError = numericCode;
  _lastErrorLine = normalizedLine;
  return { numericCode, normalizedLine };
}
function _qbInferRuntimeErrorCode(error) {
  const directCode = Number(error?.qbasicErrorCode);
  if (Number.isFinite(directCode)) {
    return Math.max(0, Math.trunc(directCode));
  }

  const rawText =
    error instanceof Error
      ? error.message
      : error === undefined || error === null
        ? ''
        : String(error);

  const explicitCode = rawText.match(/\\bError\\s+(\\d+)\\b/i);
  if (explicitCode) {
    return Math.max(0, Math.trunc(Number(explicitCode[1]) || 0));
  }

  const patterns = [
    [/NEXT without FOR/i, 1],
    [/syntax error/i, 2],
    [/RETURN without GOSUB/i, 3],
    [/(READ without DATA|Out of DATA)/i, 4],
    [/illegal function call/i, 5],
    [/overflow/i, 6],
    [/out of memory/i, 7],
    [/subscript out of range/i, 9],
    [/duplicate definition/i, 10],
    [/division by zero/i, 11],
    [/type mismatch/i, 13],
    [/RESUME without (?:active )?error/i, 20],
    [/(bad file (?:name\\/number|number)|file (?:is )?not open)/i, 52],
    [/file already open/i, 55],
    [/input past end of file/i, 61],
    [/(directory not found|path not found)/i, 66],
  ];

  for (const [pattern, code] of patterns) {
    if (pattern.test(rawText)) {
      return code;
    }
  }

  return 0;
}
function _qbMakeRuntimeError(errorCode, message, sourceLine) {
  const { numericCode, normalizedLine } = _qbRememberRuntimeError(
    errorCode,
    sourceLine,
  );
  const text =
    message !== undefined && message !== null && String(message).length > 0
      ? String(message)
      : numericCode > 0
        ? _errormessage$(numericCode)
        : 'Unknown runtime error';

  const runtimeError = new Error(text);
  runtimeError.isQBasicRuntimeError = true;
  runtimeError.qbasicErrorCode = numericCode;
  runtimeError.qbasicSourceLine = normalizedLine;
  runtimeError.qbasicMessage = text;
  return runtimeError;
}
function _qbNormalizeRuntimeError(error, fallbackLine) {
  if (error === "__END__" || error === "STOP") {
    return error;
  }

  const normalizedError =
    error instanceof Error
      ? error
      : new Error(
          error === undefined || error === null
            ? 'Unknown runtime error'
            : String(error),
        );
  const numericCode = _qbInferRuntimeErrorCode(error);
  const message =
    normalizedError.message ||
    (numericCode > 0 ? _errormessage$(numericCode) : 'Unknown runtime error');
  const sourceLine = _qbNormalizeSourceLine(
    error?.qbasicSourceLine ?? fallbackLine,
  );

  normalizedError.message = message;
  normalizedError.isQBasicRuntimeError = true;
  normalizedError.qbasicErrorCode = numericCode;
  normalizedError.qbasicSourceLine = sourceLine;
  normalizedError.qbasicMessage = message;
  _qbRememberRuntimeError(numericCode, sourceLine);
  return normalizedError;
}
const _qbWasmAcceleratorEnabled = ${this.wasmAccelerator ? 'true' : 'false'};
let _qbWasm = null;
function _qbDecodeBase64ToBytes(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  return null;
}
function _qbInitWasmAccelerator() {
  if (!_qbWasmAcceleratorEnabled || typeof WebAssembly !== 'object') {
    return;
  }
  try {
    const bytes = _qbDecodeBase64ToBytes(
      'AGFzbQEAAAABDAJgAn9/AX9gAX8BfwMGBQAAAAEABy0FBmkzMmFuZAAABWkzMm9yAAEGaTMyeG9yAAIGaTMybm90AAMGaTMybW9kAAQKKQUHACAAIAFxCwcAIAAgAXILBwAgACABcwsHACAAQX9zCwcAIAAgAW8L',
    );
    if (!bytes) return;
    const module = new WebAssembly.Module(bytes);
    _qbWasm = new WebAssembly.Instance(module, {}).exports;
  } catch (_error) {
    _qbWasm = null;
  }
}
_qbInitWasmAccelerator();
function _qbNumber(value) {
  if (typeof value === 'boolean') {
    return value ? -1 : 0;
  }
  if (value === undefined || value === null) {
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw _qbMakeRuntimeError(13, undefined, _currentSourceLine);
  }
  return numeric;
}
function _qbBooleanValue(value) {
  return value ? -1 : 0;
}
function _qbCond(value) {
  return _qbNumber(value) !== 0;
}
function _qbBitwiseOperand(value) {
  return _qbBankersRound(_qbNumber(value)) | 0;
}
function _qbPrepareComparison(left, right) {
  const leftIsString = typeof left === 'string';
  const rightIsString = typeof right === 'string';

  if (leftIsString || rightIsString) {
    if (!leftIsString || !rightIsString) {
      throw _qbMakeRuntimeError(13, undefined, _currentSourceLine);
    }

    return {
      kind: 'string',
      left,
      right,
    };
  }

  return {
    kind: 'number',
    left: _qbNumber(left),
    right: _qbNumber(right),
  };
}
function _qbStringEq(left, right) {
  return left.length === right.length && left === right;
}
function _qbStringLt(left, right) {
  for (let index = 0; index < left.length; index++) {
    const leftCode = left.charCodeAt(index);
    if (index >= right.length) {
      return false;
    }
    const rightCode = right.charCodeAt(index);
    if (leftCode < rightCode) return true;
    if (leftCode > rightCode) return false;
  }
  return false;
}
function _qbStringGt(left, right) {
  for (let index = 0; index < left.length; index++) {
    const leftCode = left.charCodeAt(index);
    if (index >= right.length) {
      return true;
    }
    const rightCode = right.charCodeAt(index);
    if (leftCode > rightCode) return true;
    if (leftCode < rightCode) return false;
  }
  return false;
}
function _qbFinite(value) {
  if (!Number.isFinite(value)) {
    throw _qbMakeRuntimeError(6, undefined, _currentSourceLine);
  }
  return value;
}
function _qbBankersRound(value) {
  const numeric = _qbNumber(value);
  const sign = numeric < 0 ? -1 : 1;
  const absolute = Math.abs(numeric);
  const rounded = Math.round(absolute);
  return (absolute % 1 === 0.5 ? rounded - (rounded % 2) : rounded) * sign;
}
function _qbOverflowIfOutside(value, min, max) {
  if (value < min || value > max) {
    throw _qbMakeRuntimeError(6, undefined, _currentSourceLine);
  }
  return value;
}
function _coerceScalarValue(typeName, value) {
  const normalizedType = _normalizeConversionType(typeName);

  if (normalizedType === '_MEM' || normalizedType === 'MEM') {
    if (value === undefined || value === null || value === '') {
      return 0;
    }
    return value && typeof value === 'object' ? value : _mem(value);
  }

  if (normalizedType === '_OFFSET' || normalizedType === 'OFFSET') {
    if (value === undefined || value === null || value === '') {
      return 0;
    }
    return _offset(value);
  }

  if (value === undefined || value === null || value === '') {
    return 0;
  }

  switch (normalizedType) {
    case 'INTEGER':
      return _cint(value);
    case 'LONG':
      return _clng(value);
    case 'SINGLE':
      return _csng(value);
    case 'DOUBLE':
      return _cdbl(value);
    default: {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    }
  }
}
function _coerceTypedValue(spec, value) {
  if (!spec || typeof spec !== 'object') {
    return value;
  }

  if (spec.kind === 'fixedString') {
    return _fixedString(value, spec.length);
  }

  if (spec.kind === 'string') {
    return String(value ?? '');
  }

  if (spec.kind === 'scalar') {
    return _coerceScalarValue(spec.typeName, value);
  }

  if (spec.kind === 'type') {
    if (value && typeof value === 'object') {
      return _createTypeInstance(spec.typeName, value);
    }
    return _createTypeInstance(spec.typeName);
  }

  return value;
}
function _fix(value) {
  return Math.trunc(_qbNumber(value));
}
function _int(value) {
  return Math.floor(_qbNumber(value));
}
function _cint(value) {
  return _qbOverflowIfOutside(_qbBankersRound(value), -32768, 32767);
}
function _clng(value) {
  return _qbOverflowIfOutside(_qbBankersRound(value), -2147483648, 2147483647);
}
function _csng(value) {
  const numeric = _qbNumber(value);
  if (numeric !== 0 && Math.abs(numeric) > 3.402823466e38) {
    throw _qbMakeRuntimeError(6, undefined, _currentSourceLine);
  }
  return Number(numeric);
}
function _cdbl(value) {
  return _qbNumber(value);
}
function _qbEq(left, right) {
  const comparison = _qbPrepareComparison(left, right);
  return comparison.kind === 'string'
    ? _qbBooleanValue(_qbStringEq(comparison.left, comparison.right))
    : _qbBooleanValue(comparison.left === comparison.right);
}
function _qbNe(left, right) {
  return _qbBooleanValue(_qbEq(left, right) === 0);
}
function _qbLt(left, right) {
  const comparison = _qbPrepareComparison(left, right);
  return comparison.kind === 'string'
    ? _qbBooleanValue(_qbStringLt(comparison.left, comparison.right))
    : _qbBooleanValue(comparison.left < comparison.right);
}
function _qbLe(left, right) {
  return _qbBooleanValue(_qbLt(left, right) !== 0 || _qbEq(left, right) !== 0);
}
function _qbGt(left, right) {
  const comparison = _qbPrepareComparison(left, right);
  return comparison.kind === 'string'
    ? _qbBooleanValue(_qbStringGt(comparison.left, comparison.right))
    : _qbBooleanValue(comparison.left > comparison.right);
}
function _qbGe(left, right) {
  return _qbBooleanValue(_qbGt(left, right) !== 0 || _qbEq(left, right) !== 0);
}
function _qbNot(value) {
  const operand = _qbBitwiseOperand(value);
  return _qbWasm?.i32not ? _qbWasm.i32not(operand) : ~operand;
}
function _qbAnd(left, right) {
  const leftOperand = _qbBitwiseOperand(left);
  const rightOperand = _qbBitwiseOperand(right);
  return _qbWasm?.i32and
    ? _qbWasm.i32and(leftOperand, rightOperand)
    : leftOperand & rightOperand;
}
function _qbOr(left, right) {
  const leftOperand = _qbBitwiseOperand(left);
  const rightOperand = _qbBitwiseOperand(right);
  return _qbWasm?.i32or
    ? _qbWasm.i32or(leftOperand, rightOperand)
    : leftOperand | rightOperand;
}
function _qbXor(left, right) {
  const leftOperand = _qbBitwiseOperand(left);
  const rightOperand = _qbBitwiseOperand(right);
  return _qbWasm?.i32xor
    ? _qbWasm.i32xor(leftOperand, rightOperand)
    : leftOperand ^ rightOperand;
}
function _qbEqv(left, right) {
  return _qbNot(_qbXor(left, right));
}
function _qbImp(left, right) {
  return _qbOr(_qbNot(left), right);
}
function _qbAdd(left, right) {
  if (typeof left === 'string' || typeof right === 'string') {
    return String(left ?? '') + String(right ?? '');
  }
  return _qbFinite(_qbNumber(left) + _qbNumber(right));
}
function _qbSub(left, right) {
  return _qbFinite(_qbNumber(left) - _qbNumber(right));
}
function _qbMul(left, right) {
  return _qbFinite(_qbNumber(left) * _qbNumber(right));
}
function _qbPow(left, right) {
  return _qbFinite(Math.pow(_qbNumber(left), _qbNumber(right)));
}
function _val(value) {
  const source = String(value ?? '').trimStart();
  if (!source) {
    return 0;
  }

  const hexMatch = source.match(/^&H([0-9A-F]+)/i);
  if (hexMatch) {
    return parseInt(hexMatch[1], 16);
  }

  const octalMatch = source.match(/^&O([0-7]+)/i);
  if (octalMatch) {
    return parseInt(octalMatch[1], 8);
  }

  const decimalMatch = source.match(
    /^[+-]?(?:(?:\\d+\\.\\d*)|(?:\\d+)|(?:\\.\\d+))(?:[ED][+-]?\\d+)?/i,
  );
  if (!decimalMatch) {
    return 0;
  }

  return Number(decimalMatch[0].replace(/d/i, 'e'));
}
function _qbDiv(left, right) {
  const divisor = _qbNumber(right);
  if (divisor === 0) {
    throw _qbMakeRuntimeError(11, undefined, _currentSourceLine);
  }
  return _qbNumber(left) / divisor;
}
function _qbIntDiv(left, right) {
  return Math.trunc(_qbDiv(_fix(left), _fix(right)));
}
function _qbMod(left, right) {
  const divisor = _fix(right);
  if (divisor === 0) {
    throw _qbMakeRuntimeError(11, undefined, _currentSourceLine);
  }
  const dividend = _fix(left);
  const canUseI32Mod =
    dividend >= -2147483648 &&
    dividend <= 2147483647 &&
    divisor >= -2147483648 &&
    divisor <= 2147483647;
  return _qbWasm?.i32mod && canUseI32Mod
    ? _qbWasm.i32mod(dividend, divisor)
    : dividend % divisor;
}
function _qbTrackSourceLine(sourceLine) {
  const numericLine = Number(sourceLine);
  if (!Number.isFinite(numericLine)) return;
  const editorLine = Math.max(1, Math.trunc(numericLine) + 1);
  _currentSourceLine = editorLine;
  if (typeof _runtime !== 'undefined' && typeof _runtime.setSourceLine === 'function') {
    _runtime.setSourceLine(editorLine);
  }
}

// _varptr$ - returns string representation of variable pointer
function _varptr$(varname) {
  return '0';
}

// _environ - set environment variable
function _environ(envstring) {
  const parts = String(envstring).split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    ${this.target === 'node'
      ? 'process.env[key] = value;'
      : '// Environment variables not available in web mode'}
  }
}

// _dateset - set system date
function _dateset(datestr) {
  // Not supported in most environments
  console.log('DATE$ = ' + datestr);
}

// _timeset - set system time
function _timeset(timestr) {
  // Not supported in most environments
  console.log('TIME$ = ' + timestr);
}

// ========== QB64 Additional Functions ==========

// _key - sets function key string
function _key(keynum, keystr) {
  console.log('KEY ' + keynum + ' = ' + keystr);
}

// _strig - joystick button status (stub)
function _strig(button) {
  return 0;
}

// _console - console control
function _console(mode) {
  if (typeof _runtime.console === 'function') {
    _runtime.console(mode === 'ON');
  }
}

// _consoletitle - console title
function _consoletitle(title) {
  if (typeof _runtime.consoletitle === 'function') {
    _runtime.consoletitle(title);
  }
}

// _shellhide - shell hide
function _shellhide(cmd) {
  return _shell(cmd);
}

// _acceptfiledrop - file drop control
function _acceptfiledrop(mode) {
  if (typeof _runtime.acceptfiledrop === 'function') {
    _runtime.acceptfiledrop(mode === 'ON');
  }
}

// _newimage - create new image
function _newimage(width, height, mode) {
  if (typeof _runtime.newimage === 'function') {
    return _runtime.newimage(width, height, mode);
  }
  return -1;
}

// _loadimage - load image from file
function _loadimage(filename, mode) {
  if (typeof _runtime.loadimage === 'function') {
    return _runtime.loadimage(filename, mode);
  }
  return -1;
}

// _copyimage - copy existing image
function _copyimage(handle) {
  if (typeof _runtime.copyimage === 'function') {
    return _runtime.copyimage(handle);
  }
  return -1;
}

// _sndopen - open sound file
function _sndopen(filename, flags) {
  if (typeof _runtime.sndopen === 'function') {
    return _runtime.sndopen(filename, flags);
  }
  return -1;
}

// _sndplayfile - play sound file
function _sndplayfile(filename, volume) {
  if (typeof _runtime.sndplayfile === 'function') {
    return _runtime.sndplayfile(filename, volume);
  }
}

// _sndlen - get sound length
function _sndlen(handle) {
  if (typeof _runtime.sndlen === 'function') {
    return _runtime.sndlen(handle);
  }
  return 0;
}

// _sndgetpos - get sound playback position
function _sndgetpos(handle) {
  if (typeof _runtime.sndgetpos === 'function') {
    return _runtime.sndgetpos(handle);
  }
  return 0;
}

// _sndplaying - check if sound is playing
function _sndplaying(handle) {
  if (typeof _runtime.sndplaying === 'function') {
    return _runtime.sndplaying(handle);
  }
  return 0;
}

// _openhost - open TCP host
function _openhost(protocol) {
  if (typeof _runtime.openhost === 'function') {
    return _runtime.openhost(protocol);
  }
  return -1;
}

// _openclient - open TCP client
function _openclient(protocol, address) {
  if (typeof _runtime.openclient === 'function') {
    return _runtime.openclient(protocol, address);
  }
  return -1;
}

// _openconnection - open network connection
function _openconnection(handle) {
  if (typeof _runtime.openconnection === 'function') {
    return _runtime.openconnection(handle);
  }
  return -1;
}

// _keydown - check if key is pressed
function _keydown(keycode) {
  if (typeof _runtime.keydown === 'function') {
    return _runtime.keydown(keycode);
  }
  return 0;
}

// _keyhit - get key hit
function _keyhit() {
  if (typeof _runtime.keyhit === 'function') {
    return _runtime.keyhit();
  }
  return 0;
}

// _resize - window resize control
function _resize(mode) {
  if (typeof _runtime.resize === 'function') {
    _runtime.resize(mode);
  }
}

// _mousewheel - get mouse wheel value
function _mousewheel() {
  if (typeof _runtime.mousewheel === 'function') {
    return _runtime.mousewheel();
  }
  return 0;
}

// _screenexists - check if screen exists
function _screenexists() {
  if (typeof _runtime.screenexists === 'function') {
    return _runtime.screenexists();
  }
  return -1;
}

// _resizewidth / _resizeheight - current CRT viewport size
function _resizewidth() {
  if (typeof _runtime.resizewidth === 'function') {
    return _runtime.resizewidth();
  }
  return 640;
}

function _resizeheight() {
  if (typeof _runtime.resizeheight === 'function') {
    return _runtime.resizeheight();
  }
  return 400;
}

// _os$ - get OS name
function _os$() {
  ${this.target === 'node'
    ? 'return process.platform === \'win32\' ? \'WINDOWS\' : process.platform === \'darwin\' ? \'MACOSX\' : \'LINUX\';'
    : 'return \'WEB\';'}
}

// _errormessage$ - get error message
function _errormessage$(errnum) {
  const messages = {
    1: 'NEXT without FOR',
    2: 'Syntax error',
    3: 'RETURN without GOSUB',
    4: 'READ without DATA',
    5: 'Illegal function call',
    6: 'Overflow',
    7: 'Out of memory',
    8: 'Label not defined',
    9: 'Subscript out of range',
    10: 'Duplicate definition',
    11: 'Division by zero',
    12: 'Illegal in direct mode',
    13: 'Type mismatch',
    14: 'Out of string space',
    20: 'RESUME without error',
    24: 'Device timeout',
    25: 'Device fault',
    26: 'FOR without NEXT',
    27: 'Out of paper',
    52: 'Bad file name/number',
    53: 'File not found',
    54: 'Bad file mode',
    55: 'File already open',
    56: 'FIELD statement active',
    57: 'Internal error',
    58: 'File already exists',
    59: 'Bad record length',
    60: 'Disk full',
    61: 'Input past end of file',
    62: 'Bad record number',
    63: 'Bad file name',
    64: 'Bad file number',
    65: 'File already exists',
    66: 'PATH not found',
    67: 'Too many files',
    68: 'Device unavailable',
    69: 'Disk not ready',
    70: 'Disk write protection',
    71: 'Disk media error',
    72: 'Bad FAT',
    73: 'Rename across disks',
    74: 'Path/FILE required',
    75: 'Path access denied',
    76: 'String formula too complex'
  };
  return messages[errnum] || 'Unknown error';
}

// _environcount - get environment variable count
function _environcount() {
  ${this.target === 'node'
    ? 'return process.env ? Object.keys(process.env).length : 0;'
    : 'return 0;'}
}

// _files$ - get file list
function _files$(spec) {
  return _dir$(spec);
}

// _fullpath$ - get full path
function _fullpath$(path) {
  ${this.target === 'node'
    ? 'return _nodePath.resolve(path);'
    : 'return path;'}
}

// _capslock - get caps lock state (stub)
function _capslock() {
  return 0;
}

// _numlock - get num lock state (stub)
function _numlock() {
  return 0;
}

// _scrolllock - get scroll lock state (stub)
function _scrolllock() {
  return 0;
}

// _devices - get input devices
function _devices() {
  if (typeof _runtime.devices === 'function') {
    return _runtime.devices();
  }
  return 0;
}

// _device$ - get device info
function _device$(num) {
  if (typeof _runtime.device === 'function') {
    return _runtime.device(num);
  }
  return '';
}

// _axis - get joystick axis value
function _axis(device, axis) {
  if (typeof _runtime.axis === 'function') {
    return _runtime.axis(device, axis);
  }
  return 0;
}

// _button - get joystick button state
function _button(device, button) {
  if (typeof _runtime.button === 'function') {
    return _runtime.button(device, button);
  }
  return 0;
}

// _buttonchange - get joystick button change
function _buttonchange(device, button) {
  if (typeof _runtime.buttonchange === 'function') {
    return _runtime.buttonchange(device, button);
  }
  return 0;
}

// _lastbutton - get last button pressed
function _lastbutton(device) {
  if (typeof _runtime.lastbutton === 'function') {
    return _runtime.lastbutton(device);
  }
  return 0;
}

// _lastaxis - get last axis value
function _lastaxis(device) {
  if (typeof _runtime.lastaxis === 'function') {
    return _runtime.lastaxis(device);
  }
  return 0;
}

// _lastwheel - get last wheel value
function _lastwheel(device) {
  if (typeof _runtime.lastwheel === 'function') {
    return _runtime.lastwheel(device);
  }
  return 0;
}

// _totaldroppedfiles - get total dropped files
function _totaldroppedfiles() {
  if (typeof _runtime.totaldroppedfiles === 'function') {
    return _runtime.totaldroppedfiles();
  }
  return 0;
}

// _droppedfile$ - get dropped file name
function _droppedfile$(index) {
  if (typeof _runtime.droppedfile === 'function') {
    return _runtime.droppedfile(index);
  }
  return '';
}

function _finishdrop() {
  if (typeof _runtime.finishdrop === 'function') {
    _runtime.finishdrop();
  }
  return '';
}

function _consoleinput() {
  if (typeof _runtime.consoleinput === 'function') {
    return _runtime.consoleinput();
  }
  return '';
}

function _connected(handle) {
  if (typeof _runtime.connected === 'function') {
    return _runtime.connected(handle);
  }
  return 0;
}

function _connectionaddress$(handle) {
  if (typeof _runtime.connectionaddress === 'function') {
    return _runtime.connectionaddress(handle);
  }
  return '';
}

// _instrrev - reverse instr
function _instrrev(str, find, start) {
  str = String(str);
  find = String(find);
  if (start === undefined) {
    return str.lastIndexOf(find) + 1;
  }
  return str.lastIndexOf(find, start - 1) + 1;
}

// ========== Additional String Functions ==========

// _trim$ - trim string
function _trim$(str) {
  return String(str).trim();
}

// _leftof$ - get left of string
function _leftof$(str, delim) {
  str = String(str);
  delim = String(delim);
  const idx = str.indexOf(delim);
  return idx >= 0 ? str.slice(0, idx) : str;
}

// _rightof$ - get right of string
function _rightof$(str, delim) {
  str = String(str);
  delim = String(delim);
  const idx = str.indexOf(delim);
  return idx >= 0 ? str.slice(idx + delim.length) : '';
}

// _leftoflast$ - get left of last occurrence
function _leftoflast$(str, delim) {
  str = String(str);
  delim = String(delim);
  const idx = str.lastIndexOf(delim);
  return idx >= 0 ? str.slice(0, idx) : str;
}

// _rightoflast$ - get right of last occurrence
function _rightoflast$(str, delim) {
  str = String(str);
  delim = String(delim);
  const idx = str.lastIndexOf(delim);
  return idx >= 0 ? str.slice(idx + delim.length) : str;
}

(async () => {
try {
_qbRestart: while (true) {
try {
`);
  },

  _emitFooter() {
    this.output.push(`
} catch (e) {
  if (e && e.type === "RUN" && e.restart) {
    _restore();
    await _closeAll();
    continue _qbRestart;
  }
  if (e && e.type === "RUN" && e.program !== undefined) {
    throw new Error("RUN with an external program is not supported by the internal compiler runtime.");
  }
  if (e && e.type === "CHAIN") {
    throw new Error("CHAIN is not supported by the internal compiler runtime.");
  }
  throw e;
}
break _qbRestart;
}
} catch (e) {
  if (e === "__END__" || e === "STOP") {
    // Normal program termination — do nothing, fall through to finally
  } else if (typeof e === 'string' && e.startsWith('GOTO_')) {
    // GOTO jumped out of main body — normal for top-level GOTOs
  } else if (e && e.message) {
    const _runtimeError = _qbNormalizeRuntimeError(e, _currentSourceLine);
    const _runtimeLine = _runtimeError.qbasicSourceLine || _currentSourceLine;
    if (typeof process !== 'undefined' && process.stderr?.write) {
      process.stderr.write('\\nRuntime Error: ' + _runtimeError.message + '\\n');
    } else {
      console.error('Runtime Error:', _runtimeError.message);
    }
    if (typeof _runtime !== 'undefined' && typeof _runtime.error === 'function') {
      _runtime.error(_runtimeError.message, {
        line: _runtimeLine,
        code: _runtimeError.qbasicErrorCode,
      });
    }
  } else if (e !== undefined && e !== null) {
    if (typeof process !== 'undefined' && process.stderr?.write) {
      process.stderr.write('\\nError: ' + String(e) + '\\n');
    } else {
      console.error('Error:', String(e));
    }
  }
} finally {
  ${
    this.target === 'node'
      ? `
  // Flush stdout before exit
  if (process.stdout.write('')) {
    rl.close();
    process.exit(0);
  } else {
    process.stdout.once('drain', () => { rl.close(); process.exit(0); });
  }`
      : ''
  }
}
})();
`);
  },

  _matchPunc(c) {
    const t = this._peek();
    if (t?.type === TokenType.PUNCTUATION && t.value === c) {
      this._advance();
      return true;
    }
    return false;
  },

  _consume(type) {
    if (this._check(type)) return this._advance();
    return null;
  },

  _consumeNameToken() {
    if (this._check(TokenType.IDENTIFIER) || this._check(TokenType.KEYWORD)) {
      return this._advance();
    }
    return null;
  },

  _consumeKw(kw) {
    this._matchKw(kw);
  },

  _consumeOp(op) {
    this._matchOp(op);
  },

  _consumeToken() {
    if (this._isEnd()) {
      const lastToken = this._prev();
      return {
        type: 'EOF',
        value: '',
        line: lastToken?.line || 1,
        col: lastToken?.col || 0,
      };
    }
    const token = this._advance();
    return (
      token || {
        type: 'UNKNOWN',
        value: '',
        line: this._prev()?.line || 1,
        col: 0,
      }
    );
  },

  _decIndent() {
    this.indent = Math.max(0, this.indent - 1);
  },

  _matchKw(kw) {
    if (this._checkKw(kw)) {
      this._advance();
      return true;
    }
    return false;
  },

  _checkKw(kw) {
    const t = this._peek();
    return t?.type === TokenType.KEYWORD && t.value === kw;
  },

  _advance() {
    if (!this._isEnd()) {
      this.pos++;
      // Invalidate cache
      this._cachedPeekPos = -1;
    }
    return this._prev();
  },

  _isEnd() {
    return this._check(TokenType.EOF);
  },

  _skipNewlines() {
    while (this._check(TokenType.NEWLINE)) this._advance();
  },

  _isStmtEnd() {
    const t = this._peek();
    if (!t || t.type === TokenType.EOF || t.type === TokenType.NEWLINE)
      return true;
    if (
      t.type === TokenType.KEYWORD &&
      ['THEN', 'ELSE', 'ELSEIF'].includes(t.value)
    )
      return true;
    return false;
  },

  _skipToEndOfLine() {
    while (!this._isStmtEnd() && !this._isEnd()) {
      this._advance();
    }
  },

  _check(type) {
    return this._peek()?.type === type;
  },

  _matchOp(op) {
    const t = this._peek();
    if (t?.type === TokenType.OPERATOR && t.value === op) {
      this._advance();
      return true;
    }
    return false;
  },

  _peek() {
    if (this._cachedPeekPos === this.pos) {
      return this._cachedPeek;
    }
    this._cachedPeek = this.tokens[this.pos] || null;
    this._cachedPeekPos = this.pos;
    return this._cachedPeek;
  },

  _prev() {
    return this.pos > 0 ? this.tokens[this.pos - 1] : null;
  },
};
