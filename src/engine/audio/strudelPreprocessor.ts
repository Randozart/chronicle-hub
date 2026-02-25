// src/engine/audio/strudelPreprocessor.ts
//
// Preprocesses Strudel source code by evaluating {{...}} ScribeScript template
// expressions and substituting them with their computed values before the code
// is sent to the Strudel REPL.
//
// Example:
//   note("c3 e3").s("piano").cpm({{$bpm}}).gain({{$volume * 0.8}})
// with qualities { bpm: { level: 120 }, volume: { level: 1.0 } }
// becomes:
//   note("c3 e3").s("piano").cpm(120).gain(0.8)

import { PlayerQualities } from '@/engine/models';

/**
 * Builds a variable context from PlayerQualities for use in expression evaluation.
 * $varName → numeric level
 * $$varName → string value
 */
function buildContext(qualities: PlayerQualities): Record<string, unknown> {
    const ctx: Record<string, unknown> = {};
    for (const [key, q] of Object.entries(qualities)) {
        if (!q) continue;
        ctx[`$${key}`] = (q as any).level ?? 0;
        ctx[`$$${key}`] = (q as any).stringValue ?? '';
        // Also available without prefix for convenience
        ctx[key] = (q as any).level ?? 0;
    }
    return ctx;
}

/**
 * Evaluates a single expression string in the given variable context.
 * Returns the result as a string, or throws on error.
 */
function evaluateExpression(expression: string, ctx: Record<string, unknown>): string {
    const keys = Object.keys(ctx);
    const values = Object.values(ctx);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${expression});`);
    const result = fn(...values);
    return String(result);
}

/**
 * Replaces all {{expression}} placeholders in the given Strudel source with
 * the evaluated value of each expression, using the provided player qualities
 * as the variable context.
 *
 * If an expression fails to evaluate, the original placeholder is preserved.
 */
export function preprocessStrudelSource(
    source: string,
    qualities: PlayerQualities
): string {
    const ctx = buildContext(qualities);
    return source.replace(/\{\{([\s\S]*?)\}\}/g, (_match, expression: string) => {
        try {
            return evaluateExpression(expression.trim(), ctx);
        } catch {
            return _match; // Preserve the original template on error
        }
    });
}
