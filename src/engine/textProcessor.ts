// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityState, QualityType } from './models';

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

    // 1. Macros
    if (trimmedExpr.startsWith('%')) {
        return evaluateMacro(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
    }
    
    // 2. Conditional Logic (colon OR pipe)
    if (trimmedExpr.includes(':') || trimmedExpr.includes('|')) {
        // Pluralization { $q | Sing | Plur }
        const pluralMatch = trimmedExpr.match(/^(\$[^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/);
        if (pluralMatch) {
            const [, qualityVar, singular, plural] = pluralMatch;
            const qualityValue = resolveVariable(`$${qualityVar.trim().replace('$','')}`, qualities, defs, aliases, self, resolutionRoll);
            return Number(qualityValue) === 1 ? singular.trim().replace(/^['"]|['"]$/g, '') : plural.trim().replace(/^['"]|['"]$/g, '');
        }
        return evaluateConditional(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
    }

    // 3. Complex Expression (Math/Variables)
    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
}

function evaluateConditional(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number
): string {
    const branches = expr.split('|');
    
    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');
        
        if (colonIndex > -1) {
            const condition = branch.substring(0, colonIndex).trim();
            const resultText = branch.substring(colonIndex + 1).trim();
            
            const isTrue = evaluateCondition(condition, qualities, defs, aliases, self, resolutionRoll);
            
            if (isTrue) {
                return resultText.replace(/^['"]|['"]$/g, ''); 
            }
        } else {
            return branch.trim().replace(/^['"]|['"]$/g, '');
        }
    }
    return "";
}

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
        // Boolean variable check (must start with sigil)
        const match = trimExpr.match(/^([@\$\.])([a-zA-Z0-9_]+)/);
        if (match) {
             const val = resolveVariable(trimExpr, qualities, defs, aliases, self, resolutionRoll);
             return val === 'true' || Number(val) > 0;
        }
        return trimExpr === 'true';
    }
    
    const operator = operatorMatch[0];
    const [leftRaw, rightRaw] = trimExpr.split(operator);
    
    // FIX: Pass all required arguments to resolveComplexExpression
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

    if (!match) return `[Invalid Macro: ${macroString}]`;

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
        case "label":
        case "image":
        case "labeled_image":
            return ""; 
        case "schedule":
        case "reset":
        case "update":
        case "cancel":
        case "all":
            return ""; 
        default:
            return `[Unknown Macro: ${command}]`;
    }
}

// FIX: Exported so StoryletDisplay can use it via getChallengeDetails wrapper logic
export function calculateChance(
    skillCheckExpr: string,
    optionalArgsStr: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): number {
    // FIX: Check for undefined expr
    if (!skillCheckExpr) return 0;

    const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|==|!=)\s*(.*)\s*$/);
    if (!skillCheckMatch) return 0;

    const [, skillPart, operator, targetPart] = skillCheckMatch;
    
    // FIX: Pass all args to evaluateExpression
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
    } else {
         const distance = Math.abs(skillLevel - target);
         if (operator === '==') successChance = distance >= margin ? 0 : 1.0 - (distance / margin);
         else if (operator === '!=') successChance = distance >= margin ? 1.0 : (distance / margin);
         else if (operator === '<<') {
             successChance = 1 - (((skillLevel - (target - margin)) / (2 * margin)));
         }
    }
    
    let finalPercent = successChance * 100;
    finalPercent = Math.max(minCap, Math.min(maxCap, finalPercent));
    return Math.round(finalPercent);
}

function resolveComplexExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    
    // STRICT REGEX: Must start with sigil @, $, #, or .
    const varReplacedExpr = expr.replace(/([@#\$\.])([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/g, 
        (match) => { 
            const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll);
            if (typeof resolved === 'string') return `"${resolved}"`;
            return resolved.toString();
        }
    );

    if (/^[a-zA-Z0-9_]+$/.test(varReplacedExpr.trim())) {
        return varReplacedExpr.trim();
    }

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
    // STRICT REGEX: Matches must start with a sigil
    const match = fullMatch.match(/^([@#\$\.])([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/);
    if (!match) return fullMatch;

    const [, sigil, name, propChain, levelSpoof] = match;

    let qualityId: string | undefined;
    if (sigil === '$') qualityId = name;
    else if (sigil === '#') qualityId = name; 
    else if (sigil === '@') qualityId = aliases[name];
    else if (sigil === '$.') qualityId = self?.qid;

    if (!qualityId) return `[Unknown: ${fullMatch}]`;

    const definition = defs[qualityId];
    if (!definition) return `[Missing Def: ${qualityId}]`;
    
    let state = qualities[qualityId];
    if (!state && self?.qid === qualityId) state = self.state;
    // Default state for missing variables to allow math to proceed (e.g. 0)
    if (!state) state = { qualityId, type: definition.type, level: 0, stringValue: "", changePoints: 0, sources: [], spentTowardsPrune: 0 } as any;

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

// UI Helper - Wraps internal calls
export function getChallengeDetails(
    challengeString: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>
): { chance: number | null, text: string } {
    if (!challengeString) return { chance: null, text: '' };
    
    // 1. Evaluate logic
    const chanceStr = evaluateText(`{${challengeString}}`, qualities, defs, null, 0);
    const chance = parseInt(chanceStr, 10);
    if (isNaN(chance)) return { chance: null, text: '' };

    // 2. Extract Label
    let text = "Challenge";
    const match = challengeString.match(/\$([a-zA-Z0-9_]+)/);
    if (match) {
        const qid = match[1];
        text = defs[qid]?.name || qid;
        if (text.includes('{') || text.includes('$')) {
             text = evaluateText(text, qualities, defs, null, 0);
        }
    }
    return { chance: Math.max(0, Math.min(100, chance)), text: `Test: ${text}` };
}