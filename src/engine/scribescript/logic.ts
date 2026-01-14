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
            const val = resolveComplexExpression(trimExpr, qualities, defs, aliases, self, resolutionRoll, errors, undefined, depth, evaluator); // No logger for sub-resolve to reduce noise
            const result = val === 'true' || val === true || Number(val) > 0;
            
            if (logger) {
                logger(`[Check] Is '${trimExpr}' true? Value: ${val} -> ${result ? 'YES' : 'NO'}`, depth, result ? 'SUCCESS' : 'WARN');
            }
            return result;
        }
        
        const operator = operatorMatch[0];
        const index = operatorMatch.index!;
        let leftRaw = trimExpr.substring(0, index).trim();
        if (leftRaw === '' && self) leftRaw = '$.';

        const leftVal = resolveComplexExpression(leftRaw, qualities, defs, aliases, self, resolutionRoll, errors, undefined, depth, evaluator);
        const rightVal = resolveComplexExpression(trimExpr.substring(index + operator.length).trim(), qualities, defs, aliases, self, resolutionRoll, errors, undefined, depth, evaluator);

        let result = false;
        if (operator === '==' || operator === '=') result = leftVal == rightVal;
        else if (operator === '!=') result = leftVal != rightVal;
        else {
            const lNum = Number(leftVal);
            const rNum = Number(rightVal);
            if (!isNaN(lNum) && !isNaN(rNum)) {
                switch (operator) {
                    case '>': result = lNum > rNum; break;
                    case '<': result = lNum < rNum; break;
                    case '>=': result = lNum >= rNum; break;
                    case '<=': result = lNum <= rNum; break;
                }
            }
        }

        if (logger) {
            logger(`[Check] ${leftRaw} (${leftVal}) ${operator} ${rightVal} ? -> ${result}`, depth, result ? 'SUCCESS' : 'INFO');
        }

        return result;

    } catch (e: any) {
        if (errors) errors.push(`Condition Error "${expression}": ${e.message}`);
        return false;
    }
}