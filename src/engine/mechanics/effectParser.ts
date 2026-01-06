// src/engine/mechanics/effectParser.ts
import { sanitizeScribeScript } from '../scribescript/utils';
import { EngineContext } from './types';
import { changeQuality, createNewQuality, batchChangeQuality } from './qualityOperations';
import { parseAndQueueTimerInstruction } from './scheduler';

/**
 * Splits a string by commas, respecting brackets, braces, and quotes.
 */
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
    // 1. Sanitize input
    const cleanEffectsString = sanitizeScribeScript(effectsString).replace(/\n/g, ' ');
    if (!cleanEffectsString) return;

    // 2. Split into individual command chunks
    const effects = splitEffectsString(cleanEffectsString); 

    for (const rawEffect of effects) {
        let command = rawEffect.trim();
        if (!command) continue;

        ctx.executedEffectsLog.push(`[RESOLVING] ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`);
        const prevErrorCount = ctx.errors.length;

        // ==================================================================================
        // STEP 1: RESOLUTION
        // Fully unwrap any ScribeScript logic ({...}) in the command string first.
        // This handles:
        // - Logic: {if: $x>5: $gold+=10} -> "$gold+=10"
        // - Interpolation: Attribute_{$class} += 1 -> "Attribute_Warrior += 1"
        // - Calculation: $hp += {10 + $bonus} -> "$hp += 15"
        // ==================================================================================
        
        // We only evaluate if there are braces to save overhead on simple commands like "$x+=1"
        if (command.includes('{')) {
            const resolved = ctx.evaluateText(command);
            
            // If the resolved text is different, update our command
            if (resolved !== command) {
                command = resolved.trim();
                ctx.executedEffectsLog.push(`   -> [EXPANDED] "${command}"`);

                // EDGE CASE: RECURSION
                // If the resolution resulted in a comma-separated list (e.g., a macro returned "$x=1, $y=2"),
                // we must treat that as a new block of effects to parse sequentially.
                if (command.includes(',') && !command.match(/^%[a-zA-Z]/)) { 
                    // Simple check: if it has commas and isn't clearly a single macro call, recurse.
                    // This allows {GiveLoadout()} to return "$sword=1, $shield=1" and have both applied.
                    parseAndApplyEffects(ctx, command);
                    continue; // Skip the rest of processing for this iteration, recursion handled it
                }
            }
        }

        // ==================================================================================
        // STEP 2: EXECUTION
        // Now we parse the "Clean" command string.
        // ==================================================================================

        // --- A. Timer / Scheduler Macros ---
        // Matches: %schedule[...], %reset[...], etc.
        const macroMatch = command.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
        if (macroMatch && ['schedule', 'reset', 'update', 'cancel'].includes(macroMatch[1])) {
            const [, cmdName, args] = macroMatch;
            ctx.executedEffectsLog.push(`[EXECUTE] Timer: ${cmdName}`);
            parseAndQueueTimerInstruction(ctx, cmdName, args);
        }
        
        // --- B. Batch Operations ---
        // Matches: %all[category; filter] += 10
        else if (command.startsWith('%all')) {
            // Because we resolved braces in Step 1, we can trust the content inside [] is largely static or simple
            const batchMatch = command.match(/^%all\[([^;\]]+)(?:;\s*([^\]]+))?\]\s*(=|\+=|-=)\s*(.*)$/);
            if (batchMatch) {
                const [, catExpr, filterExpr, op, val] = batchMatch;
                // 'val' might still need numeric casting
                const numVal = isNaN(Number(val)) ? val : Number(val);
                ctx.executedEffectsLog.push(`[EXECUTE] Batch: Category[${catExpr}] ${op} ${numVal}`);
                batchChangeQuality(ctx, catExpr, op, numVal, filterExpr);
            }
        }

        // --- C. Creation Logic ---
        // Matches: %new[id; template:x] = 5
        else if (command.startsWith('%new')) {
            const newMatch = command.match(/^%new\[(.*?)(?:;\s*(.*))?\](?:\s*(=)\s*(.*))?$/);
            if (newMatch) {
                const [, idExpr, argsStr, op, valStr] = newMatch;
                const newId = idExpr.trim(); // Resolved in Step 1

                let numVal: string | number = 1;
                if (op && valStr) {
                    numVal = isNaN(Number(valStr)) ? valStr : Number(valStr);
                }

                ctx.executedEffectsLog.push(`[EXECUTE] New: ${newId} = ${numVal}`);

                const props: Record<string, any> = {};
                let templateId = null;

                if (argsStr) {
                    const args = argsStr.split(',').map(s => s.trim());
                    // Check if first arg is a template ID (no colon)
                    if (args.length > 0 && !args[0].includes(':')) {
                        templateId = args.shift() || null;
                    }
                    // Parse properties
                    args.forEach(arg => {
                        const [k, ...vParts] = arg.split(':');
                        if (k) {
                            const rawVal = vParts.join(':').trim().replace(/^['"]|['"]$/g, "");
                            props[k.trim()] = isNaN(Number(rawVal)) || rawVal === "" ? rawVal : Number(rawVal);
                        }
                    });
                }

                if (ctx.createNewQuality) {
                    ctx.createNewQuality(newId, numVal, templateId, props);
                } else {
                    createNewQuality(ctx, newId, numVal, templateId, props);
                }
            }
        }

        // --- D. Standard Assignment ---
        // Matches: Variable [metadata] += Value
        // Regex Explanation:
        // ^(.+?)            -> Capture Group 1: The Quality ID (Lazy match until metadata or operator)
        // (?:\s*\[(.*?)\])? -> Capture Group 2: Optional Metadata inside [] (e.g. [desc:Hello])
        // \s*               -> Whitespace
        // (\+\+|--|[\+\-\*\/%]=|=) -> Capture Group 3: Operator
        // \s*(.*)$          -> Capture Group 4: The Value
        else {
            const assignMatch = command.match(/^(.+?)(?:\s*\[(.*?)\])?\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/);

            if (assignMatch) {
                const [, rawLhs, metaStr, op, valStr] = assignMatch;

                // 1. Clean up LHS (remove sigils like $, @, # if present, though Step 1 might have left them)
                let qid = rawLhs.trim();
                if (['$', '@', '#'].includes(qid.charAt(0))) {
                    if (qid.startsWith('@')) {
                        qid = ctx.tempAliases[qid.substring(1)] || qid.substring(1);
                    } else {
                        qid = qid.substring(1);
                    }
                }

                // 2. Parse Metadata
                const metadata: { desc?: string; source?: string; hidden?: boolean } = {};
                if (metaStr) {
                    const metaParts = metaStr.split(',');
                    for (const part of metaParts) {
                        const [k, ...v] = part.split(':');
                        const key = k.trim().toLowerCase();
                        const val = v.join(':').trim();
                        if (key === 'desc') metadata.desc = val;
                        if (key === 'source') metadata.source = val;
                        if (key === 'hidden') metadata.hidden = true;
                    }
                }

                // 3. Resolve Value (Right Hand Side)
                let val: string | number = 0;
                
                // If Step 1 already resolved the calculation (e.g. "15"), we just take it.
                // If strictly text is needed, we take valStr.
                if (op !== '++' && op !== '--') {
                    if (!isNaN(Number(valStr)) && valStr.trim() !== "") {
                        val = Number(valStr);
                    } else {
                        // If it's a string literal that Step 1 didn't strip quotes from:
                        val = valStr.replace(/^['"]|['"]$/g, "");
                    }
                }

                if (qid && qid !== "nothing" && qid !== "undefined") {
                    changeQuality(ctx, qid, op, val, metadata);
                }
            }
        }

        // Error Logging
        if (ctx.errors.length > prevErrorCount) {
            const lastIdx = ctx.errors.length - 1;
            ctx.errors[lastIdx] = `${ctx.errors[lastIdx]} \n>> Context: "${command}"`;
        }
    }
}