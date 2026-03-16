// src/engine/scribescript/parser/integration.ts
// Non-destructive integration layer between old regex parser and new Chevrotain parser

import { evaluateTextNew } from './index';
import type { EvaluationContext } from './astEvaluator';
import type { PlayerQualities, QualityDefinition, QualityState } from '../../models';
import type { ScribeEvaluator, TraceLogger } from '../types';

/**
 * Feature flag: enable new parser
 * Set environment variable SCRIBESCRIPT_USE_NEW_PARSER=true to use new parser
 */
const USE_NEW_PARSER = process.env.SCRIBESCRIPT_USE_NEW_PARSER === 'true';

/**
 * The legacyEvaluator callback conforms to ScribeEvaluator and allows
 * legacy functions (resolveVariable, calculateChance, evaluateMacro) to
 * recursively evaluate sub-expressions using the new parser.
 *
 * Defined as a const before createEvaluationContext; works because
 * createEvaluationContext is a function declaration (hoisted).
 */
const legacyEvaluator: ScribeEvaluator = (
  rawText,
  qualities,
  qualityDefs,
  selfContext,
  resolutionRoll,
  aliases,
  errors,
  logger,
  depth = 0,
) => {
  const ctx = createEvaluationContext(
    qualities,
    qualityDefs,
    aliases ?? {},
    selfContext,
    resolutionRoll,
    errors,
    logger,
    depth,
  );
  // Legacy functions (calculateChance, resolveVariable, evaluateMacro) pass bare
  // sub-expressions without braces, e.g. "$swordsmanship" or "50". Wrap them so
  // evaluateTextNew can parse them. Strings that already contain a brace block
  // (template text) are passed through unchanged.
  const text = rawText ?? '';
  const toEval = text.includes('{') ? text : `{${text}}`;
  return String(evaluateTextNew(toEval, ctx));
};

/**
 * Build a full EvaluationContext from legacy engine parameters.
 * Declared as a function (not const) so it is hoisted and accessible
 * from the legacyEvaluator const above.
 */
function createEvaluationContext(
  qualities: PlayerQualities,
  qualityDefs: Record<string, QualityDefinition>,
  aliases: Record<string, string> | null = {},
  selfContext: { qid: string; state: QualityState } | null = null,
  resolutionRoll: number = 0,
  errors?: string[],
  logger?: TraceLogger,
  depth: number = 0,
): EvaluationContext {
  const variables = new Map<string, any>();
  const worldVariables = new Map<string, any>();
  const aliasMap = new Map<string, any>();

  // Convert qualities to variables Map (keyed by qid, value = level)
  for (const [qid, state] of Object.entries(qualities)) {
    const stateValue = state as any;
    variables.set(qid, stateValue.level ?? stateValue.value ?? 0);
  }

  // Convert aliases Record → Map
  if (aliases) {
    for (const [key, value] of Object.entries(aliases)) {
      aliasMap.set(key, value);
    }
  }

  return {
    variables,
    worldVariables,
    aliases: aliasMap,
    legacy: {
      qualities,
      qualityDefs,
      selfContext,
      resolutionRoll,
      errors,
      logger,
      depth,
      evaluator: legacyEvaluator,
    },
  };
}

/**
 * Evaluate text using new parser if feature flag is enabled,
 * otherwise fall back to old parser.
 *
 * This function has the same signature as the old evaluateText
 * for drop-in replacement testing.
 */
export function evaluateTextWithNewParser(
  rawText: string | undefined,
  qualities: PlayerQualities,
  qualityDefs: Record<string, QualityDefinition>,
  selfContext: { qid: string; state: QualityState } | null = null,
  resolutionRoll: number = 0,
  aliases: Record<string, string> | null = {},
  errors?: string[],
  logger?: TraceLogger,
  depth: number = 0,
  _locals?: Record<string, number | string>,
): string {
  if (!rawText) return '';

  if (!USE_NEW_PARSER) {
    return '';
  }

  try {
    const context = createEvaluationContext(
      qualities,
      qualityDefs,
      aliases,
      selfContext,
      resolutionRoll,
      errors,
      logger,
      depth,
    );
    const result = evaluateTextNew(rawText, context);

    if (logger) {
      logger(`New parser result: ${result}`, depth, 'INFO');
    }

    return String(result);
  } catch (error) {
    const errorMsg = `New parser error: ${error}`;
    console.warn(errorMsg);

    if (errors) {
      errors.push(errorMsg);
    }

    if (logger) {
      logger(`New parser failed: ${error}`, depth, 'WARN');
    }

    return '';
  }
}

/**
 * Test the new parser on a specific text with full context.
 * Useful for A/B testing and validation.
 */
export function testNewParser(
  text: string,
  qualities: PlayerQualities,
  qualityDefs: Record<string, QualityDefinition>,
  aliases: Record<string, string> | null = {},
  selfContext: { qid: string; state: QualityState } | null = null,
  resolutionRoll: number = 0,
): {
  success: boolean;
  result: string;
  error?: string;
} {
  try {
    const context = createEvaluationContext(
      qualities,
      qualityDefs,
      aliases,
      selfContext,
      resolutionRoll,
    );
    const result = evaluateTextNew(text, context);
    return { success: true, result: String(result) };
  } catch (error) {
    return { success: false, result: '', error: String(error) };
  }
}

/**
 * Compare old and new parser results for validation.
 */
export function compareParsers(
  text: string,
  oldParserFn: (text: string) => string,
  qualities: PlayerQualities,
  qualityDefs: Record<string, QualityDefinition>,
  aliases: Record<string, string> | null = {},
): {
  oldResult: string;
  newResult: string;
  match: boolean;
  errors: string[];
} {
  const oldResult = oldParserFn(text);
  const testResult = testNewParser(text, qualities, qualityDefs, aliases);

  return {
    oldResult,
    newResult: testResult.result,
    match: oldResult === testResult.result,
    errors: testResult.error ? [testResult.error] : [],
  };
}
