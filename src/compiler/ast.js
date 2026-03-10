/**
 * QBasic Nexus - Abstract Syntax Tree (AST) definitions
 *
 * This file defines the AST nodes for the new multi-pass compiler architecture.
 * Moving to an AST solves bottlenecks present in direct string-emission transpilation,
 * enabling advanced optimization passes, static analysis, and better scoping rules.
 */

'use strict';

class ASTNode {
  constructor(type) {
    this.type = type;
    // Allows attaching line number / token information for debugging
    this.loc = null;
  }
}

// ==========================================
// Root and Scopes
// ==========================================

class Program extends ASTNode {
  constructor(body = []) {
    super('Program');
    this.body = body; // Array of statements
  }
}

class Block extends ASTNode {
  constructor(statements = []) {
    super('Block');
    this.statements = statements;
  }
}

// ==========================================
// Expressions
// ==========================================

class Expression extends ASTNode {
  constructor(type) {
    super(type);
  }
}

class Literal extends Expression {
  constructor(value, dataType = 'ANY') {
    super('Literal');
    this.value = value;
    this.dataType = dataType; // 'STRING', 'INTEGER', 'FLOAT', etc.
  }
}

class Identifier extends Expression {
  constructor(name) {
    super('Identifier');
    this.name = name;
  }
}

class BinaryExpression extends Expression {
  constructor(operator, left, right) {
    super('BinaryExpression');
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

class UnaryExpression extends Expression {
  constructor(operator, argument) {
    super('UnaryExpression');
    this.operator = operator;
    this.argument = argument;
  }
}

class CallExpression extends Expression {
  constructor(callee, args = []) {
    super('CallExpression');
    this.callee = callee; // Identifier or Built-in name
    this.args = args;
  }
}

class ArraysAccess extends Expression {
  constructor(ident, indices = []) {
    super('ArraysAccess');
    this.ident = ident;
    this.indices = indices;
  }
}

// ==========================================
// Statements
// ==========================================

class Statement extends ASTNode {
  constructor(type) {
    super(type);
  }
}

class AssignmentStatement extends Statement {
  constructor(left, right) {
    super('AssignmentStatement');
    this.left = left; // Identifier or ArraysAccess
    this.right = right; // Expression
  }
}

class IfStatement extends Statement {
  constructor(condition, consequent, alternate = null, elseIfs = []) {
    super('IfStatement');
    this.condition = condition;
    this.consequent = consequent; // Block
    this.alternate = alternate; // Block or null
    this.elseIfs = elseIfs; // Array of { condition, consequent }
  }
}

class ForStatement extends Statement {
  constructor(variable, start, end, step, body) {
    super('ForStatement');
    this.variable = variable;
    this.start = start;
    this.end = end;
    this.step = step; // Optional Expression, defaults to 1
    this.body = body; // Block
  }
}

class WhileStatement extends Statement {
  constructor(condition, body) {
    super('WhileStatement');
    this.condition = condition;
    this.body = body;
  }
}

class DoLoopStatement extends Statement {
  constructor(condition, body, isUntil = false, checkAtBottom = false) {
    super('DoLoopStatement');
    this.condition = condition;
    this.body = body;
    this.isUntil = isUntil;
    this.checkAtBottom = checkAtBottom;
  }
}

class SelectStatement extends Statement {
  constructor(discriminant, cases = []) {
    super('SelectStatement');
    this.discriminant = discriminant;
    this.cases = cases; // Array of { test, consequent }
  }
}

// ==========================================
// Procedures and Definitions
// ==========================================

class SubDeclaration extends Statement {
  constructor(name, params, body) {
    super('SubDeclaration');
    this.name = name;
    this.params = params; // Array of parameter definitions
    this.body = body;
  }
}

class FunctionDeclaration extends Statement {
  constructor(name, params, returnType, body) {
    super('FunctionDeclaration');
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.body = body;
  }
}

class DimStatement extends Statement {
  constructor(declarations = []) {
    super('DimStatement');
    this.declarations = declarations; // { name, type, isArray, dimensions }
  }
}

// ==========================================
// I/O & Graphics Statements
// ==========================================

class PrintStatement extends Statement {
  constructor(args = []) {
    super('PrintStatement');
    this.args = args; // Expressions
  }
}

class InputStatement extends Statement {
  constructor(prompt, variables) {
    super('InputStatement');
    this.prompt = prompt; // String Literal
    this.variables = variables; // Array of Identifiers
  }
}

class GraphicsStatement extends Statement {
  constructor(command, args = []) {
    super('GraphicsStatement');
    this.command = command; // 'PSET', 'CIRCLE', 'LINE'
    this.args = args;
  }
}

// Exports
module.exports = {
  ASTNode,
  Program,
  Block,
  Expression,
  Literal,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  ArraysAccess,
  Statement,
  AssignmentStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  DoLoopStatement,
  SelectStatement,
  SubDeclaration,
  FunctionDeclaration,
  DimStatement,
  PrintStatement,
  InputStatement,
  GraphicsStatement,
};
