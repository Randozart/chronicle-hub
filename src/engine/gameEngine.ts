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
    
    private tempAliases: Record<string, string> = {}; 
    private errors: string[] = [];

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

    public evaluateCondition(expression?: string, contextOverride?: { qid: string, state: QualityState }): boolean {
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

    public evaluateText(rawText: string | undefined): string {
        return evaluateScribeText(
            rawText, 
            this.qualities, 
            this.worldContent.qualities, 
            null, 
            this.resolutionRoll, 
            this.tempAliases,
            this.errors
        );
    }

    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
        this.changes = [];
        this.scheduledUpdates = [];
        this.tempAliases = {}; 
        this.errors = []; 
        
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
            rawEffects: changeString 
        };
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

    public applyEffects(effectsString: string): void {
        console.log(`[ENGINE DEBUG] applyEffects called with: "${effectsString}"`);
        
        const effects = effectsString.split(/,(?![^\[]*\])/g); 

        for (const effect of effects) {
            const cleanEffect = effect.trim();
            if (!cleanEffect) continue;

            if (cleanEffect.startsWith('{') && cleanEffect.endsWith('}')) {
                const resolvedCommand = this.evaluateText(cleanEffect);
                if (resolvedCommand && (resolvedCommand.includes('=') || resolvedCommand.startsWith('%'))) {
                    this.applyEffects(resolvedCommand);
                }
                continue;
            }

            const macroMatch = cleanEffect.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
            if (macroMatch) {
                const [, command, args] = macroMatch;
                if (['schedule', 'reset', 'update', 'cancel'].includes(command)) {
                    this.parseAndQueueTimerInstruction(command, args);
                }
                continue;
            }

            const batchMatch = cleanEffect.match(/^%all\[([^;\]]+)(?:;\s*([^\]]+))?\]\s*(=|\+=|-=)\s*(.*)$/);
            if (batchMatch) {
                const [, catExpr, filterExpr, op, val] = batchMatch;
                const resolvedVal = this.evaluateText(`{${val}}`);
                const numVal = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);
                this.batchChangeQuality(catExpr, op, numVal, filterExpr); 
                continue;
            }

            const newMatch = cleanEffect.match(/^%new\[(.*?)(?:;\s*(.*))?\]\s*(=)\s*(.*)$/);
            if (newMatch) {
                const [, idExpr, argsStr, op, valStr] = newMatch;
                const newId = this.evaluateText(`{${idExpr}}`).trim();
                const resolvedVal = this.evaluateText(`{${valStr}}`);
                const numVal = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);

                const props: Record<string, any> = {};
                let templateId: string | null = null;

                if (argsStr) {
                    const args = argsStr.split(',').map(s => s.trim());
                    if (args.length > 0 && !args[0].includes(':')) {
                        const rawTemplate = args.shift()!;
                        templateId = this.evaluateText(`{${rawTemplate}}`);
                    }

                    args.forEach(arg => {
                        const [k, ...vParts] = arg.split(':');
                        if (!k) return;
                        const key = k.trim();
                        let rawVal = vParts.join(':').trim();
                        if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
                            props[key] = rawVal.slice(1, -1);
                        } else {
                            props[key] = this.evaluateText(`{${rawVal}}`);
                        }
                    });
                }

                this.createNewQuality(newId, numVal, templateId, props);
                continue;
            }

            const assignMatch = cleanEffect.match(/^((?:[$@][a-zA-Z0-9_]+)|(?:\{.*?\}))(?:\[(.*?)\])?\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/);
            
            if (assignMatch) {
                const [, rawLhs, metaStr, op, valStr] = assignMatch;
                
                let qid = "";

                if (rawLhs.startsWith('{')) {
                    qid = this.evaluateText(rawLhs).trim();
                    if (qid.startsWith('$') || qid.startsWith('@') || qid.startsWith('#')) {
                        qid = qid.substring(1);
                    }
                } else if (rawLhs.startsWith('@')) {
                    const aliasKey = rawLhs.substring(1);
                    if (this.tempAliases[aliasKey]) {
                        qid = this.tempAliases[aliasKey]; 
                    } else {
                        const msg = `Alias '${rawLhs}' not found in current context.`;
                        console.warn(msg);
                        this.errors.push(msg); 
                        continue;
                    }
                } else {
                    qid = rawLhs.substring(1); 
                }

                if (!qid || qid === "nothing" || qid === "undefined") continue;

                const metadata: { desc?: string; source?: string; hidden?: boolean } = {};
                if (metaStr) {
                    const metaParts = metaStr.split(',');
                    for (const part of metaParts) {
                        const [k, ...v] = part.split(':');
                        const key = k.trim();
                        const val = v.join(':').trim();
                        if (key === 'desc') metadata.desc = val;
                        if (key === 'source') metadata.source = val;
                        if (key === 'hidden') metadata.hidden = true;
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

            const tMatch = timeStr.match(/((?:\{.*\}|\d+))\s*([mhd])/);
            if (tMatch) {
                const amountRaw = tMatch[1];
                const unit = tMatch[2];
                const amountVal = parseInt(this.evaluateText(amountRaw.startsWith('{') ? amountRaw : `{${amountRaw}}`));
                
                if (!isNaN(amountVal)) {
                    instruction.intervalMs = amountVal * (unit === 'h' ? 3600000 : unit === 'd' ? 86400000 : 60000);
                }
            }

            const effMatch = effectStr.match(/\$([a-zA-Z0-9_]+)\s*(=|\+=|-=)\s*(.*)/);
            if (effMatch) {
                instruction.targetId = effMatch[1];
                instruction.op = effMatch[2];
                const valStr = effMatch[3];
                const resolvedVal = this.evaluateText(`{${valStr}}`);
                instruction.value = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);
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

    public batchChangeQuality(categoryExpr: string, op: string, value: number | string, filterExpr?: string) {
        const targetCat = this.evaluateText(`{${categoryExpr}}`).trim().toLowerCase();
        
        const qids = Object.values(this.worldContent.qualities)
            .filter(q => {
                if (!q.category) return false;
                const cats = q.category.split(',').map(c => c.trim().toLowerCase());
                if (!cats.includes(targetCat)) return false;
                if (filterExpr) {
                    const state = this.qualities[q.id] || { qualityId: q.id, level: 0, type: q.type } as any;
                    return this.evaluateCondition(filterExpr, { qid: q.id, state });
                }
                return true;
            })
            .map(q => q.id);
            
        console.log(`[Batch] Applying '${op} ${value}' to category '${targetCat}'. Hits: ${qids.length}`);
        qids.forEach(qid => this.changeQuality(qid, op, value, {}));
    }

    public createNewQuality(id: string, value: number | string, templateId: string | null, props: Record<string, any>) {
        let def: Partial<QualityDefinition> = {};
        if (templateId && this.worldContent.qualities[templateId]) {
            def = { ...this.worldContent.qualities[templateId] };
        } else {
            def = { type: typeof value === 'string' ? QualityType.String : QualityType.Pyramidal };
        }

        let state = this.qualities[id];
        
        if (!state) {
            this.qualities[id] = {
                qualityId: id,
                type: def.type || QualityType.Pyramidal,
                level: typeof value === 'number' ? value : 0,
                stringValue: typeof value === 'string' ? value : "",
                changePoints: 0,
                customProperties: {
                    ...(def.name ? { name: def.name } : {}),
                    ...(def.description ? { description: def.description } : {}),
                    ...(def.image ? { image: def.image } : {}),
                    ...props 
                }
            } as any;
        } else {
            const dynamicState = state as any;
            if (!dynamicState.customProperties) dynamicState.customProperties = {};
            Object.assign(dynamicState.customProperties, props);
            if (typeof value === 'number') {
                 dynamicState.level = value;
            }
            if (typeof value === 'string') {
                 dynamicState.stringValue = value;
            }
        }
        console.log(`[GameEngine] Created/Updated ${id}. Template: ${templateId}`, this.qualities[id]);
    }

    public changeQuality(qid: string, op: string, value: number | string, metadata: { desc?: string; source?: string; hidden?: boolean }): void {
        const def = this.worldContent.qualities[qid];
        if (!def) {
            const msg = `[GameEngine] Unknown quality '${qid}'. Skipping.`;
            console.warn(msg);
            this.errors.push(msg);
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

        // DEBUG UPDATE: Do not return if hidden. Capture it, but mark it.
        const isHidden = metadata.hidden || (def.tags && def.tags.includes('hidden'));

        const context = { qid: effectiveQid, state: qState };
        const displayName = this.evaluateText(def.name || effectiveQid);
        
        let changeText = "";
        
        const increaseDesc = this.evaluateText(def.increase_description);
        const decreaseDesc = this.evaluateText(def.decrease_description);

        if (qState.level > levelBefore) changeText = increaseDesc || `${displayName} increased.`;
        else if (qState.level < levelBefore) changeText = decreaseDesc || `${displayName} decreased.`;
        else if (qState.type === 'S') changeText = `${displayName} is now ${qState.stringValue}`;

        if (metadata.desc) {
            changeText = this.evaluateText(metadata.desc);
        }

        if (changeText) {
            this.changes.push({
                qid: effectiveQid, qualityName: displayName, type: def.type, category: def.category,
                levelBefore, cpBefore, levelAfter: qState.level, cpAfter: qState.changePoints,
                stringValue: qState.stringValue, changeText, scope: qid.startsWith('world.') ? 'world' : 'character',
                overrideDescription: metadata.desc ? changeText : undefined,
                hidden: isHidden // MARK HIDDEN
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
            wasSuccess: this.resolutionRoll <= targetChance, 
            roll: Math.floor(this.resolutionRoll), 
            targetChance, 
            description: `Rolled ${Math.floor(this.resolutionRoll)} vs ${targetChance}%` 
        };
    }
}