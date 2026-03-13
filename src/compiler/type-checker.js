/**
 * QBasic Nexus - Type Checker
 * Static type analysis and validation for QBasic code
 * 
 * Features:
 * - Type inference from variable suffixes ($, %, &, !, #)
 * - Type compatibility checking
 * - Array dimension validation
 * - User-defined TYPE validation
 */

'use strict';

const { ErrorCategory } = require('./error-recovery');

/**
 * QBasic type system
 */
const QBasicType = Object.freeze({
  INTEGER: 'INTEGER',    // % suffix, 16-bit
  LONG: 'LONG',          // & suffix, 32-bit
  SINGLE: 'SINGLE',      // ! suffix, 32-bit float (default)
  DOUBLE: 'DOUBLE',      // # suffix, 64-bit float
  STRING: 'STRING',      // $ suffix
  USER_DEFINED: 'TYPE',  // Custom TYPE
  ANY: 'ANY'             // Unknown/dynamic
});

class TypeChecker {
  constructor() {
    this.typeMap = new Map(); // Variable name -> type info
    this.userTypes = new Map(); // TYPE name -> field definitions
    this.diagnostics = [];
  }

  /**
   * Infer type from variable name suffix
   */
  inferType(varName) {
    if (!varName || typeof varName !== 'string') {
      return QBasicType.ANY;
    }

    const lastChar = varName.charAt(varName.length - 1);
    
    switch (lastChar) {
      case '$': return QBasicType.STRING;
      case '%': return QBasicType.INTEGER;
      case '&': return QBasicType.LONG;
      case '!': return QBasicType.SINGLE;
      case '#': return QBasicType.DOUBLE;
      default: return QBasicType.SINGLE; // Default numeric type
    }
  }

  /**
   * Register a variable with its type
   */
  registerVariable(name, type, metadata = {}) {
    const inferredType = type || this.inferType(name);
    
    this.typeMap.set(name, {
      type: inferredType,
      isArray: metadata.isArray || false,
      dimensions: metadata.dimensions || 0,
      userType: metadata.userType || null,
      line: metadata.line || 0,
      column: metadata.column || 0
    });
  }

  /**
   * Register a user-defined TYPE
   */
  registerUserType(typeName, fields) {
    this.userTypes.set(typeName.toUpperCase(), fields);
  }

  /**
   * Get variable type info
   */
  getVariableType(name) {
    return this.typeMap.get(name) || null;
  }

  /**
   * Check if types are compatible for assignment
   */
  areTypesCompatible(targetType, sourceType) {
    // ANY type is compatible with everything
    if (targetType === QBasicType.ANY || sourceType === QBasicType.ANY) {
      return true;
    }

    // Exact match
    if (targetType === sourceType) {
      return true;
    }

    // Numeric types are compatible with each other (with potential precision loss)
    const numericTypes = [
      QBasicType.INTEGER,
      QBasicType.LONG,
      QBasicType.SINGLE,
      QBasicType.DOUBLE
    ];
    
    if (numericTypes.includes(targetType) && numericTypes.includes(sourceType)) {
      return true;
    }

    return false;
  }

  /**
   * Validate assignment type compatibility
   */
  validateAssignment(targetName, sourceName, line, column) {
    const targetInfo = this.getVariableType(targetName);
    const sourceInfo = this.getVariableType(sourceName);

    if (!targetInfo || !sourceInfo) {
      return; // Can't validate without type info
    }

    if (!this.areTypesCompatible(targetInfo.type, sourceInfo.type)) {
      this.diagnostics.push({
        severity: 'warning',
        category: ErrorCategory.TYPE,
        message: `Type mismatch: Cannot assign ${sourceInfo.type} to ${targetInfo.type}`,
        line,
        column,
        length: targetName.length
      });
    }

    // Check array dimension mismatch
    if (targetInfo.isArray !== sourceInfo.isArray) {
      this.diagnostics.push({
        severity: 'error',
        category: ErrorCategory.TYPE,
        message: `Cannot assign ${sourceInfo.isArray ? 'array' : 'scalar'} to ${targetInfo.isArray ? 'array' : 'scalar'}`,
        line,
        column,
        length: targetName.length
      });
    }
  }

  /**
   * Validate array access
   */
  validateArrayAccess(varName, dimensionCount, line, column) {
    const varInfo = this.getVariableType(varName);

    if (!varInfo) {
      return; // Variable not registered yet
    }

    if (!varInfo.isArray) {
      this.diagnostics.push({
        severity: 'error',
        category: ErrorCategory.TYPE,
        message: `Variable '${varName}' is not an array`,
        line,
        column,
        length: varName.length
      });
      return;
    }

    if (varInfo.dimensions > 0 && dimensionCount !== varInfo.dimensions) {
      this.diagnostics.push({
        severity: 'warning',
        category: ErrorCategory.TYPE,
        message: `Array '${varName}' expects ${varInfo.dimensions} dimension(s), got ${dimensionCount}`,
        line,
        column,
        length: varName.length
      });
    }
  }

  /**
   * Validate user-defined TYPE field access
   */
  validateTypeFieldAccess(varName, fieldName, line, column) {
    const varInfo = this.getVariableType(varName);

    if (!varInfo || varInfo.type !== QBasicType.USER_DEFINED) {
      this.diagnostics.push({
        severity: 'error',
        category: ErrorCategory.TYPE,
        message: `Variable '${varName}' is not a user-defined TYPE`,
        line,
        column,
        length: varName.length
      });
      return;
    }

    const typeFields = this.userTypes.get(varInfo.userType);
    if (!typeFields || !typeFields[fieldName.toUpperCase()]) {
      this.diagnostics.push({
        severity: 'error',
        category: ErrorCategory.REFERENCE,
        message: `TYPE '${varInfo.userType}' has no field '${fieldName}'`,
        line,
        column,
        length: fieldName.length
      });
    }
  }

  /**
   * Get all diagnostics
   */
  getDiagnostics() {
    return this.diagnostics;
  }

  /**
   * Clear diagnostics
   */
  clearDiagnostics() {
    this.diagnostics = [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      constantsFolded: 0,
      deadCodeRemoved: 0,
      loopsOptimized: 0,
      functionsInlined: 0
    };
  }
}

module.exports = TypeChecker;
