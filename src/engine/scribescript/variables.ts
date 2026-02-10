// src/engine/scribescript/variables.ts
import { safeEval } from '@/utils/safeEval';
import { PlayerQualities, QualityDefinition, QualityState, QualityType } from '../models';
import { ScribeEvaluator, TraceLogger } from './types';
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
    evaluator: ScribeEvaluator
): string | number | boolean {
    const indent = '  '.repeat(depth);
    if (logger) logger(`Expr: "${expr}"`, depth, 'INFO');

     try {
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
        
        const varReplacedExpr = expr.replace(VARIABLE_REGEX, (match) => { 
            const resolved = resolveVariable(match, qualities, defs, aliases, self, resolutionRoll, errors, logger, depth, evaluator);
            if (typeof resolved === 'string') {
                if (!isNaN(Number(resolved)) && resolved.trim() !== "") {
                    return resolved;
                }
                return `"${resolved}"`;
            }
            return resolved.toString();
        });
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
    evaluator: ScribeEvaluator
): string | number {
    const indent = '  '.repeat(depth);
    
    try {
        const parserRegex = /^((?:\$\.)|[@#\$](?:\{.*?\}|[a-zA-Z0-9_]+))(?:\[(.*?)\])?((?:\.[a-zA-Z0-9_]+)*)$/;
        const match = fullMatch.match(parserRegex);
        
        if (!match) return fullMatch;

        const [, sigilAndName, levelSpoof, propChain] = match;
        
        let sigil: string;
        let identifier: string;
        if (sigilAndName === '$.') {
            sigil = '$.';
            identifier = '';
        } else {
            sigil = sigilAndName.charAt(0);
            identifier = sigilAndName.slice(1);
        }
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
            if (sigil === '$.') return 0;
            return `[Unknown: ${fullMatch}]`;
        }
        
        let definition = defs[qualityId];
        let state: QualityState | undefined;
        if (sigil === '$.' && self) {
            state = self.state;
        } else {
            state = qualities[qualityId];
            if (!state && self?.qid === qualityId) state = self.state;
        }
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
        if (levelSpoof) {
            const spoofedVal = evaluator(
                `{${levelSpoof}}`, qualities, defs, self, resolutionRoll, aliases, errors, logger, depth + 1
            );
            if (!isNaN(Number(spoofedVal))) {
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
            if (typeof currentValue === 'object' && (currentValue as any).text_variants && (currentValue as any).text_variants[prop] !== undefined) {
                foundValue = (currentValue as any).text_variants[prop];
                found = true;
            }
            else if (!found && currentDef?.text_variants && currentDef.text_variants[prop] !== undefined) {
                foundValue = currentDef.text_variants[prop];
                found = true;
            }
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
            else if (!found && currentDef && (currentDef as any)[prop] !== undefined) {
                foundValue = (currentDef as any)[prop];
                found = true;
            }

            if (found) {
                currentValue = foundValue;
            } else {
                if (logger) logger(`[WARN] Property .${prop} not found on ${lookupId}`, depth, 'WARN');
                currentValue = undefined;
            }
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