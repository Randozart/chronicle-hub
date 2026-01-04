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
    const cleanEffectsString = sanitizeScribeScript(effectsString).replace(/\n/g, ' ');
    const effects = splitEffectsString(cleanEffectsString); 

    // Inject evaluateText into context wrapper if needed, or use existing
    // We modify ctx directly for temporary evaluation scope if needed, 
    // but we trust the main EngineContext for data storage.

    for (const effect of effects) {
        const cleanEffect = effect.trim();
        if (!cleanEffect) continue;

        ctx.executedEffectsLog.push(""); 
        ctx.executedEffectsLog.push(`[RESOLVING: ${cleanEffect.substring(0, 50)}${cleanEffect.length > 50 ? '...' : ''}]`);

        const prevErrorCount = ctx.errors.length;

        if (cleanEffect.startsWith('{') && cleanEffect.endsWith('}')) {
            const resolvedCommand = ctx.evaluateText(cleanEffect);
            if (resolvedCommand !== cleanEffect) {
                 ctx.executedEffectsLog.push(`   -> [Result] "${resolvedCommand}"`);
            }
            if (resolvedCommand && (resolvedCommand.includes('=') || resolvedCommand.startsWith('%'))) {
                parseAndApplyEffects(ctx, resolvedCommand);
            }
        }
        else {
            const macroMatch = cleanEffect.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
            if (macroMatch && ['schedule', 'reset', 'update', 'cancel'].includes(macroMatch[1])) {
                const [, command, args] = macroMatch;
                 ctx.executedEffectsLog.push(`[EXECUTE] Timer Command: ${command}`);
                 parseAndQueueTimerInstruction(ctx, command, args);
            }
            else {
                const batchMatch = cleanEffect.match(/^%all\[([^;\]]+)(?:;\s*([^\]]+))?\]\s*(=|\+=|-=)\s*(.*)$/);
                if (batchMatch) {
                    const [, catExpr, filterExpr, op, val] = batchMatch;
                    const resolvedVal = ctx.evaluateText(`{${val}}`);
                    const numVal = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);
                    ctx.executedEffectsLog.push(`[EXECUTE] Batch: Category[${catExpr}] ${op} ${numVal}`);
                    batchChangeQuality(ctx, catExpr, op, numVal, filterExpr); 
                }
                else {
                    // %new logic
                    const newMatch = cleanEffect.match(/^%new\[(.*?)(?:;\s*(.*))?\](?:\s*(=)\s*(.*))?$/);
                    
                    if (newMatch) {
                        const [, idExpr, argsStr, op, valStr] = newMatch;
                        
                        let newId = idExpr.trim();
                        if (newId.includes('{') || newId.includes('$') || newId.startsWith('@')) {
                            newId = ctx.evaluateText(`{${newId}}`).trim();
                        }

                        let numVal: string | number = 1; 
                        if (op && valStr) {
                            const resolvedVal = ctx.evaluateText(`{${valStr}}`);
                            numVal = resolvedVal;
                            if (resolvedVal !== "" && !isNaN(Number(resolvedVal))) {
                                numVal = Number(resolvedVal);
                            }
                        }
                        
                        ctx.executedEffectsLog.push(`[EXECUTE] New: ${newId} = ${numVal}`);
                        
                        const props: Record<string, any> = {}; 
                        let templateId = null;

                        if (argsStr) {
                            const args = argsStr.split(',').map(s => s.trim());
                            if (args.length > 0 && !args[0].includes(':')) {
                                templateId = args.shift() || null; 
                            }
                            args.forEach(arg => {
                                const [k, ...vParts] = arg.split(':');
                                if (k) {
                                    const rawVal = vParts.join(':').trim().replace(/['"]/g, "");
                                    props[k.trim()] = isNaN(Number(rawVal)) || rawVal === "" ? rawVal : Number(rawVal);
                                }
                            });
                        }
                        
                        // CRITICAL: Use the method on the context if available (GameEngine)
                        // If not available (e.g. stripped context), fallback to basic operations
                        if (ctx.createNewQuality) {
                            ctx.createNewQuality(newId, numVal, templateId, props);
                        } else {
                            // Fallback: creates state only, no definition
                            createNewQuality(ctx, newId, numVal, templateId, props);
                        }
                    }
                    else {
                        const assignMatch = cleanEffect.match(/^((?:[$@][a-zA-Z0-9_]+)|(?:\{.*?\}))(?:\[(.*?)\])?\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/);
                        if (assignMatch) {
                            const [, rawLhs, metaStr, op, valStr] = assignMatch;
                            let qid = "";
                            if (rawLhs.startsWith('{')) {
                                qid = ctx.evaluateText(rawLhs).trim(); 
                                if (qid.startsWith('$') || qid.startsWith('@') || qid.startsWith('#')) qid = qid.substring(1);
                            } else if (rawLhs.startsWith('@')) {
                                const aliasKey = rawLhs.substring(1);
                                qid = ctx.tempAliases[aliasKey]; 
                            } else {
                                qid = rawLhs.substring(1); 
                            }

                            if (qid && qid !== "nothing" && qid !== "undefined") {
                                const metadata: { desc?: string; source?: string; hidden?: boolean } = {};
                                if (metaStr) {
                                    const metaParts = metaStr.split(',');
                                    for (const part of metaParts) {
                                        const [k, ...v] = part.split(':');
                                        const key = k.trim();
                                        const val = v.join(':').trim();
                                        if (key === 'desc') metadata.desc = val;
                                        if (key === 'source') metadata.source = val;
                                        if (key === 'hidden') metadata.hidden = true;
                                    }
                                }

                                let val: string | number = 0;
                                if (op !== '++' && op !== '--') {
                                        const resolvedValueStr = ctx.evaluateText(`{${valStr}}`); 
                                        val = resolvedValueStr;
                                        if (!isNaN(Number(resolvedValueStr)) && resolvedValueStr.trim() !== '') {
                                            val = Number(resolvedValueStr);
                                        }
                                }
                                
                                changeQuality(ctx, qid, op, val, metadata);
                            }
                        }
                    }
                }
            }
        }

        if (ctx.errors.length > prevErrorCount) {
            const lastIdx = ctx.errors.length - 1;
            ctx.errors[lastIdx] = `${ctx.errors[lastIdx]} \n>> Context: "${cleanEffect}"`;
        }
    }
}