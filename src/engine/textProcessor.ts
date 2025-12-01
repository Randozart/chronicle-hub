// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityType } from './models';

export const evaluatePart = (part: string, qualities: PlayerQualities): number => {
    let total = 0;
    // Matches "$var" or "10"
    const tokens = part.match(/\$?([a-zA-Z0-9_]+)|\d+/g) || [];
    
    for (const token of tokens) {
        if (token.startsWith('$')) {
            const qid = token.substring(1);
            
            // Luck has no "level" in the database to look up
            if (qid === 'luck') continue; 

            const state = qualities[qid];
            // NOTE: This uses raw quality level. 
            // If you want the UI to reflect Equipment bonuses, 
            // you would need to pass the calculated effective levels here.
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

    // Simplified recursive evaluator
    const blockRegex = /\{([^{}]*?)\}/g;
    let currentPass = input;
    for(let i=0; i < 10 && currentPass.includes('{'); i++) {
        currentPass = currentPass.replace(blockRegex, (_, content) => 
            evaluateBlock(content, qualities, qualityDefs)
        );
    }
    
    // Final pass for any remaining $variables, including .property access
    return currentPass.replace(/\$([a-zA-Z0-9_.]+)/g, (match) => {
        const refMatch = match.match(/^\$([a-zA-Z0-9_]+)(?:\.([a-zA-Z_]+))?$/);
        if (!refMatch) return match;

        const [, qid, property] = refMatch;
        const state = qualities[qid];
        const def = qualityDefs[qid];

        if (property) {
            if (property.toLowerCase() === 'description') return def?.description ?? '';
            return `[${qid}.${property}]`;
        }

        if (!state || !def) return "0";

        if (state.type === QualityType.String) return state.stringValue;
        if ('level' in state) return state.level.toString();
        
        return "[Unknown]";
    });
};

// Recursive parser for {blocks}
// const evaluateRecursive = (input: string, qualities: PlayerQualities): string => {
//     // A simplified regex that is less prone to catastrophic backtracking on complex strings
//     const blockRegex = /\{([^{}]*?)\}/g;
    
//     let lastPass = "";
//     let currentPass = input;
//     // We might need a depth counter for truly nested blocks, but this handles most cases.
//     for(let i=0; i < 10 && currentPass !== lastPass; i++) { // Loop limit prevents infinite loops
//         lastPass = currentPass;
//         currentPass = currentPass.replace(blockRegex, (_, content) => evaluateBlock(content, qualities));
//     }
    
//     // Final pass for any remaining simple $quality variables
//     return currentPass.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => {
//         return getQualityDisplayValue(qid, qualities);
//     });
// };

// Evaluates the content inside a single {block}
const evaluateBlock = (
    content: string, 
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>
): string => {
    const trimmedContent = content.trim();

    if (trimmedContent.includes('|') || trimmedContent.includes(':')) {
        const branches = trimmedContent.split('|'); 
        for (const branch of branches) {
            const parts = branch.split(':');
            if (parts.length > 1) {
                const condition = parts[0].trim();
                const text = parts.slice(1).join(':').trim();
                // evaluateCondition doesn't need qualityDefs, so this call is simple
                if (evaluateCondition(condition, qualities)) { 
                    return evaluateText(text, qualities, qualityDefs);
                }
            } else {
                return evaluateText(branch.trim(), qualities, qualityDefs);
            }
        }
        return '';
    }
    
    return evaluateText(trimmedContent, qualities, qualityDefs);
};

export const evaluateCondition = (expression: string | undefined, qualities: PlayerQualities): boolean => {
    if (!expression) return true;

    const operatorMatch = expression.match(/\s*(>=|<=|==|=|>|<)\s*/);
    if (!operatorMatch) {
        const qualityMatch = expression.match(/\$([a-zA-Z0-9_]+)/);
        if (qualityMatch) {
            const state = qualities[qualityMatch[1]];
            return (state && 'level' in state) ? state.level > 0 : false;
        }
        return true;
    }
    
    const operator = operatorMatch[0].trim();
    const parts = expression.split(operatorMatch[0]);
    const leftPart = parts[0].trim();
    const rightPart = parts[1].trim();

    const evaluatePart = (part: string): number => {
        let total = 0;
        const tokens = part.match(/\$?([a-zA-Z0-9_]+)|\d+/g) || [];
        for (const token of tokens) {
            if (token.startsWith('$')) {
                const qid = token.substring(1);
                const state = qualities[qid];
                total += (state && 'level' in state) ? state.level : 0;
            } else {
                total += parseInt(token, 10);
            }
        }
        return total;
    };

    const leftValue = evaluatePart(leftPart);
    const rightValue = evaluatePart(rightPart);

    switch (operator) {
        case '>': return leftValue > rightValue;
        case '<': return leftValue < rightValue;
        case '>=': return leftValue >= rightValue;
        case '<=': return leftValue <= rightValue;
        case '=':
        case '==': return leftValue === rightValue;
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

    // --- 1. HANDLE LUCK SPECIAL CASE ---
    if (qualitiesPart.trim() === 'luck') {
        let chance = 0;
        // $luck <= 40 means 40% chance (1-40 is success)
        if (operator === '<=') chance = target;
        // $luck >= 40 means 61% chance (40-100 is success)
        else if (operator === '>=') chance = 100 - target + 1;
        
        // Clamp
        chance = Math.max(0, Math.min(100, chance));
        
        return { chance, text: "Luck" };
    }
    
    // Defaults
    let margin = target;
    let minChance = 0;
    let maxChance = 100;
    let pivotChance = 60;

    // Robust Argument Parsing (The Fix)
    if (bracketContent) {
        const args = bracketContent.split(',').map(s => {
            const parsed = parseInt(s.trim(), 10);
            return isNaN(parsed) ? null : parsed; 
        });

        // FIX: Check length before accessing indices to avoid 'undefined'
        if (args.length > 0 && args[0] !== null) margin = args[0];
        if (args.length > 1 && args[1] !== null) minChance = args[1];
        if (args.length > 2 && args[2] !== null) maxChance = args[2];
        if (args.length > 3 && args[3] !== null) pivotChance = args[3];
    }

    // Sanity Check: Pivot must be 0-100
    pivotChance = Math.max(0, Math.min(100, pivotChance));

    // Calculate Skill Level
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

        // PIECEWISE LINEAR LOGIC
        if (skillLevel < target) {
            // Range: LowerBound -> Target
            const range = target - lowerBound;
            if (range <= 0) {
                successChance = 0.5; 
            } else {
                const progress = (skillLevel - lowerBound) / range;
                successChance = progress * pivotDecimal;
            }
        } else {
            // Range: Target -> UpperBound
            const range = upperBound - target;
            if (range <= 0) {
                successChance = 0.5;
            } else {
                const progress = (skillLevel - target) / range;
                successChance = pivotDecimal + (progress * (1.0 - pivotDecimal));
            }
        }
    }
    
    // Invert for <= (Roll Under)
    if (operator === '<=') {
        successChance = 1.0 - successChance;
    }
    
    // Final Clamping
    let finalPercent = successChance * 100;
    
    // Final NaN safety net
    if (isNaN(finalPercent)) finalPercent = 0;

    finalPercent = Math.max(minChance, Math.min(maxChance, finalPercent));
    
    // Format Name
    const testedQualityNames = qualitiesPart.replace(/\$/g, '') 
        .split('+')
        .map(qid => qid.trim())
        .filter(qid => qid)
        .map(qid => qualityDefs[qid]?.name ?? qid);
    const text = `A test of ${testedQualityNames.join(' + ')}`;

    return { chance: Math.round(finalPercent), text };
};
