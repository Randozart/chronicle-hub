// src/engine/mechanics/effectParser.ts
import { sanitizeScribeScript } from '../scribescript/utils';
import { EngineContext } from './types';
import { changeQuality, createNewQuality, batchChangeQuality } from './qualityOperations';
import { parseAndQueueTimerInstruction } from './scheduler';
import { evaluateText as evaluateScribeText } from '../textProcessor';

function splitEffectsString(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let bracketDepth = 0; 
    let braceDepth = 0;   
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inQuote) {
            current += char;
            if (char === quoteChar) inQuote = false;
        } else {
            if (char === '"' || char === "'") {
                inQuote = true; quoteChar = char; current += char;
            } else if (char === '[') {
                bracketDepth++; current += char;
            } else if (char === ']') {
                if (bracketDepth > 0) bracketDepth--; current += char;
            } else if (char === '{') {
                braceDepth++; current += char;
            } else if (char === '}') {
                if (braceDepth > 0) braceDepth--; current += char;
            } else if (char === ',' && bracketDepth === 0 && braceDepth === 0) {
                result.push(current.trim()); current = '';
            } else {
                current += char;
            }
        }
    }
    if (current.trim()) result.push(current.trim());
    return result;
}

export function parseAndApplyEffects(
    ctx: EngineContext,
    effectsString: string,
): void {
    const cleanEffectsString = effectsString.replace(/\n/g, ' ');
    const effects = splitEffectsString(cleanEffectsString); 

    // Loop through each comma-separated instruction one at a time.
    for (const effect of effects) {
        const cleanEffect = effect.trim();
        if (!cleanEffect) continue;

        ctx.executedEffectsLog.push(`[RESOLVING: ${cleanEffect}]`);
        
        // --- 1. ALIAS DEFINITION: {@alias = ...} ---
        // This is a special case that only sets a temporary variable.
        if (cleanEffect.startsWith('{@') && cleanEffect.endsWith('}')) {
            // Evaluate the content to populate the alias in the context.
            ctx.evaluateText(cleanEffect);
            continue; // Move to the next instruction
        }
        
        // --- 2. MACRO COMMANDS that are NOT assignments ---
        // E.g., {%schedule[...]}, {%cancel[...]}
        const macroMatch = cleanEffect.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
        if (macroMatch && ['schedule', 'reset', 'update', 'cancel'].includes(macroMatch[1])) {
            const [, command, args] = macroMatch;
            ctx.executedEffectsLog.push(`[EXECUTE] Timer Command: ${command}`);
            parseAndQueueTimerInstruction(ctx, command, args);
            continue; // Move to the next instruction
        }

        // --- 3. STANDARD ASSIGNMENTS (LHS op RHS) ---
        // This regex is designed to find the last operator, correctly handling dynamic LHS.
        const assignMatch = cleanEffect.match(/^(.*)\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/);
        if (assignMatch) {
            let [, rawLhs, op, valStr] = assignMatch;
            rawLhs = rawLhs.trim();

            // STEP 1: Resolve the Right-Hand Side (RHS) to get the value.
            // This reads the CURRENT, fully updated state.
            let value: string | number = 0;
            if (op !== '++' && op !== '--') {
                const resolvedValueStr = ctx.evaluateText(`{${valStr}}`);
                value = resolvedValueStr;
                if (!isNaN(Number(resolvedValueStr)) && resolvedValueStr.trim() !== '') {
                    value = Number(resolvedValueStr);
                }
            }

            // STEP 2: Resolve the Left-Hand Side (LHS) to get the target quality ID.
            let qid = "";
            if (rawLhs.startsWith('$') && rawLhs.includes('{')) { // Dynamic e.g. ${...}
                qid = ctx.evaluateText(rawLhs.substring(1));
            } else if (rawLhs.startsWith('@')) {
                qid = ctx.tempAliases[rawLhs.substring(1)];
            } else if (rawLhs.startsWith('$') || rawLhs.startsWith('#')) {
                qid = rawLhs.substring(1);
            } else {
                ctx.errors.push(`Invalid Left-Hand-Side in effect: "${rawLhs}"`);
                continue;
            }
            
            if (qid && qid !== "nothing" && qid !== "undefined") {
                // STEP 3: Apply the change. This mutates ctx.qualities immediately.
                changeQuality(ctx, qid, op, value, {});
            }
        } else {
             // If it's not a known macro or assignment, it might be a standalone logic block.
             // We evaluate it for its side effects (like alias creation within a conditional).
             ctx.evaluateText(`{${cleanEffect}}`);
        }
    }
}