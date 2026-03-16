// src/engine/scribescript/parser/index.ts

import { scribeScriptLexer, parser } from './grammar';
import { ScribeScriptVisitor } from './visitor';
import { CstToAstTransformer } from './transformer';
import { AstEvaluator } from './astEvaluator';
import type { EvaluationContext } from './astEvaluator';
export { scribeScriptLexer, parser };
export type { ASTNode } from './ast';
export type { EvaluationContext } from './astEvaluator';
export { ScribeScriptVisitor, CstToAstTransformer, AstEvaluator };

/**
 * Evaluate ScribeScript text using the new parser.
 * Handles both pure brace expressions and template strings with interspersed
 * plain text (e.g. "You have {$gold} gold pieces.").
 * Accepts a full EvaluationContext (including optional legacy field) so that
 * macros, challenges, and self-reference delegate to the legacy engine.
 */
export function evaluateTextNew(
  text: string,
  context: Partial<EvaluationContext> = {}
): any {
  const evaluator = new AstEvaluator({
    variables: context.variables || new Map(),
    worldVariables: context.worldVariables || new Map(),
    aliases: context.aliases || new Map(),
    legacy: context.legacy,
  });

  // If the entire text is a single brace expression with no nested braces, evaluate directly.
  // If there are nested braces (e.g. {${$role}[3].prop}), fall through to the Russian doll
  // loop below so innermost blocks are resolved first — matching legacy textProcessor behaviour.
  const trimmed = text.trim();
  const innerContent = trimmed.slice(1, -1);
  if (trimmed.startsWith('{') && trimmed.endsWith('}') && !innerContent.includes('{')) {
    // Let parse/eval errors propagate — the caller (evaluateTextWithNewParser) re-throws
    // so textProcessor.ts can fall back to the legacy parser.
    const ast = parseToAST(trimmed);
    return evaluator.evaluate(ast);
  }

  // Template mode: iteratively evaluate innermost {..} blocks and substitute.
  // Errors are propagated so the legacy fallback in textProcessor.ts triggers for
  // any expression the new parser cannot handle (e.g. {// comments}, unquoted prose).
  let result = text;
  for (let i = 0; i < 500; i++) {
    const match = result.match(/\{([^{}]*?)\}/);
    if (!match) break;

    const blockWithBraces = match[0];
    const ast = parseToAST(blockWithBraces);
    const blockResult = evaluator.evaluate(ast);
    result = result.replace(blockWithBraces, () => String(blockResult ?? ''));
  }

  return result;
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

  // CST to AST transformation
  const transformer = new CstToAstTransformer();
  return transformer.transform(cst);
}

/**
 * Validate ScribeScript syntax.
 * Handles template text (plain text + brace blocks) by validating each
 * {..} block individually, innermost first. Plain text outside braces is ignored.
 */
export function validateSyntax(text: string): string[] {
  const allErrors: string[] = [];
  const seen = new Set<string>();
  let current = text;

  // Iteratively find and validate innermost {..} blocks
  for (let i = 0; i < 500; i++) {
    const match = current.match(/\{([^{}]*?)\}/);
    if (!match) break;

    const block = match[0];
    if (!seen.has(block)) {
      seen.add(block);
      try {
        const lexResult = scribeScriptLexer.tokenize(block);
        allErrors.push(...lexResult.errors.map(e => e.message));

        parser.input = lexResult.tokens;
        // @ts-expect-error - Chevrotain dynamically adds methods
        parser.script();
        allErrors.push(...parser.errors.map(e => e.message));
      } catch (error) {
        allErrors.push(String(error));
      }
    }

    // Replace block with a placeholder valid token so outer blocks can be validated
    current = current.replace(block, '0');
  }

  return allErrors;
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