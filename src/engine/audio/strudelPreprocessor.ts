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
 * Resolves an audio reference string, which may be:
 *  - A plain ID/URL:  "track_a"
 *  - A comma-separated playlist:  "track_a, track_b, track_c"  (one picked at random)
 *  - A ScribeScript conditional:  "{ $combat > 5 : combat_track | ambient_track }"
 *  - Any combination of the above after conditional resolution
 *
 * Returns a single resolved string (the chosen ID/URL), or undefined when the
 * input is empty or resolves to an empty value.
 */
export function resolveAudioRef(
    ref: string | undefined,
    qualities: PlayerQualities
): string | undefined {
    if (!ref) return undefined;
    const ctx = buildContext(qualities);

    // Evaluate { condition : branch_a | branch_b } blocks (single-level)
    const resolved = ref.replace(/\{([^{}]*)\}/g, (_match, content: string) => {
        const colonIdx = content.indexOf(':');
        if (colonIdx === -1) return _match;
        const condition = content.slice(0, colonIdx).trim();
        const branches = content.slice(colonIdx + 1).split('|');
        try {
            const condResult = evaluateExpression(condition, ctx);
            const isTrue = condResult !== 'false' && condResult !== '0' && condResult.trim() !== '';
            return (isTrue ? (branches[0] ?? '') : (branches[1] ?? '')).trim();
        } catch {
            return _match;
        }
    });

    // Split by comma, trim, filter empty, then pick one at random
    const options = resolved.split(',').map(s => s.trim()).filter(Boolean);
    if (options.length === 0) return undefined;
    return options[Math.floor(Math.random() * options.length)];
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
