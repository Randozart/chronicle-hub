// src/engine/scribescript/macros.ts
import { PlayerQualities, QualityDefinition, QualityState } from '../models';
import { ScribeEvaluator, TraceLogger, SEPARATORS } from './types';
import { evaluateCondition } from './logic';
import { calculateChance } from './math';

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
        .map(def => def.id);

    if (rawFilterArg && rawFilterArg.trim() !== "") {
        const filterStr = rawFilterArg.trim();
        candidates = candidates.filter(qid => {
            const state = qualities[qid] || { qualityId: qid, type: defs[qid].type, level: 0, stringValue: "", changePoints: 0 } as QualityState;
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
    // We need to pass evaluateExpression logic, but we can't import it directly.
    // Instead, we reuse the Main Evaluator for argument resolution.
    // Note: This relies on evaluateText being able to handle a single expression string too.
): string | number | boolean {
    const match = macroString.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
    if (!match) return `[Invalid Macro: ${macroString}]`;
    const [, command, fullArgs] = match;
    let mainArg = fullArgs.trim();
    let optArgs: string[] = [];
    let rawOptStr = ""; 
    const semiIndex = fullArgs.indexOf(';');
    if (semiIndex !== -1) {
        mainArg = fullArgs.substring(0, semiIndex).trim();
        rawOptStr = fullArgs.substring(semiIndex + 1).trim();
        if (rawOptStr) optArgs = rawOptStr.split(',').map(s => s.trim());
    }

    // Wrap the injected evaluator for simple calls
    const evalArg = (s: string) => evaluator(`{${s}}`, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
    
    switch (command.toLowerCase()) {
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
        case "chance": return calculateChance(mainArg, rawOptStr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
        case "pick": {
            const countExpr = optArgs[0] || "1";
            const countVal = evalArg(countExpr);
            const count = Math.max(1, parseInt(countVal as string) || 1);
            const candidates = getCandidateIds(mainArg, optArgs[1], qualities, defs, resolutionRoll, aliases, errors, logger, depth, evaluator);
            if (candidates.length === 0) return "nothing";
            const result = candidates.sort(() => 0.5 - Math.random()).slice(0, count).join(', ');
            if (logger) logger(`Picked: [${result}]`, depth);
            return result;
        }
        case "roll": {
            const candidates = getCandidateIds(mainArg, optArgs[0], qualities, defs, resolutionRoll, aliases, errors, logger, depth, evaluator);
            const pool: string[] = [];
            candidates.forEach(qid => {
                const q = qualities[qid];
                if (q && 'level' in q && q.level > 0) {
                    const tickets = Math.min(q.level, 100); 
                    for(let i=0; i<tickets; i++) pool.push(qid);
                }
            });
            if (pool.length === 0) return "nothing";
            const res = pool[Math.floor(Math.random() * pool.length)];
            if (logger) logger(`Rolled: [${res}]`, depth);
            return res;
        }
        case "list": {
            const sepArg = optArgs[0]?.toLowerCase() || 'comma';
            const separator = SEPARATORS[sepArg] || optArgs[0] || ', ';
            const candidates = getCandidateIds(mainArg, optArgs[1] || '>0', qualities, defs, resolutionRoll, aliases, errors, logger, depth, evaluator);
            const names = candidates.map(qid => {
                const def = defs[qid];
                return evaluator(`{${def.name || qid}}`, qualities, defs, { qid, state: qualities[qid] }, resolutionRoll, aliases, errors, logger, depth + 1);
            });
            if (names.length === 0) return "nothing";
            return names.join(separator);
        }
        case "count": {
            const candidates = getCandidateIds(mainArg, optArgs[0], qualities, defs, resolutionRoll, aliases, errors, logger, depth, evaluator);
            return candidates.length;
        }
        case "schedule": case "reset": case "update": case "cancel": case "all": return macroString; 
        default: return `[Unknown Macro: ${command}]`;
    }
}

// Re-export getCandidateIds for gameEngine
export { getCandidateIds };