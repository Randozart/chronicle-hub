// src/engine/gameEngine.ts

import {
    PlayerQualities, QualityState, QualityType, ResolveOption, Storylet,
    QualityChangeInfo, WorldConfig, Opportunity, QualityDefinition
} from '@/engine/models';
import {
    evaluateText as evaluateScribeText,
    evaluateCondition as evaluateScribeCondition,
    sanitizeScribeScript
} from './textProcessor';

// Mechanics imports
import { EngineContext } from './mechanics/types';
import { parseAndApplyEffects } from './mechanics/effectParser';
import { changeQuality, createNewQuality, batchChangeQuality, updatePyramidalLevel } from './mechanics/qualityOperations';

type SkillCheckResult = { wasSuccess: boolean; roll: number; targetChance: number; description: string; };
type ScheduleInstruction = any;

export class GameEngine implements EngineContext {
    // === STATE (EngineContext Implementation) ===
    public qualities: PlayerQualities;
    public worldQualities: PlayerQualities;
    public worldContent: WorldConfig;
    public equipment: Record<string, string | null>;
    
    // Track definitions created dynamically (e.g., via %new)
    public dynamicQualities: Record<string, QualityDefinition> = {};

    public changes: QualityChangeInfo[] = [];
    public scheduledUpdates: ScheduleInstruction[] = [];
    public resolutionRoll: number;
    public tempAliases: Record<string, string> = {}; 
    public errors: string[] = [];
    public executedEffectsLog: string[] = [];

    constructor(
        initialQualities: PlayerQualities,
        worldContent: WorldConfig,
        currentEquipment: Record<string, string | null> = {},
        worldQualities: PlayerQualities = {}
    ) {
        this.qualities = JSON.parse(JSON.stringify(initialQualities));
        this.worldContent = worldContent;
        this.equipment = currentEquipment;
        this.worldQualities = worldQualities;
        this.resolutionRoll = Math.random() * 100;
    }

    public setQualities(newQualities: PlayerQualities): void { this.qualities = JSON.parse(JSON.stringify(newQualities)); }
    public getQualities(): PlayerQualities { return this.qualities; }
    // Expose dynamic definitions
    public getDynamicQualities(): Record<string, QualityDefinition> { return this.dynamicQualities; }
    
    public getWorldQualities(): PlayerQualities { return this.worldQualities; }

    // Returns a list of Quality IDs that are being modified by current equipment
    public getBonusQualities(): string[] {
        const affectedQids = new Set<string>();
        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;
            const itemDef = this.worldContent.qualities[itemId];
            if (itemDef && itemDef.bonus) {
                const matches = itemDef.bonus.matchAll(/[\$#]([a-zA-Z0-9_]+)/g);
                for (const m of matches) {
                    affectedQids.add(m[1]);
                }
            }
        }
        return Array.from(affectedQids);
    }

    // Creates a visual-only state object that includes ghost qualities and effective levels
    public getDisplayState(): PlayerQualities {
        const displayState = JSON.parse(JSON.stringify(this.qualities));
        const bonusKeys = this.getBonusQualities();

        bonusKeys.forEach(qid => {
            const effective = this.getEffectiveLevel(qid);
            
            if (displayState[qid]) {
                if (displayState[qid].type !== QualityType.String) {
                    displayState[qid].level = effective;
                }
            } else if (effective !== 0) {
                // Mock ghost quality
                const def = this.worldContent.qualities[qid];
                if (def) {
                    displayState[qid] = {
                        qualityId: qid,
                        type: def.type,
                        level: effective,
                        stringValue: "",
                        changePoints: 0
                    } as any;
                }
            }
        });
        return displayState;
    }
    // === PUBLIC EVALUATION API ===

    // Helper to create a Proxy that injects Effective Levels into ScribeScript lookups
    // Helper to create a Proxy that injects Effective Levels into ScribeScript lookups
    private getEffectiveQualitiesProxy(): PlayerQualities {
        return new Proxy(this.qualities, {
            get: (target, prop) => {
                // Allow standard props/methods to pass through
                if (typeof prop !== 'string') return Reflect.get(target, prop);
                
                const qid = prop;
                const baseState = target[qid];
                
                // Calculate effective level (Base + Equipment)
                // Note: getEffectiveLevel returns 0 for String qualities or missing qualities
                const effectiveLevel = this.getEffectiveLevel(qid);
                
                // If the quality exists in state
                if (baseState) {
                    // String qualities don't use 'level', so return them as-is
                    if (baseState.type === QualityType.String) {
                        return baseState;
                    }

                    // For numeric qualities (P, C, T, I, E), check if optimization is possible
                    // Cast to 'any' or check type to satisfy TS that .level exists
                    if ('level' in baseState && baseState.level === effectiveLevel) {
                        return baseState;
                    }
                    
                    // Return shallow copy with overridden level
                    return { ...baseState, level: effectiveLevel };
                }

                // If quality doesn't exist in character state, but has a non-zero effective level 
                // (e.g. from equipment only, or a world quality), mock a state object for it.
                if (effectiveLevel !== 0 || this.worldQualities[qid]) {
                    // Check if it's a world quality first
                    if (this.worldQualities[qid]) {
                        const wq = this.worldQualities[qid];
                        if (wq.type === QualityType.String) return wq;
                        return { ...wq, level: effectiveLevel };
                    }

                    // Create transient state for equipment-only quality
                    const def = this.worldContent.qualities[qid];
                    return {
                        qualityId: qid,
                        type: def?.type || QualityType.Counter,
                        level: effectiveLevel,
                        stringValue: "",
                        changePoints: 0
                    } as QualityState;
                }

                // Default: Return undefined (let TextProcessor handle ghosting)
                return undefined;
            }
        });
    }

    public evaluateText(rawText: string | undefined, context?: { qid: string, state: QualityState }): string {
        return evaluateScribeText(
            rawText, 
            this.getEffectiveQualitiesProxy(), // <--- USE PROXY
            this.worldContent.qualities, 
            context || null,
            this.resolutionRoll, 
            this.tempAliases,
            this.errors,
            (msg, depth, type) => this.traceLog(msg, depth, type),
            0 
        );
    }

    public evaluateCondition(expression: string | undefined, contextOverride?: { qid: string, state: QualityState }): boolean {
        return evaluateScribeCondition(
            expression, 
            this.getEffectiveQualitiesProxy(), // <--- USE PROXY
            this.worldContent.qualities, 
            contextOverride || null,
            this.resolutionRoll, 
            this.tempAliases,
            this.errors
        );
    }

    public getEffectiveLevel(qid: string): number {
        const baseState = this.qualities[qid];
        let total = (baseState && 'level' in baseState) ? baseState.level : 0;
        
        // World Quality Fallback
        if (!baseState && this.worldQualities[qid]) {
             const worldState = this.worldQualities[qid];
             total = ('level' in worldState) ? worldState.level : 0;
        }

        // Equipment Bonuses
        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;
            const itemDef = this.worldContent.qualities[itemId];
            if (!itemDef || !itemDef.bonus) continue;
            
            // Evaluates bonus text. IMPORTANT: This calls evaluateScribeText using RAW this.qualities 
            // inside textProcessor to prevent infinite recursion loop (Bonus -> Effective -> Bonus).
            // This is safe because evaluateScribeText doesn't call back into GameEngine unless we pass callbacks.
            // But wait, evaluateScribeText uses the qualities object passed to it.
            // We must manually parse the bonus string here to avoid circular dependency if we used this.evaluateText.
            
            // We use the imported evaluateScribeText with raw this.qualities.
            const evaluatedBonus = evaluateScribeText(
                itemDef.bonus, 
                this.qualities, // RAW qualities, preventing recursion
                this.worldContent.qualities, 
                null, 
                this.resolutionRoll, 
                this.tempAliases, 
                []
            );

            const bonuses = evaluatedBonus.split(',');
            for (const bonus of bonuses) {
                // Regex matches "$stat + val" or "$stat - val"
                const match = bonus.trim().match(/^\$([a-zA-Z0-9_]+)\s*([+\-])\s*(\d+)$/);
                if (match) {
                    const [, targetQid, op, value] = match;
                    if (targetQid === qid) {
                        const numVal = parseInt(value, 10);
                        if (op === '+') total += numVal;
                        if (op === '-') total -= numVal;
                    }
                }
            }
        }
        return total;
    }

    // === MAIN RESOLUTION FLOW ===

    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
        this.changes = [];
        this.scheduledUpdates = [];
        this.tempAliases = {}; 
        this.errors = []; 
        this.executedEffectsLog = [];
        this.dynamicQualities = {}; // Reset for this resolution
        
        const challengeResult = this.evaluateChallenge(option.challenge);
        const isSuccess = challengeResult.wasSuccess;
        
        const body = isSuccess ? option.pass_long : option.fail_long || "";
        const evaluatedBody = this.evaluateText(body); 
        
        const changeString = isSuccess ? option.pass_quality_change : option.fail_quality_change;
        const redirectId = isSuccess ? option.pass_redirect : option.fail_redirect;
        const moveToId = isSuccess ? option.pass_move_to : option.fail_move_to;
        
        if (changeString) {
            this.applyEffects(changeString);
        }
        
        return { 
            wasSuccess: isSuccess, 
            body: evaluatedBody, 
            redirectId, 
            moveToId, 
            qualityChanges: this.changes, 
            scheduledUpdates: this.scheduledUpdates, 
            skillCheckDetails: challengeResult,
            errors: this.errors,
            rawEffects: changeString,
            resolvedEffects: this.executedEffectsLog,
            dynamicQualities: this.dynamicQualities 
        };
    }

    public applyEffects(effectsString: string): void {
        parseAndApplyEffects(this, effectsString);
    }

    // === UTILS ===

    private traceLog(message: string, depth: number, type?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR') {
        let prefix = depth > 0 ? '|-- ' : '';
        if (depth > 1) {
            prefix = '|   '.repeat(depth - 1) + '|-- ';
        }
        let icon = '';
        if (type === 'SUCCESS') icon = '✔ ';
        if (type === 'ERROR') icon = '❌ ';
        if (type === 'WARN') icon = '⚠ ';

        this.executedEffectsLog.push(`${prefix}${icon}${message}`);
    }

    private evaluateChallenge(challengeString?: string): SkillCheckResult {
        if (!challengeString) return { wasSuccess: true, roll: -1, targetChance: 100, description: "" };
        const chanceStr = this.evaluateText(`{${challengeString}}`);
        const targetChance = parseInt(chanceStr, 10) || 100;
        
        return { 
            wasSuccess: this.resolutionRoll <= targetChance, 
            roll: Math.floor(this.resolutionRoll), 
            targetChance, 
            description: `Rolled ${Math.floor(this.resolutionRoll)} vs ${targetChance}%` 
        };
    }

    // === API Wrappers ===

    public createNewQuality(id: string, value: number | string, templateId: string | null, props: Record<string, any>) {
        // 1. Update State (This is now correct from the previous step)
        createNewQuality(this, id, value, templateId, props);
        
        // 2. Construct the Definition for Persistence
        const templateDef = templateId ? this.worldContent.qualities[templateId] : null;

        // CRITICAL FIX: Use a deep copy to ensure `text_variants` and `category` are unique to this instance.
        const newDef: QualityDefinition = templateDef 
            ? JSON.parse(JSON.stringify(templateDef)) 
            : { type: QualityType.Pyramidal }; // Fallback for no template

        // A. Set the unique ID.
        newDef.id = id;

        // B. Ensure text_variants dictionary exists.
        if (!newDef.text_variants) {
            newDef.text_variants = {};
        }

        // C. Merge props from the macro (e.g., index:1) into BOTH the top-level and text_variants.
        // This makes them accessible via {$s1.index} and ensures they are part of the logic context.
        Object.assign(newDef, props);
        Object.assign(newDef.text_variants, props);
        
        // D. Set name and type, prioritizing template values.
        newDef.name = newDef.name || id;
        newDef.type = templateDef ? templateDef.type : (typeof value === 'string' ? QualityType.String : QualityType.Pyramidal);

        // 3. Update Engine Context for immediate use in this turn.
        this.worldContent.qualities[id] = newDef;

        // 4. Register for Persistence to be saved to the database.
        this.dynamicQualities[id] = newDef;
    }

    public changeQuality(qid: string, op: string, value: number | string, metadata: { desc?: string; source?: string; hidden?: boolean }) {
        changeQuality(this, qid, op, value, metadata);
    }

    public batchChangeQuality(categoryExpr: string, op: string, value: number | string, filterExpr?: string) {
        batchChangeQuality(this, categoryExpr, op, value, filterExpr);
    }

    public render<T>(obj: T): T {
        const copy = JSON.parse(JSON.stringify(obj));
        return this.deepEvaluate(copy);
    }

    public renderStorylet(storylet: Storylet | Opportunity): Storylet | Opportunity {
        const rendered = this.render(storylet);
        if (rendered.options) {
            rendered.options.forEach((opt: ResolveOption) => {
                if (opt.action_cost) {
                    const costVal = parseInt(String(opt.action_cost), 10);
                    opt.computed_action_cost = isNaN(costVal) ? opt.action_cost : costVal;
                } else {
                    opt.computed_action_cost = 0;
                }
            });
        }
        return rendered;
    }

    private deepEvaluate(obj: any): any {
        if (typeof obj === 'string') {
            if (obj.includes('{') || obj.includes('$') || obj.includes('#') || obj.includes('@')) {
                // FIX: Use evaluateText so it uses the Proxy and respects bonuses
                return this.evaluateText(obj); 
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepEvaluate(item));
        }
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (['id', 'deck', 'ordering', 'worldId', 'ownerId', '_id'].includes(key)) {
                    continue;
                }
                obj[key] = this.deepEvaluate(obj[key]);
            }
            return obj;
        }
        return obj;
    }
}