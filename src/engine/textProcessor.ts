// src/engine/textProcessor.ts
import { PlayerQualities, QualityDefinition, QualityType } from './models';

// Helper to sum up values in a string like "$strength + 10"
export const evaluatePart = (part: string, qualities: PlayerQualities): number => {
    let total = 0;
    // Matches "$var" or "10"
    const tokens = part.match(/\$?([a-zA-Z0-9_]+)|\d+/g) || [];
    
    for (const token of tokens) {
        if (token.startsWith('$')) {
            const qid = token.substring(1);
            
            if (qid === 'luck') continue; 

            const state = qualities[qid];
            const val = (state && 'level' in state) ? state.level : 0;
            total += val;
        } else {
            const val = parseInt(token, 10);
            if (!isNaN(val)) total += val;
        }
    }
    return total;
};

// Main evaluation function
export const evaluateText = (
    input: string | undefined, 
    qualities: PlayerQualities, 
    qualityDefs: Record<string, QualityDefinition>
): string => {
    if (!input) return '';

    const blockRegex = /\{([^{}]*?)\}/g;
    let currentPass = input;
    
    for(let i=0; i < 10 && currentPass.includes('{'); i++) {
        currentPass = currentPass.replace(blockRegex, (_, content) => 
            evaluateBlock(content, qualities, qualityDefs)
        );
    }
    
    return currentPass.replace(/\$([a-zA-Z0-9_.]+)/g, (match) => {
        const refMatch = match.match(/^\$([a-zA-Z0-9_]+)(?:\.([a-zA-Z_]+))?$/);
        if (!refMatch) return match;

        const [, qid, property] = refMatch;
        const state = qualities[qid];
        const def = qualityDefs[qid];

        if (property) {
            if (property.toLowerCase() === 'description') return def?.description ?? '';
            if (property.toLowerCase() === 'name') return def?.name ?? qid;
            
            if (property.toLowerCase() === 'source') {
                if (state && 'sources' in state && state.sources.length > 0) {
                    return state.sources[state.sources.length - 1];
                }
                return "acquired mysteriously";
            }
            return `[${qid}.${property}]`;
        }

        if (!state || !def) return "0";
        if (state.type === QualityType.String) return state.stringValue;
        if ('level' in state) return state.level.toString();
        
        return "0";
    });
};

const evaluateBlock = (
    content: string, 
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>
): string => {
    const trimmedContent = content.trim();

    // 1. Random Range { 1 ~ 10 }
    const randomMatch = trimmedContent.match(/^(\d+)\s*~\s*(\d+)$/);
    if (randomMatch) {
        const min = parseInt(randomMatch[1], 10);
        const max = parseInt(randomMatch[2], 10);
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
    }

    // 2. Conditionals { $q > 5 : A | B }
    if (trimmedContent.includes('|') || trimmedContent.includes(':')) {
        const branches = trimmedContent.split('|'); 
        for (const branch of branches) {
            const parts = branch.split(':');
            if (parts.length > 1) {
                const condition = parts[0].trim();
                const text = parts.slice(1).join(':').trim();
                if (evaluateCondition(condition, qualities)) { 
                    return evaluateText(text, qualities, qualityDefs);
                }
            } else {
                return evaluateText(branch.trim(), qualities, qualityDefs);
            }
        }
        return '';
    }
    
    // 3. Fallback Math
    // Note: evaluateText handles variables, but if the block is just "{ $a + $b }", 
    // we might want to run evaluatePart here to return a number string.
    // For now, we rely on evaluateText to just strip braces if no logic matched.
    const numericResult = evaluatePart(trimmedContent, qualities);
    if (numericResult !== 0 || trimmedContent === '0') return numericResult.toString();

    return evaluateText(trimmedContent, qualities, qualityDefs);
};

// UPDATED: Supports && and || recursion
export const evaluateCondition = (expression: string | undefined, qualities: PlayerQualities): boolean => {
    if (!expression) return true;
    const trimExpr = expression.trim();

    // 1. Handle OR (||)
    if (trimExpr.includes('||')) {
        const parts = trimExpr.split('||');
        return parts.some(part => evaluateCondition(part, qualities));
    }

    // 2. Handle AND (&&)
    if (trimExpr.includes('&&')) {
        const parts = trimExpr.split('&&');
        return parts.every(part => evaluateCondition(part, qualities));
    }

    // 3. Handle Parentheses ( )
    if (trimExpr.startsWith('(') && trimExpr.endsWith(')')) {
        return evaluateCondition(trimExpr.slice(1, -1), qualities);
    }

    // 4. Comparison
    const operatorMatch = trimExpr.match(/(!=|>=|<=|==|=|>|<)/);
    if (!operatorMatch) {
        const qualityMatch = trimExpr.match(/\$([a-zA-Z0-9_]+)/);
        if (qualityMatch) {
            const state = qualities[qualityMatch[1]];
            return (state && 'level' in state) ? state.level > 0 : false;
        }
        return trimExpr === 'true' || parseInt(trimExpr) > 0;
    }
    
    const operator = operatorMatch[0];
    const parts = trimExpr.split(operator);
    const leftPart = parts[0].trim();
    const rightPart = parts[1].trim();

    // Use the exported helper
    const leftValue = evaluatePart(leftPart, qualities);
    const rightValue = evaluatePart(rightPart, qualities);

    switch (operator) {
        case '>': return leftValue > rightValue;
        case '<': return leftValue < rightValue;
        case '>=': return leftValue >= rightValue;
        case '<=': return leftValue <= rightValue;
        case '=':
        case '==': return leftValue === rightValue;
        case '!=': return leftValue !== rightValue;
        default: return false;
    }
};

export const calculateSkillCheckChance = (
    expression: string | undefined, 
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>
): { chance: number | null; text: string } => {
    
    if (!expression) return { chance: null, text: '' };

    const match = expression.match(/^\s*\$(.*?)\s*(>=|<=)\s*(\d+)(?:\s*\[([^\]]+)\])?\s*$/);
    if (!match) return { chance: null, text: '' };

    const [, qualitiesPart, operator, targetStr, bracketContent] = match;
    const target = parseInt(targetStr, 10);

    if (qualitiesPart.trim() === 'luck') {
        let chance = 0;
        if (operator === '<=') chance = target;
        else if (operator === '>=') chance = 100 - target + 1;
        chance = Math.max(0, Math.min(100, chance));
        return { chance, text: "Luck" };
    }
    
    let margin = target;
    let minChance = 0;
    let maxChance = 100;
    let pivotChance = 60;

    if (bracketContent) {
        const args = bracketContent.split(',').map(s => {
            const parsed = parseInt(s.trim(), 10);
            return isNaN(parsed) ? null : parsed; 
        });

        if (args.length > 0 && args[0] !== null) margin = args[0];
        if (args.length > 1 && args[1] !== null) minChance = args[1];
        if (args.length > 2 && args[2] !== null) maxChance = args[2];
        if (args.length > 3 && args[3] !== null) pivotChance = args[3];
    }

    pivotChance = Math.max(0, Math.min(100, pivotChance));

    // Use the exported helper
    const skillLevel = evaluatePart(qualitiesPart, qualities);

    const lowerBound = target - margin;
    const upperBound = target + margin;

    let successChance = 0.0;

    if (skillLevel <= lowerBound) {
        successChance = 0.0;
    } else if (skillLevel >= upperBound) {
        successChance = 1.0;
    } else {
        const pivotDecimal = pivotChance / 100;

        if (skillLevel < target) {
            const range = target - lowerBound;
            if (range <= 0) successChance = 0.5;
            else {
                const progress = (skillLevel - lowerBound) / range;
                successChance = progress * pivotDecimal;
            }
        } else {
            const range = upperBound - target;
            if (range <= 0) successChance = 0.5;
            else {
                const progress = (skillLevel - target) / range;
                successChance = pivotDecimal + (progress * (1.0 - pivotDecimal));
            }
        }
    }
    
    if (operator === '<=') {
        successChance = 1.0 - successChance;
    }
    
    let finalPercent = successChance * 100;
    if (isNaN(finalPercent)) finalPercent = 0;
    finalPercent = Math.max(minChance, Math.min(maxChance, finalPercent));
    
    const testedQualityNames = qualitiesPart.replace(/\$/g, '') 
        .split('+')
        .map(qid => qid.trim())
        .filter(qid => qid)
        .map(qid => qualityDefs[qid]?.name ?? qid);
    const text = `A test of ${testedQualityNames.join(' + ')}`;

    return { chance: Math.round(finalPercent), text };
};