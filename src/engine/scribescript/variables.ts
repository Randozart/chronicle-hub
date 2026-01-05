// src/engine/scribescript/variables.ts
import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from '../models';
import { ScribeEvaluator, TraceLogger } from './types';

// Improved Regex:
// 1. Matches $. (Self) OR
// 2. Matches @, #, $ followed by either a name OR a dynamic {...} block
// 3. Optional [...] brackets
// 4. Optional .prop.chain
const VARIABLE_REGEX = /((?:\$\.)|[@#\$](?:\{.*?\}|[a-zA-Z0-9_]+))(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g;

export function resolveComplexExpression(
    expr: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors: string[] | undefined, 
    logger: TraceLogger | undefined, 
    depth: number,
    evaluator: ScribeEvaluator // Injected
): string | number | boolean {
    const indent = '  '.repeat(depth);
    if (logger) logger(`Expr: "${expr}"`, depth, 'INFO');

    try {
        const varReplacedExpr = expr.replace(VARIABLE_REGEX, (match) => { 
            const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
            
            // If resolved is a string, quote it for eval, unless it looks like a number
            if (typeof resolved === 'string') {
                // Check if it's a clean number disguised as string
                if (!isNaN(Number(resolved)) && resolved.trim() !== "") {
                    return resolved;
                }
                return `"${resolved}"`;
            }
            return resolved.toString();
        });

        // Optimization: If the result is just a simple string/number, return it without eval
        if (/^[a-zA-Z0-9_]+$/.test(varReplacedExpr.trim())) return varReplacedExpr.trim();
        if (!isNaN(Number(varReplacedExpr))) return Number(varReplacedExpr);

        return safeEval(varReplacedExpr);
    } catch (e: any) {
        if (errors) errors.push(`Expression Error "${expr}": ${e.message}`);
        return `[ERROR: ${expr}]`;
    }
}

export function resolveVariable(
    fullMatch: string, 
    qualities: PlayerQualities, 
    defs: Record<string, QualityDefinition>, 
    aliases: Record<string, string>, 
    self: { qid: string, state: QualityState } | null, 
    resolutionRoll: number, 
    errors: string[] | undefined, 
    logger: TraceLogger | undefined, 
    depth: number,
    evaluator: ScribeEvaluator // Injected
): string | number {
    const indent = '  '.repeat(depth);
    
    try {
        // Re-parse the specific match to extract parts.
        // We reuse the logic but anchor it to the start/end of the string.
        const parserRegex = /^((?:\$\.)|[@#\$](?:\{.*?\}|[a-zA-Z0-9_]+))(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/;
        const match = fullMatch.match(parserRegex);
        
        if (!match) return fullMatch;

        const [, sigilAndName, levelSpoof, propChain] = match;
        
        let sigil: string;
        let identifier: string;

        // Handle "Self" token explicitly
        if (sigilAndName === '$.') {
            sigil = '$.';
            identifier = ''; // Identifier is implied as self
        } else {
            sigil = sigilAndName.charAt(0);
            identifier = sigilAndName.slice(1);
        }

        // Handle Dynamic Variable Names: e.g. ${$prefix}_name
        if (identifier.startsWith('{')) {
            identifier = evaluator(identifier, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
        }

        let qualityId: string | undefined;
        let contextQualities = qualities;

        if (sigil === '$.') qualityId = self?.qid;
        else if (sigil === '@') qualityId = aliases[identifier];
        else if (sigil === '$') qualityId = identifier;
        else if (sigil === '#') qualityId = identifier;

        if (!qualityId) {
            // If we are looking for self ($.), but no self exists, return 0 or error
            if (sigil === '$.') return 0;
            return `[Unknown: ${fullMatch}]`;
        }
        
        let definition = defs[qualityId];
        let state: QualityState | undefined;

        // Context Resolution
        if (sigil === '$.' && self) {
            state = self.state;
        } else {
            state = qualities[qualityId];
            // Fallback: If not in qualities, check if it IS self (e.g. accessed via $name instead of $.)
            if (!state && self?.qid === qualityId) state = self.state;
        }
        
        // Ghost State Creation (if variable doesn't exist yet)
        if (!state) {
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

        // Level Spoofing logic [50]
        if (levelSpoof) {
            const spoofedVal = evaluator(
                `{${levelSpoof}}`, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1
            );
            if (!isNaN(Number(spoofedVal))) {
                 state = { ...state, level: Number(spoofedVal) } as any;
            }
        }

        // --- PROPERTY ACCESS CHAIN ---
        const properties = propChain ? propChain.split('.').filter(Boolean) : [];
        let currentValue: any = state;

        // Short-circuit: If no properties, return primary value
        if (properties.length === 0) {
            if (currentValue.type === QualityType.String) return (currentValue as any).stringValue;
            if ('level' in currentValue) return (currentValue as any).level;
            return 0;
        }

        for (const prop of properties) {
            // Case Handling (Formatters) - Must be at end of chain strings
            if (typeof currentValue === 'string') {
                if (prop === 'capital') { currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1); continue; }
                if (prop === 'upper') { currentValue = currentValue.toUpperCase(); continue; }
                if (prop === 'lower') { currentValue = currentValue.toLowerCase(); continue; }
            }

            const currentQid = (currentValue && typeof currentValue === 'object' && currentValue.qualityId) ? currentValue.qualityId : qualityId;
            const lookupId = (typeof currentValue === 'string') ? currentValue : currentQid;
            const currentDef = defs[lookupId];
            
            let found = false;
            let foundValue: any = undefined;

            // 1. Dynamic Properties (from %new macro or text_variants on state)
            if (typeof currentValue === 'object' && (currentValue as any).text_variants && (currentValue as any).text_variants[prop] !== undefined) {
                foundValue = (currentValue as any).text_variants[prop];
                found = true;
            }
            // 2. Definition Properties (text_variants on definition)
            else if (!found && currentDef?.text_variants && currentDef.text_variants[prop] !== undefined) {
                foundValue = currentDef.text_variants[prop];
                found = true;
            }
            // 3. Built-in Properties
            else if (prop === 'name') { foundValue = currentDef?.name || lookupId; found = true; }
            else if (prop === 'description') { foundValue = currentDef?.description || ""; found = true; }
            else if (prop === 'category') { foundValue = currentDef?.category || ""; found = true; }
            else if (prop === 'level') { 
                foundValue = ('level' in (currentValue as any)) ? (currentValue as any).level : 0; 
                found = true; 
            }
            else if (prop === 'plural') {
                const lvl = ('level' in state!) ? state!.level : 0;
                foundValue = (lvl !== 1) ? (currentDef?.plural_name || currentDef?.name || lookupId) : (currentDef?.singular_name || currentDef?.name || lookupId);
                found = true;
            }
            else if (prop === 'singular') { 
                foundValue = currentDef?.singular_name || currentDef?.name || lookupId; 
                found = true; 
            }
            // 4. Raw Definition Property Fallback (e.g. .index)
            else if (!found && currentDef && (currentDef as any)[prop] !== undefined) {
                foundValue = (currentDef as any)[prop];
                found = true;
            }

            if (found) {
                currentValue = foundValue;
            } else {
                // Property not found
                if (logger) logger(`[WARN] Property .${prop} not found on ${lookupId}`, depth, 'WARN');
                currentValue = undefined;
            }

            // Recursive Resolution for Property Values (e.g. if .name contains ScribeScript)
            if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
                currentValue = evaluator(
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
        
        // Final Unwrapping
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