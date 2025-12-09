// src/engine/gameEngine.ts

import {
    PlayerQualities, QualityState, QualityType, ResolveOption, Storylet,
    QualityChangeInfo, WorldConfig, Opportunity, QualityDefinition
} from '@/engine/models';
import {
    evaluateText as evaluateScribeText,
    evaluateCondition as evaluateScribeCondition
} from './textProcessor';

type SkillCheckResult = { wasSuccess: boolean; roll: number; targetChance: number; description: string; };
type ScheduleInstruction = any;

export class GameEngine {
    private qualities: PlayerQualities;
    private worldQualities: PlayerQualities;
    private worldContent: WorldConfig;
    private equipment: Record<string, string | null>;
    private changes: QualityChangeInfo[] = [];
    private scheduledUpdates: ScheduleInstruction[] = [];
    private resolutionRoll: number;

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

    public setQualities(newQualities: PlayerQualities): void {
        this.qualities = JSON.parse(JSON.stringify(newQualities));
    }

    public getQualities(): PlayerQualities { return this.qualities; }
    public getWorldQualities(): PlayerQualities { return this.worldQualities; }

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
            
            const evaluatedBonus = this.evaluateText(itemDef.bonus);
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

    public evaluateCondition(expression?: string): boolean {
        return evaluateScribeCondition(
            expression, 
            this.qualities, 
            this.worldContent.qualities, 
            {}, 
            null, 
            this.resolutionRoll
        );
    }

    public evaluateText(rawText: string | undefined): string {
        return evaluateScribeText(
            rawText, 
            this.qualities, 
            this.worldContent.qualities, 
            null, 
            this.resolutionRoll
        );
    }

    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
        this.changes = [];
        this.scheduledUpdates = [];
        
        const challengeResult = this.evaluateChallenge(option.challenge);
        const isSuccess = challengeResult.wasSuccess;
        
        const body = isSuccess ? option.pass_long : option.fail_long || "";
        const changeString = isSuccess ? option.pass_quality_change : option.fail_quality_change;
        const redirectId = isSuccess ? option.pass_redirect : option.fail_redirect;
        const moveToId = isSuccess ? option.pass_move_to : option.fail_move_to;
        
        if (changeString) {
            this.applyEffects(changeString);
        }
        
        return { 
            wasSuccess: isSuccess, 
            body: this.evaluateText(body), 
            redirectId, 
            moveToId, 
            qualityChanges: this.changes, 
            scheduledUpdates: this.scheduledUpdates, 
            skillCheckDetails: challengeResult 
        };
    }

    public renderStorylet(storylet: Storylet | Opportunity): Storylet | Opportunity {
        const rendered = JSON.parse(JSON.stringify(storylet));
        const evalAndAssign = (obj: any, key: string) => { if (obj[key]) { obj[key] = this.evaluateText(obj[key]); } };
        
        evalAndAssign(rendered, 'name');
        evalAndAssign(rendered, 'text');
        evalAndAssign(rendered, 'short');
        evalAndAssign(rendered, 'metatext');
        evalAndAssign(rendered, 'image_code');
        
        if (rendered.options) { 
            rendered.options = rendered.options.map((opt: ResolveOption) => { 
                const rOpt = { ...opt }; 
                evalAndAssign(rOpt, 'name'); 
                evalAndAssign(rOpt, 'short'); 
                evalAndAssign(rOpt, 'meta'); 
                
                if (rOpt.action_cost) {
                    const costStr = this.evaluateText(`{${rOpt.action_cost}}`);
                    rOpt.computed_action_cost = isNaN(Number(costStr)) ? costStr : Number(costStr);
                } else {
                    rOpt.computed_action_cost = 0;
                }
                return rOpt; 
            }); 
        }
        return rendered;
    }

    public applyEffects(effectsString: string): void {
        console.log(`[ENGINE DEBUG] applyEffects called with: "${effectsString}"`);
        
        // 1. Resolve nested ScribeScript first ({ ... })
        const resolvedString = this.evaluateText(`{${effectsString}}`);
        
        // 2. Split by comma (ignore brackets)
        const effects = resolvedString.split(/,(?![^\[]*\])/g); 

        for (const effect of effects) {
            const cleanEffect = effect.trim();
            if (!cleanEffect) continue;

            console.log(`[ENGINE DEBUG] Processing effect: "${cleanEffect}"`);

            const macroMatch = cleanEffect.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
            if (macroMatch) {
                const [, command, args] = macroMatch;
                if (['schedule', 'reset', 'update', 'cancel'].includes(command)) {
                    this.parseAndQueueTimerInstruction(command, args);
                }
                continue;
            }

            const batchMatch = cleanEffect.match(/^%all\[(.*?)\]\s*(=|\+=|-=)\s*(.*)$/);
            if (batchMatch) {
                const [, cat, op, val] = batchMatch;
                const resolvedVal = this.evaluateText(`{${val}}`);
                const numVal = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);
                this.batchChangeQuality(cat, op, numVal, {});
                continue;
            }

            const assignMatch = cleanEffect.match(/^\$([a-zA-Z0-9_]+)(?:\[(.*?)\])?\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/);
            
            if (assignMatch) {
                const [, qid, metaStr, op, valStr] = assignMatch;
                
                const metadata: { desc?: string; source?: string } = {};
                if (metaStr) {
                    const metaParts = metaStr.split(',');
                    for (const part of metaParts) {
                        const [k, ...v] = part.split(':');
                        if (k.trim() === 'desc') metadata.desc = v.join(':').trim();
                        if (k.trim() === 'source') metadata.source = v.join(':').trim();
                    }
                }

                let val: string | number = 0;
                if (op !== '++' && op !== '--') {
                     const resolvedValueStr = this.evaluateText(`{${valStr}}`);
                     val = resolvedValueStr;
                     if (!isNaN(Number(resolvedValueStr)) && resolvedValueStr.trim() !== '') {
                         val = Number(resolvedValueStr);
                     }
                }
                
                this.changeQuality(qid, op, val, metadata);
            }
        }
    }

    private parseAndQueueTimerInstruction(command: string, argsStr: string) {
        const [mainArgs, optArgs] = argsStr.split(';').map(s => s.trim());
        const instruction: any = { type: command, rawOptions: optArgs ? optArgs.split(',') : [] };

        if (command === 'cancel') {
            instruction.targetId = mainArgs;
        } else {
            const lastColon = mainArgs.lastIndexOf(':');
            if (lastColon === -1) return;

            const effectStr = mainArgs.substring(0, lastColon).trim();
            const timeStr = mainArgs.substring(lastColon + 1).trim();

            const tMatch = timeStr.match(/(\d+)([mhd])/);
            if (tMatch) {
                const val = parseInt(tMatch[1]);
                const unit = tMatch[2];
                instruction.intervalMs = val * (unit === 'h' ? 3600000 : unit === 'd' ? 86400000 : 60000);
            }

            const effMatch = effectStr.match(/\$([a-zA-Z0-9_]+)\s*(=|\+=|-=)\s*(.*)/);
            if (effMatch) {
                instruction.targetId = effMatch[1];
                instruction.op = effMatch[2];
                instruction.value = isNaN(Number(effMatch[3])) ? effMatch[3] : Number(effMatch[3]);
            }
        }

        if (optArgs) {
            if (optArgs.includes('recur')) instruction.recurring = true;
            if (optArgs.includes('unique')) instruction.unique = true;
            const descMatch = optArgs.match(/desc:(.*)/);
            if (descMatch) instruction.description = descMatch[1].trim();
        }

        this.scheduledUpdates.push(instruction);
    }

    public batchChangeQuality(category: string, op: string, value: number | string, meta: any) {
        const qids = Object.values(this.worldContent.qualities)
            .filter(q => q.category?.split(',').map(c => c.trim()).includes(category))
            .map(q => q.id);
            
        qids.forEach(qid => this.changeQuality(qid, op, value, meta));
    }

    public changeQuality(qid: string, op: string, value: number | string, metadata: { desc?: string; source?: string }): void {
        const def = this.worldContent.qualities[qid];
        if (!def) {
            console.warn(`[GameEngine] Unknown quality '${qid}'. Skipping.`);
            return;
        }

        let targetState = this.qualities;
        let effectiveQid = qid;
        
        if (qid.startsWith('world.')) {
            targetState = this.worldQualities;
            effectiveQid = qid.substring(6);
        }

        if (!targetState[effectiveQid]) {
            targetState[effectiveQid] = { qualityId: effectiveQid, type: def.type, level: 0, changePoints: 0, stringValue: "", sources: [], customProperties: {}, spentTowardsPrune: 0 } as any;
        }

        const qState = targetState[effectiveQid] as any;
        const levelBefore = qState.level || 0;
        const cpBefore = qState.changePoints || 0;

        if (qState.type === QualityType.String) {
            if (typeof value === 'string' && op === '=') qState.stringValue = value;
        } 
        else if (typeof value === 'number') {
            const numValue = Math.floor(value);
            const isIncremental = ['+=', '-=', '++', '--'].includes(op);
            const isItem = def.type === QualityType.Item || def.type === QualityType.Equipable;

            if (qState.type === QualityType.Pyramidal) {
                 if (isIncremental) {
                    if (op === '++' || op === '+=') {
                        if (def.grind_cap) {
                            const cap = parseInt(this.evaluateText(`{${def.grind_cap}}`), 10);
                            if (!isNaN(cap) && qState.level >= cap) return; 
                        }
                    }
                    if (op === '++') qState.changePoints += 1;
                    else if (op === '--') qState.changePoints -= 1;
                    else if (op === '+=') qState.changePoints += numValue;
                    else if (op === '-=') qState.changePoints -= numValue;
                    this.updatePyramidalLevel(qState, def);
                } else if (op === '=') { qState.level = numValue; qState.changePoints = 0; }
            } else {
                if (isIncremental) {
                    const isAdd = op === '++' || op === '+=';
                    const qty = (op === '++' || op === '--') ? 1 : numValue;

                    if (isAdd) {
                        if (def.grind_cap) {
                             const cap = parseInt(this.evaluateText(`{${def.grind_cap}}`), 10);
                             if (!isNaN(cap) && qState.level >= cap) return;
                        }
                        qState.level += qty;
                        
                        if (isItem && metadata.source) {
                            if (!qState.sources) qState.sources = [];
                            for(let i=0; i<qty; i++) qState.sources.push(metadata.source);
                        }
                    } else {
                        if (isItem) this.pruneSources(qState, qty, levelBefore);
                        qState.level -= qty;
                    }
                } else { 
                    if (isItem && numValue < levelBefore) {
                        this.pruneSources(qState, levelBefore - numValue, levelBefore);
                    }
                    qState.level = numValue;
                    if (isItem && numValue === 0) qState.sources = [];
                }
            }
            
            if (def.max) {
                const max = Number(this.evaluateText(`{${def.max}}`)) || Infinity;
                if (qState.level > max) { qState.level = max; if (qState.type === 'P') qState.changePoints = 0; }
            }
            qState.level = Math.floor(qState.level);
            if ((def.type === 'C' || isItem) && qState.level < 0) qState.level = 0;
        }

        const displayName = this.evaluateText(def.name || effectiveQid);
        let changeText = "";
        if (qState.level > levelBefore) changeText = this.evaluateText(def.increase_description) || `${displayName} increased.`;
        else if (qState.level < levelBefore) changeText = this.evaluateText(def.decrease_description) || `${displayName} decreased.`;
        else if (qState.type === 'S') changeText = `${displayName} is now ${qState.stringValue}`;

        if (metadata.desc) changeText = this.evaluateText(metadata.desc);

        if (changeText) {
            this.changes.push({
                qid: effectiveQid, qualityName: displayName, type: def.type, category: def.category,
                levelBefore, cpBefore, levelAfter: qState.level, cpAfter: qState.changePoints,
                stringValue: qState.stringValue, changeText, scope: qid.startsWith('world.') ? 'world' : 'character',
                overrideDescription: metadata.desc ? this.evaluateText(metadata.desc) : undefined
            });
        }
    }

    private pruneSources(qState: any, amountSpent: number, totalLevelBefore: number) {
        if (!qState.sources || qState.sources.length === 0) return;
        if (totalLevelBefore <= 0) return;

        const fractionSpent = amountSpent / totalLevelBefore;
        const creditsEarned = qState.sources.length * fractionSpent;
        qState.spentTowardsPrune = (qState.spentTowardsPrune || 0) + creditsEarned;

        let removeCount = 0;
        while (qState.spentTowardsPrune >= 1.0 && qState.sources.length > 0) {
            const candidate = qState.sources[0];
            let duplicateCount = 0;
            for(const s of qState.sources) { if (s === candidate) duplicateCount++; if(duplicateCount > 1) break; }
            const isDuplicate = duplicateCount > 1;

            if (removeCount === 0 || isDuplicate) {
                qState.sources.shift();
                qState.spentTowardsPrune -= 1.0;
                removeCount++;
            } else {
                break;
            }
        }
    }

    public updatePyramidalLevel(qState: any, def: QualityDefinition): void {
        const cpCap = def.cp_cap ? Number(this.evaluateText(`{${def.cp_cap}}`)) || Infinity : Infinity;
        let cpNeeded = Math.min(qState.level + 1, cpCap);
        while (qState.changePoints >= cpNeeded && cpNeeded > 0) {
            qState.level++; qState.changePoints -= cpNeeded;
            cpNeeded = Math.min(qState.level + 1, cpCap);
        }
        while (qState.changePoints < 0 && qState.level > 0) {
            const prevCp = Math.min(qState.level, cpCap);
            qState.level--; qState.changePoints += prevCp;
        }
    }

    private evaluateChallenge(challengeString?: string): SkillCheckResult {
        if (!challengeString) return { wasSuccess: true, roll: -1, targetChance: 100, description: "" };
        const chanceStr = this.evaluateText(`{${challengeString}}`);
        const targetChance = parseInt(chanceStr, 10) || 100;
        
        return { 
            wasSuccess: this.resolutionRoll < targetChance, 
            roll: Math.floor(this.resolutionRoll), 
            targetChance, 
            description: `Rolled ${Math.floor(this.resolutionRoll)} vs ${targetChance}%` 
        };
    }
}