// Auto-extracted Mixin
'use strict';

const { TokenType } = require('../constants');

function appendNodes(target, nodes) {
  if (!nodes) return;
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node) target.push(node);
    }
    return;
  }
  target.push(nodes);
}

function normalizeNodes(nodes) {
  if (!nodes) return [];
  return Array.isArray(nodes) ? nodes.filter(Boolean) : [nodes];
}

function stateLiteral(target) {
  return JSON.stringify(String(target));
}

function joinConditions(conditions) {
  if (!conditions || conditions.length === 0) {
    return 'false';
  }

  return conditions.length === 1
    ? conditions[0]
    : `(${conditions.join(' || ')})`;
}

function cloneLoopContext(context, extra) {
  return {
    ...context,
    loops: [...(context.loops || []), extra],
  };
}

function findLoopTarget(context, targetKind, field) {
  const loops = context?.loops || [];

  for (let index = loops.length - 1; index >= 0; index--) {
    const loop = loops[index];
    if (!targetKind || loop.kind === targetKind) {
      return loop[field];
    }
  }

  return null;
}

class TrampolineBuilder {
  constructor(parser, body, context = {}) {
    this.parser = parser;
    this.body = body;
    this.context = context;
    this.states = [];
    this.labelTargets = new Map();
    this.nextStateId = 0;
  }

  build() {
    const endState = '__body_end__';
    const entryState = this._compileSequence(
      this.body.statements,
      endState,
      {
        bodyEndState: endState,
        loops: [],
      },
    );

    return {
      entryState,
      endState,
      states: this.states,
      labelTargets: this.labelTargets,
    };
  }

  _newStateId(prefix = 'state') {
    this.nextStateId++;
    return `__${prefix}_${this.nextStateId}__`;
  }

  _pushState(state) {
    this.states.push(state);
    return state.id;
  }

  _compileSequence(statements, nextState, context) {
    let currentNext = nextState;

    for (let index = statements.length - 1; index >= 0; index--) {
      const statement = statements[index];
      if (!statement) continue;

      if (statement.kind === 'Label') {
        this.labelTargets.set(statement.name, currentNext);
        continue;
      }

      currentNext = this._compileStatement(statement, currentNext, context);
    }

    return currentNext;
  }

  _compileStatement(statement, nextState, context) {
    switch (statement.kind) {
      case 'Raw':
      case 'Emit':
        return this._pushState({
          id: this._newStateId(statement.kind === 'Emit' ? 'emit' : 'raw'),
          kind: 'raw',
          code: statement.code,
          nextState,
          errorResumeState: nextState,
        });

      case 'Goto':
        return this._pushState({
          id: this._newStateId('goto'),
          kind: 'goto',
          targetLabel: statement.label,
        });

      case 'Gosub':
        return this._pushState({
          id: this._newStateId('gosub'),
          kind: 'gosub',
          targetLabel: statement.label,
          returnState: nextState,
        });

      case 'Return':
        return this._pushState({
          id: this._newStateId('return'),
          kind: 'return',
        });

      case 'RaiseError':
        return this._pushState({
          id: this._newStateId('raise_error'),
          kind: 'raiseError',
          expression: statement.expression,
          errorResumeState: nextState,
        });

      case 'Terminate':
        return this._pushState({
          id: this._newStateId('term'),
          kind: 'term',
        });

      case 'If': {
        const thenEntry = this._compileSequence(
          statement.thenBody,
          nextState,
          context,
        );
        const elseEntry = this._compileSequence(
          statement.elseBody,
          nextState,
          context,
        );

        return this._pushState({
          id: this._newStateId('if'),
          kind: 'branch',
          condition: statement.condition,
          trueState: thenEntry,
          falseState: elseEntry || nextState,
          errorResumeState: nextState,
        });
      }

      case 'Select': {
        let currentState = this._compileSequence(
          statement.elseBody,
          nextState,
          context,
        );

        for (let index = statement.cases.length - 1; index >= 0; index--) {
          const caseClause = statement.cases[index];
          const trueState = this._compileSequence(
            caseClause.body,
            nextState,
            context,
          );

          currentState = this._pushState({
            id: this._newStateId('select'),
            kind: 'branch',
            condition: joinConditions(caseClause.conditions),
            trueState,
            falseState: currentState || nextState,
            errorResumeState: nextState,
          });
        }

        return currentState || nextState;
      }

      case 'For': {
        const conditionState = this._newStateId('for_cond');
        const incrementState = this._newStateId('for_inc');
        const bodyEntry = this._compileSequence(
          statement.body,
          incrementState,
          cloneLoopContext(context, {
            kind: 'FOR',
            breakState: nextState,
            continueState: incrementState,
          }),
        );

        this._pushState({
          id: incrementState,
          kind: 'raw',
          code: [`${statement.variable} += ${statement.step};`],
          nextState: conditionState,
          errorResumeState: nextState,
        });

        this._pushState({
          id: conditionState,
          kind: 'branch',
          condition: `(${statement.step} >= 0) ? ${statement.variable} <= ${statement.end} : ${statement.variable} >= ${statement.end}`,
          trueState: bodyEntry,
          falseState: nextState,
          errorResumeState: nextState,
        });

        return this._pushState({
          id: this._newStateId('for_init'),
          kind: 'raw',
          code: [`var ${statement.variable} = ${statement.start};`],
          nextState: conditionState,
          errorResumeState: nextState,
        });
      }

      case 'While': {
        const conditionState = this._newStateId('while_cond');
        const bodyEntry = this._compileSequence(
          statement.body,
          conditionState,
          cloneLoopContext(context, {
            kind: 'WHILE',
            breakState: nextState,
            continueState: conditionState,
          }),
        );

        this._pushState({
          id: conditionState,
          kind: 'branch',
          condition: statement.condition,
          trueState: bodyEntry,
          falseState: nextState,
          errorResumeState: nextState,
        });

        return conditionState;
      }

      case 'DoLoop': {
        if (statement.mode === 'PRETEST') {
          const conditionState = this._newStateId('do_cond');
          const bodyEntry = this._compileSequence(
            statement.body,
            conditionState,
            cloneLoopContext(context, {
              kind: 'DO',
              breakState: nextState,
              continueState: conditionState,
            }),
          );

          this._pushState({
            id: conditionState,
            kind: 'branch',
            condition: statement.negateCondition
              ? `!(${statement.condition})`
              : statement.condition,
            trueState: bodyEntry,
            falseState: nextState,
            errorResumeState: nextState,
          });

          return conditionState;
        }

        const postConditionState = this._newStateId('loop_cond');
        const bodyEntry = this._compileSequence(
          statement.body,
          postConditionState,
          cloneLoopContext(context, {
            kind: 'DO',
            breakState: nextState,
            continueState: postConditionState,
          }),
        );

        this._pushState({
          id: postConditionState,
          kind: 'branch',
          condition: statement.condition
            ? (statement.negateCondition
              ? `!(${statement.condition})`
              : statement.condition)
            : 'true',
          trueState: bodyEntry,
          falseState: nextState,
          errorResumeState: nextState,
        });

        return bodyEntry;
      }

      case 'Exit': {
        const targetState =
          statement.target === 'SUB' || statement.target === 'FUNCTION'
            ? context.bodyEndState
            : findLoopTarget(
            context,
            statement.target,
            'breakState',
          );

        return this._pushState({
          id: this._newStateId('exit'),
          kind: 'assign',
          nextState: targetState || context.bodyEndState,
        });
      }

      case 'Continue': {
        const targetState = findLoopTarget(context, null, 'continueState');
        return this._pushState({
          id: this._newStateId('continue'),
          kind: 'assign',
          nextState: targetState || nextState,
        });
      }

      case 'OnJump':
        return this._pushState({
          id: this._newStateId('on_jump'),
          kind: 'onJump',
          expression: statement.expression,
          mode: statement.mode,
          labels: [...statement.labels],
          nextState,
          errorResumeState: nextState,
        });

      case 'OnError':
        return this._pushState({
          id: this._newStateId('on_error'),
          kind: 'onError',
          mode: statement.mode,
          target: statement.target || null,
          targetType: statement.targetType || null,
          nextState,
          code: statement.code || [],
        });

      case 'Resume':
        return this._pushState({
          id: this._newStateId('resume'),
          kind: 'resume',
          mode: statement.mode,
          target: statement.target || null,
          targetType: statement.targetType || null,
          nextState,
        });

      default:
        return this._pushState({
          id: this._newStateId('raw'),
          kind: 'raw',
          code: statement.code || [],
          nextState,
          errorResumeState: nextState,
        });
    }
  }
}

module.exports = {
  _astLoc(token = this._prev()) {
    return {
      line: (token?.line || 1) - 1,
      column: token?.col || 0,
    };
  },

  _reportAstDiagnostic(severity, message, node, category = 'semantic') {
    this.errors.push({
      line: typeof node?.line === 'number' ? node.line : 0,
      column: typeof node?.column === 'number' ? node.column : 0,
      message,
      severity,
      category,
    });
  },

  _hasAstLoop(context, loopKind) {
    const loops = context?.loops || [];
    return loopKind
      ? loops.some((loop) => loop.kind === loopKind)
      : loops.length > 0;
  },

  _peekPendingLoopClosure(kind = null) {
    const pending = this._pendingLoopClosures || [];
    if (pending.length === 0) return null;

    const closure = pending[0];
    if (kind && closure.kind !== kind) {
      return null;
    }

    return closure;
  },

  _consumePendingLoopClosure(kind = null) {
    const closure = this._peekPendingLoopClosure(kind);
    if (!closure) return null;
    this._pendingLoopClosures.shift();
    return closure;
  },

  _queuePendingLoopClosures(kind, tokens) {
    for (const token of tokens || []) {
      if (!token) continue;
      this._pendingLoopClosures.push({
        kind,
        value: token.value,
        line: (token.line || 1) - 1,
        column: token.col || 0,
      });
    }
  },

  _consumeAstRequiredKeyword(keyword, message) {
    if (this._matchKw(keyword)) {
      return true;
    }

    this._reportAstDiagnostic(
      'error',
      message || `Expected ${keyword}.`,
      this._astLoc(this._peek() || this._prev()),
      'syntax',
    );
    return false;
  },

  _consumeAstRequiredKeywordPair(firstKeyword, secondKeyword, message) {
    const next = this.tokens[this.pos + 1];
    if (
      this._checkKw(firstKeyword) &&
      next?.type === TokenType.KEYWORD &&
      next?.value === secondKeyword
    ) {
      this._advance();
      this._advance();
      return true;
    }

    this._reportAstDiagnostic(
      'error',
      message || `Expected ${firstKeyword} ${secondKeyword}.`,
      this._astLoc(this._peek() || this._prev()),
      'syntax',
    );
    return false;
  },

  _isAstUnconditionalTransfer(statement) {
    return (
      statement?.kind === 'Goto' ||
      statement?.kind === 'Return' ||
      statement?.kind === 'Resume' ||
      statement?.kind === 'Terminate' ||
      statement?.kind === 'Exit' ||
      statement?.kind === 'Continue' ||
      statement?.unconditional === true
    );
  },

  _parseWithAst() {
    this._collectDataValues();
    const ast = this._parseProgramAst();
    this._analyzeAstProgram(ast);

    this.output.length = 0;
    this.indent = 0;
    this._emitHeader();
    this._generateAstProgram(ast);
    this._emitFooter();
    return this.output.join('\n');
  },

  _parseProgramAst() {
    return {
      kind: 'Program',
      body: this._parseAstBody({
        bodyType: 'PROGRAM',
        name: '__main__',
      }),
    };
  },

  _parseAstBody(options = {}) {
    const statements = [];

    while (!this._isEnd()) {
      this._skipNewlines();
      if (this._isEnd()) break;

      if (options.terminator?.()) {
        break;
      }

      try {
        appendNodes(statements, this._parseAstStatement(options));
      } catch (error) {
        this._recordError(error);
        this._sync();
      }
    }

    return {
      kind: 'Body',
      bodyType: options.bodyType || 'BLOCK',
      procedureType: options.procedureType || null,
      name: options.name || null,
      args: options.args || [],
      resultVar: options.resultVar || null,
      statements,
      needsTrampoline: false,
      labels: new Map(),
      rawJumpNodes: [],
      gosubCount: 0,
      returnCount: 0,
      firstReturnNode: null,
      onErrorCount: 0,
      resumeCount: 0,
      firstResumeNode: null,
    };
  },

  _parseAstStatement(context = {}) {
    const labelToken = this._peekAstLabel();
    if (labelToken) {
      this._advance();
      this._matchPunc(':');
      return {
        kind: 'Label',
        name: labelToken.value,
        line: labelToken.line,
        column: labelToken.col,
      };
    }

    if (this._matchKw('IF')) return this._parseAstIf(context);
    if (this._matchKw('FOR')) return this._parseAstFor(context);
    if (this._matchKw('NEXT')) {
      return this._parseAstUnexpectedTerminator(
        'Unexpected NEXT without a matching FOR block.',
      );
    }
    if (this._matchKw('DO')) return this._parseAstDo(context);
    if (this._matchKw('LOOP')) {
      return this._parseAstUnexpectedTerminator(
        'Unexpected LOOP without a matching DO block.',
      );
    }
    if (this._matchKw('WHILE')) return this._parseAstWhile(context);
    if (this._matchKw('WEND')) {
      return this._parseAstUnexpectedTerminator(
        'Unexpected WEND without a matching WHILE block.',
      );
    }
    if (this._matchKw('SELECT')) return this._parseAstSelect(context);
    if (this._matchKw('CASE')) {
      return this._parseAstUnexpectedTerminator(
        'Unexpected CASE outside a SELECT CASE block.',
      );
    }
    if (this._matchKw('ELSEIF')) {
      return this._parseAstUnexpectedTerminator(
        'Unexpected ELSEIF without a matching IF block.',
      );
    }
    if (this._matchKw('ELSE')) {
      return this._parseAstUnexpectedTerminator(
        'Unexpected ELSE without a matching IF block.',
      );
    }
    if (this._matchKw('EXIT')) return this._parseAstExit(context);
    if (this._matchKw('CONTINUE') || this._matchKw('_CONTINUE')) {
      return {
        kind: 'Continue',
        ...this._astLoc(),
      };
    }
    if (this._matchKw('ON')) return this._parseAstOnStatement(context);
    if (this._matchKw('GOTO')) return this._parseAstGoto();
    if (this._matchKw('GOSUB')) return this._parseAstGosub();
    if (this._matchKw('ERROR')) return this._parseAstError();
    if (this._matchKw('RESUME')) return this._parseAstResume();
    if (this._matchKw('RETURN')) {
      return {
        kind: 'Return',
        ...this._astLoc(),
      };
    }
    if (this._checkKw('SUB')) {
      this._advance();
      return this._parseAstProcedure('SUB');
    }
    if (this._checkKw('FUNCTION')) {
      this._advance();
      return this._parseAstProcedure('FUNCTION');
    }
    if (this._matchKw('STOP')) {
      return { kind: 'Terminate', reason: 'STOP', ...this._astLoc() };
    }
    if (this._matchKw('SYSTEM')) {
      return { kind: 'Terminate', reason: 'SYSTEM', ...this._astLoc() };
    }
    if (this._matchKw('END')) return this._parseAstEnd(context);
    if (this._matchKw('PRINT')) return this._parseAstEmitStatement('_parsePrint');
    if (this._matchKw('INPUT')) return this._parseAstEmitStatement('_parseInput');
    if (this._matchKw('GET')) {
      return this._peek()?.type === TokenType.PUNCTUATION && this._peek()?.value === '#'
        ? this._parseAstEmitStatement('_parseGetFile')
        : this._parseAstEmitStatement('_parseGet');
    }
    if (this._matchKw('PUT')) {
      return this._peek()?.type === TokenType.PUNCTUATION && this._peek()?.value === '#'
        ? this._parseAstEmitStatement('_parsePutFile')
        : this._parseAstEmitStatement('_parsePut');
    }
    if (this._matchKw('LINE')) {
      if (this._matchKw('INPUT')) {
        return this._parseAstEmitStatement('_parseLineInput');
      }
      return this._parseAstEmitStatement('_parseLine');
    }
    if (this._matchKw('DATA')) return this._parseAstEmitStatement('_parseData');
    if (this._matchKw('READ')) return this._parseAstEmitStatement('_parseRead');
    if (this._matchKw('RESTORE')) return this._parseAstEmitStatement('_parseRestore');
    if (this._matchKw('OPEN')) return this._parseAstEmitStatement('_parseOpen');
    if (this._matchKw('CLOSE')) return this._parseAstEmitStatement('_parseClose');
    if (this._matchKw('FIELD')) return this._parseAstEmitStatement('_parseField');
    if (this._matchKw('FILES')) return this._parseAstEmitStatement('_parseFiles');
    if (this._matchKw('NAME')) return this._parseAstEmitStatement('_parseName');
    if (this._matchKw('KILL')) return this._parseAstEmitStatement('_parseKill');
    if (this._matchKw('MKDIR')) return this._parseAstEmitStatement('_parseMkdir');
    if (this._matchKw('RMDIR')) return this._parseAstEmitStatement('_parseRmdir');
    if (this._matchKw('CHDIR')) return this._parseAstEmitStatement('_parseChdir');
    if (this._matchKw('SEEK')) return this._parseAstEmitStatement('_parseSeek');
    if (this._matchKw('LOCK')) return this._parseAstEmitStatement('_parseLock');
    if (this._matchKw('UNLOCK')) return this._parseAstEmitStatement('_parseUnlock');
    if (this._matchKw('RESET')) return this._parseAstEmitLines(['await _resetFiles();']);
    if (this._matchKw('WRITE')) return this._parseAstEmitStatement('_parseWrite');
    if (this._matchKw('RANDOMIZE')) return this._parseAstEmitStatement('_parseRandomize');
    if (this._matchKw('OUT')) return this._parseAstEmitStatement('_parseOut');
    if (this._matchKw('WAIT')) return this._parseAstEmitStatement('_parseWait');
    if (this._matchKw('POKE')) return this._parseAstEmitStatement('_parsePoke');
    if (this._matchKw('LSET')) return this._parseAstEmitStatement('_parseLsetStatement');
    if (this._matchKw('RSET')) return this._parseAstEmitStatement('_parseRsetStatement');
    if (this._matchKw('RUN')) return this._parseAstEmitStatement('_parseRun', { unconditional: true });
    if (this._matchKw('CHAIN')) return this._parseAstEmitStatement('_parseChain', { unconditional: true });
    if (this._matchKw('SHELL') || this._matchKw('_SHELL')) return this._parseAstEmitStatement('_parseShell');
    if (this._matchKw('DEF')) {
      if (this._matchKw('SEG')) {
        return this._parseAstEmitStatement('_parseDefSeg');
      }
      return this._parseAstEmitStatement('_parseDefFn');
    }

    return this._captureAstRawStatement();
  },

  _parseAstIf(context = {}) {
    const prelude = [];
    const condStart = this.output.length;
    const condition = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
    this._consumeKw('THEN');

    if (!this._isStmtEnd()) {
      const thenBody = normalizeNodes(this._parseAstStatement(context));
      let elseBody = [];

      if (this._matchKw('ELSE')) {
        elseBody = normalizeNodes(this._parseAstStatement(context));
      }

      return [
        ...prelude,
        {
          kind: 'If',
          condition,
          thenBody,
          elseBody,
        },
      ];
    }

    this._skipNewlines();
    const thenBody = this._parseAstBody({
      ...context,
      bodyType: 'IF_THEN',
      terminator: () => this._checkKw('ELSE') || this._checkKw('ELSEIF') || this._isAstEndIf(),
    }).statements;

    let elseBody = [];

    if (this._matchKw('ELSEIF')) {
      elseBody = normalizeNodes(this._parseAstElseIf(context));
    } else if (this._matchKw('ELSE')) {
      this._skipNewlines();
      elseBody = this._parseAstBody({
        ...context,
        bodyType: 'IF_ELSE',
        terminator: () => this._isAstEndIf(),
      }).statements;
    }

    this._consumeAstRequiredKeywordPair(
      'END',
      'IF',
      'Expected END IF to close IF block.',
    );

    return [
      ...prelude,
      {
        kind: 'If',
        condition,
        thenBody,
        elseBody,
      },
    ];
  },

  _parseAstElseIf(context = {}) {
    const prelude = [];
    const condStart = this.output.length;
    const condition = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
    this._consumeKw('THEN');
    this._skipNewlines();

    const thenBody = this._parseAstBody({
      ...context,
      bodyType: 'IF_THEN',
      terminator: () => this._checkKw('ELSE') || this._checkKw('ELSEIF') || this._isAstEndIf(),
    }).statements;

    let elseBody = [];

    if (this._matchKw('ELSEIF')) {
      elseBody = normalizeNodes(this._parseAstElseIf(context));
    } else if (this._matchKw('ELSE')) {
      this._skipNewlines();
      elseBody = this._parseAstBody({
        ...context,
        bodyType: 'IF_ELSE',
        terminator: () => this._isAstEndIf(),
      }).statements;
    }

    return [
      ...prelude,
      {
        kind: 'If',
        condition,
        thenBody,
        elseBody,
      },
    ];
  },

  _parseAstFor(context = {}) {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) {
      this._raiseSyntaxError('Expected variable after FOR');
    }

    const name = id.value;
    this._addVar(name);

    this._consumeOp('=');
    const prelude = [];
    const startCapture = this.output.length;
    const start = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(startCapture));

    this._consumeKw('TO');
    const endCapture = this.output.length;
    const end = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(endCapture));

    let step = '1';
    if (this._matchKw('STEP')) {
      const stepCapture = this.output.length;
      step = this._parseExpr();
      appendNodes(prelude, this._consumeCapturedRawNodes(stepCapture));
    }

    this._skipNewlines();
    const body = this._parseAstBody({
      ...context,
      bodyType: 'FOR',
      terminator: () =>
        this._checkKw('NEXT') || this._peekPendingLoopClosure('FOR'),
    }).statements;

    let nextVariable = null;
    let nextVariableToken = null;

    if (this._matchKw('NEXT')) {
      const nextTokens = this._parseAstNextVariables();
      nextVariableToken = nextTokens[0] || null;
      nextVariable = nextVariableToken?.value || null;
      this._queuePendingLoopClosures('FOR', nextTokens.slice(1));
    } else {
      const pendingClosure = this._consumePendingLoopClosure('FOR');
      if (pendingClosure) {
        nextVariable = pendingClosure.value;
        nextVariableToken = {
          line: pendingClosure.line + 1,
          col: pendingClosure.column,
          value: pendingClosure.value,
        };
      } else {
        this._reportAstDiagnostic(
          'error',
          `Expected NEXT to close FOR ${name}.`,
          this._astLoc(this._peek() || this._prev()),
          'syntax',
        );
      }
    }

    return [
      ...prelude,
      {
        kind: 'For',
        variable: name,
        start,
        end,
        step,
        nextVariable,
        nextVariableLine: nextVariableToken
          ? (nextVariableToken.line || 1) - 1
          : null,
        nextVariableColumn: nextVariableToken?.col || 0,
        body,
      },
    ];
  },

  _parseAstNextVariables() {
    const variables = [];

    if (this._check(TokenType.IDENTIFIER)) {
      variables.push(this._advance());

      while (this._matchPunc(',')) {
        const nextToken = this._consume(TokenType.IDENTIFIER);
        if (!nextToken) {
          this._raiseSyntaxError('Expected variable name after comma in NEXT');
        }
        variables.push(nextToken);
      }
      return variables;
    }

    if (this._matchPunc(',')) {
      this._raiseSyntaxError('Expected variable name after comma in NEXT');
    }

    return variables;
  },

  _parseAstWhile(context = {}) {
    const prelude = [];
    const condStart = this.output.length;
    const condition = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
    this._skipNewlines();

    const body = this._parseAstBody({
      ...context,
      bodyType: 'WHILE',
      terminator: () => this._checkKw('WEND'),
    }).statements;

    this._consumeAstRequiredKeyword(
      'WEND',
      'Expected WEND to close WHILE block.',
    );

    return [
      ...prelude,
      {
        kind: 'While',
        condition,
        body,
      },
    ];
  },

  _parseAstSelect(context = {}) {
    if (!this._matchKw('CASE')) {
      this._raiseSyntaxError('Expected CASE after SELECT');
    }

    const prelude = [];
    const exprStart = this.output.length;
    const selectorExpression = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(exprStart));

    const selectorVar = `_select_${((this._astTempId = (this._astTempId || 0) + 1))}`;
    prelude.push({
      kind: 'Raw',
      code: [`var ${selectorVar} = ${selectorExpression};`],
      containsJump: false,
    });

    this._skipNewlines();

    const cases = [];
    let elseBody = [];

    while (!this._isEnd()) {
      this._skipNewlines();

      if (this._isAstEndSelect()) {
        break;
      }

      if (!this._matchKw('CASE')) {
        this._recordError('Expected CASE or END SELECT within SELECT CASE block.');
        this._skipToEndOfLine();
        continue;
      }

      if (this._matchKw('ELSE')) {
        this._skipNewlines();
        elseBody = this._parseAstBody({
          ...context,
          bodyType: 'SELECT_ELSE',
          terminator: () => this._checkKw('CASE') || this._isAstEndSelect(),
        }).statements;
        break;
      }

      const conditions = [];
      do {
        const clauseStart = this.output.length;
        conditions.push(this._parseAstSelectCaseCondition(selectorVar));
        appendNodes(prelude, this._consumeCapturedRawNodes(clauseStart));
      } while (this._matchPunc(','));

      this._skipNewlines();
      const body = this._parseAstBody({
        ...context,
        bodyType: 'SELECT_CASE',
        terminator: () => this._checkKw('CASE') || this._isAstEndSelect(),
      }).statements;

      cases.push({
        conditions,
        body,
      });
    }

    this._consumeAstRequiredKeywordPair(
      'END',
      'SELECT',
      'Expected END SELECT to close SELECT CASE block.',
    );

    return [
      ...prelude,
      {
        kind: 'Select',
        selectorVar,
        cases,
        elseBody,
      },
    ];
  },

  _parseAstSelectCaseCondition(selectorVar) {
    if (this._matchKw('IS')) {
      const operatorToken = this._peek();
      const operator = operatorToken?.value;

      if (
        operatorToken?.type !== TokenType.OPERATOR ||
        !['=', '<>', '<', '<=', '>', '>='].includes(operator)
      ) {
        this._raiseSyntaxError('Expected comparison operator after CASE IS', operatorToken);
      }

      this._advance();
      const right = this._parseExpr();
      return `(${selectorVar} ${this._mapAstComparisonOperator(operator)} ${right})`;
    }

    const rangeStart = this._parseExpr();
    if (this._matchKw('TO')) {
      const rangeEnd = this._parseExpr();
      return `((${selectorVar} >= ${rangeStart}) && (${selectorVar} <= ${rangeEnd}))`;
    }

    return `(${selectorVar} === ${rangeStart})`;
  },

  _mapAstComparisonOperator(operator) {
    switch (operator) {
      case '=':
        return '===';
      case '<>':
        return '!==';
      case '<':
      case '<=':
      case '>':
      case '>=':
        return operator;
      default:
        return '===';
    }
  },

  _parseAstDo(context = {}) {
    let condition = null;
    let negateCondition = false;
    let mode = 'POSTTEST';
    const prelude = [];

    if (this._matchKw('WHILE')) {
      const condStart = this.output.length;
      condition = this._parseExpr();
      appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
      mode = 'PRETEST';
    } else if (this._matchKw('UNTIL')) {
      const condStart = this.output.length;
      condition = this._parseExpr();
      appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
      negateCondition = true;
      mode = 'PRETEST';
    }

    this._skipNewlines();
    const body = this._parseAstBody({
      ...context,
      bodyType: 'DO',
      terminator: () => this._checkKw('LOOP'),
    }).statements;

    this._consumeAstRequiredKeyword(
      'LOOP',
      'Expected LOOP to close DO block.',
    );

    if (this._matchKw('WHILE')) {
      const condStart = this.output.length;
      condition = this._parseExpr();
      appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
      mode = 'POSTTEST';
      negateCondition = false;
    } else if (this._matchKw('UNTIL')) {
      const condStart = this.output.length;
      condition = this._parseExpr();
      appendNodes(prelude, this._consumeCapturedRawNodes(condStart));
      mode = 'POSTTEST';
      negateCondition = true;
    } else if (!condition) {
      condition = 'true';
    }

    return [
      ...prelude,
      {
        kind: 'DoLoop',
        mode,
        condition,
        negateCondition,
        body,
      },
    ];
  },

  _parseAstProcedure(procedureType) {
    const id = this._consume(TokenType.IDENTIFIER);
    if (!id) return null;

    const name = id.value;
    const args = [];

    if (this._matchPunc('(')) {
      if (!this._matchPunc(')')) {
        do {
          const arg = this._consume(TokenType.IDENTIFIER);
          if (arg) args.push(arg.value);
        } while (this._matchPunc(','));
        this._matchPunc(')');
      }
    }

    this._skipNewlines();
    this._enterScope();

    const savedProcedure = this.currentProcedure;
    const savedFunction = this.currentFunction;
    const staticStore = `_static_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`;
    const resultVar = `_result_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`;

    this.currentProcedure = { name, staticStore, kind: procedureType };
    if (procedureType === 'FUNCTION') {
      this.currentFunction = { name, resultVar };
    }

    args.forEach((arg) => this._addVar(arg));

    const body = this._parseAstBody({
      bodyType: 'PROCEDURE',
      procedureType,
      name,
      args,
      resultVar: procedureType === 'FUNCTION' ? resultVar : null,
      terminator: () => this._isAstEndProcedure(procedureType),
    });

    this._consumeAstRequiredKeywordPair(
      'END',
      procedureType,
      `Expected END ${procedureType} to close ${procedureType} ${name}.`,
    );

    this.currentProcedure = savedProcedure;
    this.currentFunction = savedFunction;
    this._exitScope();

    return {
      kind: 'Procedure',
      procedureType,
      name,
      args,
      staticStore,
      resultVar: procedureType === 'FUNCTION' ? resultVar : null,
      body,
    };
  },

  _parseAstGoto() {
    const location = this._astLoc();
    const label = this._consume(TokenType.IDENTIFIER);
    if (!label) {
      this._raiseSyntaxError('Expected label after GOTO');
    }

    return {
      kind: 'Goto',
      label: label.value,
      ...location,
    };
  },

  _parseAstGosub() {
    const location = this._astLoc();
    const label = this._consume(TokenType.IDENTIFIER);
    if (!label) {
      this._raiseSyntaxError('Expected label after GOSUB');
    }

    return {
      kind: 'Gosub',
      label: label.value,
      ...location,
    };
  },

  _parseAstError() {
    const location = this._astLoc();
    const prelude = [];
    const exprStart = this.output.length;
    const expression = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(exprStart));

    return [
      ...prelude,
      {
        kind: 'RaiseError',
        expression,
        ...location,
      },
    ];
  },

  _parseAstOnStatement() {
    const location = this._astLoc();
    if (this._matchKw('ERROR')) {
      return this._parseAstOnError();
    }

    const prelude = [];
    const exprStart = this.output.length;
    const expression = this._parseExpr();
    appendNodes(prelude, this._consumeCapturedRawNodes(exprStart));

    let mode = null;
    if (this._matchKw('GOTO')) {
      mode = 'GOTO';
    } else if (this._matchKw('GOSUB')) {
      mode = 'GOSUB';
    } else {
      this._raiseSyntaxError('Expected GOTO or GOSUB after ON expression');
    }

    const labels = [];
    do {
      const label = this._consume(TokenType.IDENTIFIER);
      if (!label) {
        this._raiseSyntaxError(`Expected label after ON ${mode}`);
      }
      labels.push(label.value);
    } while (this._matchPunc(','));

    return [
      ...prelude,
      {
        kind: 'OnJump',
        expression,
        mode,
        labels,
        ...location,
      },
    ];
  },

  _parseAstOnError() {
    const location = this._astLoc();
    if (this._matchKw('GOTO')) {
      const target = this._consumeToken();
      const targetValue = String(target?.value || '0');

      return {
        kind: 'OnError',
        mode: 'GOTO',
        target: targetValue,
        targetType: target?.type || null,
        code: [
          targetValue === '0'
            ? '// ON ERROR GOTO 0 - disable error handling'
            : `// ON ERROR GOTO ${targetValue} (error handling limited in JS)`,
        ],
        containsJump: false,
        ...location,
      };
    }

    if (this._matchKw('RESUME')) {
      this._matchKw('NEXT');
      return {
        kind: 'OnError',
        mode: 'RESUME_NEXT',
        code: ['// ON ERROR RESUME NEXT'],
        containsJump: false,
        ...location,
      };
    }

    this._recordError('Unsupported ON ERROR form.');
    return {
      kind: 'OnError',
      mode: 'UNSUPPORTED',
      code: ['// ON ERROR - unsupported'],
      containsJump: false,
      ...location,
    };
  },

  _parseAstResume() {
    const location = this._astLoc();

    if (this._matchKw('NEXT')) {
      return {
        kind: 'Resume',
        mode: 'NEXT',
        code: ['// RESUME NEXT'],
        containsJump: false,
        ...location,
      };
    }

    if (this._check(TokenType.NUMBER) || this._check(TokenType.IDENTIFIER)) {
      const targetToken = this._advance();
      const target = targetToken.value;
      return {
        kind: 'Resume',
        mode: 'TARGET',
        code: [`// RESUME ${target}`],
        containsJump: false,
        target,
        targetType: targetToken.type,
        ...location,
      };
    }

    return {
      kind: 'Resume',
      mode: 'PLAIN',
      code: ['// RESUME'],
      containsJump: false,
      ...location,
    };
  },

  _parseAstExit() {
    const location = this._astLoc();
    if (this._matchKw('FOR')) return { kind: 'Exit', target: 'FOR', ...location };
    if (this._matchKw('DO') || this._matchKw('WHILE')) {
      return {
        kind: 'Exit',
        target: this._prev()?.value === 'WHILE' ? 'WHILE' : 'DO',
        ...location,
      };
    }
    if (this._matchKw('SUB')) return { kind: 'Exit', target: 'SUB', ...location };
    if (this._matchKw('FUNCTION')) {
      return { kind: 'Exit', target: 'FUNCTION', ...location };
    }

    return { kind: 'Exit', target: 'DO', ...location };
  },

  _parseAstEnd() {
    const location = this._astLoc();
    if (this._checkKw('IF') || this._checkKw('SELECT')) {
      this._advance();
      this._reportAstDiagnostic(
        'error',
        'Unexpected END block terminator.',
        location,
        'syntax',
      );
      return null;
    }

    if (this._checkKw('SUB') || this._checkKw('FUNCTION')) {
      this._advance();
      this._reportAstDiagnostic(
        'error',
        'Unexpected END procedure terminator.',
        location,
        'syntax',
      );
      return null;
    }

    return {
      kind: 'Terminate',
      reason: 'END',
      ...location,
    };
  },

  _parseAstUnexpectedTerminator(message) {
    this._reportAstDiagnostic('error', message, this._astLoc(), 'syntax');
    this._skipToEndOfLine();
    return null;
  },

  _peekAstLabel() {
    if (!this._check(TokenType.IDENTIFIER)) return null;
    const next = this.tokens[this.pos + 1];
    if (next?.type === TokenType.PUNCTUATION && next?.value === ':') {
      return this._peek();
    }
    return null;
  },

  _isAstEndIf() {
    return (
      this._checkKw('END') &&
      this.tokens[this.pos + 1]?.type === TokenType.KEYWORD &&
      this.tokens[this.pos + 1]?.value === 'IF'
    );
  },

  _isAstEndSelect() {
    return (
      this._checkKw('END') &&
      this.tokens[this.pos + 1]?.type === TokenType.KEYWORD &&
      this.tokens[this.pos + 1]?.value === 'SELECT'
    );
  },

  _isAstEndProcedure(procedureType) {
    return (
      this._checkKw('END') &&
      this.tokens[this.pos + 1]?.type === TokenType.KEYWORD &&
      this.tokens[this.pos + 1]?.value === procedureType
    );
  },

  _captureAstRawStatement() {
    const startToken = this._peek();
    const start = this.output.length;
    const savedFlag = this._insideRawCapture;
    const savedJumpFlag = this._rawCaptureContainsJump;
    let containsJump;
    this._insideRawCapture = true;
    this._rawCaptureContainsJump = false;

    try {
      this._parseStatement();
    } finally {
      containsJump = this._rawCaptureContainsJump;
      this._insideRawCapture = savedFlag;
      this._rawCaptureContainsJump = savedJumpFlag;
    }

    return {
      kind: 'Raw',
      code: this.output.splice(start),
      containsJump,
      ...this._astLoc(startToken),
    };
  },

  _parseAstEmitStatement(methodName, extra = {}) {
    const startToken = this._peek() || this._prev();
    const start = this.output.length;
    this[methodName]();
    return {
      kind: 'Emit',
      code: this.output.splice(start),
      ...extra,
      ...this._astLoc(startToken),
    };
  },

  _parseAstEmitLines(lines, extra = {}) {
    return {
      kind: 'Emit',
      code: Array.isArray(lines) ? lines : [lines],
      ...extra,
      ...this._astLoc(),
    };
  },

  _consumeCapturedRawNodes(startIndex) {
    const code = this.output.splice(startIndex);
    if (code.length === 0) return [];
    return [{ kind: 'Raw', code, containsJump: false }];
  },

  _analyzeAstProgram(program) {
    this._analyzeAstBody(program.body, {
      procedureType: null,
      loops: [],
    });
  },

  _analyzeAstBody(body, context = {}) {
    body.labels = new Map();
    body.rawJumpNodes = [];
    body.gosubCount = 0;
    body.returnCount = 0;
    body.firstReturnNode = null;
    body.onErrorCount = 0;
    body.resumeCount = 0;
    body.firstResumeNode = null;
    const bodyContext = {
      procedureType: body.procedureType || context.procedureType || null,
      loops: context.loops || [],
    };

    this._analyzeAstStatementList(body.statements, body, bodyContext);
    this._validateAstLabelReferences(body.statements, body);

    if (body.returnCount > 0 && body.gosubCount === 0) {
      this._reportAstDiagnostic(
        'error',
        'RETURN used without a corresponding GOSUB in the same body.',
        body.firstReturnNode,
      );
    }

    if (body.resumeCount > 0 && body.onErrorCount === 0) {
      this._reportAstDiagnostic(
        'error',
        'RESUME used without a corresponding ON ERROR in the same body.',
        body.firstResumeNode,
      );
    }

    if (body.needsTrampoline && body.rawJumpNodes.length > 0) {
      this._reportAstDiagnostic(
        'error',
        'Unsupported jump inside a raw legacy statement. Convert surrounding control flow to core IF/FOR/DO/WHILE forms.',
        body.rawJumpNodes[0],
      );
    }
  },

  _analyzeAstStatementList(statements, body, context = {}) {
    let reachable = true;

    for (const statement of statements || []) {
      if (!statement) continue;

      if (statement.kind === 'Label') {
        reachable = true;
      } else if (statement.kind !== 'Procedure' && !reachable) {
        this._reportAstDiagnostic(
          'warning',
          'Statement is unreachable because control flow transfers before this point.',
          statement,
        );
      }

      if (statement.kind === 'Procedure') {
        this._analyzeAstBody(statement.body, {
          procedureType: statement.procedureType,
          loops: [],
        });
        continue;
      }

      this._analyzeAstStatement(statement, body, context);

      if (this._isAstUnconditionalTransfer(statement)) {
        reachable = false;
      }
    }
  },

  _validateAstLabelReferences(statements, body) {
    for (const statement of statements || []) {
      if (!statement) continue;

      if (statement.kind === 'Goto' || statement.kind === 'Gosub') {
        if (!body.labels.has(statement.label)) {
          this._reportAstDiagnostic(
            'error',
            `${statement.kind.toUpperCase()} ${statement.label}: Label not defined.`,
            statement,
          );
        }
        continue;
      }

      if (statement.kind === 'OnJump') {
        for (const label of statement.labels) {
          if (!body.labels.has(label)) {
            this._reportAstDiagnostic(
              'error',
              `ON ${statement.mode} ${label}: Label not defined.`,
              statement,
            );
          }
        }
        continue;
      }

      if (
        statement.kind === 'OnError' &&
        statement.mode === 'GOTO' &&
        statement.target &&
        statement.target !== '0' &&
        statement.targetType === TokenType.IDENTIFIER
      ) {
        if (!body.labels.has(statement.target)) {
          this._reportAstDiagnostic(
            'error',
            `ON ERROR GOTO ${statement.target}: Label not defined.`,
            statement,
          );
        }
        continue;
      }

      if (
        statement.kind === 'Resume' &&
        statement.mode === 'TARGET' &&
        statement.target &&
        statement.targetType === TokenType.IDENTIFIER
      ) {
        if (!body.labels.has(statement.target)) {
          this._reportAstDiagnostic(
            'error',
            `RESUME ${statement.target}: Label not defined.`,
            statement,
          );
        }
        continue;
      }

      if (statement.kind === 'If') {
        this._validateAstLabelReferences(statement.thenBody, body);
        this._validateAstLabelReferences(statement.elseBody, body);
        continue;
      }

      if (statement.kind === 'Select') {
        for (const caseClause of statement.cases || []) {
          this._validateAstLabelReferences(caseClause.body, body);
        }
        this._validateAstLabelReferences(statement.elseBody, body);
        continue;
      }

      if (
        statement.kind === 'For' ||
        statement.kind === 'While' ||
        statement.kind === 'DoLoop'
      ) {
        this._validateAstLabelReferences(statement.body, body);
      }
    }
  },

  _analyzeAstStatement(statement, body, context = {}) {
    if (!statement) return;

    if (statement.kind === 'Label') {
      if (body.labels.has(statement.name)) {
        this._reportAstDiagnostic(
          'error',
          `Duplicate label "${statement.name}"`,
          {
            line: (statement.line || 1) - 1,
            column: statement.column || 0,
          },
        );
      } else {
        body.labels.set(statement.name, statement);
      }
      body.needsTrampoline = true;
      return;
    }

    if (statement.kind === 'Goto' || statement.kind === 'Gosub') {
      if (statement.kind === 'Gosub') body.gosubCount++;
      body.needsTrampoline = true;
      return;
    }

    if (statement.kind === 'OnJump') {
      if (statement.mode === 'GOSUB') body.gosubCount++;
      body.needsTrampoline = true;
      return;
    }

    if (statement.kind === 'OnError') {
      body.onErrorCount++;
      body.needsTrampoline = true;
      return;
    }

    if (statement.kind === 'Resume') {
      body.resumeCount++;
      if (!body.firstResumeNode) body.firstResumeNode = statement;
      body.needsTrampoline = true;
      return;
    }

    if (statement.kind === 'Return') {
      body.returnCount++;
      if (!body.firstReturnNode) body.firstReturnNode = statement;
      body.needsTrampoline = true;
      return;
    }

    if (statement.kind === 'Raw' && statement.containsJump) {
      body.rawJumpNodes.push(statement);
      return;
    }

    if (statement.kind === 'Continue') {
      if (!this._hasAstLoop(context)) {
        this._reportAstDiagnostic(
          'error',
          'CONTINUE used outside any active loop.',
          statement,
        );
      }
      return;
    }

    if (statement.kind === 'Exit') {
      if (statement.target === 'FOR' && !this._hasAstLoop(context, 'FOR')) {
        this._reportAstDiagnostic(
          'error',
          'EXIT FOR used outside a FOR loop.',
          statement,
        );
      } else if (
        statement.target === 'DO' &&
        !this._hasAstLoop(context, 'DO')
      ) {
        this._reportAstDiagnostic(
          'error',
          'EXIT DO used outside a DO loop.',
          statement,
        );
      } else if (
        statement.target === 'WHILE' &&
        !this._hasAstLoop(context, 'WHILE')
      ) {
        this._reportAstDiagnostic(
          'error',
          'EXIT WHILE used outside a WHILE loop.',
          statement,
        );
      } else if (
        statement.target === 'SUB' &&
        context.procedureType !== 'SUB'
      ) {
        this._reportAstDiagnostic(
          'error',
          'EXIT SUB used outside a SUB procedure.',
          statement,
        );
      } else if (
        statement.target === 'FUNCTION' &&
        context.procedureType !== 'FUNCTION'
      ) {
        this._reportAstDiagnostic(
          'error',
          'EXIT FUNCTION used outside a FUNCTION procedure.',
          statement,
        );
      }
      return;
    }

    if (statement.kind === 'If') {
      this._analyzeAstStatementList(statement.thenBody, body, context);
      this._analyzeAstStatementList(statement.elseBody, body, context);
      return;
    }

    if (statement.kind === 'For') {
      if (
        statement.nextVariable &&
        statement.nextVariable.toUpperCase() !== statement.variable.toUpperCase()
      ) {
        this._reportAstDiagnostic(
          'error',
          `NEXT ${statement.nextVariable} does not match FOR ${statement.variable}.`,
          {
            line: statement.nextVariableLine,
            column: statement.nextVariableColumn,
          },
        );
      }

      this._analyzeAstStatementList(statement.body, body, {
        ...context,
        loops: [...(context.loops || []), { kind: 'FOR' }],
      });
      return;
    }

    if (statement.kind === 'Select') {
      for (const caseClause of statement.cases || []) {
        this._analyzeAstStatementList(caseClause.body, body, context);
      }
      this._analyzeAstStatementList(statement.elseBody, body, context);
      return;
    }

    if (statement.kind === 'While') {
      this._analyzeAstStatementList(statement.body, body, {
        ...context,
        loops: [...(context.loops || []), { kind: 'WHILE' }],
      });
      return;
    }

    if (statement.kind === 'DoLoop') {
      this._analyzeAstStatementList(statement.body, body, {
        ...context,
        loops: [...(context.loops || []), { kind: 'DO' }],
      });
    }
  },

  _generateAstProgram(program) {
    this._generateAstBody(program.body, {
      topLevel: true,
      procedureType: null,
      resultVar: null,
    });
  },

  _generateAstBody(body, context = {}) {
    for (const statement of body.statements) {
      if (statement?.kind === 'Procedure') {
        this._generateAstProcedure(statement);
      }
    }

    const executableStatements = body.statements.filter(
      (statement) => statement?.kind !== 'Procedure',
    );

    if (body.needsTrampoline) {
      this._generateTrampolineBody(
        { ...body, statements: executableStatements },
        context,
      );
      return;
    }

    this._generateStructuredStatements(executableStatements, context);
  },

  _generateAstProcedure(procedure) {
    this._emit(`const ${procedure.staticStore} = Object.create(null);`);
    this._emit(`async function ${procedure.name}(${procedure.args.join(', ')}) {`);
    this.indent++;

    if (procedure.procedureType === 'FUNCTION') {
      this._emit(
        `let ${procedure.resultVar} = ${procedure.name.endsWith('$') ? '""' : '0'};`,
      );
    }

    this._generateAstBody(procedure.body, {
      topLevel: false,
      procedureType: procedure.procedureType,
      resultVar: procedure.resultVar,
    });

    if (procedure.procedureType === 'FUNCTION' && !procedure.body.needsTrampoline) {
      this._emit(`return ${procedure.resultVar};`);
    }

    this.indent--;
    this._emit(`} // END ${procedure.procedureType}`);
  },

  _generateStructuredStatements(statements, context = {}) {
    for (const statement of statements || []) {
      if (!statement) continue;

      switch (statement.kind) {
        case 'Raw':
        case 'Emit':
          for (const line of statement.code) {
            this._emit(line.trimStart());
          }
          break;

        case 'Label':
          this._emit(`// Label ${statement.name}`);
          break;

        case 'If':
          this._emit(`if (${statement.condition}) {`);
          this.indent++;
          this._generateStructuredStatements(statement.thenBody, context);
          this.indent--;
          if (statement.elseBody?.length > 0) {
            this._emit('} else {');
            this.indent++;
            this._generateStructuredStatements(statement.elseBody, context);
            this.indent--;
          }
          this._emit('}');
          break;

        case 'Select': {
          let hasBranches = false;

          for (const caseClause of statement.cases || []) {
            const condition = joinConditions(caseClause.conditions);
            this._emit(hasBranches ? `} else if (${condition}) {` : `if (${condition}) {`);
            this.indent++;
            this._generateStructuredStatements(caseClause.body, context);
            this.indent--;
            hasBranches = true;
          }

          if (statement.elseBody?.length > 0) {
            this._emit(hasBranches ? '} else {' : 'if (true) {');
            this.indent++;
            this._generateStructuredStatements(statement.elseBody, context);
            this.indent--;
            hasBranches = true;
          }

          if (hasBranches) {
            this._emit('}');
          }
          break;
        }

        case 'For':
          this._emit(
            `for (var ${statement.variable} = ${statement.start}; (${statement.step} >= 0) ? ${statement.variable} <= ${statement.end} : ${statement.variable} >= ${statement.end}; ${statement.variable} += ${statement.step}) {`,
          );
          this.indent++;
          this._generateStructuredStatements(statement.body, context);
          this.indent--;
          this._emit('}');
          break;

        case 'While':
          this._emit(`while (${statement.condition}) {`);
          this.indent++;
          this._generateStructuredStatements(statement.body, context);
          this.indent--;
          this._emit('}');
          break;

        case 'DoLoop':
          if (statement.mode === 'PRETEST') {
            this._emit(
              `while (${statement.negateCondition ? `!(${statement.condition})` : statement.condition}) {`,
            );
            this.indent++;
            this._generateStructuredStatements(statement.body, context);
            this.indent--;
            this._emit('}');
          } else {
            this._emit('do {');
            this.indent++;
            this._generateStructuredStatements(statement.body, context);
            this.indent--;
            this._emit(
              `} while (${statement.negateCondition ? `!(${statement.condition})` : statement.condition});`,
            );
          }
          break;

        case 'Exit':
          if (statement.target === 'SUB') {
            this._emit('return;');
          } else if (statement.target === 'FUNCTION') {
            this._emit(`return ${context.resultVar || 'undefined'};`);
          } else {
            this._emit('break;');
          }
          break;

        case 'Continue':
          this._emit('continue;');
          break;

        case 'Terminate':
          this._emit('throw "__END__";');
          break;

        case 'RaiseError':
          this._emit(`throw new Error("Error " + ${statement.expression});`);
          break;

        default:
          if (statement.code) {
            for (const line of statement.code) {
              this._emit(line.trimStart());
            }
          }
      }
    }
  },

  _generateTrampolineBody(body, context = {}) {
    const builder = new TrampolineBuilder(this, body, context);
    const machine = builder.build();
    const loopLabel = `_qbMainLoop_${body.name?.replace(/[^A-Za-z0-9_$]/g, '_') || 'main'}`;

    this._emit('{');
    this.indent++;
    this._emit(`let _pc = ${stateLiteral(machine.entryState)};`);
    this._emit('const _gosubStack = [];');
    this._emit('let _errorHandlerMode = "OFF";');
    this._emit('let _errorHandlerState = null;');
    this._emit(`let _errorResumeState = ${stateLiteral(machine.endState)};`);
    this._emit(`let _errorFaultState = ${stateLiteral(machine.endState)};`);
    this._emit('let _lastRuntimeError = null;');
    this._emit('let _handlingRuntimeError = false;');
    this._emit(`${loopLabel}: while (true) {`);
    this.indent++;
    this._emit('switch (_pc) {');
    this.indent++;

    for (const state of machine.states) {
      this._emit(`case ${stateLiteral(state.id)}: {`);
      this.indent++;
      this._emit('try {');
      this.indent++;
      this._emitTrampolineState(state, machine, loopLabel);
      this.indent--;
      this._emit('} catch (_stateError) {');
      this.indent++;
      this._emitTrampolineErrorHandler(state, machine, loopLabel);
      this.indent--;
      this._emit('}');
      this.indent--;
      this._emit('}');
    }

    this._emit(`case ${stateLiteral(machine.endState)}: {`);
    this.indent++;
    if (context.procedureType === 'FUNCTION' && context.resultVar) {
      this._emit(`return ${context.resultVar};`);
    } else {
      this._emit(`break ${loopLabel};`);
    }
    this.indent--;
    this._emit('}');

    this._emit('default: {');
    this.indent++;
    this._emit('throw new Error("Invalid program counter: " + _pc);');
    this.indent--;
    this._emit('}');

    this.indent--;
    this._emit('}');
    this.indent--;
    this._emit('}');
    this.indent--;
    this._emit('}');
  },

  _emitTrampolineErrorHandler(state, machine, loopLabel) {
    const resumeState = stateLiteral(
      (() => {
        const target = state.errorResumeState ?? state.nextState ?? machine.endState;
        if (target === machine.endState) return machine.endState;
        if (machine.labelTargets.has(target)) return machine.labelTargets.get(target);
        return target;
      })(),
    );

    this._emit('if (_stateError === "__END__" || _stateError === "STOP") {');
    this.indent++;
    this._emit('throw _stateError;');
    this.indent--;
    this._emit('}');
    this._emit('if (_handlingRuntimeError) {');
    this.indent++;
    this._emit('throw _stateError;');
    this.indent--;
    this._emit('}');
    this._emit(`_errorFaultState = ${stateLiteral(state.id)};`);
    this._emit(`_errorResumeState = ${resumeState};`);
    this._emit('_lastRuntimeError = _stateError;');
    this._emit('if (_errorHandlerMode === "RESUME_NEXT") {');
    this.indent++;
    this._emit(`_pc = ${resumeState};`);
    this._emit(`continue ${loopLabel};`);
    this.indent--;
    this._emit('}');
    this._emit('if (_errorHandlerMode === "GOTO" && _errorHandlerState) {');
    this.indent++;
    this._emit('_handlingRuntimeError = true;');
    this._emit('_pc = _errorHandlerState;');
    this._emit(`continue ${loopLabel};`);
    this.indent--;
    this._emit('}');
    this._emit('throw _stateError;');
  },

  _emitTrampolineState(state, machine, loopLabel) {
    const resolveState = (target) => {
      if (target === machine.endState) return machine.endState;
      if (machine.labelTargets.has(target)) return machine.labelTargets.get(target);
      return target;
    };

    if (state.kind === 'raw') {
      for (const line of state.code) {
        this._emit(line.trimStart());
      }
      this._emit(`_pc = ${stateLiteral(resolveState(state.nextState))};`);
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'assign') {
      this._emit(`_pc = ${stateLiteral(resolveState(state.nextState))};`);
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'goto') {
      this._emit(`_pc = ${stateLiteral(resolveState(state.targetLabel))};`);
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'gosub') {
      this._emit(
        `_gosubStack.push(${stateLiteral(resolveState(state.returnState))});`,
      );
      this._emit(`_pc = ${stateLiteral(resolveState(state.targetLabel))};`);
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'return') {
      this._emit(
        'if (_gosubStack.length === 0) throw new Error("RETURN without GOSUB");',
      );
      this._emit('_pc = _gosubStack.pop();');
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'term') {
      this._emit('throw "__END__";');
      return;
    }

    if (state.kind === 'raiseError') {
      this._emit(`throw new Error("Error " + ${state.expression});`);
      return;
    }

    if (state.kind === 'onJump') {
      const nextState = stateLiteral(resolveState(state.nextState));
      const targets = `[${state.labels
        .map((label) => stateLiteral(resolveState(label)))
        .join(', ')}]`;

      this._emit(`const _onIndex = Math.trunc(Number(${state.expression}) || 0) - 1;`);
      this._emit(`const _onTargets = ${targets};`);
      this._emit('if (_onIndex >= 0 && _onIndex < _onTargets.length) {');
      this.indent++;
      if (state.mode === 'GOSUB') {
        this._emit(`_gosubStack.push(${nextState});`);
      }
      this._emit('_pc = _onTargets[_onIndex];');
      this.indent--;
      this._emit('} else {');
      this.indent++;
      this._emit(`_pc = ${nextState};`);
      this.indent--;
      this._emit('}');
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'onError') {
      for (const line of state.code || []) {
        this._emit(line.trimStart());
      }

      if (state.mode === 'GOTO') {
        if (state.target === '0') {
          this._emit('_errorHandlerMode = "OFF";');
          this._emit('_errorHandlerState = null;');
        } else {
          this._emit('_errorHandlerMode = "GOTO";');
          this._emit(`_errorHandlerState = ${stateLiteral(resolveState(state.target))};`);
        }
      } else if (state.mode === 'RESUME_NEXT') {
        this._emit('_errorHandlerMode = "RESUME_NEXT";');
        this._emit('_errorHandlerState = null;');
      }

      this._emit(`_pc = ${stateLiteral(resolveState(state.nextState))};`);
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'resume') {
      for (const line of state.code || []) {
        this._emit(line.trimStart());
      }

      this._emit('if (!_lastRuntimeError) {');
      this.indent++;
      this._emit('throw new Error("RESUME without active error");');
      this.indent--;
      this._emit('}');
      this._emit('_handlingRuntimeError = false;');
      this._emit('const _resumeTargetState = (() => {');
      this.indent++;
      if (state.mode === 'NEXT') {
        this._emit('return _errorResumeState;');
      } else if (state.mode === 'TARGET') {
        this._emit(`return ${stateLiteral(resolveState(state.target))};`);
      } else {
        this._emit('return _errorFaultState;');
      }
      this.indent--;
      this._emit('})();');
      this._emit('_lastRuntimeError = null;');
      this._emit('_pc = _resumeTargetState;');
      this._emit(`continue ${loopLabel};`);
      return;
    }

    if (state.kind === 'branch') {
      this._emit(
        `if (${state.condition}) { _pc = ${stateLiteral(resolveState(state.trueState))}; } else { _pc = ${stateLiteral(resolveState(state.falseState))}; }`,
      );
      this._emit(`continue ${loopLabel};`);
    }
  },
};
