// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityState } from './models';
import { sanitizeScribeScript, isLiteral } from './scribescript/utils';
import { TraceLogger, ScribeEvaluator } from './scribescript/types';
import { resolveComplexExpression } from './scribescript/variables';
import { evaluateCondition as logicEvaluateCondition } from './scribescript/logic';
import { evaluateMacro } from './scribescript/macros';
import { calculateChance } from './scribescript/math';

// Re-export specific helpers used by GameEngine
export { getCandidateIds } from './scribescript/macros';
export { calculateChance } from './scribescript/math';
export { sanitizeScribeScript } from './scribescript/utils';

// ==========================================
// CORE PARSER (Entry Point)
// ==========================================

export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null = null,
    resolutionRoll: number = 0,
    aliases: Record<string, string> | null = {},
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string {
    if (!rawText) return '';
    
    // Step 1: Sanitize
    const cleanText = sanitizeScribeScript(rawText);
    const effectiveAliases = aliases || {}; 
    
    try {
        return evaluateRecursive(cleanText, 'TEXT', qualities, qualityDefs, effectiveAliases, selfContext, resolutionRoll, errors, logger, depth);
    } catch (e: any) {
        const msg = `Fatal Parser Error: ${e.message}`;
        console.error(msg);
        if (errors) errors.push(msg);
        return `[ERROR: ${e.message}]`;
    }
}

function evaluateRecursive(
    text: string,
    context: 'LOGIC' | 'TEXT',
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string {
    let currentText = text;
    let currentBlock = ""; 

    try {
        for (let i = 0; i < 50; i++) {
            const innermostBlockMatch = currentText.match(/\{([^{}]*?)\}/);
            if (!innermostBlockMatch) break;

            const blockWithBraces = innermostBlockMatch[0];
            const blockContent = innermostBlockMatch[1];
            currentBlock = blockWithBraces; 

            // NOISE FILTER: Only log if it's NOT a simple literal
            const shouldLog = logger && context === 'TEXT' && !isLiteral(blockContent);

            if (shouldLog) {
                logger!(`Eval: ${blockWithBraces}`, depth);
            }

            const resolvedValue = evaluateExpression(blockContent, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth + 1);
            const safeValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString();
            
            if (shouldLog && safeValue !== "") {
                 const display = safeValue.length > 50 ? safeValue.substring(0, 47) + '...' : safeValue;
                 logger!(`= "${display}"`, depth, 'SUCCESS');
            }

            currentText = currentText.replace(blockWithBraces, () => safeValue);
        }

        if (context === 'LOGIC') {
            return evaluateExpression(currentText, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth).toString();
        } else {
            return currentText;
        }
    } catch (e: any) {
        if (errors) errors.push(`Recursion Error in block "${currentBlock}": ${e.message}`);
        return "[SCRIPT ERROR]";
    }
}

function evaluateExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string | number | boolean {
    const cleanExpr = expr.replace(/\/\/.*$/gm, '').trim();
    if (!cleanExpr) return "";
    const trimmedExpr = cleanExpr; 
    
    // 1. Alias Assignment
    const assignmentMatch = trimmedExpr.match(/^@([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (assignmentMatch) {
        const aliasKey = assignmentMatch[1];
        const rawValue = assignmentMatch[2];
        const resolvedValue = resolveComplexExpression(rawValue, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
        
        let storedValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString().trim();
        if (storedValue.startsWith('$')) storedValue = storedValue.substring(1);
        
        aliases[aliasKey] = storedValue;
        if (logger) logger(`@${aliasKey} := "${storedValue}"`, depth, 'SUCCESS');
        return ""; 
    }

    if (trimmedExpr.includes(':')) {
        return evaluateConditional(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
    }

    if (trimmedExpr.startsWith('%')) {
        return evaluateMacro(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
    }
    
    if (trimmedExpr.match(/^\d+%$/)) {
        const chance = parseInt(trimmedExpr.slice(0, -1), 10);
        return resolutionRoll < chance;
    }
    
    if (trimmedExpr.includes('|')) {
        const choices = trimmedExpr.split('|');
        const randomIndex = Math.floor(Math.random() * choices.length);
        const selected = choices[randomIndex].trim();
        if (choices.length > 1 && logger) logger(`Random Choice: "${selected}"`, depth);
        return evaluateExpression(selected, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
    }
    
    if (trimmedExpr.match(/>>|<<|><|<>/)) {
        return calculateChance(trimmedExpr, undefined, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
    }
    
    const rangeMatch = trimmedExpr.match(/^(\d+)\s*~\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        const res = Math.floor(Math.random() * (max - min + 1)) + min;
        if (logger) logger(`Rolled ${min}~${max}: ${res}`, depth);
        return res;
    }

    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
}

function evaluateConditional(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string {
    const branches = expr.split('|');
    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');
        
        if (colonIndex > -1) {
            const conditionStr = branch.substring(0, colonIndex).trim();
            const resultStr = branch.substring(colonIndex + 1).trim();

            const isMet = logicEvaluateCondition(conditionStr, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth, evaluateText);
            
            if (isMet) {
                if (logger) logger(`[IF] "${conditionStr}" passed.`, depth, 'INFO');
                return evaluateText(resultStr.replace(/^['"]|['"]$/g, ''), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
            } 
        } else {
            if (logger) logger(`[ELSE] Default branch taken.`, depth, 'INFO');
            const resultStr = branch.trim();
            return evaluateText(resultStr.replace(/^['"]|['"]$/g, ''), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
        }
    }
    return "";
}

// Public API for simple Condition evaluation (used by gameEngine)
export function evaluateCondition(
    expression: string | undefined, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition> = {}, 
    self: { qid: string, state: QualityState } | null = null, 
    resolutionRoll: number = 0, 
    aliases: Record<string, string> = {}, 
    errors?: string[]
): boolean {
    return logicEvaluateCondition(expression, qualities, defs, self, resolutionRoll, aliases, errors, undefined, 0, evaluateText);
}

export function getChallengeDetails(
    challengeString: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>
): { chance: number | null, text: string } {
    if (!challengeString) return { chance: null, text: '' };
    const chanceStr = evaluateText(`{${challengeString}}`, qualities, defs, null, 0, {});
    const chance = parseInt(chanceStr, 10);
    if (isNaN(chance)) return { chance: null, text: '' };

    let text = "Challenge";
    const match = challengeString.match(/\$([a-zA-Z0-9_]+)/);
    if (match) {
        const qid = match[1];
        text = defs[qid]?.name || qid;
        if (text.includes('{') || text.includes('$')) {
             text = evaluateText(text, qualities, defs, null, 0, {});
        }
    }
    return { chance: Math.max(0, Math.min(100, chance)), text: `Test: ${text}` };
}