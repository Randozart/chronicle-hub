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
    public getWorldQualities(): PlayerQualities { return this.worldQualities; }

    // === PUBLIC EVALUATION API ===

    public evaluateText(rawText: string | undefined, context?: { qid: string, state: QualityState }): string {
        return evaluateScribeText(
            rawText, 
            this.qualities, 
            this.worldContent.qualities, 
            context || null,
            this.resolutionRoll, 
            this.tempAliases,
            this.errors,
            (msg, depth, type) => this.traceLog(msg, depth, type),
            0 
        );
    }

    // FIXED: Now accepts 'undefined' to match textProcessor signature
    public evaluateCondition(expression: string | undefined, contextOverride?: { qid: string, state: QualityState }): boolean {
        return evaluateScribeCondition(
            expression, 
            this.qualities, 
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
        if (!baseState && this.worldQualities[qid]) {
             const worldState = this.worldQualities[qid];
             total = ('level' in worldState) ? worldState.level : 0;
        }
        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;
            const itemDef = this.worldContent.qualities[itemId];
            if (!itemDef || !itemDef.bonus) continue;
            
            const evaluatedBonus = evaluateScribeText(itemDef.bonus, this.qualities, this.worldContent.qualities, null, this.resolutionRoll, this.tempAliases, []);
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

    // === MAIN RESOLUTION FLOW ===

    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
        this.changes = [];
        this.scheduledUpdates = [];
        this.tempAliases = {}; 
        this.errors = []; 
        this.executedEffectsLog = [];
        
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
            resolvedEffects: this.executedEffectsLog
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
        createNewQuality(this, id, value, templateId, props);
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
                return evaluateScribeText(obj, this.qualities, this.worldContent.qualities, null, this.resolutionRoll, {}, []);
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