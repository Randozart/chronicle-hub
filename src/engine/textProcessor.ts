import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from './models';

type EvaluationContext = 'LOGIC' | 'TEXT';

// --- CORE PARSING ENGINE ---

export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    // RESTORED ORDER: Self Context first
    selfContext: { qid: string, state: QualityState } | null = null,
    // RESTORED ORDER: Resolution Roll second
    resolutionRoll: number = 0,
    // NEW: Aliases last (Optional)
    aliases: Record<string, string> | null = {}
): string {
    if (!rawText) return '';
    const effectiveAliases = aliases || {}; 
    return evaluateRecursive(rawText, 'TEXT', qualities, qualityDefs, effectiveAliases, selfContext, resolutionRoll);
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

    for (let i = 0; i < 50; i++) {
        const innermostBlockMatch = currentText.match(/\{([^{}]*?)\}/);
        if (!innermostBlockMatch) break;

        const blockWithBraces = innermostBlockMatch[0];
        const blockContent = innermostBlockMatch[1];

        const resolvedValue = evaluateExpression(blockContent, qualities, defs, aliases, self, resolutionRoll);
        currentText = currentText.replace(blockWithBraces, resolvedValue.toString());
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
    //Filter out comments
    const cleanExpr = expr.replace(/\/\/.*$/gm, '').trim();
    if (!cleanExpr) return "";
    const trimmedExpr = cleanExpr; 
    
    // 1. Handle Assignment: @alias = value
    const assignmentMatch = trimmedExpr.match(/^@([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (assignmentMatch) {
        const aliasKey = assignmentMatch[1];
        const rawValue = assignmentMatch[2];
        const resolvedValue = resolveComplexExpression(rawValue, qualities, defs, aliases, self, resolutionRoll);
        
        let storedValue = resolvedValue.toString().trim();
        if (storedValue.startsWith('$')) storedValue = storedValue.substring(1);
        
        aliases[aliasKey] = storedValue;
        return ""; 
    }

    if (trimmedExpr.includes(':')) {
        return evaluateConditional(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
    }

    if (trimmedExpr.startsWith('%')) {
        return evaluateMacro(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
    }
    
    if (trimmedExpr.match(/^\d+%$/)) {
        const chance = parseInt(trimmedExpr.slice(0, -1), 10);
        return resolutionRoll < chance;
    }
    
    if (trimmedExpr.includes('|')) {
        const choices = trimmedExpr.split('|');
        const randomIndex = Math.floor(Math.random() * choices.length);
        return evaluateExpression(choices[randomIndex].trim(), qualities, defs, aliases, self, resolutionRoll);
    }
    if (trimmedExpr.match(/>>|<<|><|<>/)) {
        return calculateChance(trimmedExpr, undefined, qualities, defs, aliases, self, resolutionRoll);
    }
    const rangeMatch = trimmedExpr.match(/^(\d+)\s*~\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll);
}

// --- HELPER: ADVANCED FILTERING FOR MACROS ---
function getCandidateIds(
    rawCategoryArg: string,
    rawFilterArg: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    resolutionRoll: number,
    aliases: Record<string, string>
): string[] {
    const targetCat = evaluateText(
        rawCategoryArg.startsWith('{') ? rawCategoryArg : `{${rawCategoryArg}}`, 
        qualities, 
        defs, 
        null, 
        resolutionRoll,
        aliases
    ).trim().toLowerCase();

    let candidates = Object.values(defs)
        .filter(def => {
            if (!def.category) return false;
            const cats = def.category.split(',').map(c => c.trim().toLowerCase());
            return cats.includes(targetCat);
        })
        .map(def => def.id);

    if (rawFilterArg && rawFilterArg.trim() !== "") {
        const filterStr = rawFilterArg.trim();
        
        candidates = candidates.filter(qid => {
            const state = qualities[qid] || { 
                qualityId: qid, 
                type: defs[qid].type, 
                level: 0, 
                stringValue: "", 
                changePoints: 0 
            } as QualityState;

            if (filterStr === '>0' || filterStr === 'has' || filterStr === 'owned') {
                return 'level' in state ? state.level > 0 : false;
            }

            return evaluateCondition(filterStr, qualities, defs, { qid, state }, resolutionRoll, aliases);
        });
    }

    return candidates;
}

const SEPARATORS: Record<string, string> = {
    'comma': ', ',
    'pipe': ' | ',
    'newline': '\n',
    'break': '<br/>',
    'and': ' and ',
    'space': ' '
};

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

    let mainArg = fullArgs.trim();
    let optArgs: string[] = [];
    let rawOptStr = ""; 

    const semiIndex = fullArgs.indexOf(';');
    if (semiIndex !== -1) {
        mainArg = fullArgs.substring(0, semiIndex).trim();
        rawOptStr = fullArgs.substring(semiIndex + 1).trim();
        if (rawOptStr) {
            optArgs = rawOptStr.split(',').map(s => s.trim());
        }
    }

    switch (command.toLowerCase()) {
        case "random": {
            const chanceExpr = mainArg;
            const chance = Number(evaluateExpression(chanceExpr, qualities, defs, aliases, self, resolutionRoll));
            const isInverted = optArgs.includes('invert');
            if (isNaN(chance)) return false;
            const success = resolutionRoll < chance;
            return isInverted ? !success : success;
        }
        case "choice": {
            const choices = fullArgs.split(';').map(s => s.trim()).filter(Boolean); 
            if (choices.length === 0) return "";
            const randomIndex = Math.floor(Math.random() * choices.length);
            return evaluateExpression(choices[randomIndex], qualities, defs, aliases, self, resolutionRoll);
        }
        case "chance": {
            return calculateChance(mainArg, rawOptStr, qualities, defs, aliases, self, resolutionRoll);
        }
        
        case "pick": {
            const categoryExpr = mainArg;
            const countExpr = optArgs[0] || "1";
            const filterExpr = optArgs[1];

            const countVal = parseInt(evaluateText(`{${countExpr}}`, qualities, defs, self, resolutionRoll, aliases));
            const count = isNaN(countVal) ? 1 : Math.max(1, countVal);

            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases);
            
            if (candidates.length === 0) return "nothing";

            const shuffled = candidates.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, count);
            
            return selected.join(', ');
        }

        case "roll": {
            const categoryExpr = mainArg;
            const filterExpr = optArgs[0];

            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases);
            const pool: string[] = [];
            
            candidates.forEach(qid => {
                const q = qualities[qid];
                if (q && 'level' in q && q.level > 0) {
                    const tickets = Math.min(q.level, 100); 
                    for(let i=0; i<tickets; i++) pool.push(qid);
                }
            });
            
            if (pool.length === 0) return "nothing";
            const rand = Math.floor(Math.random() * pool.length);
            return pool[rand];
        }

        case "list": {
            const categoryExpr = mainArg;
            const sepArg = optArgs[0]?.toLowerCase() || 'comma';
            const filterExpr = optArgs[1] || '>0'; 

            const separator = SEPARATORS[sepArg] || optArgs[0] || ', ';

            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases);
            
            const names = candidates.map(qid => {
                const def = defs[qid];
                return evaluateText(def.name || qid, qualities, defs, { qid, state: qualities[qid] }, resolutionRoll, aliases);
            });

            if (names.length === 0) return "nothing";
            return names.join(separator);
        }

        case "count": {
            const categoryExpr = mainArg;
            const filterExpr = optArgs[0]; 
            
            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases);
            
            return candidates.length;
        }

        case "schedule":
        case "reset":
        case "update":
        case "cancel":
        case "all":
            return macroString; 
        default:
            return `[Unknown Macro: ${command}]`;
    }
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
            if (evaluateCondition(condition, qualities, defs, self, resolutionRoll, aliases)) {
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
    self: { qid: string, state: QualityState } | null = null,
    resolutionRoll: number = 0,
    aliases: Record<string, string> = {}
): boolean {
    if (!expression) return true;
    const trimExpr = expression.trim();

    if (trimExpr.startsWith('(') && trimExpr.endsWith(')')) return evaluateCondition(trimExpr.slice(1, -1), qualities, defs, self, resolutionRoll, aliases);
    if (trimExpr.includes('||')) return trimExpr.split('||').some(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases));
    if (trimExpr.includes('&&')) return trimExpr.split('&&').every(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases));
    if (trimExpr.startsWith('!')) return !evaluateCondition(trimExpr.slice(1), qualities, defs, self, resolutionRoll, aliases);

    const operatorMatch = trimExpr.match(/(!=|>=|<=|==|=|>|<)/);
    if (!operatorMatch) {
        const val = resolveComplexExpression(trimExpr, qualities, defs, aliases, self, resolutionRoll);
        return val === 'true' || val === true || Number(val) > 0;
    }
    
    const operator = operatorMatch[0];
    const index = operatorMatch.index!;

    // --- IMPLICIT SELF HANDLING ---
    let leftRaw = trimExpr.substring(0, index).trim();
    if (leftRaw === '' && self) {
        leftRaw = '$.'; // Default to "Self" if LHS is missing but context exists
    }

    const leftVal = resolveComplexExpression(leftRaw, qualities, defs, aliases, self, resolutionRoll);
    const rightVal = resolveComplexExpression(trimExpr.substring(index + operator.length).trim(), qualities, defs, aliases, self, resolutionRoll);

    if (operator === '==' || operator === '=') return leftVal == rightVal;
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

function resolveComplexExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): string | number | boolean {
    
    // Updated Regex to reliably capture properties
    const varReplacedExpr = expr.replace(/((?:\$\.)|[@#\$][a-zA-Z0-9_]+)(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g, 
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
        return safeEval(varReplacedExpr);
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
    
    const match = fullMatch.match(/^((?:\$\.)|[@#\$][a-zA-Z0-9_]+)(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/);
    if (!match) return fullMatch;

    const [, sigilAndName, levelSpoof, propChain] = match;

    let sigil: string, identifier: string;
    
    if (sigilAndName === '$.') {
        sigil = '$.';
        identifier = '';
    } else {
        sigil = sigilAndName.charAt(0);
        identifier = sigilAndName.slice(1);
    }

    let qualityId: string | undefined;
    let contextQualities = qualities;

    if (sigil === '$.') qualityId = self?.qid;
    else if (sigil === '@') qualityId = aliases[identifier];
    else if (sigil === '$') qualityId = identifier;
    else if (sigil === '#') qualityId = identifier;

    if (!qualityId) return `[Unknown: ${fullMatch}]`;
    
    // NOTE: We don't return here if definition is missing, we try to degrade gracefully
    // But for properties we need the definition.
    let definition = defs[qualityId];

    let state: QualityState | undefined;

    if (sigil === '$.' && self) {
        state = self.state;
    } else {
        state = contextQualities[qualityId];
        if (!state && self?.qid === qualityId) state = self.state;
    }
    
    if (!state) {
        // Fallback state if quality not found on player
        state = { 
            qualityId, 
            type: definition?.type || QualityType.Pyramidal, 
            level: 0, 
            stringValue: "", 
            changePoints: 0, 
            sources: [], 
            spentTowardsPrune: 0 
        } as any;
    }

    if (levelSpoof) {
        const spoofedVal = evaluateExpression(levelSpoof, qualities, defs, aliases, self, resolutionRoll);
        if (typeof spoofedVal === 'number') {
            state = { ...state, level: spoofedVal } as any;
        }
    }

    const properties = propChain ? propChain.split('.').filter(Boolean) : [];
    let currentValue: any = state;

    if (properties.length === 0) {
        if (currentValue.type === QualityType.String) return (currentValue as any).stringValue;
        if ('level' in currentValue) return (currentValue as any).level;
        return 0;
    }

    for (const prop of properties) {
        if (typeof currentValue === 'string') {
            if (prop === 'capital') currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1);
            else if (prop === 'upper') currentValue = currentValue.toUpperCase();
            else if (prop === 'lower') currentValue = currentValue.toLowerCase();
            continue;
        }

        // FIX: Use the definition of the CURRENT quality in the chain, not the initial one
        const currentQid = currentValue.qualityId || qualityId;
        const currentDef = defs[currentQid];
        
        if (!currentDef) break;

        if (prop === 'name') currentValue = currentDef.name || currentQid;
        else if (prop === 'description') currentValue = currentDef.description || "";
        else if (prop === 'category') currentValue = currentDef.category || "";
        else if (prop === 'plural') {
             const lvl = ('level' in state!) ? state!.level : 0;
             currentValue = (lvl !== 1) ? (currentDef.plural_name || currentDef.name || currentQid) : (currentDef.singular_name || currentDef.name || currentQid);
        }
        else if (prop === 'singular') currentValue = currentDef.singular_name || currentDef.name || currentQid;
        else if (currentDef.text_variants && currentDef.text_variants[prop]) {
            currentValue = currentDef.text_variants[prop];
        }
        else if (state!.customProperties && state!.customProperties![prop] !== undefined) {
            currentValue = state!.customProperties![prop];
        } else {
            currentValue = undefined;
        }

        // Recursive Evaluation with Correct Context
        if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
            currentValue = evaluateText(
                currentValue, 
                qualities, 
                defs, 
                { qid: currentQid, state: state! }, // Use currentQid
                resolutionRoll,
                aliases
            );
        }
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

export function calculateChance(
    skillCheckExpr: string,
    optionalArgsStr: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number
): number {
    if (!skillCheckExpr) return 0;
    const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|><|<>|==|!=)\s*(.*)\s*$/);
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
        let inv = 0;
        if (skillLevel <= lowerBound) inv = 0;
        else if (skillLevel >= target + margin) inv = 1;
        else if (skillLevel < target) inv = ((skillLevel - lowerBound) / margin) * pivotDecimal;
        else inv = pivotDecimal + (((skillLevel - target) / margin) * (1 - pivotDecimal));
        successChance = 1.0 - inv;
    } else {
         const distance = Math.abs(skillLevel - target);
         if (operator === '><' || operator === '==') successChance = distance >= margin ? 0 : 1.0 - (distance / margin);
         else if (operator === '<>' || operator === '!=') successChance = distance >= margin ? 1.0 : (distance / margin);
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
    // RESTORED ORDER: self=null, roll=0, aliases={}
    const chanceStr = evaluateText(`{${challengeString}}`, qualities, defs, null, 0, {});
    const chance = parseInt(chanceStr, 10);
    if (isNaN(chance)) return { chance: null, text: '' };

    let text = "Challenge";
    const match = challengeString.match(/\$([a-zA-Z0-9_]+)/);
    if (match) {
        const qid = match[1];
        text = defs[qid]?.name || qid;
        if (text.includes('{') || text.includes('$')) {
             text = evaluateText(text, qualities, defs, null, 0, {});
        }
    }
    return { chance: Math.max(0, Math.min(100, chance)), text: `Test: ${text}` };
}