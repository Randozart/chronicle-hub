// src/engine/scribescript/macros.ts

import { PlayerQualities, QualityDefinition, QualityState, QualityType } from '../models';
import { ScribeEvaluator, TraceLogger, SEPARATORS } from './types';
import { evaluateCondition } from './logic';
import { calculateChance } from './math';

//Helper method to parse the arguments for "batch type macros"
export function parseCollectionArgs(
    rawArgs: string[], 
    macroType: 'pick' | 'roll' | 'all' | 'count' | 'list',
    evaluator: (t: string) => string
) {
    const category = rawArgs[0];
    const rest = rawArgs.slice(1);
    
    // Default values for each argument:
    // - Return 1 by default for macros like %pick,
    // - Filter always evaluates to true,
    // - If we're printing a list, always use the name property
    // - Comma seperate this list
    let count = (macroType === 'all' || macroType === 'list') ? Infinity : 1;
    let filter = "true";
    let prop = (macroType === 'list') ? ".name" : "id";
    let separator = ", ";

    if (rest.length > 0) {
        let currentIdx = 0;
        
        const potentialCount = evaluator(rest[currentIdx].startsWith('{') ? rest[currentIdx] : `{${rest[currentIdx]}`);
        const parsedCount = parseFloat(potentialCount);

        if (!isNaN(parsedCount)) {
            count = Math.max(1, Math.round(parsedCount));
            currentIdx++;
        }

        if (currentIdx < rest.length) {
            const arg = rest[currentIdx].trim();
            const isProp = arg === 'id' || arg.startsWith('.');
            
            if (isProp) {
                prop = arg;
                currentIdx++;
            } else {
                filter = arg;
                currentIdx++;
                
                if (currentIdx < rest.length) {
                    prop = rest[currentIdx].trim();
                    currentIdx++;
                }
            }
        }
        
        if (currentIdx < rest.length) {
            const rawSep = rest[currentIdx];
            separator = SEPARATORS[rawSep.toLowerCase()] || rawSep.replace(/['"]/g, '');
        }
    }

    return { category, count, filter, prop, separator };
}

function getCandidateIds(
    rawCategoryArg: string,
    rawFilterArg: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    resolutionRoll: number,
    aliases: Record<string, string>,
    errors: string[] | undefined,
    logger: TraceLogger | undefined,
    depth: number,
    evaluator: ScribeEvaluator
): string[] {
    const targetCat = evaluator(
        rawCategoryArg.startsWith('{') ? rawCategoryArg : `{${rawCategoryArg}}`, 
        qualities, defs, null, resolutionRoll, aliases, errors, logger, depth
    ).trim().toLowerCase();

    let candidates = Object.values(defs)
        .filter(def => {
            if (!def.category) return false;
            const cats = def.category.split(',').map(c => c.trim().toLowerCase());
            return cats.includes(targetCat);
        })

        // Sort by Ordering (Ascending), then by name Name
        .sort((a, b) => {
            const ordA = a.ordering || 0;
            const ordB = b.ordering || 0;
            if (ordA !== ordB) return ordA - ordB;
            return (a.name || a.id).localeCompare(b.name || b.id);
        })
        .map(def => def.id);

    if (rawFilterArg && rawFilterArg.trim() !== "" && rawFilterArg !== "true") {
        const filterStr = rawFilterArg.trim();
        candidates = candidates.filter(qid => {
            const state = qualities[qid] || { qualityId: qid, type: defs[qid].type, level: 0, stringValue: "", changePoints: 0 } as QualityState;
            
            // Special macro shortcuts meaning "possesses this quality"
            if (filterStr === '>0' || filterStr === 'has' || filterStr === 'owned') {
                return 'level' in state ? state.level > 0 : false;
            }
            return evaluateCondition(filterStr, qualities, defs, { qid, state }, resolutionRoll, aliases, errors, logger, depth, evaluator);
        });
    }
    return candidates;
}

export function evaluateMacro(
    macroString: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors: string[] | undefined,
    logger: TraceLogger | undefined,
    depth: number,
    evaluator: ScribeEvaluator,
): string | number | boolean {
    const match = macroString.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
    if (!match) return `[Invalid Macro: ${macroString}]`;
    const [, command, fullArgs] = match;
    const lowerCmd = command.toLowerCase();

    const evalArg = (s: string) => evaluator(`{${s}}`, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);

    if (['pick', 'roll', 'all', 'list', 'count'].includes(lowerCmd)) {
        const rawArgs = fullArgs.split(';').map(s => s.trim());
        
        const simpleEval = (t: string) => evaluator(t, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);

        const { category, count, filter, prop, separator } = parseCollectionArgs(rawArgs, lowerCmd as any, simpleEval);

        const candidates = getCandidateIds(category, filter, qualities, defs, resolutionRoll, aliases, errors, logger, depth, evaluator);

        if (lowerCmd === 'count') return candidates.length;

        if (candidates.length === 0) return "nothing";

        let selected: string[] = [];

        if (lowerCmd === 'roll') {
            const pool: string[] = [];
            candidates.forEach(qid => {
                const q = qualities[qid];
                if (q && 'level' in q && q.level > 0) {
                    const tickets = Math.min(q.level, 100); 
                    for(let i=0; i<tickets; i++) pool.push(qid);
                }
            });
            if (pool.length === 0) return "nothing";
            for(let i=0; i<count; i++) {
                selected.push(pool[Math.floor(Math.random() * pool.length)]);
            }
        } else if (lowerCmd === 'pick') {
            selected = candidates.sort(() => 0.5 - Math.random()).slice(0, count);
        } else {
            selected = candidates.slice(0, count);
        }

        const mappedResults = selected.map(qid => {
            if (prop === 'id' || prop === '') return qid;
            
            let propExpr = prop;
            if (!prop.startsWith('$')) {
                const p = prop.startsWith('.') ? prop : `.${prop}`;
                propExpr = `{${"$"}${p}}`; 
            }

            return evaluator(
                propExpr, 
                qualities, 
                defs, 
                { qid, state: qualities[qid] }, 
                resolutionRoll, 
                aliases, 
                errors, 
                logger, 
                depth + 1
            );
        });

        if (logger) logger(`${lowerCmd} [${category}] -> ${mappedResults.length} items`, depth);
        return mappedResults.join(separator);
    }

    let mainArg = fullArgs.trim();
    let optArgs: string[] = [];
    const semiIndex = fullArgs.indexOf(';');
    if (semiIndex !== -1) {
        mainArg = fullArgs.substring(0, semiIndex).trim();
        const rawOptStr = fullArgs.substring(semiIndex + 1).trim();
        if (rawOptStr) optArgs = rawOptStr.split(',').map(s => s.trim());
    }

    switch (lowerCmd) {
        case "random": {
            const chance = Number(evalArg(mainArg));
            const isInverted = optArgs.includes('invert');
            if (isNaN(chance)) return false;
            return isInverted ? !(resolutionRoll < chance) : (resolutionRoll < chance);
        }
        case "choice": {
            const choices = fullArgs.split(';').map(s => s.trim()).filter(Boolean); 
            if (choices.length === 0) return "";
            const selected = choices[Math.floor(Math.random() * choices.length)];
            return evaluator(selected, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
        }
        case "chance": return calculateChance(mainArg, fullArgs.substring(semiIndex + 1), qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
        
        case "schedule": case "reset": case "update": case "cancel": return macroString; 
        default: return `[Unknown Macro: ${command}]`;
    }
}

export { getCandidateIds };