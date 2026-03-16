// src/engine/scribescript/parser/visitor.ts

import { scribeScriptLexer, parser } from './grammar';

export interface EvaluationContext {
  variables: Map<string, any>;
  worldVariables: Map<string, any>;
  aliases: Map<string, any>;
}

/**
 * Direct CST evaluator for Chevrotain v11
 * Walks the CST directly without AST transformation for Phase 2
 */
export class ScribeScriptVisitor {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
  }

  /**
   * Evaluate ScribeScript text.
   */
  public evaluate(text: string): any {
    const lexResult = scribeScriptLexer.tokenize(text);
    if (lexResult.errors.length > 0) {
      console.warn('Lexer errors:', lexResult.errors);
      return text; // Fallback to original text
    }

    parser.input = lexResult.tokens;
    // @ts-expect-error - Chevrotain dynamically adds methods
    const cst = parser.script();
    if (parser.errors.length > 0) {
      console.warn('Parser errors:', parser.errors);
      return text; // Fallback
    }

    return this.evaluateCst(cst);
  }

  /**
   * Recursively evaluate CST nodes
   */
  private evaluateCst(cst: any): any {
    if (!cst || !cst.children) {
      return '';
    }

    // Handle script node
    if (cst.name === 'script') {
      const textBlocks = cst.children.textBlock || [];
      return textBlocks.map((block: any) => this.evaluateCst(block)).join('');
    }

    // Handle textBlock node
    if (cst.name === 'textBlock') {
      const parts: string[] = [];

      // Process string literals
      if (cst.children.StringLiteral) {
        for (const lit of cst.children.StringLiteral) {
          parts.push(lit.image.slice(1, -1)); // Remove quotes
        }
      }

      // Process brace expressions
      if (cst.children.braceExpression) {
        for (const expr of cst.children.braceExpression) {
          parts.push(String(this.evaluateCst(expr)));
        }
      }

      return parts.join('');
    }

    // Handle braceExpression node
    if (cst.name === 'braceExpression') {
      if (cst.children.expression && cst.children.expression[0]) {
        return this.evaluateCst(cst.children.expression[0]);
      }
      return '';
    }

    // Handle expression nodes (walk down the grammar tree)
    const expressionTypes = [
      'expression', 'logicalOr', 'logicalAnd', 'equality',
      'comparison', 'additive', 'multiplicative', 'unary', 'primary'
    ];

    if (expressionTypes.includes(cst.name)) {
      // Find the first child (there should be exactly one main child for unary/primary,
      // or multiple for binary expressions with operators)
      for (const childName in cst.children) {
        if (childName !== 'LogicalOr' && childName !== 'LogicalAnd' &&
            childName !== 'DoubleEquals' && childName !== 'NotEquals' &&
            childName !== 'GreaterThan' && childName !== 'LessThan' &&
            childName !== 'GreaterEquals' && childName !== 'LessEquals' &&
            childName !== 'Plus' && childName !== 'Minus' &&
            childName !== 'Multiply' && childName !== 'Divide' &&
            childName !== 'LogicalNot') {
          const childArray = cst.children[childName];
          if (Array.isArray(childArray) && childArray.length > 0) {
            // Handle binary expressions
            if (childArray.length > 1) {
              return this.evaluateBinaryExpression(cst);
            }
            // Handle unary expressions
            if (cst.children.LogicalNot || cst.children.Minus) {
              return this.evaluateUnaryExpression(cst);
            }
            // Handle primary expressions (variables, literals, parenthesized)
            return this.evaluateCst(childArray[0]);
          }
        }
      }
    }

    // Handle variable node
    if (cst.name === 'variable') {
      return this.evaluateVariable(cst);
    }

    // Handle literal node
    if (cst.name === 'literal') {
      return this.evaluateLiteral(cst);
    }

    // Handle parenthesized node
    if (cst.name === 'parenthesized') {
      if (cst.children.expression && cst.children.expression[0]) {
        return this.evaluateCst(cst.children.expression[0]);
      }
      return '';
    }

    // Default: return empty string for unimplemented nodes
    console.warn(`Unhandled CST node type: ${cst.name}`);
    return '';
  }

  /**
   * Evaluate binary expressions
   */
  private evaluateBinaryExpression(cst: any): any {
    // Get left and right operands
    const leftChildName = Object.keys(cst.children).find(
      key => key !== 'LogicalOr' && key !== 'LogicalAnd' &&
             key !== 'DoubleEquals' && key !== 'NotEquals' &&
             key !== 'GreaterThan' && key !== 'LessThan' &&
             key !== 'GreaterEquals' && key !== 'LessEquals' &&
             key !== 'Plus' && key !== 'Minus' &&
             key !== 'Multiply' && key !== 'Divide'
    );

    if (!leftChildName) return 0;

    const leftArray = cst.children[leftChildName];
    if (!Array.isArray(leftArray) || leftArray.length < 2) return 0;

    const left = this.evaluateCst(leftArray[0]);
    const right = this.evaluateCst(leftArray[1]);

    // Determine operator
    let operator = '';
    if (cst.children.LogicalOr && cst.children.LogicalOr[0]) operator = '||';
    else if (cst.children.LogicalAnd && cst.children.LogicalAnd[0]) operator = '&&';
    else if (cst.children.DoubleEquals && cst.children.DoubleEquals[0]) operator = '==';
    else if (cst.children.NotEquals && cst.children.NotEquals[0]) operator = '!=';
    else if (cst.children.GreaterThan && cst.children.GreaterThan[0]) operator = '>';
    else if (cst.children.LessThan && cst.children.LessThan[0]) operator = '<';
    else if (cst.children.GreaterEquals && cst.children.GreaterEquals[0]) operator = '>=';
    else if (cst.children.LessEquals && cst.children.LessEquals[0]) operator = '<=';
    else if (cst.children.Plus && cst.children.Plus[0]) operator = '+';
    else if (cst.children.Minus && cst.children.Minus[0]) operator = '-';
    else if (cst.children.Multiply && cst.children.Multiply[0]) operator = '*';
    else if (cst.children.Divide && cst.children.Divide[0]) operator = '/';

    // Apply operator
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: return left;
    }
  }

  /**
   * Evaluate unary expressions
   */
  private evaluateUnaryExpression(cst: any): any {
    // Find the operand
    const operandChildName = Object.keys(cst.children).find(
      key => key !== 'LogicalNot' && key !== 'Minus'
    );

    if (!operandChildName) return 0;

    const operandArray = cst.children[operandChildName];
    if (!Array.isArray(operandArray) || operandArray.length === 0) return 0;

    const operand = this.evaluateCst(operandArray[0]);

    // Determine operator
    if (cst.children.LogicalNot && cst.children.LogicalNot[0]) {
      return !operand;
    }
    if (cst.children.Minus && cst.children.Minus[0]) {
      return -operand;
    }

    return operand;
  }

  /**
   * Evaluate variable nodes
   */
  private evaluateVariable(cst: any): any {
    let identifier = '';
    let sigil = '';

    if (cst.children.Variable && cst.children.Variable[0]) {
      sigil = '$';
      identifier = cst.children.Variable[0].image.slice(1);
    } else if (cst.children.Alias && cst.children.Alias[0]) {
      sigil = '@';
      identifier = cst.children.Alias[0].image.slice(1);
    } else if (cst.children.WorldVar && cst.children.WorldVar[0]) {
      sigil = '#';
      identifier = cst.children.WorldVar[0].image.slice(1);
    } else if (cst.children.SelfRef && cst.children.SelfRef[0]) {
      sigil = '$.';
      // Self reference - TODO: implement
      return 0;
    }

    // Handle level spoof if present
    if (cst.children.LBracket && cst.children.expression && cst.children.expression[0]) {
      // TODO: Implement level spoof evaluation
      console.warn('Level spoof not implemented');
    }

    // Look up value based on sigil
    switch (sigil) {
      case '$':
        return this.context.variables.get(identifier) ?? 0;
      case '@':
        return this.context.aliases.get(identifier) ?? '';
      case '#':
        return this.context.worldVariables.get(identifier) ?? 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate literal nodes
   */
  private evaluateLiteral(cst: any): any {
    if (cst.children.NumberLiteral && cst.children.NumberLiteral[0]) {
      const image = cst.children.NumberLiteral[0].image;
      return image.includes('.') ? parseFloat(image) : parseInt(image, 10);
    }
    if (cst.children.StringLiteral && cst.children.StringLiteral[0]) {
      return cst.children.StringLiteral[0].image.slice(1, -1);
    }
    if (cst.children.BooleanLiteral && cst.children.BooleanLiteral[0]) {
      return cst.children.BooleanLiteral[0].image === 'true';
    }
    return '';
  }
}