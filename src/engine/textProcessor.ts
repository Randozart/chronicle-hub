// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityType } from './models';
//import { repositories } from './repositories';

// const getQualityDisplayValue = (qid: string, qualities: PlayerQualities): string => {
//     const state = qualities[qid];
//     if (!state) return "0"; // Default to 0 if quality doesn't exist

//     const def = repositories.getQuality(qid);

//     // Safely check for stringValue
//     if ('stringValue' in state) {
//         return state.stringValue;
//     }

//     // Fallback for string qualities that might use their definition as a default value
//     if (def?.type === 'S' && def.description) {
//         return def.description;
//     }

//     // Safely check for level
//     if ('level' in state) {
//         return state.level.toString();
//     }
    
//     return "[Unknown Quality Type]";
// };

// const resolveQualityReference = (match: string, qualities: PlayerQualities): string => {
//     const refMatch = match.match(/^\$([a-zA-Z0-9_]+)(?:\.([a-zA-Z_]+))?$/);
//     if (!refMatch) return match;

//     const [, qid, property] = refMatch;
//     const state = qualities[qid];
//     const def = repositories.getQuality(qid);

//     if (property) {
//         // Handle explicit property access like .description
//         if (property.toLowerCase() === 'description') {
//             return def?.description ?? '';
//         }
//         // Handle explicit property access for stringValue (e.g., $player_name.stringValue)
//         if (property.toLowerCase() === 'stringvalue') {
//             return (state && state.type === QualityType.String) ? state.stringValue : '';
//         }
//         return `[${qid}.${property}]`;
//     }

//     // Handle direct value access like "$gossip" or "$player_name"
//     if (!state || !def) return "0";

//     // If it's a String quality, its default value IS its stringValue.
//     if (state.type === QualityType.String) {
//         return state.stringValue;
//     }

//     if ('level' in state) {
//         return state.level.toString();
//     }
    
//     return "[Unknown Quality]";
// };

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
    qualityDefs: Record<string, QualityDefinition> // Accepts the static definitions
): { chance: number | null; text: string } => { // Correct return type
    
    if (!expression) return { chance: null, text: '' };

    const match = expression.match(/^\s*\$(.*?)\s*(>=|<=)\s*(\d+)(?:\s*\[(\d+)\])?\s*$/);
    if (!match) return { chance: null, text: '' };

    const [, qualitiesPart, operator, targetStr, marginStr] = match;
    const target = parseInt(targetStr, 10);
    const margin = marginStr ? parseInt(marginStr, 10) : target;

    const testedQualityNames = qualitiesPart.replace(/\$/g, '') 
        .split('+')
        .map(qid => qid.trim())
        .filter(qid => qid)
        .map(qid => qualityDefs[qid]?.name ?? qid); // Look up in the passed-in object
    const text = `A test of ${testedQualityNames.join(' + ')}`;

    const evaluatePart = (part: string): number => {
        let total = 0;
        const tokens = part.match(/\$?([a-zA-Z0-9_]+)/g) || [];
        for (const token of tokens) {
            if (token.startsWith('$')) {
                const qid = token.substring(1);
                const state = qualities[qid];
                total += (state && 'level' in state) ? state.level : 0;
            } else if (!isNaN(parseInt(token, 10))) {
                total += parseInt(token, 10);
            }
        }
        return total;
    };
    
    const skillLevel = evaluatePart(qualitiesPart);
    
    const lowerBound = target - margin;
    const upperBound = target + margin;

    let successChance = 0.0;
    if (skillLevel <= lowerBound) {
        successChance = 0.0;
    } else if (skillLevel >= upperBound) {
        successChance = 1.0;
    } else {
        if (skillLevel < target) {
            const denominator = target - lowerBound;
            if (denominator <= 0) successChance = 0.5;
            else {
                const progress = (skillLevel - lowerBound) / denominator;
                successChance = progress * 0.5;
            }
        } else { // skillLevel >= target
            const denominator = upperBound - target;
            if (denominator <= 0) successChance = 0.5;
            else {
                const progress = (skillLevel - target) / denominator;
                successChance = 0.5 + (progress * 0.5);
            }
        }
    }
    
    if (operator === '<=') {
        successChance = 1.0 - successChance;
    }
    
    const finalChance = Math.max(0.0, Math.min(1.0, successChance));
    const chance = Math.round(finalChance * 100); 

    // Return as a whole number percentage (e.g., 75)
    return { chance, text };
};