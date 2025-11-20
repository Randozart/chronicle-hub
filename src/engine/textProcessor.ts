// src/engine/textProcessor.ts

import { PlayerQualities, QualityState, QualityType } from './models'; // Simplified import
import { repositories } from './repositories';

const getQualityDisplayValue = (qid: string, qualities: PlayerQualities): string => {
    const state = qualities[qid];
    if (!state) return "0"; // Default to 0 if quality doesn't exist

    const def = repositories.getQuality(qid);

    // Safely check for stringValue
    if ('stringValue' in state) {
        return state.stringValue;
    }

    // Fallback for string qualities that might use their definition as a default value
    if (def?.type === 'S' && def.description) {
        return def.description;
    }

    // Safely check for level
    if ('level' in state) {
        return state.level.toString();
    }
    
    return "[Unknown Quality Type]";
};

const resolveQualityReference = (match: string, qualities: PlayerQualities): string => {
    const refMatch = match.match(/^\$([a-zA-Z0-9_]+)(?:\.([a-zA-Z_]+))?$/);
    if (!refMatch) return match;

    const [, qid, property] = refMatch;
    const state = qualities[qid];
    const def = repositories.getQuality(qid);

    if (property) {
        // Handle explicit property access like .description
        if (property.toLowerCase() === 'description') {
            return def?.description ?? '';
        }
        // Handle explicit property access for stringValue (e.g., $player_name.stringValue)
        if (property.toLowerCase() === 'stringvalue') {
            return (state && state.type === QualityType.String) ? state.stringValue : '';
        }
        return `[${qid}.${property}]`;
    }

    // Handle direct value access like "$gossip" or "$player_name"
    if (!state || !def) return "0";

    // If it's a String quality, its default value IS its stringValue.
    if (state.type === QualityType.String) {
        return state.stringValue;
    }

    if ('level' in state) {
        return state.level.toString();
    }
    
    return "[Unknown Quality]";
};

// Main evaluation function
export const evaluateText = (input: string | undefined, qualities: PlayerQualities): string => {
    if (!input) return '';

    let processedText = input.replace(/\$([a-zA-Z0-9_]+)\.([a-zA-Z_]+)/g, (_, qid, property) => {
        const def = repositories.getQuality(qid);
        if (property.toLowerCase() === 'description') {
            return def?.description ?? '';
        }
        return `[${qid}.${property}]`;
    });
    
    return evaluateRecursive(processedText, qualities);
};

// Recursive parser for {blocks}
const evaluateRecursive = (input: string, qualities: PlayerQualities): string => {
    // A simplified regex that is less prone to catastrophic backtracking on complex strings
    const blockRegex = /\{([^{}]*?)\}/g;
    
    let lastPass = "";
    let currentPass = input;
    // We might need a depth counter for truly nested blocks, but this handles most cases.
    for(let i=0; i < 10 && currentPass !== lastPass; i++) { // Loop limit prevents infinite loops
        lastPass = currentPass;
        currentPass = currentPass.replace(blockRegex, (_, content) => evaluateBlock(content, qualities));
    }
    
    // Final pass for any remaining simple $quality variables
    return currentPass.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => {
        return getQualityDisplayValue(qid, qualities);
    });
};

// Evaluates the content inside a single {block}
const evaluateBlock = (content: string, qualities: PlayerQualities): string => {
    const trimmedContent = content.trim();

    if (trimmedContent.includes(':') || trimmedContent.includes('|')) {
        const branches = trimmedContent.split('|'); 
        for (const branch of branches) {
            const parts = branch.split(':');
            if (parts.length > 1) {
                const condition = parts[0].trim();
                const text = parts.slice(1).join(':').trim();
                if (evaluateCondition(condition, qualities)) {
                    return evaluateRecursive(text, qualities);
                }
            } else {
                return evaluateRecursive(branch.trim(), qualities);
            }
        }
        return '';
    }
    
    // If not conditional, it's a simple variable to be replaced
    return evaluateRecursive(trimmedContent, qualities);
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
    qualities: PlayerQualities
): number | null => {
    if (!expression) return null;

    // This logic mirrors the server's performSkillCheck, but returns a percentage.
    // It is designed to parse YOUR expressive format: $qualities >= target [margin]
    const match = expression.match(/^\s*\$(.*?)\s*(>=|<=)\s*(\d+)(?:\s*\[(\d+)\])?\s*$/);
    if (!match) return null; // Not a valid skill check format

    const [, qualitiesPart, operator, targetStr, marginStr] = match;
    const target = parseInt(targetStr, 10);
    const margin = marginStr ? parseInt(marginStr, 10) : target;

    // Helper to evaluate just the skill part (e.g., "scholar + fellowship")
    const evaluatePart = (part: string): number => {
        let total = 0;
        // This regex finds numbers or $quality names
        const tokens = part.match(/\$?([a-zA-Z0-9_]+)/g) || [];
        for (const token of tokens) {
            if (token.startsWith('$')) {
                const qid = token.substring(1);
                const state = qualities[qid];
                total += (state && 'level' in state) ? state.level : 0;
            } else if (!isNaN(parseInt(token, 10))) {
                // This case handles if a raw number is in the expression, e.g. "$scholar + 5"
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

    // Return as a whole number percentage (e.g., 75)
    return Math.round(finalChance * 100); 
};