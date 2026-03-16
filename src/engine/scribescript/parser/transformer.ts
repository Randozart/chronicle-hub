// src/engine/scribescript/parser/transformer.ts
// CST to AST transformation for Chevrotain parser

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
  ConditionalBranch,
  SourceLocation
} from './ast';

// Helper to extract location from Chevrotain tokens
function extractLocation(token: any): SourceLocation | undefined {
  if (!token || !token.startOffset !== undefined) return undefined;

  return {
    start: {
      line: token.startLine || 1,
      column: token.startColumn || 1,
      offset: token.startOffset || 0
    },
    end: {
      line: token.endLine || 1,
      column: token.endColumn || 1,
      offset: token.endOffset || 0
    }
  };
}

// Helper to extract location from CST node (first token)
function extractLocationFromCst(cst: any): SourceLocation | undefined {
  if (!cst || !cst.children) return undefined;

  // Find first token with location
  for (const childName in cst.children) {
    const children = cst.children[childName];
    if (Array.isArray(children) && children.length > 0) {
      const firstChild = children[0];
      if (firstChild.tokenType) {
        return extractLocation(firstChild);
      } else if (firstChild.children) {
        return extractLocationFromCst(firstChild);
      }
    }
  }
  return undefined;
}

export class CstToAstTransformer {

  transform(cst: any): ASTNode {
    if (!cst || !cst.name) {
      throw new Error('Invalid CST node');
    }

    switch (cst.name) {
      case 'script':
        return this.transformScript(cst);
      case 'textBlock':
        return this.transformTextBlock(cst);
      case 'braceExpression':
        return this.transformBraceExpression(cst);
      case 'expression':
      case 'logicalOr':
      case 'logicalAnd':
      case 'equality':
      case 'comparison':
      case 'additive':
      case 'multiplicative':
      case 'unary':
      case 'primary':
        return this.transformExpression(cst);
      case 'variable':
        return this.transformVariable(cst);
      case 'literal':
        return this.transformLiteral(cst);
      case 'parenthesized':
        return this.transformParenthesized(cst);
      case 'macro':
        return this.transformMacro(cst);
      case 'assignment':
        return this.transformAssignment(cst);
      case 'conditional':
        return this.transformConditional(cst);
      case 'challengeExpression':
        return this.transformChallengeExpression(cst);
      case 'rangeExpression':
        return this.transformRangeExpression(cst);
      case 'choiceExpression':
        return this.transformChoiceExpression(cst);
      case 'percentageShorthand':
        return this.transformPercentageShorthand(cst);
      default:
        throw new Error(`Unsupported CST node type: ${cst.name}`);
    }
  }

  private transformScript(cst: any): TextBlockNode {
    // Script is essentially a text block
    const textBlocks = cst.children.textBlock || [];
    if (textBlocks.length === 0) {
      return {
        type: 'TextBlock',
        parts: [],
        location: extractLocationFromCst(cst)
      };
    }

    // If there's only one text block, return it directly
    if (textBlocks.length === 1) {
      return this.transformTextBlock(textBlocks[0]);
    }

    // Multiple text blocks need to be combined
    const parts: Array<ASTNode | string> = [];
    for (const block of textBlocks) {
      const transformed = this.transformTextBlock(block);
      parts.push(...transformed.parts);
    }

    return {
      type: 'TextBlock',
      parts,
      location: extractLocationFromCst(cst)
    };
  }

  private transformTextBlock(cst: any): TextBlockNode {
    const parts: Array<ASTNode | string> = [];
    const location = extractLocationFromCst(cst);

    // String literals (plain text)
    if (cst.children.StringLiteral) {
      for (const lit of cst.children.StringLiteral) {
        // Remove quotes from string literals
        const value = lit.image.slice(1, -1);
        parts.push(value);
      }
    }

    // Brace expressions
    if (cst.children.braceExpression) {
      for (const expr of cst.children.braceExpression) {
        parts.push(this.transformBraceExpression(expr));
      }
    }

    return {
      type: 'TextBlock',
      parts,
      location
    };
  }

  private transformBraceExpression(cst: any): BraceExpressionNode {
    const expression = cst.children.expression && cst.children.expression[0]
      ? this.transformExpression(cst.children.expression[0])
      : this.createEmptyLiteral();

    return {
      type: 'BraceExpression',
      expression,
      location: extractLocationFromCst(cst)
    };
  }

  private transformExpression(cst: any): ASTNode {
    // Handle expression with branches (new grammar)
    if (cst.children.branch) {
      return this.transformExpressionWithBranches(cst);
    }

    // Handle range expressions (Tilde operator)
    if (cst.children.Tilde) {
      return this.transformRangeNode(cst);
    }

    // Handle challenge expressions (ChallengeOp: >>, <<, ><, <>)
    if (cst.children.ChallengeOp) {
      return this.transformChallengeNode(cst);
    }

    // Handle binary expressions (operators with left/right operands)
    const hasOperator = this.hasBinaryOperator(cst);
    if (hasOperator) {
      return this.transformBinaryExpression(cst);
    }

    // Handle unary expressions
    if (cst.children.LogicalNot || cst.children.Minus) {
      return this.transformUnaryExpression(cst);
    }

    // Handle primary expressions
    if (cst.children.primary && cst.children.primary[0]) {
      return this.transformExpression(cst.children.primary[0]);
    }

    // Handle direct children (variable, literal, etc.)
    const childTypes = ['variable', 'literal', 'parenthesized', 'macro',
                       'conditional', 'challengeExpression', 'rangeExpression',
                       'choiceExpression', 'percentageShorthand',
                       'logicalOr', 'logicalAnd', 'equality', 'comparison',
                       'additive', 'multiplicative', 'unary', 'primary'];

    for (const type of childTypes) {
      if (cst.children[type] && cst.children[type][0]) {
        return this.transform(cst.children[type][0]);
      }
    }

    // Fallback: empty literal
    return this.createEmptyLiteral();
  }

  private transformExpressionWithBranches(cst: any): ASTNode {
    const branches = cst.children.branch || [];
    if (branches.length === 0) {
      return this.createEmptyLiteral();
    }

    // Check if any branch has a colon (conditional) vs plain choices
    const hasColon = branches.some((branch: any) => branch.children.Colon);

    if (hasColon) {
      // Build conditional branches: {condition : result | condition2 : result2 | else}
      const conditionalBranches: ConditionalBranch[] = [];
      let elseBranch: ASTNode | undefined;

      for (const branch of branches) {
        if (branch.children.Colon) {
          const condition = this.transformExpression(branch.children.logicalOr[0]);
          const result = this.transformExpression(branch.children.logicalOr[1]);
          conditionalBranches.push({ condition, result });
        } else {
          // else branch (no colon)
          elseBranch = this.transformExpression(branch.children.logicalOr[0]);
        }
      }

      return {
        type: 'Conditional',
        branches: conditionalBranches,
        elseBranch,
        location: extractLocationFromCst(cst)
      };
    } else {
      // Choice node: {a | b | c}
      const choices: ASTNode[] = [];
      for (const branch of branches) {
        choices.push(this.transformExpression(branch.children.logicalOr[0]));
      }
      return {
        type: 'Choice',
        choices,
        location: extractLocationFromCst(cst)
      };
    }
  }

  private transformRangeNode(cst: any): RangeNode {
    // comparison rule: additive Tilde additive
    const additives = cst.children.additive || [];
    if (additives.length >= 2) {
      return {
        type: 'Range',
        min: this.transformExpression(additives[0]),
        max: this.transformExpression(additives[1]),
        location: extractLocationFromCst(cst)
      };
    }
    return {
      type: 'Range',
      min: this.createEmptyLiteral(),
      max: this.createEmptyLiteral(),
      location: extractLocationFromCst(cst)
    };
  }

  private transformChallengeNode(cst: any): ChallengeNode {
    // comparison rule: additive ChallengeOp additive
    const additives = cst.children.additive || [];
    const operator: '>>' | '<<' | '><' | '<>' = cst.children.ChallengeOp?.[0]?.image ?? '>>';
    return {
      type: 'Challenge',
      skill: additives.length > 0 ? this.transformExpression(additives[0]) : this.createEmptyLiteral(),
      operator,
      target: additives.length > 1 ? this.transformExpression(additives[1]) : this.createEmptyLiteral(),
      options: undefined,
      location: extractLocationFromCst(cst)
    };
  }

  private hasBinaryOperator(cst: any): boolean {
    const operatorTokens = [
      'LogicalOr', 'LogicalAnd', 'DoubleEquals', 'NotEquals',
      'GreaterThan', 'LessThan', 'GreaterEquals', 'LessEquals',
      'Plus', 'Minus', 'Multiply', 'Divide'
    ];

    for (const op of operatorTokens) {
      if (cst.children[op] && cst.children[op].length > 0) {
        return true;
      }
    }
    return false;
  }

  private transformBinaryExpression(cst: any): BinaryExpressionNode {
    // Find left operand
    let left: ASTNode = this.createEmptyLiteral();
    let operator = '';
    let right: ASTNode = this.createEmptyLiteral();

    // Determine operator type
    const operatorMapping: Record<string, string> = {
      'LogicalOr': '||',
      'LogicalAnd': '&&',
      'DoubleEquals': '==',
      'NotEquals': '!=',
      'GreaterThan': '>',
      'LessThan': '<',
      'GreaterEquals': '>=',
      'LessEquals': '<=',
      'Plus': '+',
      'Minus': '-',
      'Multiply': '*',
      'Divide': '/'
    };

    // Find which operator is present
    for (const [opToken, opSymbol] of Object.entries(operatorMapping)) {
      if (cst.children[opToken] && cst.children[opToken].length > 0) {
        operator = opSymbol;
        break;
      }
    }

    // Find left and right operands
    // They should be in a child array (e.g., logicalAnd, equality, etc.)
    const operandChildName = Object.keys(cst.children).find(
      key => !operatorMapping[key] && key !== 'LogicalNot' && key !== 'Minus'
    );

    if (operandChildName && cst.children[operandChildName]) {
      const operands = cst.children[operandChildName];
      if (Array.isArray(operands) && operands.length >= 2) {
        left = this.transformExpression(operands[0]);
        right = this.transformExpression(operands[1]);
      }
    }

    return {
      type: 'BinaryExpression',
      operator: operator as any,
      left,
      right,
      location: extractLocationFromCst(cst)
    };
  }

  private transformUnaryExpression(cst: any): UnaryExpressionNode {
    const operator = cst.children.LogicalNot ? '!' : '-';

    // Find operand
    let operand: ASTNode = this.createEmptyLiteral();
    const operandChildName = Object.keys(cst.children).find(
      key => key !== 'LogicalNot' && key !== 'Minus'
    );

    if (operandChildName && cst.children[operandChildName]) {
      const operands = cst.children[operandChildName];
      if (Array.isArray(operands) && operands.length > 0) {
        operand = this.transformExpression(operands[0]);
      }
    }

    return {
      type: 'UnaryExpression',
      operator,
      operand,
      location: extractLocationFromCst(cst)
    };
  }

  private transformVariable(cst: any): VariableNode {
    let sigil: '$' | '@' | '#' | '$.' = '$';
    let identifier = '';

    // Determine sigil and identifier
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
      identifier = ''; // Self reference has no identifier
    }

    // Level spoof
    let levelSpoof: ASTNode | undefined;
    if (cst.children.LBracket && cst.children.expression && cst.children.expression[0]) {
      levelSpoof = this.transformExpression(cst.children.expression[0]);
    }

    // Property chain
    const propertyChain: string[] = [];
    if (cst.children.PropertyAccess) {
      for (const prop of cst.children.PropertyAccess) {
        propertyChain.push(prop.image.slice(1)); // Remove leading dot
      }
    }

    return {
      type: 'Variable',
      sigil,
      identifier,
      levelSpoof,
      propertyChain,
      location: extractLocationFromCst(cst)
    };
  }

  private transformLiteral(cst: any): LiteralNode {
    let value: string | number | boolean = '';

    if (cst.children.NumberLiteral && cst.children.NumberLiteral[0]) {
      const image = cst.children.NumberLiteral[0].image;
      value = image.includes('.') ? parseFloat(image) : parseInt(image, 10);
    } else if (cst.children.StringLiteral && cst.children.StringLiteral[0]) {
      value = cst.children.StringLiteral[0].image.slice(1, -1);
    } else if (cst.children.BooleanLiteral && cst.children.BooleanLiteral[0]) {
      value = cst.children.BooleanLiteral[0].image === 'true';
    } else if (cst.children.Identifier && cst.children.Identifier[0]) {
      // Unquoted identifier — treated as bare string (e.g. macro args like %list[weapons])
      value = cst.children.Identifier[0].image;
    }

    return {
      type: 'Literal',
      value,
      location: extractLocationFromCst(cst)
    };
  }

  private transformParenthesized(cst: any): ASTNode {
    if (cst.children.expression && cst.children.expression[0]) {
      return this.transformExpression(cst.children.expression[0]);
    }
    return this.createEmptyLiteral();
  }

  private transformMacro(cst: any): MacroNode {
    // Extract command from Macro token
    let command = '';
    if (cst.children.Macro && cst.children.Macro[0]) {
      const macroImage = cst.children.Macro[0].image;
      command = macroImage.slice(1); // Remove leading '%'
    }

    // Extract arguments
    let mainArg: ASTNode | string = '';
    const options: Array<ASTNode | string> = [];

    if (cst.children.macroArgs && cst.children.macroArgs[0]) {
      const macroArgsCst = cst.children.macroArgs[0];
      const expressions = macroArgsCst.children.expression || [];

      if (expressions.length > 0) {
        mainArg = this.transformExpression(expressions[0]);
      }

      // Additional arguments (options)
      for (let i = 1; i < expressions.length; i++) {
        options.push(this.transformExpression(expressions[i]));
      }
    }

    return {
      type: 'Macro',
      command,
      mainArg,
      options,
      location: extractLocationFromCst(cst)
    };
  }

  private transformAssignment(cst: any): AssignmentNode {
    // Extract alias name
    let alias = '';
    if (cst.children.Alias && cst.children.Alias[0]) {
      const aliasImage = cst.children.Alias[0].image;
      alias = aliasImage.slice(1); // Remove leading '@'
    }

    // Extract value expression
    let value: ASTNode = this.createEmptyLiteral();
    if (cst.children.expression && cst.children.expression[0]) {
      value = this.transformExpression(cst.children.expression[0]);
    }

    return {
      type: 'Assignment',
      alias,
      value,
      location: extractLocationFromCst(cst)
    };
  }

  private transformConditional(cst: any): ConditionalNode {
    const expressions = cst.children.expression || [];
    const branches: ConditionalBranch[] = [];
    let elseBranch: ASTNode | undefined;

    if (expressions.length >= 2) {
      // Simple if: condition : result
      const condition = this.transformExpression(expressions[0]);
      const result = this.transformExpression(expressions[1]);

      branches.push({ condition, result });

      // Optional else branch
      if (expressions.length >= 3) {
        elseBranch = this.transformExpression(expressions[2]);
      }
    }

    return {
      type: 'Conditional',
      branches,
      elseBranch,
      location: extractLocationFromCst(cst)
    };
  }

  private transformChallengeExpression(cst: any): ChallengeNode {
    // Get skill and target expressions
    const expressions = cst.children.expression || [];
    let skill: ASTNode = this.createEmptyLiteral();
    let target: ASTNode = this.createEmptyLiteral();

    if (expressions.length >= 2) {
      skill = this.transformExpression(expressions[0]);
      target = this.transformExpression(expressions[1]);
    }

    // Get operator
    let operator: '>>' | '<<' | '><' | '<>' | '==' | '!=' = '>>';
    if (cst.children.ChallengeOp && cst.children.ChallengeOp[0]) {
      const opImage = cst.children.ChallengeOp[0].image;
      operator = opImage as any; // Will be validated at evaluation
    }

    // Parse options if present
    let options: { margin?: number; min?: number; max?: number; pivot?: number } | undefined;
    if (cst.children.LBracket && cst.children.challengeParams && cst.children.challengeParams[0]) {
      // TODO: Parse challenge parameters properly
      // For now, store undefined
      options = undefined;
    }

    return {
      type: 'Challenge',
      skill,
      operator,
      target,
      options,
      location: extractLocationFromCst(cst)
    };
  }

  private transformRangeExpression(cst: any): RangeNode {
    // rangeExpression: expression Tilde expression
    const expressions = cst.children.expression || [];
    if (expressions.length < 2) {
      // Fallback with empty literals
      return {
        type: 'Range',
        min: this.createEmptyLiteral(),
        max: this.createEmptyLiteral(),
        location: extractLocationFromCst(cst)
      };
    }

    const min = this.transformExpression(expressions[0]);
    const max = this.transformExpression(expressions[1]);

    return {
      type: 'Range',
      min,
      max,
      location: extractLocationFromCst(cst)
    };
  }

  private transformChoiceExpression(cst: any): ChoiceNode {
    // choiceExpression: expression (| expression)+
    const expressions = cst.children.expression || [];
    const choices: ASTNode[] = [];

    for (const expr of expressions) {
      choices.push(this.transformExpression(expr));
    }

    return {
      type: 'Choice',
      choices,
      location: extractLocationFromCst(cst)
    };
  }

  private transformPercentageShorthand(cst: any): PercentageNode {
    // percentageShorthand: NumberLiteral Percent
    let value = 0;
    if (cst.children.NumberLiteral && cst.children.NumberLiteral[0]) {
      const image = cst.children.NumberLiteral[0].image;
      value = image.includes('.') ? parseFloat(image) : parseInt(image, 10);
    }

    return {
      type: 'Percentage',
      value,
      location: extractLocationFromCst(cst)
    };
  }

  private createEmptyLiteral(): LiteralNode {
    return {
      type: 'Literal',
      value: '',
      location: undefined
    };
  }
}