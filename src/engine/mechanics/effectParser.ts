// src/engine/mechanics/effectParser.ts
import { sanitizeScribeScript } from '../scribescript/utils'; // Corrected import path from previous refactor
import { EngineContext } from './types';
import { changeQuality, createNewQuality, batchChangeQuality } from './qualityOperations';
import { parseAndQueueTimerInstruction } from './scheduler';

export function parseAndApplyEffects(
    ctx: EngineContext,
    effectsString: string,
): void {
    console.log(`[ENGINE DEBUG] applyEffects called with: "${effectsString}"`);
    
    const cleanEffectsString = sanitizeScribeScript(effectsString);
    const effects = cleanEffectsString.split(/,(?![^\[]*\])(?![^{]*\})/g); 

    for (const effect of effects) {
        const cleanEffect = effect.trim();
        if (!cleanEffect) continue;

        // VISUAL SPACER: Add a newline between top-level instructions for readability
        ctx.executedEffectsLog.push(""); 
        ctx.executedEffectsLog.push(`[RESOLVING: ${cleanEffect.substring(0, 50)}${cleanEffect.length > 50 ? '...' : ''}]`);

        const prevErrorCount = ctx.errors.length;

        if (cleanEffect.startsWith('{') && cleanEffect.endsWith('}')) {
            const resolvedCommand = ctx.evaluateText(cleanEffect);
            
            if (resolvedCommand !== cleanEffect) {
                 ctx.executedEffectsLog.push(`   -> [Result] "${resolvedCommand}"`);
            }

            if (resolvedCommand && (resolvedCommand.includes('=') || resolvedCommand.startsWith('%'))) {
                // Recursion
                parseAndApplyEffects(ctx, resolvedCommand);
            }
        }
        else {
            const macroMatch = cleanEffect.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
            if (macroMatch) {
                const [, command, args] = macroMatch;
                
                if (['schedule', 'reset', 'update', 'cancel'].includes(command)) {
                    ctx.executedEffectsLog.push(`[EXECUTE] Timer Command: ${command}`);
                    parseAndQueueTimerInstruction(ctx, command, args);
                } else {
                    // Other macros handled by evaluator usually, but if top level?
                    // This block catches standalone macros like %list[...] which don't do anything as an effect
                    // unless they return a command.
                }
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
                    const newMatch = cleanEffect.match(/^%new\[(.*?)(?:;\s*(.*))?\]\s*(=)\s*(.*)$/);
                    if (newMatch) {
                        const [, idExpr, argsStr, op, valStr] = newMatch;
                        const newId = ctx.evaluateText(`{${idExpr}}`).trim();
                        const resolvedVal = ctx.evaluateText(`{${valStr}}`);
                        const numVal = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);
                        
                        ctx.executedEffectsLog.push(`[EXECUTE] New: ${newId} = ${numVal}`);
                        
                        const props: Record<string, any> = {}; 
                            if (argsStr) {
                            const args = argsStr.split(',').map(s => s.trim());
                            if (args.length > 0 && !args[0].includes(':')) {
                                args.shift(); 
                            }
                            args.forEach(arg => {
                                const [k, ...vParts] = arg.split(':');
                                if(k) props[k.trim()] = vParts.join(':').trim().replace(/['"]/g, "");
                            });
                        }
                        createNewQuality(ctx, newId, numVal, null, props);
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
                                
                                const oldVal = ctx.getEffectiveLevel(qid);
                                ctx.executedEffectsLog.push(`[EXECUTE] $${qid}: ${oldVal} -> ${val} (${op})`);
                                
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