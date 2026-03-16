// @ts-nocheck
// src/engine/scribescript/parser/grammar.ts

import { CstParser, Lexer, createToken } from 'chevrotain';

// ----------------------------------------------------------------------------
// Tokens
// ----------------------------------------------------------------------------

// Variable sigils
export const Variable = createToken({
  name: 'Variable',
  pattern: /\$[a-zA-Z_][a-zA-Z0-9_]*/,
});

export const Alias = createToken({
  name: 'Alias',
  pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/,
});

export const WorldVar = createToken({
  name: 'WorldVar',
  pattern: /#[a-zA-Z_][a-zA-Z0-9_]*/,
});

export const SelfRef = createToken({
  name: 'SelfRef',
  pattern: /\$\./,
});

// Property access
export const PropertyAccess = createToken({
  name: 'PropertyAccess',
  pattern: /\.[a-zA-Z_][a-zA-Z0-9_]*/,
});

// Brackets and braces
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });

// Operators
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Multiply = createToken({ name: 'Multiply', pattern: /\*/ });
export const Divide = createToken({ name: 'Divide', pattern: /\// });
export const Equals = createToken({ name: 'Equals', pattern: /=/ });
export const DoubleEquals = createToken({ name: 'DoubleEquals', pattern: /==/ });
export const NotEquals = createToken({ name: 'NotEquals', pattern: /!=/ });
export const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
export const LessThan = createToken({ name: 'LessThan', pattern: /</ });
export const GreaterEquals = createToken({ name: 'GreaterEquals', pattern: />=/ });
export const LessEquals = createToken({ name: 'LessEquals', pattern: /<=/ });
export const LogicalAnd = createToken({ name: 'LogicalAnd', pattern: /&&/ });
export const LogicalOr = createToken({ name: 'LogicalOr', pattern: /\|\|/ });
export const LogicalNot = createToken({ name: 'LogicalNot', pattern: /!/ });

// Challenge operators
export const ChallengeOp = createToken({
  name: 'ChallengeOp',
  pattern: />>|<<|><|<>/,
});

// Macro
export const Macro = createToken({
  name: 'Macro',
  pattern: /%[a-zA-Z_]+/,
});

// Separators
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
export const Tilde = createToken({ name: 'Tilde', pattern: /~/ });

// Literals
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?\d+(\.\d+)?/,
});

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/,
});

export const BooleanLiteral = createToken({
  name: 'BooleanLiteral',
  pattern: /true|false/,
});

// Whitespace and comments (skipped)
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

// ----------------------------------------------------------------------------
// Lexer
// ----------------------------------------------------------------------------

export const allTokens = [
  WhiteSpace,
  // Variable sigils
  Variable,
  Alias,
  WorldVar,
  SelfRef,
  PropertyAccess,
  // Brackets
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  LParen,
  RParen,
  // Operators
  Plus,
  Minus,
  Multiply,
  Divide,
  Equals,
  DoubleEquals,
  NotEquals,
  GreaterThan,
  LessThan,
  GreaterEquals,
  LessEquals,
  LogicalAnd,
  LogicalOr,
  LogicalNot,
  ChallengeOp,
  // Macro
  Macro,
  // Separators
  Colon,
  Semicolon,
  Comma,
  Pipe,
  Tilde,
  // Literals
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
];

export const scribeScriptLexer = new Lexer(allTokens);

// ----------------------------------------------------------------------------
// Parser
// ----------------------------------------------------------------------------

export class ScribeScriptParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
    });

    // Define grammar rules
    this.RULE('script', () => {
      this.MANY(() => {
        this.SUBRULE(this.textBlock);
      });
    });

    this.RULE('textBlock', () => {
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(StringLiteral) },
          { ALT: () => this.SUBRULE(this.braceExpression) },
        ]);
      });
    });

    this.RULE('braceExpression', () => {
      this.CONSUME(LBrace);
      this.SUBRULE(this.expression);
      this.CONSUME(RBrace);
    });

    this.RULE('expression', () => {
      this.SUBRULE(this.logicalOr);
    });

    this.RULE('logicalOr', () => {
      this.SUBRULE(this.logicalAnd);
      this.MANY(() => {
        this.CONSUME(LogicalOr);
        this.SUBRULE2(this.logicalAnd);
      });
    });

    this.RULE('logicalAnd', () => {
      this.SUBRULE(this.equality);
      this.MANY(() => {
        this.CONSUME(LogicalAnd);
        this.SUBRULE2(this.equality);
      });
    });

    this.RULE('equality', () => {
      this.SUBRULE(this.comparison);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(DoubleEquals) },
          { ALT: () => this.CONSUME(NotEquals) },
        ]);
        this.SUBRULE2(this.comparison);
      });
    });

    this.RULE('comparison', () => {
      this.SUBRULE(this.additive);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(GreaterThan) },
          { ALT: () => this.CONSUME(LessThan) },
          { ALT: () => this.CONSUME(GreaterEquals) },
          { ALT: () => this.CONSUME(LessEquals) },
        ]);
        this.SUBRULE2(this.additive);
      });
    });

    this.RULE('additive', () => {
      this.SUBRULE(this.multiplicative);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(Plus) },
          { ALT: () => this.CONSUME(Minus) },
        ]);
        this.SUBRULE2(this.multiplicative);
      });
    });

    this.RULE('multiplicative', () => {
      this.SUBRULE(this.unary);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(Multiply) },
          { ALT: () => this.CONSUME(Divide) },
        ]);
        this.SUBRULE2(this.unary);
      });
    });

    this.RULE('unary', () => {
      this.OR([
        {
          ALT: () => {
            this.OR([
              { ALT: () => this.CONSUME(LogicalNot) },
              { ALT: () => this.CONSUME(Minus) },
            ]);
            this.SUBRULE(this.unary);
          },
        },
        { ALT: () => this.SUBRULE(this.primary) },
      ]);
    });

    this.RULE('primary', () => {
      this.OR([
        { ALT: () => this.SUBRULE(this.variable) },
        { ALT: () => this.SUBRULE(this.literal) },
        { ALT: () => this.SUBRULE(this.parenthesized) },
      ]);
    });

    this.RULE('variable', () => {
      this.OR([
        { ALT: () => this.CONSUME(Variable) },
        { ALT: () => this.CONSUME(Alias) },
        { ALT: () => this.CONSUME(WorldVar) },
        { ALT: () => this.CONSUME(SelfRef) },
      ]);

      // Optional level spoof
      if (this.LA(1).tokenType === LBracket) {
        this.CONSUME(LBracket);
        this.SUBRULE(this.expression);
        this.CONSUME(RBracket);
      }

      // Zero or more property accesses
      this.MANY(() => {
        this.CONSUME(PropertyAccess);
      });
    });

    this.RULE('literal', () => {
      this.OR([
        { ALT: () => this.CONSUME(NumberLiteral) },
        { ALT: () => this.CONSUME(StringLiteral) },
        { ALT: () => this.CONSUME(BooleanLiteral) },
      ]);
    });

    this.RULE('parenthesized', () => {
      this.CONSUME(LParen);
      this.SUBRULE(this.expression);
      this.CONSUME(RParen);
    });

    // Additional rules (stubs for now)
    this.RULE('macro', () => {
      this.CONSUME(Macro);
      this.CONSUME(LBracket);
      this.SUBRULE(this.expression);
      this.CONSUME(RBracket);
    });

    this.RULE('assignment', () => {
      this.CONSUME(Alias);
      this.CONSUME(Equals);
      this.SUBRULE(this.expression);
    });

    this.RULE('conditional', () => {
      this.SUBRULE(this.expression);
      this.CONSUME(Colon);
      this.SUBRULE(this.expression);
    });

    this.RULE('challengeExpression', () => {
      this.SUBRULE(this.expression);
      this.CONSUME(ChallengeOp);
      this.SUBRULE(this.expression);
    });

    // Very important: call this after all rules have been defined
    this.performSelfAnalysis();
  }
}

// Create singleton instance
export const parser = new ScribeScriptParser();