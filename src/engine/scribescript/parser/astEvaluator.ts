// src/engine/scribescript/parser/astEvaluator.ts
// AST-based evaluator for ScribeScript

import type {
  ASTNode,
  TextBlockNode,
  BraceExpressionNode,
  VariableNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  ConditionalNode,
  MacroNode,
  AssignmentNode,
  LiteralNode,
  RangeNode,
  ChoiceNode,
  ChallengeNode,
  PercentageNode,
  ConditionalBranch
} from './ast';

export interface EvaluationContext {
  variables: Map<string, any>;
  worldVariables: Map<string, any>;
  aliases: Map<string, any>;
}

export class AstEvaluator {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
  }

  /**
   * Evaluate an AST node.
   */
  public evaluate(node: ASTNode): any {
    return this.evaluateNode(node);
  }

  private evaluateNode(node: ASTNode): any {
    switch (node.type) {
      case 'TextBlock':
        return this.evaluateTextBlock(node);
      case 'BraceExpression':
        return this.evaluateBraceExpression(node);
      case 'Variable':
        return this.evaluateVariable(node);
      case 'Literal':
        return this.evaluateLiteral(node);
      case 'BinaryExpression':
        return this.evaluateBinaryExpression(node);
      case 'UnaryExpression':
        return this.evaluateUnaryExpression(node);
      case 'Conditional':
        return this.evaluateConditional(node);
      case 'Macro':
        return this.evaluateMacro(node);
      case 'Assignment':
        return this.evaluateAssignment(node);
      case 'Range':
        return this.evaluateRange(node);
      case 'Choice':
        return this.evaluateChoice(node);
      case 'Challenge':
        return this.evaluateChallenge(node);
      case 'Percentage':
        return this.evaluatePercentage(node);
      default:
        console.warn(`Unhandled AST node type: ${(node as any).type}`);
        return '';
    }
  }

  private evaluateTextBlock(node: TextBlockNode): string {
    const parts: string[] = [];

    for (const part of node.parts) {
      if (typeof part === 'string') {
        parts.push(part);
      } else {
        parts.push(String(this.evaluateNode(part)));
      }
    }

    return parts.join('');
  }

  private evaluateBraceExpression(node: BraceExpressionNode): any {
    return this.evaluateNode(node.expression);
  }

  private evaluateVariable(node: VariableNode): any {
    let value: any;

    // Look up based on sigil
    switch (node.sigil) {
      case '$':
        value = this.context.variables.get(node.identifier as string) ?? 0;
        break;
      case '@':
        value = this.context.aliases.get(node.identifier as string) ?? '';
        break;
      case '#':
        value = this.context.worldVariables.get(node.identifier as string) ?? 0;
        break;
      case '$.': // Self reference
        // TODO: Implement self reference
        value = 0;
        break;
      default:
        value = 0;
    }

    // Apply level spoof if present
    if (node.levelSpoof) {
      const spoofValue = this.evaluateNode(node.levelSpoof);
      // TODO: Apply level spoof logic
      console.warn('Level spoof not implemented');
    }

    // Apply property chain
    let current = value;
    for (const prop of node.propertyChain) {
      if (current && typeof current === 'object' && prop in current) {
        current = current[prop];
      } else {
        current = '';
        break;
      }
    }

    return current;
  }

  private evaluateLiteral(node: LiteralNode): any {
    return node.value;
  }

  private evaluateBinaryExpression(node: BinaryExpressionNode): any {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);

    switch (node.operator) {
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
      default:
        console.warn(`Unknown binary operator: ${node.operator}`);
        return left;
    }
  }

  private evaluateUnaryExpression(node: UnaryExpressionNode): any {
    const operand = this.evaluateNode(node.operand);

    switch (node.operator) {
      case '!': return !operand;
      case '-': return -operand;
      default:
        console.warn(`Unknown unary operator: ${node.operator}`);
        return operand;
    }
  }

  private evaluateConditional(node: ConditionalNode): any {
    // Evaluate branches in order
    for (const branch of node.branches) {
      const condition = this.evaluateNode(branch.condition);
      if (condition) {
        return this.evaluateNode(branch.result);
      }
    }

    // If no branch matched, return else branch
    if (node.elseBranch) {
      return this.evaluateNode(node.elseBranch);
    }

    // Default empty string
    return '';
  }

  private evaluateMacro(node: MacroNode): any {
    // TODO: Implement macro evaluation
    // Need to integrate with existing macros.ts
    console.warn(`Macro evaluation not implemented: ${node.command}`);
    return `[Macro: ${node.command}]`;
  }

  private evaluateAssignment(node: AssignmentNode): any {
    const value = this.evaluateNode(node.value);
    this.context.aliases.set(node.alias, value);
    return value;
  }

  private evaluateRange(node: RangeNode): any {
    const min = this.evaluateNode(node.min);
    const max = this.evaluateNode(node.max);

    // Ensure min and max are numbers
    const minNum = typeof min === 'number' ? min : parseFloat(min);
    const maxNum = typeof max === 'number' ? max : parseFloat(max);

    if (isNaN(minNum) || isNaN(maxNum)) {
      return 0;
    }

    // Generate random integer between min and max inclusive
    const range = Math.max(maxNum, minNum) - Math.min(maxNum, minNum);
    return Math.floor(Math.random() * (range + 1)) + Math.min(minNum, maxNum);
  }

  private evaluateChoice(node: ChoiceNode): any {
    if (node.choices.length === 0) {
      return '';
    }

    // Evaluate all choices first
    const evaluatedChoices = node.choices.map(choice => this.evaluateNode(choice));

    // Randomly select one
    const randomIndex = Math.floor(Math.random() * evaluatedChoices.length);
    return evaluatedChoices[randomIndex];
  }

  private evaluateChallenge(node: ChallengeNode): any {
    // TODO: Implement challenge evaluation
    // Need to integrate with calculateChance from math.ts
    console.warn(`Challenge evaluation not implemented: ${node.operator}`);
    return false;
  }

  private evaluatePercentage(node: PercentageNode): any {
    // Percentage shorthand {60%} -> treat as %random[60] macro
    // For now, just return the value
    return node.value;
  }
}