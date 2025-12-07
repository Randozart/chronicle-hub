// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityState, QualityType, StringQualityState, WorldSettings } from './models';

// --- TYPE DEFINITIONS for the Parser ---
type EvaluationContext = 'LOGIC' | 'TEXT';

// --- CORE PARSING ENGINE ---

/**
 * The main entry point for evaluating a ScribeScript string.
 * This function orchestrates the entire parsing process.
 * @param rawText The raw string from a storylet field (e.g., text, name, description).
 * @param qualities The current player's qualities.
 * @param qualityDefs All quality definitions for the world.
 * @param selfContext For self-referencing ($.), this is the quality being evaluated.
 * @returns The final, rendered string.
 */
export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null,
    resolutionRoll: number // Added roll
): string {
    if (!rawText) return '';

    const [cleanText, aliasMap] = preprocessAliases(rawText);
    return evaluateRecursive(cleanText, 'TEXT', qualities, qualityDefs, aliasMap, selfContext, resolutionRoll);
}

/**
 * The recursive heart of the parser. It evaluates a string based on its current context.
 */
function evaluateRecursive(
    text: string,
    context: EvaluationContext,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number // Added roll
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
// src/engine/textProcessor.ts

/**
 * Evaluates a string that is known to be in a LOGIC context.
 * This function handles macros, conditionals, and logical/mathematical expressions.
 */
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
    
    if (trimmedExpr.includes(':') || trimmedExpr.includes('|')) {
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
 * The master dispatcher for all %macros.
 */
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

/**
 * A dedicated function to parse and calculate %chance.
 */
function calculateChance(
    skillCheckExpr: string,
    optionalArgsStr: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number // This is needed for the calls inside
): number {
    const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|==|!=)\s*(.*)\s*$/);
    if (!skillCheckMatch) return 0;

    const [, skillPart, operator, targetPart] = skillCheckMatch;
    
    // The skill and target are LOGIC contexts
    const skillLevel = Number(evaluateExpression(skillPart, qualities, defs, aliases, self, resolutionRoll));
    const target = Number(evaluateExpression(targetPart, qualities, defs, aliases, self, resolutionRoll));

    // --- Parse Optional Parameters ---
    let margin = target, minCap = 0, maxCap = 100, pivot = 60;
    
    if (optionalArgsStr) {
        const optionalArgs = optionalArgsStr.split(',').map(s => s.trim());
        let posIndex = 0;
        
        for (const arg of optionalArgs) {
            const namedArgMatch = arg.match(/^([a-zA-Z]+):\s*(.*)$/);
            if (namedArgMatch) {
                const [, key, valueStr] = namedArgMatch;
                // CRITICAL FIX HERE: Pass all arguments to the recursive call
                const value = Number(evaluateExpression(valueStr, qualities, defs, aliases, self, resolutionRoll));
                if (!isNaN(value)) {
                    if (key === 'margin') margin = value;
                    else if (key === 'min') minCap = value;
                    else if (key === 'max') maxCap = value;
                    else if (key === 'pivot') pivot = value;
                }
            } else if (!isNaN(Number(arg))) {
                // Positional arguments
                const value = Number(arg);
                if (posIndex === 0) margin = value;
                else if (posIndex === 1) minCap = value;
                else if (posIndex === 2) maxCap = value;
                else if (posIndex === 3) pivot = value;
                posIndex++;
            }
        }
    }
    
    // --- Perform the Calculation (logic from GameEngine moved here) ---
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


// --- The rest of the file (utility functions, resolveVariable, etc.) remains the same ---
// MAKE SURE to pass `resolutionRoll` down through the function calls, like:
// evaluateConditional(..., resolutionRoll)
// resolveComplexExpression(..., resolutionRoll)

/**
 * Resolves a complex logical or mathematical expression, respecting operator precedence.
 */
// in src/engine/textProcessor.ts

function resolveComplexExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    // Replace all variables ($quality, @alias, $.) with their numeric or string values.
    const varReplacedExpr = expr.replace(/([@\$\.]?)([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_]+)*)(?:\[(.*?)\])?/g, 
        (match) => { // The entire match is the first argument
            // CRITICAL FIX: Pass 'resolutionRoll' down to the next function
            return resolveVariable(match, qualities, defs, aliases, self, resolutionRoll).toString();
        }
    );
    
    try {
        // Using a safe, sandboxed eval method is crucial here.
        // For simplicity in pseudocode, we represent it as a function.
        return new Function(`return ${varReplacedExpr}`)();
    } catch (e) {
        // If it fails to evaluate (e.g., it's just a string), return the string.
        return varReplacedExpr;
    }
}

/**
 * The master function for resolving any variable reference like $q.name[5].capital
 */
function resolveVariable(
    fullMatch: string, // Corrected signature: receives the full matched string
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


// --- UTILITY FUNCTIONS --- (These would be filled out)
function preprocessAliases(text: string): [string, Record<string, string>] {
    const aliasMap: Record<string, string> = {};
    const aliasRegex = /\{@([a-zA-Z0-9_]+)\s*=\s*\$([a-zA-Z0-9_]+)\}/g;
    
    const cleanText = text.replace(aliasRegex, (_, alias, qid) => {
        aliasMap[alias] = qid;
        return ''; // Remove the declaration from the text
    });

    return [cleanText, aliasMap];
}

function evaluateConditional(expr: string, qualities: PlayerQualities, defs: Record<string, QualityDefinition>, aliases: Record<string, string>, self: { qid: string, state: QualityState } | null, resolutionRoll: number): string { return "" }

// A simplified helper, since the full one is in GameEngine
function createInitialState(qid: string, type: QualityType): QualityState {
    if (type === QualityType.String) return { qualityId: qid, type, stringValue: "" };
    return { qualityId: qid, type, level: 0 } as any;
}