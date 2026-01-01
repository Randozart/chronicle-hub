import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from './models';

type EvaluationContext = 'LOGIC' | 'TEXT';

/**
 * SANITIZER:
 * Removes comment blocks formatted as {// ... } before processing.
 * Respects nested braces inside comments to prevent early exit.
 */
export function sanitizeScribeScript(text: string): string {
    if (!text) return "";
    let buffer = "";
    let i = 0;
    
    // 0 = Normal
    // >0 = Inside a comment block (tracking depth)
    let commentDepth = 0;

    while (i < text.length) {
        // 1. Detect start of a Comment Block: "{" followed immediately by "//"
        // We look ahead to ensure we don't catch just a loose "{"
        if (commentDepth === 0 && text[i] === '{' && i + 2 < text.length && text[i+1] === '/' && text[i+2] === '/') {
            commentDepth = 1;
            i += 3; // Skip past "{//"
            continue;
        }

        // 2. While inside a comment, track depth so we don't exit early on nested braces
        if (commentDepth > 0) {
            if (text[i] === '{') {
                commentDepth++;
            } else if (text[i] === '}') {
                commentDepth--;
                // If depth hits 0, we have successfully closed the main comment block.
                // We do NOT add this closing brace to buffer, effectively stripping the block.
            }
            // We ignore ALL characters inside the comment
            i++;
            continue;
        }

        // 3. Normal character - keep it
        buffer += text[i];
        i++;
    }

    return buffer;
}

// --- CORE PARSING ENGINE ---

export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null = null,
    resolutionRoll: number = 0,
    aliases: Record<string, string> | null = {},
    errors?: string[] 
): string {
    if (!rawText) return '';
    
    // STEP 1: Sanitize Comments
    // This prevents ghost symbols inside {// ...} from affecting logic or regex splits later
    const cleanText = sanitizeScribeScript(rawText);

    const effectiveAliases = aliases || {}; 
    
    // SAFETY_NET: Top level try/catch
    try {
        return evaluateRecursive(cleanText, 'TEXT', qualities, qualityDefs, effectiveAliases, selfContext, resolutionRoll, errors);
    } catch (e: any) {
        const msg = `Fatal Parser Error: ${e.message}`;
        console.error(msg);
        if (errors) errors.push(msg);
        return `[ERROR: ${e.message}]`;
    }
}

function evaluateRecursive(
    text: string,
    context: EvaluationContext,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[]
): string {
    let currentText = text;
    let currentBlock = ""; 

    try {
        for (let i = 0; i < 50; i++) {
            const innermostBlockMatch = currentText.match(/\{([^{}]*?)\}/);
            if (!innermostBlockMatch) break;

            const blockWithBraces = innermostBlockMatch[0];
            const blockContent = innermostBlockMatch[1];
            currentBlock = blockWithBraces; 

            const resolvedValue = evaluateExpression(blockContent, qualities, defs, aliases, self, resolutionRoll, errors);
            
            // FIX: Handle null/undefined to prevent crash
            const safeValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString();
            
            // FIX: Use callback for replacement to prevent regex pattern injection
            currentText = currentText.replace(blockWithBraces, () => safeValue);
        }

        if (context === 'LOGIC') {
            return evaluateExpression(currentText, qualities, defs, aliases, self, resolutionRoll, errors).toString();
        } else {
            return currentText;
        }
    } catch (e: any) {
        if (errors) errors.push(`Recursion Error in block "${currentBlock}": ${e.message}`);
        return "[SCRIPT ERROR]";
    }
}

function evaluateExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[]
): string | number | boolean {
    const cleanExpr = expr.replace(/\/\/.*$/gm, '').trim();
    if (!cleanExpr) return "";
    const trimmedExpr = cleanExpr; 
    
    // 1. Handle Assignment: @alias = value
    const assignmentMatch = trimmedExpr.match(/^@([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (assignmentMatch) {
        const aliasKey = assignmentMatch[1];
        const rawValue = assignmentMatch[2];
        const resolvedValue = resolveComplexExpression(rawValue, qualities, defs, aliases, self, resolutionRoll, errors);
        
        let storedValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString().trim();
        if (storedValue.startsWith('$')) storedValue = storedValue.substring(1);
        
        aliases[aliasKey] = storedValue;
        return ""; 
    }

    if (trimmedExpr.includes(':')) {
        return evaluateConditional(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors);
    }

    if (trimmedExpr.startsWith('%')) {
        return evaluateMacro(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors);
    }
    
    if (trimmedExpr.match(/^\d+%$/)) {
        const chance = parseInt(trimmedExpr.slice(0, -1), 10);
        return resolutionRoll < chance;
    }
    
    if (trimmedExpr.includes('|')) {
        const choices = trimmedExpr.split('|');
        const randomIndex = Math.floor(Math.random() * choices.length);
        return evaluateExpression(choices[randomIndex].trim(), qualities, defs, aliases, self, resolutionRoll, errors);
    }
    if (trimmedExpr.match(/>>|<<|><|<>/)) {
        return calculateChance(trimmedExpr, undefined, qualities, defs, aliases, self, resolutionRoll, errors);
    }
    const rangeMatch = trimmedExpr.match(/^(\d+)\s*~\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors);
}

// --- HELPER: ADVANCED FILTERING FOR MACROS ---
function getCandidateIds(
    rawCategoryArg: string,
    rawFilterArg: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    resolutionRoll: number,
    aliases: Record<string, string>,
    errors?: string[]
): string[] {
    const targetCat = evaluateText(
        rawCategoryArg.startsWith('{') ? rawCategoryArg : `{${rawCategoryArg}}`, 
        qualities, 
        defs, 
        null, 
        resolutionRoll,
        aliases,
        errors
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
            const state = qualities[qid] || { qualityId: qid, type: defs[qid].type, level: 0, stringValue: "", changePoints: 0 } as QualityState;
            if (filterStr === '>0' || filterStr === 'has' || filterStr === 'owned') {
                return 'level' in state ? state.level > 0 : false;
            }
            return evaluateCondition(filterStr, qualities, defs, { qid, state }, resolutionRoll, aliases, errors);
        });
    }
    return candidates;
}

const SEPARATORS: Record<string, string> = { 'comma': ', ', 'pipe': ' | ', 'newline': '\n', 'break': '<br/>', 'and': ' and ', 'space': ' ' };

function evaluateMacro(
    macroString: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[]
): string | number | boolean {
    const match = macroString.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
    if (!match) return `[Invalid Macro: ${macroString}]`;
    const [, command, fullArgs] = match;
    let mainArg = fullArgs.trim();
    let optArgs: string[] = [];
    let rawOptStr = ""; 
    const semiIndex = fullArgs.indexOf(';');
    if (semiIndex !== -1) {
        mainArg = fullArgs.substring(0, semiIndex).trim();
        rawOptStr = fullArgs.substring(semiIndex + 1).trim();
        if (rawOptStr) optArgs = rawOptStr.split(',').map(s => s.trim());
    }

    switch (command.toLowerCase()) {
        case "random": {
            const chanceExpr = mainArg;
            const chance = Number(evaluateExpression(chanceExpr, qualities, defs, aliases, self, resolutionRoll, errors));
            const isInverted = optArgs.includes('invert');
            if (isNaN(chance)) return false;
            return isInverted ? !(resolutionRoll < chance) : (resolutionRoll < chance);
        }
        case "choice": {
            const choices = fullArgs.split(';').map(s => s.trim()).filter(Boolean); 
            if (choices.length === 0) return "";
            return evaluateExpression(choices[Math.floor(Math.random() * choices.length)], qualities, defs, aliases, self, resolutionRoll, errors);
        }
        case "chance": return calculateChance(mainArg, rawOptStr, qualities, defs, aliases, self, resolutionRoll, errors);
        case "pick": {
            const categoryExpr = mainArg;
            const countExpr = optArgs[0] || "1";
            const filterExpr = optArgs[1];
            const countVal = parseInt(evaluateText(`{${countExpr}}`, qualities, defs, self, resolutionRoll, aliases, errors));
            const count = isNaN(countVal) ? 1 : Math.max(1, countVal);
            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases, errors);
            if (candidates.length === 0) return "nothing";
            return candidates.sort(() => 0.5 - Math.random()).slice(0, count).join(', ');
        }
        case "roll": {
            const categoryExpr = mainArg;
            const filterExpr = optArgs[0];
            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases, errors);
            const pool: string[] = [];
            candidates.forEach(qid => {
                const q = qualities[qid];
                if (q && 'level' in q && q.level > 0) {
                    const tickets = Math.min(q.level, 100); 
                    for(let i=0; i<tickets; i++) pool.push(qid);
                }
            });
            if (pool.length === 0) return "nothing";
            return pool[Math.floor(Math.random() * pool.length)];
        }
        case "list": {
            const categoryExpr = mainArg;
            const sepArg = optArgs[0]?.toLowerCase() || 'comma';
            const filterExpr = optArgs[1] || '>0'; 
            const separator = SEPARATORS[sepArg] || optArgs[0] || ', ';
            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases, errors);
            const names = candidates.map(qid => {
                const def = defs[qid];
                return evaluateText(def.name || qid, qualities, defs, { qid, state: qualities[qid] }, resolutionRoll, aliases, errors);
            });
            if (names.length === 0) return "nothing";
            return names.join(separator);
        }
        case "count": {
            const categoryExpr = mainArg;
            const filterExpr = optArgs[0]; 
            const candidates = getCandidateIds(categoryExpr, filterExpr, qualities, defs, resolutionRoll, aliases, errors);
            return candidates.length;
        }
        case "schedule": case "reset": case "update": case "cancel": case "all": return macroString; 
        default: return `[Unknown Macro: ${command}]`;
    }
}

function evaluateConditional(expr: string, qualities: PlayerQualities, defs: Record<string, QualityDefinition>, aliases: Record<string, string>, self: { qid: string, state: QualityState } | null, resolutionRoll: number, errors?: string[]): string {
    const branches = expr.split('|');
    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');
        if (colonIndex > -1) {
            if (evaluateCondition(branch.substring(0, colonIndex).trim(), qualities, defs, self, resolutionRoll, aliases, errors)) {
                return branch.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
            }
        } else {
            return branch.trim().replace(/^['"]|['"]$/g, '');
        }
    }
    return "";
}

export function evaluateCondition(expression: string | undefined, qualities: PlayerQualities, defs: Record<string, QualityDefinition> = {}, self: { qid: string, state: QualityState } | null = null, resolutionRoll: number = 0, aliases: Record<string, string> = {}, errors?: string[]): boolean {
    if (!expression) return true;
    const trimExpr = expression.trim();
    try {
        if (trimExpr.startsWith('(') && trimExpr.endsWith(')')) return evaluateCondition(trimExpr.slice(1, -1), qualities, defs, self, resolutionRoll, aliases, errors);
        if (trimExpr.includes('||')) return trimExpr.split('||').some(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases, errors));
        if (trimExpr.includes('&&')) return trimExpr.split('&&').every(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases, errors));
        if (trimExpr.startsWith('!')) return !evaluateCondition(trimExpr.slice(1), qualities, defs, self, resolutionRoll, aliases, errors);

        const operatorMatch = trimExpr.match(/(!=|>=|<=|==|=|>|<)/);
        if (!operatorMatch) {
            const val = resolveComplexExpression(trimExpr, qualities, defs, aliases, self, resolutionRoll, errors);
            return val === 'true' || val === true || Number(val) > 0;
        }
        
        const operator = operatorMatch[0];
        const index = operatorMatch.index!;
        let leftRaw = trimExpr.substring(0, index).trim();
        if (leftRaw === '' && self) leftRaw = '$.';

        const leftVal = resolveComplexExpression(leftRaw, qualities, defs, aliases, self, resolutionRoll, errors);
        const rightVal = resolveComplexExpression(trimExpr.substring(index + operator.length).trim(), qualities, defs, aliases, self, resolutionRoll, errors);

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
    } catch (e: any) {
        if (errors) errors.push(`Condition Error "${expression}": ${e.message}`);
        return false;
    }
}

function resolveComplexExpression(expr: string, qualities: PlayerQualities, defs: Record<string, QualityDefinition>, aliases: Record<string, string>, self: { qid: string, state: QualityState } | null, resolutionRoll: number, errors?: string[]): string | number | boolean {
    try {
        const varReplacedExpr = expr.replace(/((?:\$\.)|[@#\$][a-zA-Z0-9_]+)(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g, 
            (match) => { 
                const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll, errors);
                if (typeof resolved === 'string') return `"${resolved}"`;
                return resolved.toString();
            }
        );
        if (/^[a-zA-Z0-9_]+$/.test(varReplacedExpr.trim())) return varReplacedExpr.trim();
        return safeEval(varReplacedExpr);
    } catch (e: any) {
        if (errors) errors.push(`Expression Error "${expr}": ${e.message}`);
        return `[ERROR: ${expr}]`;
    }
}

function resolveVariable(fullMatch: string, qualities: PlayerQualities, defs: Record<string, QualityDefinition>, aliases: Record<string, string>, self: { qid: string, state: QualityState } | null, resolutionRoll: number, errors?: string[]): string | number {
    try {
        const match = fullMatch.match(/^((?:\$\.)|[@#\$][a-zA-Z0-9_]+)(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/);
        if (!match) return fullMatch;

        const [, sigilAndName, levelSpoof, propChain] = match;
        let sigil: string, identifier: string;
        if (sigilAndName === '$.') { sigil = '$.'; identifier = ''; } 
        else { sigil = sigilAndName.charAt(0); identifier = sigilAndName.slice(1); }

        let qualityId: string | undefined;
        let contextQualities = qualities;

        if (sigil === '$.') qualityId = self?.qid;
        else if (sigil === '@') qualityId = aliases[identifier];
        else if (sigil === '$') qualityId = identifier;
        else if (sigil === '#') qualityId = identifier;

        if (!qualityId) return `[Unknown: ${fullMatch}]`;
        
        let definition = defs[qualityId];
        let state: QualityState | undefined;

        if (sigil === '$.' && self) state = self.state;
        else {
            state = contextQualities[qualityId];
            if (!state && self?.qid === qualityId) state = self.state;
        }
        
        if (!state) {
            state = { 
                qualityId, type: definition?.type || QualityType.Pyramidal, level: 0, 
                stringValue: "", changePoints: 0, sources: [], spentTowardsPrune: 0 
            } as any;
        }

        if (levelSpoof) {
            const spoofedVal = evaluateExpression(levelSpoof, qualities, defs, aliases, self, resolutionRoll, errors);
            if (typeof spoofedVal === 'number') state = { ...state, level: spoofedVal } as any;
        }

        const properties = propChain ? propChain.split('.').filter(Boolean) : [];
        let currentValue: any = state;

        if (properties.length === 0) {
            if (currentValue.type === QualityType.String) return (currentValue as any).stringValue;
            if ('level' in currentValue) return (currentValue as any).level;
            return 0;
        }

        for (const prop of properties) {
            let processed = false;
            if (typeof currentValue === 'string') {
                if (prop === 'capital') { currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1); processed = true; }
                else if (prop === 'upper') { currentValue = currentValue.toUpperCase(); processed = true; }
                else if (prop === 'lower') { currentValue = currentValue.toLowerCase(); processed = true; }
            }
            
            if (processed) continue;

            const currentQid = currentValue.qualityId || qualityId;
            const lookupId = (typeof currentValue === 'string') ? currentValue : currentQid;
            
            const currentDef = defs[lookupId];
            
            if (prop === 'name') currentValue = currentDef?.name || lookupId;
            else if (prop === 'description') currentValue = currentDef?.description || "";
            else if (prop === 'category') currentValue = currentDef?.category || "";
            else if (prop === 'plural') {
                const lvl = ('level' in state!) ? state!.level : 0;
                currentValue = (lvl !== 1) ? (currentDef?.plural_name || currentDef?.name || lookupId) : (currentDef?.singular_name || currentDef?.name || lookupId);
            }
            else if (prop === 'singular') currentValue = currentDef?.singular_name || currentDef?.name || lookupId;
            else if (currentDef?.text_variants && currentDef.text_variants[prop]) {
                currentValue = currentDef.text_variants[prop];
            }
            else if (typeof currentValue === 'object' && currentValue.customProperties && currentValue.customProperties[prop] !== undefined) {
                currentValue = currentValue.customProperties[prop];
            } else {
                currentValue = undefined;
            }

            // FIX: Recursive evaluation for properties (Russian Doll Support)
            if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
                currentValue = evaluateText(
                    currentValue, 
                    qualities, 
                    defs, 
                    // CRITICAL FIX: Pass the correct context for the child evaluation.
                    { qid: lookupId, state: (typeof currentValue === 'object' ? currentValue : state!) }, 
                    resolutionRoll,
                    aliases,
                    errors 
                );
            }
        }
        
        if (typeof currentValue === 'object' && currentValue !== null) {
            if (currentValue.type === QualityType.String) return (currentValue as any).stringValue;
            if ('level' in currentValue) return (currentValue as any).level;
        }
        return currentValue?.toString() || "";

    } catch (e: any) {
        if (errors) errors.push(`Variable Error "${fullMatch}": ${e.message}`);
        return "[VAR ERROR]";
    }
}

export function calculateChance(
    skillCheckExpr: string,
    optionalArgsStr: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[]
): number {
    if (!skillCheckExpr) return 0;
    const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|><|<>|==|!=)\s*(.*)\s*$/);
    if (!skillCheckMatch) return 0;

    const [, skillPart, operator, targetPart] = skillCheckMatch;
    const skillLevel = Number(evaluateExpression(skillPart, qualities, defs, aliases, self, resolutionRoll, errors));
    const target = Number(evaluateExpression(targetPart, qualities, defs, aliases, self, resolutionRoll, errors));

    let margin = target, minCap = 0, maxCap = 100, pivot = 60;
    
    if (optionalArgsStr) {
        const optionalArgs = optionalArgsStr.split(',').map(s => s.trim());
        let posIndex = 0;
        for (const arg of optionalArgs) {
            const namedArgMatch = arg.match(/^([a-zA-Z]+):\s*(.*)$/);
            if (namedArgMatch) {
                const [, key, valueStr] = namedArgMatch;
                const value = Number(evaluateExpression(valueStr, qualities, defs, aliases, self, resolutionRoll, errors));
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