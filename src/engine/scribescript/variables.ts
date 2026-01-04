// src/engine/scribescript/variables.ts
import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from '../models';
import { ScribeEvaluator, TraceLogger } from './types';

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
    try {
        const varReplacedExpr = expr.replace(/((?:\$\.)|[@#\$][a-zA-Z0-9_]+)(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g, 
            (match) => { 
                const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
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

        if (!qualityId) {
            if (logger) logger(`[WARN] Unknown identifier "${fullMatch}"`, depth, 'WARN');
            return 0; 
        }
        
        let definition = defs[qualityId];
        let state: QualityState | undefined;

        if (sigil === '$.' && self) state = self.state;
        else {
            state = contextQualities[qualityId];
            if (!state && self?.qid === qualityId) state = self.state;
        }
        
        // Auto-create state shim if missing but definition exists (for static lookups)
        if (!state) {
            if (definition) {
                state = { 
                    qualityId, type: definition.type || QualityType.Pyramidal, level: 0, 
                    stringValue: "", changePoints: 0, sources: [], spentTowardsPrune: 0 
                } as any;
            } else {
                if (logger) logger(`[WARN] Variable "${qualityId}" not defined.`, depth, 'WARN');
                return 0; 
            }
        }

        if (levelSpoof) {
            const spoofedVal = evaluator(
                levelSpoof, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth
            );
            if (typeof spoofedVal === 'number' || !isNaN(Number(spoofedVal))) {
                 state = { ...state, level: Number(spoofedVal) } as any;
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
            let processed = false;
            
            // 1. String Helpers
            if (typeof currentValue === 'string') {
                if (prop === 'capital') { currentValue = currentValue.charAt(0).toUpperCase() + currentValue.slice(1); processed = true; }
                else if (prop === 'upper') { currentValue = currentValue.toUpperCase(); processed = true; }
                else if (prop === 'lower') { currentValue = currentValue.toLowerCase(); processed = true; }
            }
            if (processed) continue;

            // 2. Resolve Definition for the *current* value
            const currentQid = (currentValue && typeof currentValue === 'object' && currentValue.qualityId) ? currentValue.qualityId : qualityId;
            const lookupId = (typeof currentValue === 'string') ? currentValue : currentQid;
            const currentDef = defs[lookupId];
            
            // 3. Metadata Properties
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
            // 4. Custom Properties on STATE (Priority)
            else if (typeof currentValue === 'object' && currentValue.customProperties && currentValue.customProperties[prop] !== undefined) {
                currentValue = currentValue.customProperties[prop];
            } 
            // 5. Custom Properties on DEFINITION (Fallback - THE FIX for $.index)
            // This ensures that static properties defined in the quality template are accessible
            else if (currentDef && (currentDef as any)[prop] !== undefined) {
                currentValue = (currentDef as any)[prop];
            }
            else {
                currentValue = undefined;
            }

            // 6. Recursion (Resolve {nested} in the value we just found)
            if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
                currentValue = evaluator(
                    currentValue, 
                    qualities, 
                    defs, 
                    // Update context to the item we just resolved
                    { qid: lookupId, state: (typeof currentValue === 'object' ? currentValue : qualities[lookupId] || { qualityId: lookupId, type: QualityType.Pyramidal, level: 0 } as any) }, 
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