// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityState, QualityType, WorldSettings } from './models';

// --- TYPE DEFINITIONS for the Parser ---
type EvaluationContext = 'LOGIC' | 'TEXT';

// --- CORE PARSING ENGINE ---
export function splitTopLevel(expr: string, delimiter: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];

        if (ch === '(' || ch === '{' || ch === '[') depth++;
        if (ch === ')' || ch === '}' || ch === ']') depth--;

        if (depth === 0 && expr.slice(i, i + delimiter.length) === delimiter) {
            parts.push(current.trim());
            current = '';
            i += delimiter.length - 1;
            continue;
        }
        current += ch;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

function hasTopLevel(expr: string, token: string): boolean {
    return splitTopLevel(expr, token).length > 1;
}

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
    self: { qid: string; state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    const trimmed = expr.trim();

    // Macro
    if (trimmed.startsWith('%')) {
        return evaluateMacro(trimmed, qualities, defs, aliases, self, resolutionRoll);
    }

    // Anonymous challenge: { $x >> 50 ; args }
    if (trimmed.includes('>>') && trimmed.includes(';')) {
        const [core, mods] = trimmed.split(';', 2);
        return calculateChance(core.trim(), mods.trim(), qualities, defs, aliases, self, resolutionRoll);
    }

    // Conditional
    if (hasTopLevel(trimmed, ':')) {
        return evaluateConditional(trimmed, qualities, defs, aliases, self, resolutionRoll);
    }

    // Anonymous random choice
    if (hasTopLevel(trimmed, '|')) {
        const options = splitTopLevel(trimmed, '|');
        const choice = options[Math.floor(Math.random() * options.length)];
        return evaluateExpression(choice, qualities, defs, aliases, self, resolutionRoll);
    }

    // Boolean condition
    if (
        trimmed.includes('>') ||
        trimmed.includes('<') ||
        trimmed.includes('=') ||
        hasTopLevel(trimmed, '&&') ||
        hasTopLevel(trimmed, '||') ||
        hasTopLevel(trimmed, ',')
    ) {
        return evaluateCondition(trimmed, qualities, defs, aliases, self, resolutionRoll);
    }

    // Fallback value
    return resolveComplexExpression(trimmed, qualities, defs, aliases, self, resolutionRoll);
}


/**
 * Handles { condition : result | else } logic.
 */
function evaluateConditional(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string; state: QualityState } | null,
    resolutionRoll: number
): string {
    const branches = splitTopLevel(expr, '|');
    let defaultBranch: string | null = null;

    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');

        if (colonIndex === -1) {
            // Default fallback (do not return yet!)
            defaultBranch = branch.trim();
            continue;
        }

        const condition = branch.slice(0, colonIndex).trim();
        const result = branch.slice(colonIndex + 1).trim();

        if (evaluateCondition(condition, qualities, defs, aliases, self, resolutionRoll)) {
            return result.replace(/^['"]|['"]$/g, '');
        }
    }

    return defaultBranch ? defaultBranch.replace(/^['"]|['"]$/g, '') : '';
}


/**
 * Evaluates a condition string (e.g. "$gold > 10") and returns a boolean.
 */
export function evaluateCondition(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string; state: QualityState } | null,
    resolutionRoll: number
): boolean {
    const trimmed = expr.trim();
    
    
    // Parentheses
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return evaluateCondition(trimmed.slice(1, -1), qualities, defs, aliases, self, resolutionRoll);
    }
    
    if (hasTopLevel(expr, ':')) {
        return evaluateCondition(trimmed.slice(1, -1), qualities, defs, aliases, self, resolutionRoll);
    }
    
    // ||
    if (hasTopLevel(trimmed, '||')) {
        return splitTopLevel(trimmed, '||')
            .some(p => evaluateCondition(p, qualities, defs, aliases, self, resolutionRoll));
    }

    // &&
    if (hasTopLevel(trimmed, '&&')) {
        return splitTopLevel(trimmed, '&&')
            .every(p => evaluateCondition(p, qualities, defs, aliases, self, resolutionRoll));
    }

    // ,  (AND)
    if (hasTopLevel(trimmed, ',')) {
        return splitTopLevel(trimmed, ',')
            .every(p => evaluateCondition(p, qualities, defs, aliases, self, resolutionRoll));
    }

    // Comparison
    const opMatch = trimmed.match(/(>=|<=|!=|==|>|<)/);
    if (!opMatch) {
        const value = resolveComplexExpression(trimmed, qualities, defs, aliases, self, resolutionRoll);
        return value === true || value === 'true' || Number(value) > 0;
    }

    const op = opMatch[0];
    const [left, right] = splitTopLevel(trimmed, op);

    const l = resolveComplexExpression(left, qualities, defs, aliases, self, resolutionRoll);
    const r = resolveComplexExpression(right, qualities, defs, aliases, self, resolutionRoll);

    const ln = Number(l);
    const rn = Number(r);

    switch (op) {
        case '>': return ln > rn;
        case '<': return ln < rn;
        case '>=': return ln >= rn;
        case '<=': return ln <= rn;
        case '==': return l == r;
        case '!=': return l != r;
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
        // UI Helpers (should be handled by frontend components usually, but fallback here)
        case "label":
        case "image":
        case "labeled_image":
             return ""; // Return empty in text context
        
        // Write Ops (should fail silently in Read context)
        case "schedule":
        case "reset":
        case "update":
        case "cancel":
        case "all":
            return ""; 

        default:
            return `[Unknown: ${command}]`;
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
    const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|><|<>)\s*(.*?)\s*$/);
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
    } else {
        // Simplified fallback for other ops
         const distance = Math.abs(skillLevel - target);
         if (operator === '==') successChance = distance >= margin ? 0 : 1.0 - (distance / margin);
         else if (operator === '!=') successChance = distance >= margin ? 1.0 : (distance / margin);
         else if (operator === '<<') {
             // Inverse of >> logic roughly
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
    
    // FIX: Only replace VALID variable patterns (must start with sigil)
    const varReplacedExpr = expr.replace(/([@\$\.])([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/g, 
        (match) => { 
            const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll);
            
            // SMART QUOTING:
            // If the resolved value is a string, wrap it in quotes for JS Eval.
            // Unless it's a number.
            if (typeof resolved === 'string') {
                return `"${resolved}"`;
            }
            return resolved.toString();
        }
    );

    // Sanitize: If alphanumeric only, return as string literal (e.g. "Warrior")
    if (!/^[\d\s()+\-*/%."<>=!]+$/.test(varReplacedExpr.trim())) {
        return varReplacedExpr.trim();
    }

    try {
        return new Function(`return ${varReplacedExpr}`)();
    } catch (e) {
        // Fallback: Return raw string if eval fails (e.g. string concat without quotes)
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
    const match = fullMatch.match(/([@\$\.])([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/);
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
    // Mock state if missing (e.g. new char creation)
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

// UI Helper
export function getChallengeDetails(
    challengeString: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>
): { chance: number | null, text: string } {
    if (!challengeString) return { chance: null, text: '' };
    const chanceStr = evaluateText(`{${challengeString}}`, qualities, defs, null, 0);
    const chance = parseInt(chanceStr, 10);
    if (isNaN(chance)) return { chance: null, text: '' };

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