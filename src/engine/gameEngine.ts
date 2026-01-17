// src/engine/gameEngine.ts

import {
    PlayerQualities, QualityState, QualityType, ResolveOption, Storylet,
    QualityChangeInfo, WorldConfig, Opportunity, QualityDefinition,
    WorldSettings
} from '@/engine/models';
import {
    evaluateText as evaluateScribeText,
    evaluateCondition as evaluateScribeCondition
} from './textProcessor';
import { EngineContext } from './mechanics/types';
import { parseAndApplyEffects } from './mechanics/effectParser';
import { changeQuality, createNewQuality, batchChangeQuality, updatePyramidalLevel } from './mechanics/qualityOperations';

type SkillCheckResult = { wasSuccess: boolean; roll: number; targetChance: number; description: string; };
type ScheduleInstruction = any;

export class GameEngine implements EngineContext {
    public _logger?: (message: string, type: 'EVAL' | 'COND' | 'FX') => void;

    public qualities: PlayerQualities;
    public worldQualities: PlayerQualities;
    public worldContent: WorldConfig;
    public equipment: Record<string, string | null>;
    
    public dynamicQualities: Record<string, QualityDefinition> = {};

    public changes: QualityChangeInfo[] = [];
    public scheduledUpdates: ScheduleInstruction[] = [];
    public resolutionRoll: number;
    public tempAliases: Record<string, string> = {}; 
    public errors: string[] = [];
    public executedEffectsLog: string[] = [];

    
    /**
     * Initializes the engine with a copy of the player's state
     * to ensure mutations only happen via controlled methods.
     */
    constructor(
        initialQualities: PlayerQualities,
        worldContent: WorldConfig,
        currentEquipment: Record<string, string | null> = {},
        worldQualities: PlayerQualities = {},
        logger?: (message: string, type: 'EVAL' | 'COND' | 'FX') => void 
    ) {
        this.qualities = JSON.parse(JSON.stringify(initialQualities));
        this.worldContent = worldContent;
        this.equipment = currentEquipment;
        this.worldQualities = worldQualities;
        this.resolutionRoll = Math.random() * 100;
        this._logger = logger; 
    }
    
    /** Replaces the current state entirely. */
    public setQualities(newQualities: PlayerQualities): void { this.qualities = JSON.parse(JSON.stringify(newQualities)); }
    
    /** Returns the current raw state object. */
    public getQualities(): PlayerQualities { return this.qualities; }

    /** Returns qualities created dynamically during this session. */
    public getDynamicQualities(): Record<string, QualityDefinition> { return this.dynamicQualities; }

    /** Returns the global world state. */
    public getWorldQualities(): PlayerQualities { return this.worldQualities; }

    /**
     * Creates a Javascript Proxy around the state.
     * Intercepts property access to calculate "Effective Levels" (Base + Equipment Bonuses)
     * on the fly, so scripts always see the modified values.
     */
    private getEffectiveQualitiesProxy(): PlayerQualities {
        return new Proxy(this.qualities, {
            get: (target, prop) => {
                if (typeof prop !== 'string') return Reflect.get(target, prop);
                const qid = prop;
                const baseState = target[qid];
                const effectiveLevel = this.getEffectiveLevel(qid);
                
                if (baseState) {
                    if (baseState.type === QualityType.String) return baseState;
                    if ('level' in baseState && baseState.level === effectiveLevel) return baseState;
                    return { ...baseState, level: effectiveLevel };
                }


                const def = this.worldContent.qualities[qid];
                if (def || effectiveLevel !== 0 || this.worldQualities[qid]) {
                    if (this.worldQualities[qid]) {
                        const wq = this.worldQualities[qid];
                        if (wq.type === QualityType.String) return wq;
                        return { ...wq, level: effectiveLevel };
                    }
                    return {
                        qualityId: qid,
                        type: def?.type || QualityType.Counter,
                        level: effectiveLevel,
                        stringValue: "",
                        changePoints: 0
                    } as QualityState;
                }

                return undefined;
            }
        });
    }

    /**
     * Wrapper for `textProcessor.evaluateText()`.
     * Automatically injects the EffectiveQualitiesProxy and logging.
     */
    public evaluateText(
        rawText: string | undefined, 
        context?: { qid: string, state: QualityState },
        locals?: Record<string, number | string> 
    ): string {
         if (this._logger && rawText) {
            this._logger(rawText, 'EVAL');
        }
        return evaluateScribeText(
            rawText, 
            this.getEffectiveQualitiesProxy(),
            this.worldContent.qualities, 
            context || null,
            this.resolutionRoll, 
            this.tempAliases,
            this.errors,
            (msg, depth, type) => this.traceLog(msg, depth, type),
            0,
            locals
        );
    }

    /**
     * Wrapper for `textProcessor.evaluateCondition()`.
     * Handles splitting implicit "AND" conditions (comma-separated strings).
     */
    public evaluateCondition(expression: string | undefined, contextOverride?: { qid: string, state: QualityState }): boolean {
        if (!expression) return true;
        let parts: string[] = [];
        let buffer = "";
        let depth = 0;
        let inQuote = false;
        let quoteChar = '';

        for (let i = 0; i < expression.length; i++) {
            const char = expression[i];
            
            if (inQuote) {
                buffer += char;
                if (char === quoteChar) inQuote = false;
            } else {
                if (char === '"' || char === "'") {
                    inQuote = true;
                    quoteChar = char;
                    buffer += char;
                } else if (char === '{' || char === '[') {
                    depth++;
                    buffer += char;
                } else if (char === '}' || char === ']') {
                    if (depth > 0) depth--;
                    buffer += char;
                } else if (char === ',' && depth === 0) {
                    parts.push(buffer.trim());
                    buffer = "";
                } else {
                    buffer += char;
                }
            }
        }
        if (buffer.trim()) parts.push(buffer.trim());
        if (parts.length <= 1) {
            if (this._logger && expression) {
                this._logger(expression, 'COND');
            }
            return evaluateScribeCondition(
                expression, 
                this.getEffectiveQualitiesProxy(),
                this.worldContent.qualities, 
                contextOverride || null,
                this.resolutionRoll, 
                this.tempAliases,
                this.errors
            );
        }
        for (const part of parts) {
            if (!part) continue;
            const result = evaluateScribeCondition(
                part, 
                this.getEffectiveQualitiesProxy(),
                this.worldContent.qualities, 
                contextOverride || null,
                this.resolutionRoll, 
                this.tempAliases,
                this.errors
            );
            
            if (this._logger) {
                this._logger(`[Implicit AND] Checking: "${part}" -> ${result}`, 'COND');
            }

            if (!result) return false;
        }

        return true;
    }

    /**
     * Evaluation method for themes like "Masquerade" and "Dungeon Delver" to dynamically switch visual theme logic.
     * @param settings The `WorldSettings` model which contains the override for this specific world.
     * @returns string value of the `visualTheme` to be applied.
     */
    public evaluateActiveTheme(settings: WorldSettings): string {
        const baseTheme = settings.visualTheme || 'default';
        
        if (!settings.themeOverrides || settings.themeOverrides.length === 0) {
            return baseTheme;
        }

        for (const override of settings.themeOverrides) {
            if (this.evaluateCondition(override.condition)) {
                return override.theme;
            }
        }

        return baseTheme;
    }
    
    /**
     * Calculates the final value of a quality by taking the base level
     * and summing up bonuses from all equipped items.
     */
    public getEffectiveLevel(qid: string): number {
        const baseState = this.qualities[qid];
        let total = (baseState && 'level' in baseState) ? baseState.level : 0;
        
        if (!baseState && this.worldQualities[qid]) {
             const worldState = this.worldQualities[qid];
             total = ('level' in worldState) ? worldState.level : 0;
        }

        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;
            const itemDef = this.worldContent.qualities[itemId];
            if (!itemDef || !itemDef.bonus) continue;
            
            const evaluatedBonus = evaluateScribeText(
                itemDef.bonus, 
                this.qualities,
                this.worldContent.qualities, 
                null, 
                this.resolutionRoll, 
                this.tempAliases, 
                []
            );

            const bonuses = evaluatedBonus.split(',');
            for (const bonus of bonuses) {
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

    /**
     * Scans currently equipped items to find which Qualities they are modifying.
     * Used to ensure these qualities appear in the UI even if the player has 0 base level.
     */
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

    /**
     * Prepares the state object for the Frontend UI.
     * 1. Merges base stats with equipment bonuses.
     * 2. Evaluates ScribeScript in `tags` field to handle visibility logic (for example, a conditional `hidden`).
     */
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
                const def = this.worldContent.qualities[qid];
                if (def) {
                    displayState[qid] = {
                        qualityId: qid,
                        type: def.type,
                        level: effective,
                        stringValue: "",
                        changePoints: (displayState[qid] && 'changePoints' in displayState[qid]) ? displayState[qid].changePoints : 0
                    } as any;
                }
            }
        });
        
        for (const qid in displayState) {
            const def = this.worldContent.qualities[qid];
            if (displayState[qid].type !== QualityType.String) {
                displayState[qid].level = this.getEffectiveLevel(qid);
            }

            if (def && def.tags && def.tags.length > 0) {
                const context = { qid: qid, state: displayState[qid] };
                const evaluatedTags = def.tags.map(tagStr => {
                    return this.evaluateText(tagStr, context).trim();
                }).filter(t => t !== "");
                displayState[qid].tags = evaluatedTags;
            }
        }

        return displayState;
    }

    /**
     * The main gameplay resolution loop.
     * 1. Evaluates the challenge (success/fail).
     * 2. Selects the appropriate result text and effects.
     * 3. Applies state changes (Effects).
     * 4. Returns a result object for the UI to render.
     */
    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
        this.changes = [];
        this.scheduledUpdates = [];
        this.tempAliases = {}; 
        this.errors = []; 
        this.executedEffectsLog = [];
        this.dynamicQualities = {};
        
        const challengeResult = this.evaluateChallenge(option.challenge);
        const isSuccess = challengeResult.wasSuccess;
        const bodyTemplate = isSuccess ? option.pass_long : option.fail_long || "";
        const metaTemplate = isSuccess ? option.pass_meta : option.fail_meta; 
        
        const changeString = isSuccess ? option.pass_quality_change : option.fail_quality_change;
        const redirectId = isSuccess ? option.pass_redirect : option.fail_redirect;
        const moveToId = isSuccess ? option.pass_move_to : option.fail_move_to;
        let finalBody = this.evaluateText(bodyTemplate);
        let finalMeta = metaTemplate ? this.evaluateText(metaTemplate) : undefined; 

        if (changeString) {
            this.applyEffects(changeString);
        }
        if (option.tags?.includes('post_effects_eval')) {
            finalBody = this.evaluateText(bodyTemplate);
            if (metaTemplate) finalMeta = this.evaluateText(metaTemplate); 
        }
        
        return { 
            wasSuccess: isSuccess, 
            body: finalBody, 
            metatext: finalMeta, 
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
    
    /** Clears temporary aliases and errors between resolutions. */
    public resetEvaluationContext(): void {
        this.tempAliases = {};
        this.errors = [];
    }

    /** Parses and executes an effects string, such as `$gold++, $xp += 10`. */
    public applyEffects(effectsString: string): void {
        parseAndApplyEffects(this, effectsString);
    }

    /** Internal logging helper for the Playtest debugger. */
    private traceLog(message: string, depth: number, type?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR') {
        let prefix = depth > 0 ? '|-- ' : '';
        if (depth > 1) {
            prefix = '|   '.repeat(depth - 1) + '|-- ';
        }
        let icon = '';
        if (type === 'SUCCESS') icon = '✔ ';
        if (type === 'ERROR') icon = '❌ ';
        if (type === 'WARN') icon = '⚠ ';

        const fullMessage = `${prefix}${icon}${message}`;
        this.executedEffectsLog.push(fullMessage);
        if (this._logger) {
            this._logger(fullMessage, 'FX');
        }
    }

    /**
     * Parses a challenge string, calculates the probability, and compares it
     * against the engine's resolution roll (`this.resolutionRoll`) to determine the outcome.
     */
    private evaluateChallenge(challengeString?: string): SkillCheckResult {
        if (!challengeString) return { wasSuccess: true, roll: -1, targetChance: 100, description: "" };
        let clean = challengeString.trim();
        if (clean.startsWith('{%chance[')) clean = clean.replace(/^{%chance\[|\]}$/g, '');
        else if (clean.startsWith('{')) clean = clean.replace(/^{|}$/g, '');
        const parts = clean.split(';'); 
        const mainLogic = parts[0]; 
        const argsStr = parts[1] || '';
        const opMatch = mainLogic.match(/(>>|<<|><|<>|==|!=)/);
        if (!opMatch) {
            const val = parseInt(this.evaluateText(`{${mainLogic}}`), 10);
            return { 
                wasSuccess: this.resolutionRoll <= val, 
                roll: Math.floor(this.resolutionRoll), 
                targetChance: val, 
                description: `Flat Chance: ${val}%`
            };
        }
        
        const operator = opMatch[0];
        const [leftRaw, rightRaw] = mainLogic.split(operator);
        const skillVal = parseFloat(this.evaluateText(`{${leftRaw}}`));
        const targetVal = parseFloat(this.evaluateText(`{${rightRaw}}`));
        const defaults = this.worldContent.settings.challengeConfig || {};

        let marginExpr = defaults.defaultMargin ? String(defaults.defaultMargin) : 'target';
        let minExpr = String(defaults.minCap ?? '0');
        let maxExpr = String(defaults.maxCap ?? '100');
        let pivotExpr = String(defaults.basePivot ?? '60');
        if (argsStr) {
            const args = argsStr.split(',').map(s => s.trim());
            if (args[0]) marginExpr = args[0];
            if (args[1]) minExpr = args[1];
            if (args[2]) maxExpr = args[2];
            if (args[3]) pivotExpr = args[3];
        }
        const localScope = { target: targetVal };

        const marginVal = parseFloat(this.evaluateText(`{${marginExpr}}`, undefined, localScope));
        const minVal = parseFloat(this.evaluateText(`{${minExpr}}`, undefined, localScope));
        const maxVal = parseFloat(this.evaluateText(`{${maxExpr}}`, undefined, localScope));
        const pivotVal = parseFloat(this.evaluateText(`{${pivotExpr}}`, undefined, localScope));
        const finalChance = this.calculateChanceMath(
            skillVal, 
            operator, 
            targetVal, 
            isNaN(marginVal) ? 10 : marginVal, 
            isNaN(minVal) ? 0 : minVal, 
            isNaN(maxVal) ? 100 : maxVal, 
            isNaN(pivotVal) ? 60 : pivotVal
        );
        
        return { 
            wasSuccess: this.resolutionRoll <= finalChance, 
            roll: Math.floor(this.resolutionRoll), 
            targetChance: Math.floor(finalChance), 
            description: `Rolled ${Math.floor(this.resolutionRoll)} vs ${Math.floor(finalChance)}%` 
        };
    }

    /** Pure math implementation of the difficulty curves. */
    private calculateChanceMath(skill: number, op: string, target: number, margin: number, min: number, max: number, pivot: number): number {
        const lowerBound = target - margin;
        const upperBound = target + margin;
        const pivotDecimal = pivot / 100;
        let chance = 0;

        if (op === '>>' || op === '>=') {
            if (skill <= lowerBound) chance = 0;
            else if (skill >= upperBound) chance = 1;
            else if (skill < target) {
                const range = target - lowerBound;
                chance = range <= 0 ? 0.5 : ((skill - lowerBound) / range) * pivotDecimal;
            } else {
                const range = upperBound - target;
                chance = range <= 0 ? 0.5 : pivotDecimal + ((skill - target) / range) * (1 - pivotDecimal);
            }
        } 
        else if (op === '<<' || op === '<=') {
            let inv = 0;
            if (skill <= lowerBound) inv = 0;
            else if (skill >= upperBound) inv = 1;
            else if (skill < target) {
                const range = target - lowerBound;
                inv = range <= 0 ? 0.5 : ((skill - lowerBound) / range) * pivotDecimal;
            } else {
                const range = upperBound - target;
                inv = range <= 0 ? 0.5 : pivotDecimal + ((skill - target) / range) * (1 - pivotDecimal);
            }
            chance = 1.0 - inv;
        }
        else if (op === '==' || op === '><') {
            const dist = Math.abs(skill - target);
            chance = dist >= margin ? 0 : 1.0 - (dist / margin);
        }
        else if (op === '!=' || op === '<>') {
            const dist = Math.abs(skill - target);
            chance = dist >= margin ? 1.0 : (dist / margin);
        }

        let percent = chance * 100;
        return Math.max(min, Math.min(max, percent));
    }

    /** Handles the `%new` macro to initialize qualities at runtime. */
    public createNewQuality(id: string, value: number | string, templateId: string | null, props: Record<string, any>) {
        createNewQuality(this, id, value, templateId, props);
        
        const templateDef = templateId ? this.worldContent.qualities[templateId] : null;
        const newDef: QualityDefinition = templateDef 
            ? JSON.parse(JSON.stringify(templateDef)) 
            : { type: QualityType.Pyramidal };

        newDef.id = id;
        if (!newDef.text_variants) {
            newDef.text_variants = {};
        }

        Object.assign(newDef, props);
        Object.assign(newDef.text_variants, props);
        
        newDef.name = newDef.name || id;
        newDef.type = templateDef ? templateDef.type : (typeof value === 'string' ? QualityType.String : QualityType.Pyramidal);

        this.worldContent.qualities[id] = newDef;
        this.dynamicQualities[id] = newDef;
    }

    /** Wrapper for the low-level changeQuality operation. */
    public changeQuality(qid: string, op: string, value: number | string, metadata: { desc?: string; source?: string; hidden?: boolean }) {
        changeQuality(this, qid, op, value, metadata);
    }

    /** Wrapper for the low-level batchChangeQuality operation. */
    public batchChangeQuality(categoryExpr: string, op: string, value: number | string, filterExpr?: string) {
        batchChangeQuality(this, categoryExpr, op, value, filterExpr);
    }

    /**
     * Recursively walks an object (like a Storylet definition) and evaluates
     * any string properties containing ScribeScript.
     * Ensures the UI receives static text instead of raw code.
     */
    public render<T extends {id?: string}>(obj: T): T {
        const copy = JSON.parse(JSON.stringify(obj));
        return this.deepEvaluate(copy, copy.id);
    }

    /** Specific render wrapper for Storylets that handles Action Cost computation. */
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

    /** Recursive helper for the render method. */
    private deepEvaluate(obj: any, contextId?: string): any {
        if (typeof obj === 'string') {
            if (obj.includes('{') || obj.includes('$') || obj.includes('#') || obj.includes('@') || obj.includes('$.')) {
                const selfContext = contextId ? { qid: contextId, state: this.qualities[contextId] } : null;
                return this.evaluateText(obj, selfContext || undefined);
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepEvaluate(item, contextId));
        }
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (['id', 'deck', 'ordering', 'worldId', 'ownerId', '_id'].includes(key)) {
                    continue;
                }
                obj[key] = this.deepEvaluate(obj[key], contextId);
            }
            return obj;
        }
        return obj;
    }
}