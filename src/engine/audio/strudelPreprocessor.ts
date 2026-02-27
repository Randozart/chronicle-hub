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
 * Any $varName or $$varName references not present in ctx default to 0
 * instead of throwing a ReferenceError.
 * Returns the result as a string, or throws on error.
 */
function evaluateExpression(expression: string, ctx: Record<string, unknown>): string {
    // Pre-scan for $varName / $$varName and inject 0 defaults for any that are missing
    const ctxWithDefaults: Record<string, unknown> = { ...ctx };
    const varRe = /\$\$?[a-zA-Z_][a-zA-Z0-9_]*/g;
    let m: RegExpExecArray | null;
    while ((m = varRe.exec(expression)) !== null) {
        if (!(m[0] in ctxWithDefaults)) {
            ctxWithDefaults[m[0]] = 0;
        }
    }
    const keys = Object.keys(ctxWithDefaults);
    const values = Object.values(ctxWithDefaults);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${expression});`);
    const result = fn(...values);
    return String(result);
}

/**
 * Resolves ScribeScript conditional blocks in an audio ref string, returning
 * the list of all comma-separated options after conditional evaluation.
 *
 * Example: "{ $combat > 5 : battle_a, battle_b | ambient_a }" with combat=8
 * → ["battle_a", "battle_b"]
 *
 * Used by playlist cycling logic so callers can iterate through tracks in order
 * rather than picking one at random each time.
 */
export function resolveAudioRefList(
    ref: string | undefined,
    qualities: PlayerQualities
): string[] {
    if (!ref) return [];
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

    return resolved.split(',').map(s => s.trim()).filter(Boolean);
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
    const options = resolveAudioRefList(ref, qualities);
    if (options.length === 0) return undefined;
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Evaluates a ScribeScript conditional shorthand expression:
 *   condition : trueValue | falseValue
 *
 * This is an alternative to the JS ternary (condition ? a : b) that matches
 * the syntax used in audio ref fields. Only applied when no `?` is present
 * (to avoid ambiguity with JS ternary expressions).
 *
 * Returns the resolved string, or null if the expression does not match the
 * conditional pattern.
 */
function tryConditionalTemplate(expression: string, ctx: Record<string, unknown>): string | null {
    // Only apply our shorthand if there is no JS ternary `?` in the expression
    if (expression.includes('?')) return null;

    // Match: <condition> : <trueBranch> | <falseBranch>
    // Uses a non-greedy match on the condition to find the first bare `:`.
    // The `s` flag allows `.` to span newlines.
    const match = expression.match(/^([\s\S]+?)\s*:\s*([\s\S]+?)\s*\|\s*([\s\S]+)$/);
    if (!match) return null;

    const [, condition, trueBranch, falseBranch] = match;
    try {
        const condResult = evaluateExpression(condition.trim(), ctx);
        const isTrue = condResult !== 'false' && condResult !== '0' && condResult.trim() !== '';
        return (isTrue ? trueBranch : falseBranch).trim();
    } catch {
        return null; // Fall through to plain JS evaluation
    }
}

/**
 * Replaces all {{expression}} placeholders in the given Strudel source with
 * the evaluated value of each expression, using the provided player qualities
 * as the variable context.
 *
 * Two expression syntaxes are supported:
 *
 *   {{$bpm + 10}}              — any JavaScript expression
 *   {{$combat > 5 : 200 | 100}} — ScribeScript conditional shorthand
 *                                  (equivalent to $combat > 5 ? 200 : 100)
 *
 * If an expression fails to evaluate, the original placeholder is preserved.
 */
export function preprocessStrudelSource(
    source: string,
    qualities: PlayerQualities
): string {
    const ctx = buildContext(qualities);
    return source.replace(/\{\{([\s\S]*?)\}\}/g, (_match, expression: string) => {
        const trimmed = expression.trim();
        try {
            // Try ScribeScript conditional shorthand first: condition : true | false
            const conditional = tryConditionalTemplate(trimmed, ctx);
            if (conditional !== null) return conditional;
            // Fall back to plain JavaScript expression
            return evaluateExpression(trimmed, ctx);
        } catch {
            return _match; // Preserve the original template on error
        }
    });
}
