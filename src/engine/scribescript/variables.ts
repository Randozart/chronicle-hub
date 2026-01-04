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
    evaluator: ScribeEvaluator
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
    evaluator: ScribeEvaluator
): string | number {
    try {
        // FIX: Modified Regex to allow a {...} block as part of an identifier
        const match = fullMatch.match(/^((?:\$\.)|[@#\$](?:[a-zA-Z0-9_]+|\{.*?\}))(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/);
        if (!match) return fullMatch;

        const [, sigilAndName, levelSpoof, propChain] = match;
        let sigil: string, identifier: string;
        if (sigilAndName === '$.') { sigil = '$.'; identifier = ''; } 
        else { sigil = sigilAndName.charAt(0); identifier = sigilAndName.slice(1); }

        // FIX: If the identifier is a dynamic block, resolve it first.
        if (identifier.startsWith('{')) {
            identifier = evaluator(identifier, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1);
        }

        let qualityId: string | undefined;

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
            state = qualities[qualityId];
            if (!state && self?.qid === qualityId) state = self.state;
        }
        
        if (!state) {
            if (definition) {
                state = { 
                    qualityId, type: definition.type || QualityType.Pyramidal, level: 0, 
                    stringValue: "", changePoints: 0
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
            const currentQid = (currentValue && typeof currentValue === 'object' && currentValue.qualityId) ? currentValue.qualityId : qualityId;
            const lookupId = (typeof currentValue === 'string') ? currentValue : currentQid;
            const currentDef = defs[lookupId];
            
            let found = false;

            // CRITICAL FIX: The state object now has `text_variants`, check it first.
            if (typeof currentValue === 'object' && (currentValue as any).text_variants && (currentValue as any).text_variants[prop] !== undefined) {
                currentValue = (currentValue as any).text_variants[prop];
                found = true;
            }
            // Fallback to the definition (for non-dynamic qualities)
            else if (!found && currentDef?.text_variants && currentDef.text_variants[prop] !== undefined) {
                currentValue = currentDef.text_variants[prop];
                found = true;
            }
            // Fallback for top-level properties like .name or macro-injected .index
            else if (!found && currentDef && (currentDef as any)[prop] !== undefined) {
                currentValue = (currentDef as any)[prop];
                found = true;
            }

            if (!found) {
                currentValue = undefined;
            }

            // RECURSION for expressions within properties
            if (typeof currentValue === 'string' && (currentValue.includes('{') || currentValue.includes('$'))) {
                currentValue = evaluator(
                    currentValue, 
                    qualities, 
                    defs, 
                    { qid: lookupId, state: (qualities[lookupId] || state as any) }, 
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