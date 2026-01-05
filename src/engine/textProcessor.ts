// src/engine/textProcessor.ts

import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from './models';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================

export type TraceLogger = (message: string, depth: number, type?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR') => void;

type EvaluationContext = 'LOGIC' | 'TEXT';

const SEPARATORS: Record<string, string> = { 
    'comma': ', ', 'pipe': ' | ', 'newline': '\n', 'break': '<br/>', 'and': ' and ', 'space': ' ' 
};

// ==========================================
// 2. SANITIZER (Comment Stripper)
// ==========================================

/**
 * Removes blocks formatted as {// ... } before processing.
 * Respects nested braces inside comments to prevent early exit.
 */
export function sanitizeScribeScript(text: string): string {
    if (!text) return "";
    let buffer = "";
    let i = 0;
    let commentDepth = 0;

    while (i < text.length) {
        // Detect start of a Comment Block: "{" followed by "//"
        if (commentDepth === 0 && text[i] === '{' && i + 2 < text.length && text[i+1] === '/' && text[i+2] === '/') {
            commentDepth = 1;
            i += 3; 
            continue;
        }
        // While inside a comment, track depth
        if (commentDepth > 0) {
            if (text[i] === '{') commentDepth++;
            else if (text[i] === '}') commentDepth--;
            i++;
            continue;
        }
        buffer += text[i];
        i++;
    }
    return buffer;
}

// ==========================================
// 3. CORE PARSER (Entry Point)
// ==========================================

export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null = null,
    resolutionRoll: number = 0,
    aliases: Record<string, string> | null = {},
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string {
    if (!rawText) return '';
    const indent = '  '.repeat(depth);
    console.log(`${indent}[Scribe_Entry] Text: "${rawText.substring(0, 70).replace(/\n/g, "\\n")}..."`);
    if (selfContext) {
        console.log(`${indent}[Scribe_Entry] selfContext: { qid: '${selfContext.qid}' }`);
    } else {
        // Optional: Warn only if text actually contains self-reference to avoid log noise
        if (rawText.includes('$.')) {
            console.warn(`${indent}[Scribe_Entry] ⚠️ Text contains '$.' but No selfContext provided.`);
        }
    }
    // Step 1: Sanitize
    const cleanText = sanitizeScribeScript(rawText);
    const effectiveAliases = aliases || {}; 
    
    try {
        return evaluateRecursive(cleanText, 'TEXT', qualities, qualityDefs, effectiveAliases, selfContext, resolutionRoll, errors, logger, depth);
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
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string {
    let currentText = text;
    let currentBlock = ""; 
    const indent = '  '.repeat(depth);

    try {
        for (let i = 0; i < 50; i++) {
            const innermostBlockMatch = currentText.match(/\{([^{}]*?)\}/);
            if (!innermostBlockMatch) break;

            const blockWithBraces = innermostBlockMatch[0];
            const blockContent = innermostBlockMatch[1];
            currentBlock = blockWithBraces; 
            console.log(`${indent}[Scribe_Recurse] Found Block: {${blockContent}}`);

            // Log Entry
            if (logger && context === 'TEXT') {
                logger(`Eval: ${blockWithBraces}`, depth);
            }

            const resolvedValue = evaluateExpression(blockContent, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth + 1);
            const safeValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString();
                        console.log(`${indent}[Scribe_Recurse] ✅ Resolved to: "${safeValue}"`);

            // Log Result (if meaningful)
            if (logger && context === 'TEXT' && safeValue !== "") {
                 logger(`Result: "${safeValue}"`, depth, 'SUCCESS');
            }

            currentText = currentText.replace(blockWithBraces, () => safeValue);
        }

        if (context === 'LOGIC') {
            return evaluateExpression(currentText, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth).toString();
        } else {
            return currentText;
        }
    } catch (e: any) {
        if (errors) errors.push(`Recursion Error in block "${currentBlock}": ${e.message}`);
        return "[SCRIPT ERROR]";
    }
}

// ==========================================
// 4. EXPRESSION EVALUATOR
// ==========================================

function evaluateExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string | number | boolean {
    const cleanExpr = expr.replace(/\/\/.*$/gm, '').trim();
    if (!cleanExpr) return "";
        const indent = '  '.repeat(depth);

    const trimmedExpr = cleanExpr; 
    
    // 1. Alias Assignment: @alias = value
    const assignmentMatch = trimmedExpr.match(/^@([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (assignmentMatch) {
        const aliasKey = assignmentMatch[1];
        const rawValue = assignmentMatch[2];
        const resolvedValue = resolveComplexExpression(rawValue, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
        
        let storedValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString().trim();
        if (storedValue.startsWith('$')) storedValue = storedValue.substring(1);
        
        aliases[aliasKey] = storedValue;
        if (logger) logger(`@${aliasKey} assigned "${storedValue}"`, depth, 'SUCCESS');
        return ""; 
    }

    if (trimmedExpr.includes(':')) {
        return evaluateConditional(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
    }

    if (trimmedExpr.startsWith('%')) {
        return evaluateMacro(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
    }
    
    if (trimmedExpr.match(/^\d+%$/)) {
        const chance = parseInt(trimmedExpr.slice(0, -1), 10);
        return resolutionRoll < chance;
    }
    
    if (trimmedExpr.includes('|')) {
        const choices = trimmedExpr.split('|');
        const randomIndex = Math.floor(Math.random() * choices.length);
        const selected = choices[randomIndex].trim();
        if (logger) logger(`Choice: "${selected}"`, depth);
        return evaluateExpression(selected, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
    }
    
    if (trimmedExpr.match(/>>|<<|><|<>/)) {
        return calculateChance(trimmedExpr, undefined, qualities, defs, aliases, self, resolutionRoll, errors);
    }
    
    const rangeMatch = trimmedExpr.match(/^(\d+)\s*~\s*(\d+)$/);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        const res = Math.floor(Math.random() * (max - min + 1)) + min;
        if (logger) logger(`Range ${min}-${max}: Rolled ${res}`, depth);
        return res;
    }

    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
}

// ==========================================
// 5. VARIABLES & COMPLEX RESOLUTION
// ==========================================

function resolveComplexExpression(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors?: string[], 
    logger?: TraceLogger, 
    depth: number = 0
): string | number | boolean {
    const indent = '  '.repeat(depth);
    console.log(`${indent}[Scribe_Expr] Evaluating: "${expr}"`);

    try {
        // --- FIX: SMART PRE-SUBSTITUTION STRATEGY ---
        // If '$.' is followed by a property identifier, we must ensure a dot remains.
        // If it's standing alone (e.g. $. > 5), we substitute the ID directly.
        let processedExpr = expr;
        if (self && expr.includes('$.')) {
            processedExpr = processedExpr.replace(/\$\./g, (match, offset, string) => {
                const nextChar = string[offset + 2]; // The character immediately after "$."
                // If the next char starts an identifier (e.g. 'i' in $.index), append a dot.
                if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
                    return `$${self.qid}.`;
                }
                // Otherwise (space, operator, brace), return the ID alone.
                return `$${self.qid}`;
            });
            console.log(`${indent}[Scribe_Expr] Pre-substituted '$.' -> '$${self.qid}': "${processedExpr}"`);
        }
        // -------------------------------------

        const varReplacedExpr = processedExpr.replace(/((?:\$\.)|[@#\$][a-zA-Z0-9_]+)(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g, 
            (match) => { 
                const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
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

function resolveVariable(
    fullMatch: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors?: string[], 
    logger?: TraceLogger, 
    depth: number = 0
): string | number {
    const indent = '  '.repeat(depth);
    console.log(`${indent}[Scribe_Var] Resolving: "${fullMatch}"`);
    
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
            console.warn(`${indent}[Scribe_Var] ⚠️ No STATE found for '${qualityId}'. Creating ghost state.`);
            state = { 
                qualityId, type: definition?.type || QualityType.Pyramidal, level: 0, 
                stringValue: "", changePoints: 0, sources: [], spentTowardsPrune: 0 
            } as any;
        }

        if (levelSpoof) {
            const spoofedVal = evaluateExpression(levelSpoof, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
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
            // --- FIX: CRASH GUARD ---
            // If the previous iteration resulted in undefined (prop not found), stop immediately.
            // This prevents "Cannot read properties of undefined" on the next loop iteration.
            if (currentValue === undefined || currentValue === null) {
                console.warn(`${indent}[Scribe_Var] 🛑 Lookup chain broken before '.${prop}'. Returning undefined.`);
                break;
            }
            // ------------------------

            let processed = false;
            console.log(`${indent}[Scribe_Var] > Looping for property: ".${prop}"`);

            if (typeof currentValue === 'string') {
                if (prop === 'capital') { currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1); processed = true; }
                else if (prop === 'upper') { currentValue = currentValue.toUpperCase(); processed = true; }
                else if (prop === 'lower') { currentValue = currentValue.toLowerCase(); processed = true; }
            }
            if (processed) continue;
            
            // Check if currentValue is actually an object before reading .qualityId
            const currentQid = (typeof currentValue === 'object') ? (currentValue.qualityId || qualityId) : qualityId;
            const lookupId = (typeof currentValue === 'string') ? currentValue : currentQid;
            const currentDef = defs[lookupId];
            
            let foundIn: string | null = null;
            let foundValue: any = undefined;

            if (typeof state === 'object' && (state as any).text_variants && (state as any).text_variants[prop] !== undefined) {
                foundIn = 'state.text_variants';
                foundValue = (state as any).text_variants[prop];
            }
            else if (prop === 'name') { foundIn = 'builtin.name'; foundValue = currentDef?.name || lookupId; }
            else if (prop === 'description') { foundIn = 'builtin.description'; foundValue = currentDef?.description || ""; }
            else if (prop === 'category') { foundIn = 'builtin.category'; foundValue = currentDef?.category || ""; }
            else if (prop === 'plural') {
                foundIn = 'builtin.plural';
                const lvl = ('level' in state!) ? state!.level : 0;
                foundValue = (lvl !== 1) ? (currentDef?.plural_name || currentDef?.name || lookupId) : (currentDef?.singular_name || currentDef?.name || lookupId);
            }
            else if (prop === 'singular') { foundIn = 'builtin.singular'; foundValue = currentDef?.singular_name || currentDef?.name || lookupId; }
            else if (currentDef?.text_variants && currentDef.text_variants[prop]) {
                foundIn = 'definition.text_variants';
                foundValue = currentDef.text_variants[prop];
            }
            // Fallback: Check if the definition has this property directly (for custom macro props)
            else if (currentDef && (currentDef as any)[prop] !== undefined) {
                foundIn = 'definition.raw';
                foundValue = (currentDef as any)[prop];
            }

            if (foundIn) {
                currentValue = foundValue;
                console.log(`${indent}[Scribe_Var] >> ✅ Found ".${prop}" in ${foundIn}. Value:`, currentValue);
            } else {
                console.error(`${indent}[Scribe_Var] >> ❌ Property ".${prop}" NOT FOUND.`);
                currentValue = undefined;
            }

            // NESTED RECURSION
            if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
                                console.log(`${indent}[Scribe_Var] >> Recursing into property value: "${currentValue}"`);

                currentValue = evaluateText(
                    currentValue, 
                    qualities, 
                    defs, 
                    { qid: lookupId, state: (typeof currentValue === 'object' ? currentValue : state!) }, 
                    resolutionRoll,
                    aliases,
                    errors,
                    logger,
                    depth + 1
                );
            }
        }
        
        if (typeof currentValue === 'object' && currentValue !== null) {
            if (currentValue.type === QualityType.String) {
                return (currentValue as any).stringValue;
            }
            if ('level' in currentValue) {
                return (currentValue as any).level;
            }
        }
        console.log(`${indent}[Scribe_Var] ✅ Final resolved value for "${fullMatch}":`, currentValue);
        return currentValue?.toString() || "";
    } catch (e: any) {
        console.error(`${indent}[Scribe_Var] ❌ FATAL ERROR in resolveVariable for "${fullMatch}":`, e);
        if (errors) errors.push(`Variable Error "${fullMatch}": ${e.message}`);
        return "[VAR ERROR]";
    }
}

// ==========================================
// 6. LOGIC GATES & MACROS
// ==========================================

function evaluateConditional(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string {
    const branches = expr.split('|');
    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');
        
        if (colonIndex > -1) {
            const conditionStr = branch.substring(0, colonIndex).trim();
            const resultStr = branch.substring(colonIndex + 1).trim();

            const isMet = evaluateCondition(conditionStr, qualities, defs, self, resolutionRoll, aliases, errors);
            
            if (isMet) {
                if (logger) logger(`Condition [${conditionStr}] TRUE`, depth, 'INFO');
                return evaluateText(resultStr.replace(/^['"]|['"]$/g, ''), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
            } else {
                 // if (logger) logger(`Condition [${conditionStr}] FALSE`, depth); // Optional: Verbose mode
            }
        } else {
            // Default Branch
            if (logger) logger(`-> Default branch`, depth, 'INFO');
            const resultStr = branch.trim();
            return evaluateText(resultStr.replace(/^['"]|['"]$/g, ''), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
        }
    }
    return "";
}

function evaluateMacro(
    macroString: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
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

    // Helper for recursion in macros
    const evalArg = (s: string) => evaluateExpression(s, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth + 1);
    
    switch (command.toLowerCase()) {
        case "random": {
            const chance = Number(evalArg(mainArg));
            const isInverted = optArgs.includes('invert');
            if (isNaN(chance)) return false;
            return isInverted ? !(resolutionRoll < chance) : (resolutionRoll < chance);
        }
        case "choice": {
            const choices = fullArgs.split(';').map(s => s.trim()).filter(Boolean); 
            if (choices.length === 0) return "";
            const selected = choices[Math.floor(Math.random() * choices.length)];
            return evalArg(selected);
        }
        case "chance": return calculateChance(mainArg, rawOptStr, qualities, defs, aliases, self, resolutionRoll, errors);
        case "pick": {
            const countExpr = optArgs[0] || "1";
            const count = Math.max(1, parseInt(evaluateText(`{${countExpr}}`, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth) as string) || 1);
            const candidates = getCandidateIds(mainArg, optArgs[1], qualities, defs, resolutionRoll, aliases, errors, logger, depth);
            if (candidates.length === 0) return "nothing";
            const result = candidates.sort(() => 0.5 - Math.random()).slice(0, count).join(', ');
            if (logger) logger(`Picked: [${result}]`, depth);
            return result;
        }
        case "roll": {
            const candidates = getCandidateIds(mainArg, optArgs[0], qualities, defs, resolutionRoll, aliases, errors, logger, depth);
            const pool: string[] = [];
            candidates.forEach(qid => {
                const q = qualities[qid];
                if (q && 'level' in q && q.level > 0) {
                    const tickets = Math.min(q.level, 100); 
                    for(let i=0; i<tickets; i++) pool.push(qid);
                }
            });
            if (pool.length === 0) return "nothing";
            const res = pool[Math.floor(Math.random() * pool.length)];
            if (logger) logger(`Rolled: [${res}]`, depth);
            return res;
        }
        case "list": {
            const sepArg = optArgs[0]?.toLowerCase() || 'comma';
            const separator = SEPARATORS[sepArg] || optArgs[0] || ', ';
            const candidates = getCandidateIds(mainArg, optArgs[1] || '>0', qualities, defs, resolutionRoll, aliases, errors, logger, depth);
            const names = candidates.map(qid => {
                const def = defs[qid];
                return evaluateText(def.name || qid, qualities, defs, { qid, state: qualities[qid] }, resolutionRoll, aliases, errors, logger, depth + 1);
            });
            if (names.length === 0) return "nothing";
            return names.join(separator);
        }
        case "count": {
            const candidates = getCandidateIds(mainArg, optArgs[0], qualities, defs, resolutionRoll, aliases, errors, logger, depth);
            return candidates.length;
        }
        case "schedule": case "reset": case "update": case "cancel": case "all": return macroString; 
        default: return `[Unknown Macro: ${command}]`;
    }
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

// ==========================================
// 7. UTILS
// ==========================================

function getCandidateIds(
    rawCategoryArg: string,
    rawFilterArg: string | undefined,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    resolutionRoll: number,
    aliases: Record<string, string>,
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0
): string[] {
    const targetCat = evaluateText(
        rawCategoryArg.startsWith('{') ? rawCategoryArg : `{${rawCategoryArg}}`, 
        qualities, defs, null, resolutionRoll, aliases, errors, logger, depth
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