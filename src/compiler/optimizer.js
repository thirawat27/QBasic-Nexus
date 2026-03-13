/**
 * QBasic Nexus - Code Optimizer
 * Advanced optimization passes for generated JavaScript code
 * 
 * Features:
 * - Constant folding
 * - Dead code elimination
 * - Loop optimization
 * - Inline expansion
 */

'use strict';

class CodeOptimizer {
  constructor(options = {}) {
    this.options = {
      constantFolding: true,
      deadCodeElimination: true,
      loopOptimization: true,
      inlineExpansion: false, // Conservative default
      ...options
    };
    
    this.stats = {
      constantsFolded: 0,
      deadCodeRemoved: 0,
      loopsOptimized: 0,
      functionsInlined: 0
    };
  }

  /**
   * Optimize generated code
   */
  optimize(code) {
    let optimized = code;
    
    if (this.options.constantFolding) {
      optimized = this.foldConstants(optimized);
    }
    
    if (this.options.deadCodeElimination) {
      optimized = this.eliminateDeadCode(optimized);
    }
    
    if (this.options.loopOptimization) {
      optimized = this.optimizeLoops(optimized);
    }
    
    if (this.options.inlineExpansion) {
      optimized = this.inlineFunctions(optimized);
    }
    
    return optimized;
  }

  /**
   * Fold constant expressions
   * Example: (5 + 3) * 2 => 16
   */
  foldConstants(code) {
    // Match simple arithmetic expressions with numbers
    const patterns = [
      // Addition
      { regex: /\((\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\)/g, op: (a, b) => a + b },
      // Subtraction
      { regex: /\((\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\)/g, op: (a, b) => a - b },
      // Multiplication
      { regex: /\((\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\)/g, op: (a, b) => a * b },
      // Division
      { regex: /\((\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\)/g, op: (a, b) => a / b },
    ];
    
    let optimized = code;
    let changed = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      for (const pattern of patterns) {
        const before = optimized;
        optimized = optimized.replace(pattern.regex, (match, a, b) => {
          this.stats.constantsFolded++;
          changed = true;
          return String(pattern.op(parseFloat(a), parseFloat(b)));
        });
        
        if (optimized !== before) {
          changed = true;
        }
      }
    }
    
    return optimized;
  }

  /**
   * Remove unreachable code
   */
  eliminateDeadCode(code) {
    const lines = code.split('\n');
    const result = [];
    let inDeadCode = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for unreachable code after return/throw
      if (trimmed.startsWith('return') || trimmed.startsWith('throw')) {
        result.push(line);
        inDeadCode = true;
        continue;
      }
      
      // Check for block end (resets dead code flag)
      if (trimmed === '}' || trimmed.startsWith('} //')) {
        inDeadCode = false;
        result.push(line);
        continue;
      }
      
      // Skip dead code
      if (inDeadCode && trimmed && !trimmed.startsWith('//')) {
        this.stats.deadCodeRemoved++;
        continue;
      }
      
      result.push(line);
    }
    
    return result.join('\n');
  }

  /**
   * Optimize loop structures
   */
  optimizeLoops(code) {
    let optimized = code;
    
    // Optimize: for (var i = 0; i <= 0; ...) => single iteration
    optimized = optimized.replace(
      /for\s*\(\s*var\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<=\s*\2\s*;/g,
      (match, varName, value) => {
        this.stats.loopsOptimized++;
        return `{ var ${varName} = ${value}; // Optimized single-iteration loop`;
      }
    );
    
    // Optimize: while (false) => remove entirely
    const whileFalseRegex = /while\s*\(\s*(?:false|0)\s*\)\s*\{[^}]*\}/g;
    const beforeWhile = optimized;
    optimized = optimized.replace(whileFalseRegex, '// Removed while(false) loop');
    if (optimized !== beforeWhile) {
      this.stats.loopsOptimized++;
    }
    
    return optimized;
  }

  /**
   * Inline small functions (experimental)
   */
  inlineFunctions(code) {
    // This is a placeholder for future inline expansion
    // Requires more sophisticated AST analysis
    return code;
  }

  /**
   * Get optimization statistics
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

  /**
   * Format statistics for display
   */
  formatStats() {
    return `
Optimization Statistics:
  Constants Folded: ${this.stats.constantsFolded}
  Dead Code Removed: ${this.stats.deadCodeRemoved} lines
  Loops Optimized: ${this.stats.loopsOptimized}
  Functions Inlined: ${this.stats.functionsInlined}
    `.trim();
  }
}

module.exports = CodeOptimizer;
