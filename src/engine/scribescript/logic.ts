// src/engine/scribescript/logic.ts
import { PlayerQualities, QualityDefinition, QualityState } from '../models';
import { ScribeEvaluator, TraceLogger } from './types';
import { resolveComplexExpression } from './variables';

export function evaluateCondition(
    expression: string | undefined, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    aliases: Record<string, string>, 
    errors: string[] | undefined,
    logger: TraceLogger | undefined,
    depth: number,
    evaluator: ScribeEvaluator
): boolean {
    if (!expression) return true;
    const trimExpr = expression.trim();
    try {
        if (trimExpr.startsWith('(') && trimExpr.endsWith(')')) {
            return evaluateCondition(trimExpr.slice(1, -1), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth, evaluator);
        }
        if (trimExpr.includes('||')) {
            return trimExpr.split('||').some(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth, evaluator));
        }
        if (trimExpr.includes('&&')) {
            return trimExpr.split('&&').every(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth, evaluator));
        }
        if (trimExpr.startsWith('!')) {
            return !evaluateCondition(trimExpr.slice(1), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth, evaluator);
        }

        const operatorMatch = trimExpr.match(/(!=|>=|<=|==|=|>|<)/);
        if (!operatorMatch) {
            const val = resolveComplexExpression(trimExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
            return val === 'true' || val === true || Number(val) > 0;
        }
        
        const operator = operatorMatch[0];
        const index = operatorMatch.index!;
        let leftRaw = trimExpr.substring(0, index).trim();
        if (leftRaw === '' && self) leftRaw = '$.';

        const leftVal = resolveComplexExpression(leftRaw, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
        const rightVal = resolveComplexExpression(trimExpr.substring(index + operator.length).trim(), qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);

        if (operator === '==' || operator === '=') return leftVal == rightVal;
        if (operator === '!=') return leftVal != rightVal;
        const lNum = Number(leftVal);
        const rNum = Number(rightVal);
        if (isNaN(lNum) || isNaN(rNum)) return false;
        switch (operator) {
            case '>': return lNum > rNum;
            case '<': return lNum < rNum;
            case '>=': return lNum >= rNum;
            case '<=': return lNum <= rNum;
            default: return false;
        }
    } catch (e: any) {
        if (errors) errors.push(`Condition Error "${expression}": ${e.message}`);
        return false;
    }
}