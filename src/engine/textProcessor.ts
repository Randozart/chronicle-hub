// src/engine/textProcessor.ts
import { evaluateSimpleExpression } from './gameEngine';
import { PlayerQualities, QualityDefinition, QualityType, WorldSettings } from './models';

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

    // 2. Conditional Text { Condition : Text | Else }
    // We need to split by '|', but IGNORE '||' (Logical OR)
    // Regex: Match a pipe that is NOT preceded by a pipe AND NOT followed by a pipe
    const hasBranching = /(?<!\|)\|(?!\|)/.test(trimmedContent);
    const hasColon = trimmedContent.includes(':');

    if (hasBranching || hasColon) {
        // Split by single pipe
        const branches = trimmedContent.split(/(?<!\|)\|(?!\|)/); 
        
        for (const branch of branches) {
            const colonIndex = branch.indexOf(':');
            
            if (colonIndex > -1) {
                // "Condition : Result"
                const condition = branch.substring(0, colonIndex).trim();
                const text = branch.substring(colonIndex + 1).trim();
                
                // Evaluate the condition (handling || is now safe because we didn't split on it)
                if (evaluateCondition(condition, qualities)) { 
                    const cleanText = text.replace(/^['"]|['"]$/g, ''); // Strip outer quotes
                    return evaluateText(cleanText, qualities, qualityDefs);
                }
            } else {
                // "Else Result" (No colon)
                const cleanText = branch.trim().replace(/^['"]|['"]$/g, '');
                return evaluateText(cleanText, qualities, qualityDefs);
            }
        }
        return ''; // No conditions met
    }
    
    // 3. Fallback: Math/Logic/Variables
    // First, resolve inner variables
    const resolvedVars = evaluateText(trimmedContent, qualities, qualityDefs);
    // Then try to evaluate as math
    const result = evaluateSimpleExpression(resolvedVars);
    return result.toString();
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
    qualityDefs: Record<string, QualityDefinition>,
    settings?: WorldSettings // <--- ADD THIS ARGUMENT
): { chance: number | null; text: string } => {
    
    if (!expression) return { chance: null, text: '' };

    const match = expression.match(/^\s*\$(.*?)\s*(>>|<<|==|!=|>=|<=)\s*(\d+)(?:\s*\[([^\]]+)\])?\s*$/);
    
    if (!match) return { chance: null, text: '' };

    const [, qualitiesPart, operator, targetStr, bracketContent] = match;
    const target = parseInt(targetStr, 10);

    // --- 1. LOAD DEFAULTS FROM SETTINGS ---
    const config = settings?.challengeConfig || {};
    
    let minChance = config.minCap ?? 0;
    let maxChance = config.maxCap ?? 100;
    let pivotChance = config.basePivot ?? 60;

    // Calculate Default Margin
    let margin = target; // Fallback
    if (config.defaultMargin) {
        // Allow "$target" variable in the settings string
        const marginExpr = config.defaultMargin.replace(/\$target/g, target.toString());
        // We use a simple eval here since we don't have the full Engine instance in textProcessor
        // (safe enough for simple math like "50 / 2")
        try {
            // Use existing evaluatePart to handle other qualities if needed, 
            // or a simple math parser. For now, evaluatePart handles basic math + qualities.
            margin = evaluatePart(marginExpr, qualities);
        } catch {
            margin = target;
        }
    }

    // --- 2. OVERRIDE WITH BRACKETS ---
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

    // Sanity Check
    pivotChance = Math.max(0, Math.min(100, pivotChance));
    let pivotDecimal = pivotChance;
    
    // --- 3. CALCULATE ---
    const skillLevel = evaluatePart(qualitiesPart, qualities);

    // 4. Calculate Logic based on Operator
    let successChance = 0.0;

    // MODE: PROGRESSIVE ( >> )
    // "Higher is better". 
    // 0% at (Target - Margin). Pivot% at Target. 100% at (Target + Margin).
    if (operator === '>>') {
        const lowerBound = target - margin;
        const upperBound = target + margin;

        if (skillLevel <= lowerBound) successChance = 0.0;
        else if (skillLevel >= upperBound) successChance = 1.0;
        else if (skillLevel < target) {
            // Climbing to Pivot
            successChance = ((skillLevel - lowerBound) / margin) * pivotDecimal;
        } else {
            // Climbing from Pivot to 100
            const progress = (skillLevel - target) / margin;
            successChance = pivotDecimal + (progress * (1.0 - pivotDecimal));
        }
    }
    
    // MODE: ROLL UNDER ( << )
    // "Lower is better". Exact inverse of >>.
    else if (operator === '<<') {
        const lowerBound = target - margin;
        const upperBound = target + margin;

        // Calculate as if it were >>, then invert result
        let inverseChance = 0.0;
        if (skillLevel <= lowerBound) inverseChance = 0.0;
        else if (skillLevel >= upperBound) inverseChance = 1.0;
        else if (skillLevel < target) {
            inverseChance = ((skillLevel - lowerBound) / margin) * pivotDecimal;
        } else {
            const progress = (skillLevel - target) / margin;
            inverseChance = pivotDecimal + (progress * (1.0 - pivotDecimal));
        }
        successChance = 1.0 - inverseChance;
    }

    // MODE: PRECISION ( == )
    // "Close is good". 
    // 100% at Target. 0% at Edges (Target +/- Margin).
    else if (operator === '==') {
        const distance = Math.abs(skillLevel - target);
        if (distance >= margin) {
            successChance = 0.0;
        } else {
            // Linear drop off from 1.0 to 0.0 based on distance
            successChance = 1.0 - (distance / margin);
        }
    }

    // MODE: AVOIDANCE ( != )
    // "Far is good". 
    // 0% at Target. 100% at Edges (Target +/- Margin).
    else if (operator === '!=') {
        const distance = Math.abs(skillLevel - target);
        if (distance >= margin) {
            successChance = 1.0;
        } else {
            // Linear climb from 0.0 to 1.0 based on distance
            successChance = (distance / margin);
        }
    }

    // 5. Final Clamping
    let finalPercent = successChance * 100;
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