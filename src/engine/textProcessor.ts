// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityState, QualityType, WorldSettings } from './models';

// --- TYPE DEFINITIONS for the Parser ---
type EvaluationContext = 'LOGIC' | 'TEXT';

// --- CORE PARSING ENGINE ---

export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string {
    if (!rawText) return '';

    const [cleanText, aliasMap] = preprocessAliases(rawText);
    return evaluateRecursive(cleanText, 'TEXT', qualities, qualityDefs, aliasMap, selfContext, resolutionRoll);
}

function evaluateRecursive(
    text: string,
    context: EvaluationContext,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string {
    let currentText = text;

    for (let i = 0; i < 15; i++) {
        const innermostBlockMatch = currentText.match(/\{([^{}]*?)\}/);
        if (!innermostBlockMatch) break;

        const blockWithBraces = innermostBlockMatch[0];
        const blockContent = innermostBlockMatch[1];

        const resolvedValue = evaluateRecursive(blockContent, 'LOGIC', qualities, defs, aliases, self, resolutionRoll);
        
        currentText = currentText.replace(blockWithBraces, resolvedValue);
    }

    if (context === 'LOGIC') {
        return evaluateExpression(currentText, qualities, defs, aliases, self, resolutionRoll).toString();
    } else {
        return currentText;
    }
}

function evaluateExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    const trimmedExpr = expr.trim();

    if (trimmedExpr.startsWith('%')) {
        return evaluateMacro(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
    }
    
    // Check for Conditional Logic (colon OR pipe)
    if (trimmedExpr.includes(':') || trimmedExpr.includes('|')) {
        // Check for special pluralization syntax first
        const pluralMatch = trimmedExpr.match(/^(\$[^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/);
        if (pluralMatch) {
            const [, qualityVar, singular, plural] = pluralMatch;
            const qualityValue = resolveVariable(qualityVar.trim(), qualities, defs, aliases, self, resolutionRoll);
            return Number(qualityValue) === 1 ? singular.trim().replace(/^['"]|['"]$/g, '') : plural.trim().replace(/^['"]|['"]$/g, '');
        }
        return evaluateConditional(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
    }

    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
}

/**
 * Handles { condition : result | else } logic.
 * This returns the TEXT of the chosen branch.
 */
function evaluateConditional(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number
): string {
    // Split by pipe | but be careful not to split inside nested structures if any remain 
    // (though main recursion should have handled inner braces).
    const branches = expr.split('|');
    
    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');
        
        if (colonIndex > -1) {
            // "Condition : Result"
            const condition = branch.substring(0, colonIndex).trim();
            const resultText = branch.substring(colonIndex + 1).trim();
            
            // Evaluate the condition part as a Boolean
            const isTrue = evaluateCondition(condition, qualities, defs, aliases, self, resolutionRoll);
            
            if (isTrue) {
                // Strip quotes if it looks like a string literal
                return resultText.replace(/^['"]|['"]$/g, ''); 
            }
        } else {
            // "Else Result" (No colon)
            return branch.trim().replace(/^['"]|['"]$/g, '');
        }
    }
    
    return ""; // No condition met
}

/**
 * Evaluates a condition string (e.g. "$gold > 10") and returns a boolean.
 */
export function evaluateCondition(
    expression: string | undefined, 
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition> = {}, 
    aliases: Record<string, string> = {},
    self: { qid: string, state: QualityState } | null = null,
    resolutionRoll: number = 0
): boolean {
    if (!expression) return true;
    const trimExpr = expression.trim();

    if (trimExpr.startsWith('(') && trimExpr.endsWith(')')) {
        return evaluateCondition(trimExpr.slice(1, -1), qualities, defs, aliases, self, resolutionRoll);
    }

    if (trimExpr.includes('||')) {
        const parts = trimExpr.split('||');
        return parts.some(part => evaluateCondition(part, qualities, defs, aliases, self, resolutionRoll));
    }

    if (trimExpr.includes('&&')) {
        const parts = trimExpr.split('&&');
        return parts.every(part => evaluateCondition(part, qualities, defs, aliases, self, resolutionRoll));
    }

    const operatorMatch = trimExpr.match(/(!=|>=|<=|==|=|>|<)/);
    if (!operatorMatch) {
        const val = resolveVariable(trimExpr, qualities, defs, aliases, self, resolutionRoll);
        return val === 'true' || Number(val) > 0;
    }
    
    const operator = operatorMatch[0];
    const [leftRaw, rightRaw] = trimExpr.split(operator);
    
    const leftVal = resolveComplexExpression(leftRaw.trim(), qualities, defs, aliases, self, resolutionRoll);
    const rightVal = resolveComplexExpression(rightRaw.trim(), qualities, defs, aliases, self, resolutionRoll);

    if (operator === '==') return leftVal == rightVal;
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
}

function evaluateMacro(
    macroString: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    const macroRegex = /^%([a-zA-Z_]+)\[(.*?)\]$/;
    const match = macroString.match(macroRegex);

    if (!match) return `[Invalid Macro Syntax: ${macroString}]`;

    const [, command, fullArgs] = match;
    const [requiredArgsStr, optionalArgsStr] = fullArgs.split(';').map(s => s ? s.trim() : '');
    const requiredArgs = requiredArgsStr.split(',').map(s => s.trim());

    switch (command) {
        case "random": {
            const chanceExpr = requiredArgs[0];
            const chance = Number(evaluateExpression(chanceExpr, qualities, defs, aliases, self, resolutionRoll));
            const isInverted = optionalArgsStr?.includes('invert') || false;
            if (isNaN(chance)) return false;
            const success = resolutionRoll < chance;
            return isInverted ? !success : success;
        }
        case "choice": {
            if (requiredArgs.length === 0) return "";
            const randomIndex = Math.floor(Math.random() * requiredArgs.length);
            const chosenExpr = requiredArgs[randomIndex];
            return evaluateExpression(chosenExpr, qualities, defs, aliases, self, resolutionRoll);
        }
        case "chance": {
            return calculateChance(requiredArgsStr, optionalArgsStr, qualities, defs, aliases, self, resolutionRoll);
        }
        // Removed %pronounset/pronoun as requested
        
        case "label":
        case "image":
        case "labeled_image":
            return `[Error: UI Macro '${command}' cannot be used in this context]`;
        case "schedule":
        case "reset":
        case "update":
        case "cancel":
            return ""; 
        default:
            return `[Unknown Macro: ${command}]`;
    }
}

export function calculateChance(
    skillCheckExpr: string,
    optionalArgsStr: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): number {
    const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|==|!=)\s*(.*)\s*$/);
    if (!skillCheckMatch) return 0;

    const [, skillPart, operator, targetPart] = skillCheckMatch;
    
    const skillLevel = Number(evaluateExpression(skillPart, qualities, defs, aliases, self, resolutionRoll));
    const target = Number(evaluateExpression(targetPart, qualities, defs, aliases, self, resolutionRoll));

    let margin = target, minCap = 0, maxCap = 100, pivot = 60;
    
    if (optionalArgsStr) {
        const optionalArgs = optionalArgsStr.split(',').map(s => s.trim());
        let posIndex = 0;
        
        for (const arg of optionalArgs) {
            const namedArgMatch = arg.match(/^([a-zA-Z]+):\s*(.*)$/);
            if (namedArgMatch) {
                const [, key, valueStr] = namedArgMatch;
                const value = Number(evaluateExpression(valueStr, qualities, defs, aliases, self, resolutionRoll));
                if (!isNaN(value)) {
                    if (key === 'margin') margin = value;
                    else if (key === 'min') minCap = value;
                    else if (key === 'max') maxCap = value;
                    else if (key === 'pivot') pivot = value;
                }
            } else if (!isNaN(Number(arg))) {
                const value = Number(arg);
                if (posIndex === 0) margin = value;
                else if (posIndex === 1) minCap = value;
                else if (posIndex === 2) maxCap = value;
                else if (posIndex === 3) pivot = value;
                posIndex++;
            }
        }
    }
    
    let successChance = 0;
    const pivotDecimal = pivot / 100;
    
    if (operator === '>>') {
        const lowerBound = target - margin;
        if (skillLevel <= lowerBound) successChance = 0;
        else if (skillLevel >= target + margin) successChance = 1;
        else if (skillLevel < target) successChance = ((skillLevel - lowerBound) / margin) * pivotDecimal;
        else successChance = pivotDecimal + (((skillLevel - target) / margin) * (1 - pivotDecimal));
    } else if (operator === '<<') {
        const lowerBound = target - margin;
        let inverseChance = 0.0;
        if (skillLevel <= lowerBound) inverseChance = 0.0;
        else if (skillLevel >= target + margin) inverseChance = 1.0;
        else if (skillLevel < target) inverseChance = ((skillLevel - lowerBound) / margin) * pivotDecimal;
        else inverseChance = pivotDecimal + (((skillLevel - target) / margin) * (1 - pivotDecimal));
        successChance = 1.0 - inverseChance;
    } else if (operator === '==') {
        const distance = Math.abs(skillLevel - target);
        successChance = distance >= margin ? 0.0 : 1.0 - (distance / margin);
    } else if (operator === '!=') {
        const distance = Math.abs(skillLevel - target);
        successChance = distance >= margin ? 1.0 : (distance / margin);
    }
    
    let finalPercent = successChance * 100;
    finalPercent = Math.max(minCap, Math.min(maxCap, finalPercent));
    
    return Math.round(finalPercent);
}

export function getChallengeDetails(
    challengeString: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>
): { chance: number | null, text: string } {
    if (!challengeString) return { chance: null, text: '' };

    // 1. Evaluate the string to get the probability number
    // We wrap it in braces to ensure it evaluates as logic
    const chanceStr = evaluateText(`{${challengeString}}`, qualities, defs, null, 0);
    const chance = parseInt(chanceStr, 10);

    if (isNaN(chance)) return { chance: null, text: '' };

    // 2. Extract a pretty label (Text)
    // We try to extract the quality name from the string for display purposes
    // e.g. "{%chance[$strength >> 50]}" -> "Strength"
    let text = "Challenge";
    
    // Simple regex to find the first quality being tested
    const match = challengeString.match(/\$([a-zA-Z0-9_]+)/);
    if (match) {
        const qid = match[1];
        // Don't evaluate the name here, just get the raw string or ID to be safe/fast
        text = defs[qid]?.name || qid;
        
        // If the name itself contains ScribeScript, we should evaluate it for display
        if (text.includes('{') || text.includes('$')) {
             text = evaluateText(text, qualities, defs, null, 0);
        }
    }

    return { chance: Math.max(0, Math.min(100, chance)), text: `Test: ${text}` };
}

function resolveComplexExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    const varReplacedExpr = expr.replace(/([@\$\.]?)([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/g, 
        (match) => { 
            return resolveVariable(match, qualities, defs, aliases, self, resolutionRoll).toString();
        }
    );
    try {
        return new Function(`return ${varReplacedExpr}`)();
    } catch (e) {
        return varReplacedExpr;
    }
}

function resolveVariable(
    fullMatch: string, 
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number {
    const match = fullMatch.match(/([@\$\.]?)([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/);
    if (!match) return fullMatch;

    const [, sigil, name, propChain, levelSpoof] = match;

    let qualityId: string | undefined;
    if (sigil === '$') qualityId = name;
    else if (sigil === '@') qualityId = aliases[name];
    else if (sigil === '$.') qualityId = self?.qid;
    if (!qualityId) return `[Unknown Var: ${fullMatch}]`;

    const definition = defs[qualityId];
    if (!definition) return `[Unknown Quality: ${qualityId}]`;
    
    let state = qualities[qualityId];
    if (!state && self?.qid === qualityId) state = self.state;
    if (!state) state = createInitialState(qualityId, definition.type);

    let contextQualities = qualities;
    if (levelSpoof) {
        const spoofedLevelValue = evaluateExpression(levelSpoof, qualities, defs, aliases, self, resolutionRoll);
        if (typeof spoofedLevelValue === 'number') {
            const tempState = { ...state, level: spoofedLevelValue } as any;
            contextQualities = { ...qualities, [qualityId]: tempState };
        }
    }

    const properties = propChain ? propChain.split('.').filter(Boolean) : [];
    let currentValue: any = contextQualities[qualityId] || state;

    for (const prop of properties) {
        if (typeof currentValue === 'string') {
            if (prop === 'capital') currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1);
            else if (prop === 'upper') currentValue = currentValue.toUpperCase();
            else if (prop === 'lower') currentValue = currentValue.toLowerCase();
            continue;
        }

        const currentDef = defs[currentValue.qualityId || qualityId];
        if (!currentDef) break;

        if (prop === 'plural') currentValue = currentDef.plural_name || currentDef.name || qualityId;
        else if (prop === 'singular') currentValue = currentDef.singular_name || currentDef.name || qualityId;
        else if (currentDef.text_variants && currentDef.text_variants[prop]) {
            currentValue = evaluateText(currentDef.text_variants[prop], contextQualities, defs, { qid: qualityId, state: currentValue }, resolutionRoll);
        } else if ((currentValue.customProperties && currentValue.customProperties[prop]) !== undefined) {
             currentValue = currentValue.customProperties[prop];
        }
        else if (prop === 'name') currentValue = evaluateText(currentDef.name, contextQualities, defs, { qid: qualityId, state: currentValue }, resolutionRoll);
        else if (prop === 'description') currentValue = evaluateText(currentDef.description, contextQualities, defs, { qid: qualityId, state: currentValue }, resolutionRoll);
    }
    
    if (typeof currentValue === 'object' && currentValue !== null) {
        if (currentValue.type === QualityType.String) return (currentValue as any).stringValue;
        if ('level' in currentValue) return (currentValue as any).level;
    }
    return currentValue?.toString() || "";
}

function preprocessAliases(text: string): [string, Record<string, string>] {
    const aliasMap: Record<string, string> = {};
    const aliasRegex = /\{@([a-zA-Z0-9_]+)\s*=\s*\$([a-zA-Z0-9_]+)\}/g;
    const cleanText = text.replace(aliasRegex, (_, alias, qid) => {
        aliasMap[alias] = qid;
        return '';
    });
    return [cleanText, aliasMap];
}

function createInitialState(qid: string, type: QualityType): QualityState {
    if (type === QualityType.String) return { qualityId: qid, type, stringValue: "" } as any;
    return { qualityId: qid, type, level: 0 } as any;
}