// src/engine/mechanics/effectParser.ts
import { sanitizeScribeScript } from '../scribescript/utils';
import { EngineContext } from './types';
import { changeQuality, createNewQuality, batchChangeQuality } from './qualityOperations';
import { parseAndQueueTimerInstruction } from './scheduler';
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
    if (!cleanEffectsString) return;
    const effects = splitEffectsString(cleanEffectsString); 

    for (const rawEffect of effects) {
        let command = rawEffect.trim();
        if (!command) continue;

        ctx.executedEffectsLog.push(`[RESOLVING] ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`);
        const prevErrorCount = ctx.errors.length;
        if (command.includes('{')) {
            const resolved = ctx.evaluateText(command);
            if (resolved !== command) {
                command = resolved.trim();
                ctx.executedEffectsLog.push(`   -> [EXPANDED] "${command}"`);
                if (command.includes(',') && !command.match(/^%[a-zA-Z]/)) { 
                    parseAndApplyEffects(ctx, command);
                    continue;
                }
            }
        }
        const macroMatch = command.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
        if (macroMatch && ['schedule', 'reset', 'update', 'cancel'].includes(macroMatch[1])) {
            const [, cmdName, args] = macroMatch;
            ctx.executedEffectsLog.push(`[EXECUTE] Timer: ${cmdName}`);
            parseAndQueueTimerInstruction(ctx, cmdName, args);
        }
        else if (command.startsWith('%all')) {
            const batchMatch = command.match(/^%all\[([^;\]]+)(?:;\s*([^\]]+))?\]\s*(=|\+=|-=)\s*(.*)$/);
            if (batchMatch) {
                const [, catExpr, filterExpr, op, val] = batchMatch;
                const numVal = isNaN(Number(val)) ? val : Number(val);
                ctx.executedEffectsLog.push(`[EXECUTE] Batch: Category[${catExpr}] ${op} ${numVal}`);
                batchChangeQuality(ctx, catExpr, op, numVal, filterExpr);
            }
        }
        else if (command.startsWith('%new')) {
            const newMatch = command.match(/^%new\[(.*?)(?:;\s*(.*))?\](?:\s*(=)\s*(.*))?$/);
            if (newMatch) {
                const [, idExpr, argsStr, op, valStr] = newMatch;
                const newId = idExpr.trim(); 

                let finalVal: string | number = 1; 
                if (op && valStr) {
                    const trimmedValStr = valStr.trim();
                    if (!isNaN(Number(trimmedValStr)) && trimmedValStr !== "") {
                        finalVal = Number(trimmedValStr);
                    } else {
                        finalVal = trimmedValStr.replace(/^['"]|['"]$/g, "");
                    }
                }

                ctx.executedEffectsLog.push(`[EXECUTE] New: ${newId} = ${finalVal}`);


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
                            const rawVal = vParts.join(':').trim().replace(/^['"]|['"]$/g, "");
                            props[k.trim()] = isNaN(Number(rawVal)) || rawVal === "" ? rawVal : Number(rawVal);
                        }
                    });
                }

                if (ctx.createNewQuality) {
                    ctx.createNewQuality(newId, finalVal, templateId, props);
                } else {
                    createNewQuality(ctx, newId, finalVal, templateId, props);
                }
            }
        }
        else {
            const assignMatch = command.match(/^(.+?)(?:\s*\[(.*?)\])?\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/);

            if (assignMatch) {
                const [, rawLhs, metaStr, op, valStr] = assignMatch;
                let qid = rawLhs.trim();
                if (['$', '@', '#'].includes(qid.charAt(0))) {
                    if (qid.startsWith('@')) {
                        qid = ctx.tempAliases[qid.substring(1)] || qid.substring(1);
                    } else {
                        qid = qid.substring(1);
                    }
                }
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
                let val: string | number = 0;
                if (op !== '++' && op !== '--') {
                    if (!isNaN(Number(valStr)) && valStr.trim() !== "") {
                        val = Number(valStr);
                    } else {
                        val = valStr.replace(/^['"]|['"]$/g, "");
                    }
                }

                if (qid && qid !== "nothing" && qid !== "undefined") {
                    changeQuality(ctx, qid, op, val, metadata);
                }
            }
        }
        if (ctx.errors.length > prevErrorCount) {
            const lastIdx = ctx.errors.length - 1;
            ctx.errors[lastIdx] = `${ctx.errors[lastIdx]} \n>> Context: "${command}"`;
        }
    }
}