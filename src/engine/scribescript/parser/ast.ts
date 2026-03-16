// src/engine/scribescript/parser/ast.ts

export type ASTNode =
  | TextBlockNode
  | VariableNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | ConditionalNode
  | MacroNode
  | AssignmentNode
  | LiteralNode
  | RangeNode
  | ChoiceNode
  | ChallengeNode
  | PercentageNode
  | BraceExpressionNode;

export interface BaseNode {
  type: string;
  location?: SourceLocation;
}

export interface SourceLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

// Text and Blocks
export interface TextBlockNode extends BaseNode {
  type: 'TextBlock';
  parts: Array<ASTNode | string>;
}

export interface BraceExpressionNode extends BaseNode {
  type: 'BraceExpression';
  expression: ASTNode;
}

// Variables and Properties
export interface VariableNode extends BaseNode {
  type: 'Variable';
  sigil: '$' | '@' | '#' | '$.';
  identifier: string | ASTNode; // Can be literal or expression
  levelSpoof?: ASTNode; // Optional [expression]
  propertyChain: string[]; // Array of property names
}

// Expressions
export interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | '=' | '+' | '-' | '*' | '/' | '||' | '&&';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  operator: '!' | '-';
  operand: ASTNode;
}

// Control Flow
export interface ConditionalNode extends BaseNode {
  type: 'Conditional';
  branches: ConditionalBranch[];
  elseBranch?: ASTNode;
}

export interface ConditionalBranch {
  condition: ASTNode;
  result: ASTNode;
}

export interface AssignmentNode extends BaseNode {
  type: 'Assignment';
  alias: string;
  value: ASTNode;
}

// Macros
export interface MacroNode extends BaseNode {
  type: 'Macro';
  command: string;
  mainArg: ASTNode | string;
  options: Array<ASTNode | string>;
}

// Literals and Special Forms
export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: string | number | boolean;
}

export interface RangeNode extends BaseNode {
  type: 'Range';
  min: number;
  max: number;
}

export interface ChoiceNode extends BaseNode {
  type: 'Choice';
  choices: ASTNode[];
}

export interface ChallengeNode extends BaseNode {
  type: 'Challenge';
  skill: ASTNode;
  operator: '>>' | '<<' | '><' | '<>' | '==' | '!=';
  target: ASTNode;
  options?: {
    margin?: number;
    min?: number;
    max?: number;
    pivot?: number;
  };
}

// Percentage chance
export interface PercentageNode extends BaseNode {
  type: 'Percentage';
  value: number;
}