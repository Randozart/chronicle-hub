// src/engine/textProcessor.ts

import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from './models';
import { ScribeEvaluator } from './scribescript/types';

export type TraceLogger = (message: string, depth: number, type?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR') => void;

type EvaluationContext = 'LOGIC' | 'TEXT';

const SEPARATORS: Record<string, string> = { 
    'comma': ', ', 'pipe': ' | ', 'newline': '\n', 'break': '<br/>', 'and': ' and ', 'space': ' ' 
};

const VARIABLE_REGEX = /((?<!\\)[@#\$](?:\{.*?\}|[a-zA-Z0-9_]+|\(.*?\))|(?<!\\)\$\.)(?:\[([\s\S]*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g;

/**
 * Removes `{ // comments }` from ScribeScript strings
 * to prevent them from interfering with parsing logic.
 * 
 * @param text The raw ScribeScript string.
 * @returns The sanitized string with comments removed.
 */
export function sanitizeScribeScript(text: string): string {
    if (!text) return "";
    let buffer = "";
    let i = 0;
    let commentDepth = 0;

    while (i < text.length) {
        if (commentDepth === 0 && text[i] === '{' && i + 2 < text.length && text[i+1] === '/' && text[i+2] === '/') {
            commentDepth = 1;
            i += 3; 
            continue;
        }
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

/**
 * The main method to evaluate ScribeScript text blocks.
 * It first sanitizes the input, then recursively processes it using `evaluateRecursive()`.
 * 
 * @param rawText The text containing ScribeScript syntax.
 * @param qualities The current player qualities.
 * @param qualityDefs The static definitions of those qualities.
 * @param selfContext (Optional) Context for self `$.` references.
 * @param resolutionRoll (Optional) A challenge roll that might affect evaluation.
 * @param aliases (Optional) Temporary variable aliases map.
 * @param errors (Optional) Array to push error messages to.
 * @param logger (Optional) Trace logger for debugging.
 * @param depth Internal recursion depth for console logging.
 * @param locals (Optional) Local variables used exclusively for certain fields, like `target` in chance calculations.
 */
export function evaluateText(
    rawText: string | undefined,
    qualities: PlayerQualities,
    qualityDefs: Record<string, QualityDefinition>,
    selfContext: { qid: string, state: QualityState } | null = null,
    resolutionRoll: number = 0,
    aliases: Record<string, string> | null = {},
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0,
    locals?: Record<string, number | string> 
): string {
    if (!rawText) return '';
    if (selfContext && depth === 0) {

    } else {
        if (rawText.includes('$.')) {
        }
    }
    const cleanText = sanitizeScribeScript(rawText);
    const effectiveAliases = aliases || {}; 
    
    try {
        return evaluateRecursive(cleanText, 'TEXT', qualities, qualityDefs, effectiveAliases, selfContext, resolutionRoll, errors, logger, depth, locals);
    } catch (e: any) {
        const msg = `Fatal Parser Error: ${e.message}`;
        console.error(msg);
        if (errors) errors.push(msg);
        return `[ERROR: ${e.message}]`;
    }
}

/**
 * Handles nested ScribeScript blocks like `{{$a} + {$b}}` by resolving
 * the innermost braces first and working outward.
 * Contains a safety break to prevent infinite recursion loops.
 */
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
    depth: number = 0,
    locals?: Record<string, number | string>
): string {
    let currentText = text;
    let currentBlock = ""; 

    try {
        for (let i = 0; i < 500; i++) {
            const innermostBlockMatch = currentText.match(/\{([^{}]*?)\}/);
            if (!innermostBlockMatch) break;

            const blockWithBraces = innermostBlockMatch[0];
            const blockContent = innermostBlockMatch[1];
            currentBlock = blockWithBraces; 
            
            if (logger && context === 'TEXT') {
                logger(`Eval: ${blockWithBraces}`, depth);
            }

            const resolvedValue = evaluateExpression(blockContent, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth + 1, locals);
            
            const safeValue = (resolvedValue === undefined || resolvedValue === null) ? "" : resolvedValue.toString().trim();
            
            if (logger && context === 'TEXT' && safeValue !== "") {
                 logger(`Result: "${safeValue}"`, depth, 'SUCCESS');
            }

            currentText = currentText.replace(blockWithBraces, () => safeValue);
        }

        if (context === 'LOGIC') {
            return evaluateExpression(currentText, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, locals).toString();        
        } else {
            return currentText;
        }
    } catch (e: any) {
        if (errors) errors.push(`Recursion Error in block "${currentBlock}": ${e.message}`);
        return "[SCRIPT ERROR]";
    }
}

/**
 * Determines the type of expression inside a brace block `{...}` and routes
 * it to the appropriate handler (Macro, Conditional, Assignment, or Math).
 * 
 * @returns The resolved string, number, or boolean value of the expression.
 */
function evaluateExpression(
    expr: string,
    qualities: PlayerQualities,
    defs: Record<string, QualityDefinition>,
    aliases: Record<string, string>,
    self: { qid: string, state: QualityState } | null,
    resolutionRoll: number,
    errors?: string[],
    logger?: TraceLogger,
    depth: number = 0,
    locals?: Record<string, number | string>
): string | number | boolean {
    const cleanExpr = expr.replace(/\/\/.*$/gm, '').trim();
    if (!cleanExpr) return "";
    let trimmedExpr = cleanExpr; 
    
    if (locals) {
        const localKeys = Object.keys(locals).sort((a, b) => b.length - a.length);
        
        for (const key of localKeys) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            if (regex.test(trimmedExpr)) {
                const val = locals[key];
                trimmedExpr = trimmedExpr.replace(regex, String(val));
                if (logger && depth < 2) logger(`Local '${key}' -> ${val}`, depth, 'INFO');
            }
        }
    }
    const assignmentMatch = trimmedExpr.match(/^@([a-zA-Z0-9_]+)\s*=(?!=)\s*(.*)$/);
    if (assignmentMatch) {
        const aliasKey = assignmentMatch[1];
        const rawValue = assignmentMatch[2];
        
        const resolvedValue = resolveComplexExpression(rawValue, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
        
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

    return resolveComplexExpression(trimmedExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
}

/**
 * Resolves variables within a string and executes the result as a mathematical expression using safeEval.
 * 
 * **Sigil Rules:**
 * - Variables **must** be prefixed with `$` (Quality), `#` (World), or `@` (Alias).
 * - Text *without* a sigil is treated as a raw string literal.
 *   (e.g., `$strength + 5` becomes `15`, but `strength + 5` becomes `"strength + 5"`).
 * 
 * **Context:**
 * - Used for calculating values (Right-Hand Side), conditions, and text interpolation.
 * - Can recognize self-references using `$.` syntax.
 */
function resolveComplexExpression(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors: string[] | undefined, 
    logger: TraceLogger | undefined, 
    depth: number = 0,
    evaluator: ScribeEvaluator
): string | number | boolean {
    if(depth < 2 && logger) logger(`Expr: "${expr}"`, depth);

    // DEPRECATED: $(...) syntax. 
    // Superseded by Property Chaining in resolveVariable.
    // Keeping for backward compatibility with legacy world data.
    let expandedExpr = expr;
    if (expandedExpr.includes('$(')) {
        expandedExpr = expandedExpr.replace(/\$\(([^)]+)\)/g, (match, innerLogic) => {
            // Recursively resolve the logic inside the parentheses
            const resolvedId = resolveComplexExpression(
                innerLogic, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth + 1, evaluator
            );
            // Clean up the result to be a valid ID
            const cleanId = resolvedId.toString().replace(/['"]/g, '').trim();
            // Prepend $ to make it a valid sigil for the next pass
            return `$${cleanId}`;
        });
    }

    // If expression is a single variable, skip eval wrapping
    const simpleVarPattern = /^((?:\$\.)|[@#\$](?:[a-zA-Z0-9_]+|\{.*?\}|\(.*?\)))(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/;
    if (simpleVarPattern.test(expr.trim())) {
         const result = resolveVariable(expr.trim(), qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
         return result;
    }

    try {
        // Handle self-references ($.) by replacing them with the actual quality ID
        // Maintains level spoofing if applicable, e.g., `$.level` -> `$qualityId[level]`
        // This was the source of an earlier bug where spoofed levels were not applied correctly
        let processedExpr = expr;
        
        if (self && expr.includes('$.')) {
            const level = (self.state && 'level' in self.state) ? self.state.level : 0;
            const spoofedId = `$${self.qid}[${level}]`;

            processedExpr = processedExpr.replace(/\$\.(.?)/g, (match, nextChar) => {
                if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
                    return `${spoofedId}.${nextChar}`;
                }
                return `${spoofedId}${nextChar}`;
            });
        }
        
        const varReplacedExpr = processedExpr.replace(VARIABLE_REGEX, (match) => { 
                const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
                
                if (typeof resolved === 'string') {
                    // Pass pure numbers through
                    if (!isNaN(Number(resolved)) && resolved.trim() !== "") {
                        return resolved;
                    }
                    
                    // Escape quotes/newlines for safeEval
                    const safeStr = resolved
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '');
                    
                    return `"${safeStr}"`;
                }
                return resolved.toString();
            }
        );

        if (/^[a-zA-Z0-9_]+$/.test(varReplacedExpr.trim())) return varReplacedExpr.trim();
        if (!isNaN(Number(varReplacedExpr))) return Number(varReplacedExpr);

        return safeEval(varReplacedExpr);
    } catch (e: any) {
        if (errors) errors.push(`Expression Error "${expr}": ${e.message}`);
        return `[ERROR: ${expr}]`;
    }
}

/**
 * Converts a ScribeScript variable token (like `$strength`, 
 * `$inventory.main_hand`, or `$.level`) into its actual value from the game state.
 * 
 * Handles property access (such as `.name`, `.plural`) and recursive text evaluation 
 * if the found value contains script.
 */
function resolveVariable(
    fullMatch: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors: string[] | undefined, 
    logger: TraceLogger | undefined, 
    depth: number = 0,
    evaluator?: ScribeEvaluator 
): string | number {    
    try {
        const match = fullMatch.match(/^((?:\$\.)|[@#\$](?:[a-zA-Z0-9_]+|\{.*?\}|\(.*?\)))(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/);
        if (!match) return fullMatch;

        const [, sigilAndName, levelSpoof, propChain] = match;
        let sigil: string, identifier: string;
        
        if (sigilAndName === '$.') { 
            sigil = '$.'; identifier = ''; 
        } else { 
            sigil = sigilAndName.charAt(0); 
            identifier = sigilAndName.slice(1); 
        }
        if (identifier.startsWith('{')) {
            const resolvedId = evaluateText(identifier, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
            identifier = resolvedId.toString().replace(/^['"]|['"]$/g, '').trim();
        } 
        else if (identifier.startsWith('(')) {
            const inner = identifier.slice(1, -1);
            const resolvedId = evaluateText(inner, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
            identifier = resolvedId.toString().replace(/^['"]|['"]$/g, '').trim();
        }
        let qualityId: string | undefined;
        let contextQualities = qualities;

        if (sigil === '$.') qualityId = self?.qid; 
        else if (sigil === '@') {
            const aliasValue = aliases[identifier];
            
            // If there is no property chain (.prop), return the alias value literally
            // Important for aliases used for storing string values
            if (!propChain || propChain === "") {
                return aliasValue || 0;
            }
            
            qualityId = aliasValue;
        }
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
            if(logger) logger(`Expr: "${levelSpoof}"`, depth);
            const spoofedValRaw = evaluateExpression(levelSpoof, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth);
            const spoofedVal = Number(spoofedValRaw);
            
            if (!isNaN(spoofedVal)) {
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
            if (currentValue === undefined || currentValue === null) break;

            let processed = false;
            if (typeof currentValue === 'string') {
                if (prop === 'capital') { currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1); processed = true; }
                else if (prop === 'upper') { currentValue = currentValue.toUpperCase(); processed = true; }
                else if (prop === 'lower') { currentValue = currentValue.toLowerCase(); processed = true; }
            }
            if (processed) continue;
            
            const currentQid = (typeof currentValue === 'object') ? (currentValue.qualityId || qualityId) : qualityId;
            // The ID helps iterate over properties, to make property chains possible
            const lookupId = (typeof currentValue === 'string') ? currentValue : currentQid;
            const currentDef = defs[lookupId];
            
            let foundIn: string | null = null;
            let foundValue: any = undefined;

            if (typeof state === 'object' && (state as any).text_variants && (state as any).text_variants[prop] !== undefined) {
                foundValue = (state as any).text_variants[prop];
                foundIn = 'state';
            }
            else if (prop === 'name') { foundValue = currentDef?.name || lookupId; foundIn = 'def'; }
            else if (prop === 'description') { foundValue = currentDef?.description || ""; foundIn = 'def'; }
            else if (prop === 'category') { foundValue = currentDef?.category || ""; foundIn = 'def'; }
            else if (prop === 'plural') {
                const lvl = ('level' in state!) ? state!.level : 0;
                foundValue = (lvl !== 1) ? (currentDef?.plural_name || currentDef?.name || lookupId) : (currentDef?.singular_name || currentDef?.name || lookupId);
                foundIn = 'def';
            }
            else if (prop === 'singular') { foundValue = currentDef?.singular_name || currentDef?.name || lookupId; foundIn = 'def'; }
            else if (currentDef?.text_variants && currentDef.text_variants[prop]) {
                foundValue = currentDef.text_variants[prop];
                foundIn = 'def';
            }
            else if (currentDef && (currentDef as any)[prop] !== undefined) {
                foundValue = (currentDef as any)[prop];
                foundIn = 'def';
            }

            if (foundIn) {
                currentValue = foundValue;
            } else {
                currentValue = undefined;
            }

            if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
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
            if (currentValue.type === QualityType.String) return (currentValue as any).stringValue;
            if ('level' in currentValue) return (currentValue as any).level;
        }
        return currentValue?.toString() || "";
    } catch (e: any) {
        if (errors) errors.push(`Variable Error "${fullMatch}": ${e.message}`);
        return "[VAR ERROR]";
    }
}

/**
 * Evaluates conditional logic in the format `{ condition : result | else_result }`.
 * Supports chaining multiple branches via pipes `|`.
 */
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

    const branches = splitByPipe(expr);
    
    for (const branch of branches) {
        const colonIndex = branch.indexOf(':');
        
        if (colonIndex > -1) {
            // This is an "If" or "Else If" branch
            const conditionStr = branch.substring(0, colonIndex).trim();
            
            const isMet = evaluateCondition(conditionStr, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth);
            
            if (isMet) {
                if (logger) logger(`Condition [${conditionStr}] TRUE`, depth, 'SUCCESS');
                
                // Extract the result text
                let resultStr = branch.substring(colonIndex + 1).trim();
                
                // Clean up quotes and .trim() again to prevent indentation bugs
                const cleanedResult = resultStr.replace(/^['"]|['"]$/g, '').trim();
                
                return evaluateText(cleanedResult, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
            }
            // If condition is NOT met, the loop continues to the next branch (|)
        } else {
            // This is the "Else" or "Default" branch because it has no colon
            if (logger) logger(`-> Default branch`, depth, 'INFO');
            
            // Clean up quotes and .trim() again to prevent indentation bugs
            const cleanedResult = branch.trim().replace(/^['"]|['"]$/g, '').trim();
            
            return evaluateText(cleanedResult, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
        }
    }
    
    return ""; // Should only reach here if no branches match and no default exists
}

// Helper function to cleanly split pipes that are only relevant to the current depth.
function splitByPipe(str: string): string[] {
    const result: string[] = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') depth++;
        if (str[i] === '}') depth--;
        if (str[i] === '|' && depth === 0) {
            result.push(current.trim());
            current = "";
        } else {
            current += str[i];
        }
    }
    if (current) result.push(current.trim());
    return result;
}

/**
 * Executes built-in ScribeScript macros starting with `%`.
 * Handlers include:
 * - `%random`: Boolean probability check. Returns `true/false`.
 * - `%choice`: Picks one option from a comma-seperated list provided as arguments in brackets `[]`. Returns the selected option.
 * - `%chance`: Skill check probability calculator. Explicit macro for challenge checks. Calls `calculateChance()` and returns the result.
 * - `%roll`: Rolls on a quality-based pool. Returns the selected quality ID.
 * - `%chance`: Calculates skill check probabilities.
 * - `%list`: Generates a list of quality names based on criteria. Returns a string of names.
 * - `%count`: Counts qualities matching criteria. Returns a number.
 * - `%pick`: Randomly selects one or more quality IDs based on criteria. Returns a comma-separated string of IDs without evaluating their names.
 * 
 * Will return the original macro string if unrecognized, since some macros are handled elsewhere (like scheduling).
 */
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

/**
 * Evaluates a logical condition string to a boolean.
 * Supports comparison operators (>, <, ==, !=, >=, <=) and logical operators (&&, ||, !).
 * 
 * @param expression The condition string, such as `$strength > 10`.
 */
export function evaluateCondition(
    expression: string | undefined, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition> = {}, 
    self: { qid: string, state: QualityState } | null = null, 
    resolutionRoll: number = 0, 
    aliases: Record<string, string> = {}, 
    errors?: string[],
    logger?: TraceLogger,      
    depth: number = 0          
): boolean {
    if (!expression) return true;
    const trimExpr = expression.trim();
    try {
        if (trimExpr.startsWith('(') && trimExpr.endsWith(')')) {
            // Only strip parens if they wrap the WHOLE string, not just (a) && (b)
            // We use our new helper to check if there is a top-level split first.
            const opMatch = findBinaryOperator(trimExpr);
            // If no operator found at depth 0, it means the parens are wrapping the whole thing
            if (!opMatch && !trimExpr.includes('||') && !trimExpr.includes('&&')) {
                return evaluateCondition(trimExpr.slice(1, -1), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth);
            }
        }
        
        if (trimExpr.includes('||')) return trimExpr.split('||').some(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth));
        if (trimExpr.includes('&&')) return trimExpr.split('&&').every(part => evaluateCondition(part, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth));
        if (trimExpr.startsWith('!')) return !evaluateCondition(trimExpr.slice(1), qualities, defs, self, resolutionRoll, aliases, errors, logger, depth);

        const opData = findBinaryOperator(trimExpr);
        
        if (!opData) {
            const val = resolveComplexExpression(trimExpr, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
            return val === 'true' || val === true || Number(val) > 0;
        }
        
        const { operator, index } = opData;
        
        let leftRaw = trimExpr.substring(0, index).trim();
        if (leftRaw === '' && self) leftRaw = '$.';

        const leftVal = resolveComplexExpression(leftRaw, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);
        const rightVal = resolveComplexExpression(trimExpr.substring(index + operator.length).trim(), qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluateText);

        if (operator === '==' || operator === '=' || operator === '!=') {
            const cleanLeft = String(leftVal).replace(/^['"]|['"]$/g, '').trim();
            const cleanRight = String(rightVal).replace(/^['"]|['"]$/g, '').trim();
            let isEqual = (cleanLeft === cleanRight);

            if (!isEqual) {
                const lNum = Number(cleanLeft);
                const rNum = Number(cleanRight);
                if (!isNaN(lNum) && !isNaN(rNum)) isEqual = (lNum === rNum);
            }
            if (operator === '!=') return !isEqual;
            return isEqual;
        }
        
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

// Helper to find the comparison operator at the top level ignoring parentheses
function findBinaryOperator(str: string): { operator: string, index: number } | null {
    let depth = 0;
    let inQuote = false;
    let quoteChar = '';

    // Operators to look for. Order matters (longest first to match >= before >)
    const operators = ['==', '!=', '>=', '<=', '>', '<', '='];

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        // Handle Quotes
        if (inQuote) {
            if (char === quoteChar) inQuote = false;
            continue;
        }
        if (char === '"' || char === "'") {
            inQuote = true;
            quoteChar = char;
            continue;
        }

        // Handle Parentheses/Brackets
        if (char === '(' || char === '[' || char === '{') {
            depth++;
            continue;
        }
        if (char === ')' || char === ']' || char === '}') {
            depth--;
            continue;
        }

        // Check for Operators at Depth 0
        if (depth === 0) {
            // Special handling for bitwise confusion (>> vs > and << vs <)
            const nextChar = str[i + 1];
            const prevChar = str[i - 1];

            // If we see < or >, ensure it's not part of << or >>
            if (char === '>' && (nextChar === '>' || prevChar === '>')) continue;
            if (char === '<' && (nextChar === '<' || prevChar === '<')) continue;

            // Check against our list
            for (const op of operators) {
                if (str.startsWith(op, i)) {
                    // Ensure we haven't matched the first part of a longer operator (e.g. matching > in >=)
                    // The 'operators' array is sorted, but checking = vs == requires care.
                    // Since '==' comes before '=', startsWith finds the longest match first.
                    return { operator: op, index: i };
                }
            }
        }
    }
    return null;
}

/**
 * Helper function that scans quality definitions to find IDs that match
 * a specific Category (and optional filter condition).
 * 
 * Used by macros like `%list` and `%pick`.
 */
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

/**
 * Calculates the percentage chance of success for a skill check
 * based on the chosen difficulty curve.
 * 
 * Syntax: `quality >> target` (bigger number is better) or `number >< target` (number most be as close as possible to target).
 */
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

/**
 * Helper for UI tooltips. Parses a challenge string to return the 
 * probability percentage and a human-readable label.
 */
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

