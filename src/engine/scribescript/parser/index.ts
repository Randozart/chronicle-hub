// src/engine/scribescript/parser/index.ts

import { scribeScriptLexer, parser } from './grammar';
import { ScribeScriptVisitor } from './visitor';
export { scribeScriptLexer, parser };
export type { ASTNode } from './ast';
export { ScribeScriptVisitor };

/**
 * Evaluate ScribeScript text using the new parser.
 * This is a non-destructive implementation that can be tested
 * alongside the existing regex-based parser.
 */
export function evaluateTextNew(
  text: string,
  context: {
    variables?: Map<string, any>;
    worldVariables?: Map<string, any>;
    aliases?: Map<string, any>;
  } = {}
): any {
  const visitor = new ScribeScriptVisitor({
    variables: context.variables || new Map(),
    worldVariables: context.worldVariables || new Map(),
    aliases: context.aliases || new Map(),
  });

  try {
    return visitor.evaluate(text);
  } catch (error) {
    console.error('ScribeScript parser error:', error);
    // Fallback to returning the original text if parsing fails
    // This allows gradual adoption without breaking existing functionality
    return text;
  }
}

/**
 * Parse ScribeScript text into an AST without evaluation.
 * Useful for debugging, syntax validation, and tooling.
 */
export function parseToAST(text: string): any {
  const lexResult = scribeScriptLexer.tokenize(text);
  if (lexResult.errors.length > 0) {
    throw new Error(`Lexer errors: ${JSON.stringify(lexResult.errors)}`);
  }

  parser.input = lexResult.tokens;
  // @ts-expect-error - Chevrotain dynamically adds methods
  const cst = parser.script();
  if (parser.errors.length > 0) {
    throw new Error(`Parser errors: ${JSON.stringify(parser.errors)}`);
  }

  // TODO: Implement CST to AST transformation
  return cst;
}

/**
 * Validate ScribeScript syntax.
 * Returns an array of error messages if invalid, empty array if valid.
 */
export function validateSyntax(text: string): string[] {
  const errors: string[] = [];

  try {
    const lexResult = scribeScriptLexer.tokenize(text);
    errors.push(...lexResult.errors.map(e => e.message));

    parser.input = lexResult.tokens;
    // @ts-expect-error - Chevrotain dynamically adds methods
    parser.script();
    errors.push(...parser.errors.map(e => e.message));
  } catch (error) {
    errors.push(String(error));
  }

  return errors;
}

/**
 * Compare outputs between old and new parsers.
 * Useful for testing and validation during migration.
 */
export function compareWithOldParser(
  text: string,
  oldParserFn: (text: string) => any
): {
  oldResult: any;
  newResult: any;
  match: boolean;
  error?: string;
} {
  const oldResult = oldParserFn(text);
  let newResult: any;
  let error: string | undefined;

  try {
    newResult = evaluateTextNew(text);
  } catch (err) {
    error = String(err);
    newResult = undefined;
  }

  return {
    oldResult,
    newResult,
    match: JSON.stringify(oldResult) === JSON.stringify(newResult),
    error,
  };
}