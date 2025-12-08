// src/engine/gameEngine.ts

import {
    PlayerQualities, QualityState, QualityType, ResolveOption, Storylet,
    QualityChangeInfo, WorldConfig, Opportunity, QualityDefinition
} from '@/engine/models';
import {
    evaluateText as evaluateScribeText,
    evaluateCondition as evaluateScribeCondition,
    ScribeParser,
    tokenize,
    EvaluationState
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
        return evaluateScribeCondition(expression, this.qualities, this.worldContent.qualities, {}, null, this.resolutionRoll, this);
    }

    public evaluateText(rawText: string | undefined): string {
        return evaluateScribeText(rawText, this.qualities, this.worldContent.qualities, null, this.resolutionRoll, this);
    }

    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
//   this.changes = [];
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
                if (rOpt.action_cost && isNaN(Number(rOpt.action_cost))) {
                    rOpt.computed_action_cost = rOpt.action_cost; 
                } else {
                    rOpt.computed_action_cost = Number(rOpt.action_cost || 0);
                }
                return rOpt; 
            }); 
        }
        return rendered;
    }

    // --- EFFECT API ---

    public applyEffects(effectsString: string): void {
        // --- ADD DEBUG LOGGING HERE ---
        console.log(`[ENGINE DEBUG] applyEffects called with: "${effectsString}"`);
        // The regex `,(?![^\[]*\]|[^\{]*\})/g` splits by commas not inside `[]` or `{}`
        const effects = effectsString.split(/,(?![^\[]*\]|[^\{]*\})/g); 
        console.log(`[ENGINE DEBUG] Split into effects:`, effects);
        // --- END DEBUG ---

        for (const effect of effects) {
            if (!effect.trim()) {
                console.log(`[ENGINE DEBUG] Skipping empty effect: "${effect}"`);
                continue;
            }
            const tokens = tokenize(effect.trim());
            const state: EvaluationState = {
                qualities: this.qualities,
                worldQualities: this.worldQualities,
                defs: this.worldContent.qualities,
                aliases: {},
                self: null,
                resolutionRoll: this.resolutionRoll,
                engine: this
            };
            const parser = new ScribeParser(tokens, state);
            
            // --- ADD DEBUG LOGGING HERE ---
            console.log(`[ENGINE DEBUG] Evaluating effect "${effect.trim()}". Tokens:`, tokens.map(t => t.value).join(' '));
            // --- END DEBUG ---
            
            parser.evaluate('EFFECT'); // This is where the actual mutation happens
            
            // Log state after each effect application
            console.log(`[ENGINE DEBUG] After effect "${effect.trim()}", tutorial_progress is:`, (this.qualities['tutorial_progress'] as any)?.level);
        }
    }

    // --- PUBLIC METHODS CALLED BY PARSER ---

    public queueUpdate(type: string, targetId: string, opts: string[]) {
        const instruction: any = { type, targetId, rawOptions: opts };
        const timeOpt = opts.find(o => o.match(/\d+[mhd]/));
        if (timeOpt) {
            const match = timeOpt.match(/(\d+)([mhd])/);
            if (match) {
                const val = parseInt(match[1]);
                const unit = match[2];
                instruction.intervalMs = val * (unit === 'h' ? 3600000 : unit === 'd' ? 86400000 : 60000);
            }
        }
        
        // Handle effect parsing for schedule (e.g., $q+=1) if present
        // In this architecture, the Parser passes `args[0]` which is the full effect string ($q+=1)
        // or just the ID for cancel. 
        // We need to store the effect structure. 
        // For simplicity v6, we assume the API re-parses it, OR we store the raw string.
        // Let's check how `queueUpdate` is called. It gets `args[0]`.
        // If it's `schedule`, `args[0]` is `$q+=1`. 
        // We parse out the op/value here for the DB.
        
        if (type !== 'cancel') {
            const effectMatch = targetId.match(/(.+?)\s*(=|\+=|-=)\s*(.*)/);
            if (effectMatch) {
                instruction.targetId = effectMatch[1].replace('$', '').trim(); // Remove $
                instruction.op = effectMatch[2];
                instruction.value = parseInt(effectMatch[3].trim()); // Note: Assumes simple number for delayed effects
            }
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
        console.log(`[ENGINE.changeQuality] Received command: qid='${qid}', op='${op}', value='${value}'`);
        if (!qid || typeof qid !== 'string') {
            console.error("[ENGINE.changeQuality] ERROR: Invalid or missing qid. Aborting change.");
            return;
        }
        
         const def = this.worldContent.qualities[qid];
        if (!def) {
            console.error(`[ENGINE.changeQuality] ERROR: No definition found for qid='${qid}'. Aborting change.`);
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
        const levelBefore = qState.level || 0; // Capture this BEFORE modification
        const cpBefore = qState.changePoints || 0;

        if (qState.type === QualityType.String) {
            if (typeof value === 'string' && op === '=') qState.stringValue = value;
        } 
        else if (typeof value === 'number') {
            const numValue = Math.floor(value);
            const isIncremental = ['+=', '-=', '++', '--'].includes(op);
            const isItem = def.type === QualityType.Item || def.type === QualityType.Equipable;

            // ... (Pyramidal logic unchanged) ...
            if (qState.type === QualityType.Pyramidal) {
                 // ... [Keep existing Pyramidal block] ...
                 if (isIncremental) {
                    if (op === '++') qState.changePoints += 1;
                    else if (op === '--') qState.changePoints -= 1;
                    else if (op === '+=') qState.changePoints += numValue;
                    else if (op === '-=') qState.changePoints -= numValue;
                    this.updatePyramidalLevel(qState, def);
                } else if (op === '=') { qState.level = numValue; qState.changePoints = 0; }
            } else {
                // Linear / Item Logic
                if (isIncremental) {
                    const isAdd = op === '++' || op === '+=';
                    const qty = (op === '++' || op === '--') ? 1 : numValue;

                    if (isAdd) {
                        // ... [Keep existing Cap Check] ...
                        if (def.grind_cap) {
                             const grindCapValue = parseInt(this.evaluateText(`{${def.grind_cap}}`), 10);
                             if (!isNaN(grindCapValue) && qState.level >= grindCapValue) return;
                        }

                        qState.level += qty;
                        
                        // Source Tracking (ADD)
                        if (isItem && metadata.source) {
                            if (!qState.sources) qState.sources = [];
                            // Optimization: If the NEW source is identical to the LATEST source, 
                            // we generally assume it's the same batch.
                            // However, the prompt implies adding multiple entries for frequency weight.
                            // So we push every time.
                            for(let i=0; i<qty; i++) {
                                qState.sources.push(metadata.source);
                            }
                        }
                    } else {
                        // SUBTRACT
                        // Prune BEFORE lowering the level number, so calculations work on the state at the time of spending
                        if (isItem) {
                            this.pruneSources(qState, qty, levelBefore);
                        }
                        qState.level -= qty;
                    }
                } else { // '=' SET
                    qState.level = numValue;
                    if (isItem) {
                        if (numValue === 0) {
                            qState.sources = [];
                            qState.spentTowardsPrune = 0;
                        }
                        else {
                            // If setting to a lower number, treat difference as "spent"
                            const diff = levelBefore - numValue;
                            if (diff > 0) this.pruneSources(qState, diff, levelBefore);
                        }
                    }
                }
            }
            
            // ... [Keep existing Post-Change Cap Checks and Logging] ...
            if (def.max && qState.level > Number(def.max)) qState.level = Number(def.max);
            qState.level = Math.floor(qState.level);
            if ((def.type === QualityType.Counter || isItem) && qState.level < 0) qState.level = 0;
        }

        // ... [Keep existing Logging Logic] ...
        const displayName = this.evaluateText(def.name || effectiveQid);
        let changeText = "";
        if (qState.level > levelBefore) changeText = `${displayName} increased.`;
        else if (qState.level < levelBefore) changeText = `${displayName} decreased.`;
        else if (qState.type === 'S') changeText = `${displayName} is now ${qState.stringValue}`;

        if (metadata.desc) changeText = metadata.desc;

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

        // 1. Calculate Pruning Credit
        const fractionSpent = amountSpent / totalLevelBefore;
        const creditsEarned = qState.sources.length * fractionSpent;

        qState.spentTowardsPrune = (qState.spentTowardsPrune || 0) + creditsEarned;

        // 2. Execution Loop
        let removeCount = 0;

        while (qState.spentTowardsPrune >= 1.0 && qState.sources.length > 0) {
            
            // Identify Candidate (FIFO = Index 0)
            const candidate = qState.sources[0];

            // Check if Candidate is a Duplicate (exists more than once in current array)
            // Note: We scan the whole array. Ideally we optimized this but for <100 sources it's fine.
            let duplicateCount = 0;
            for(const s of qState.sources) {
                if (s === candidate) duplicateCount++;
                if (duplicateCount > 1) break; 
            }
            const isDuplicate = duplicateCount > 1;

            // 3. The Protection Rule
            // - If it's the First item being removed in this specific transaction (removeCount === 0),
            //   we ALWAYS allow it. This ensures the displayed "source" updates eventually.
            // - If we have enough credit to remove MORE items (removeCount > 0),
            //   we ONLY allow it if the candidate is a DUPLICATE.
            //   We stop pruning to preserve unique history tags.
            
            if (removeCount === 0 || isDuplicate) {
                qState.sources.shift(); // Remove oldest
                qState.spentTowardsPrune -= 1.0;
                removeCount++;
            } else {
                // We have credit, but the next item is Unique. 
                // We stop pruning to save it. 
                // We do NOT clear the credit; it carries over to the next transaction,
                // putting pressure on this unique item until enough are spent to force it out next time.
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