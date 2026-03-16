// src/engine/scribescript/parser/integration.ts
// Non-destructive integration layer between old regex parser and new Chevrotain parser

import { evaluateTextNew } from './index';
import type { PlayerQualities, QualityDefinition, QualityState } from '../../models';

/**
 * Feature flag: enable new parser
 * Set environment variable SCRIBESCRIPT_USE_NEW_PARSER=true to use new parser
 */
const USE_NEW_PARSER = process.env.SCRIBESCRIPT_USE_NEW_PARSER === 'true';

/**
 * Convert old parser context to new parser context
 */
function createEvaluationContext(
  qualities: PlayerQualities,
  qualityDefs: Record<string, QualityDefinition>,
  aliases: Record<string, string> | null = {},
  selfContext: { qid: string; state: QualityState } | null = null
): {
  variables: Map<string, any>;
  worldVariables: Map<string, any>;
  aliases: Map<string, any>;
} {
  const variables = new Map<string, any>();
  const worldVariables = new Map<string, any>();
  const aliasMap = new Map<string, any>();

  // Convert qualities to variables (prefixed with $)
  for (const [qid, state] of Object.entries(qualities)) {
    // QualityState may have different structures depending on type
    const stateValue = state as any;
    const value = stateValue.level ?? stateValue.value ?? 0;
    variables.set(qid, value);
  }

  // Convert aliases
  if (aliases) {
    for (const [key, value] of Object.entries(aliases)) {
      aliasMap.set(key, value);
    }
  }

  // TODO: Handle world variables (#), self references ($.), quality definitions
  // For now, these are stubs

  return { variables, worldVariables, aliases: aliasMap };
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
  logger?: any,
  depth: number = 0,
  locals?: Record<string, number | string>
): string {
  if (!rawText) return '';

  // If feature flag is not enabled, return empty string
  // (caller should fall back to old parser)
  if (!USE_NEW_PARSER) {
    return '';
  }

  try {
    const context = createEvaluationContext(qualities, qualityDefs, aliases, selfContext);
    const result = evaluateTextNew(rawText, context);

    // Log for debugging during migration
    if (logger) {
      logger.trace(`New parser result: ${result}`, depth);
    }

    return String(result);
  } catch (error) {
    // Log error and return empty string to trigger fallback
    const errorMsg = `New parser error: ${error}`;
    console.warn(errorMsg);

    if (errors) {
      errors.push(errorMsg);
    }

    if (logger) {
      logger.trace(`New parser failed: ${error}`, depth);
    }

    // Return empty string to indicate fallback should be used
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
  aliases: Record<string, string> | null = {}
): {
  success: boolean;
  result: string;
  error?: string;
  lexerErrors: string[];
  parserErrors: string[];
} {
  const lexerErrors: string[] = [];
  const parserErrors: string[] = [];

  try {
    const context = createEvaluationContext(qualities, qualityDefs, aliases);
    const result = evaluateTextNew(text, context);

    return {
      success: true,
      result: String(result),
      lexerErrors,
      parserErrors
    };
  } catch (error) {
    return {
      success: false,
      result: '',
      error: String(error),
      lexerErrors,
      parserErrors
    };
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
  aliases: Record<string, string> | null = {}
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
    errors: testResult.error ? [testResult.error] : []
  };
}