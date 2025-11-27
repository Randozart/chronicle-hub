// src/engine/gameEngine.ts

import { PlayerQualities, QualityState, QualityType, ResolveOption, Storylet, QualityChangeInfo, WorldConfig, Opportunity } from '@/engine/models';

const getCPforNextLevel = (level: number): number => {
    // Formula: (Current Level + 1) * 10.
    return level + 1;
};

const evaluateSimpleExpression = (expr: string): number | boolean | string => {
    const sanitizedExpr = expr.trim();
    if (!sanitizedExpr) return 0;

    try {
        // ALLOW STRINGS and basic math operators
        if (/[^a-zA-Z0-9_+\-/*%&|=!<>.\s'"()]/.test(sanitizedExpr)) {
             console.warn(`Unsafe expression: "${sanitizedExpr}"`);
             return sanitizedExpr; 
        }
        
        const result = new Function(`return ${sanitizedExpr}`)();
        return (result === null || result === undefined) ? 0 : result;
    } catch (e) {
        return expr; 
    }
};

type SkillCheckResult = {
    wasSuccess: boolean;
    roll: number;
    target: number;
    description: string;
};

export class GameEngine {
    private qualities: PlayerQualities;
    private worldContent: WorldConfig;
    private changes: QualityChangeInfo[] = [];
    private resolutionPruneTargets: Record<string, string> = {};
    private equipment: Record<string, string | null>; 

    constructor(
        initialQualities: PlayerQualities, 
        worldContent: WorldConfig, 
        currentEquipment: Record<string, string | null> = {}
    ) {
        this.qualities = JSON.parse(JSON.stringify(initialQualities));
        this.worldContent = worldContent;
        this.equipment = currentEquipment;
    }

    public getEffectiveLevel(qid: string): number {
        const baseState = this.qualities[qid];
        let total = (baseState && 'level' in baseState) ? baseState.level : 0;

        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;

            const itemDef = this.worldContent.qualities[itemId];
            if (!itemDef || !itemDef.bonus) continue;

            const bonuses = itemDef.bonus.split(',');
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

    public getQualities(): PlayerQualities {
        return this.qualities;
    }
    
    public resolveOption(storylet: Storylet, option: ResolveOption) {
        this.changes = []; 
        
        // 1. Determine basic Success/Failure
        const wasSuccessResult = this.evaluateCondition(option.random, true);
        const isSuccess = typeof wasSuccessResult === 'boolean' ? wasSuccessResult : wasSuccessResult.wasSuccess;

        // 2. Determine Rare Outcome (Alternative)
        let isRare = false;
        let outcomeType: 'pass' | 'fail' | 'rare_pass' | 'rare_fail' = isSuccess ? 'pass' : 'fail';

        const rareChance = isSuccess ? option.rare_pass_chance : option.rare_fail_chance;
        
        if (rareChance && rareChance > 0) {
            const roll = Math.random() * 100;
            if (roll < rareChance) {
                isRare = true;
                outcomeType = isSuccess ? 'rare_pass' : 'rare_fail';
            }
        }

        // 3. Select the correct text/changes based on outcomeType
        let body = "";
        let changeString: string | undefined = undefined;
        let redirectId: string | undefined = undefined;
        let moveId: string | undefined = undefined;

        switch (outcomeType) {
            case 'pass':
                body = option.pass_long;
                changeString = option.pass_quality_change;
                redirectId = option.pass_redirect;
                moveId = option.pass_move_to;
                break;
            case 'rare_pass':
                body = option.rare_pass_long || option.pass_long; // Fallback
                changeString = option.rare_pass_quality_change || option.pass_quality_change;
                redirectId = option.rare_pass_redirect || option.pass_redirect;
                moveId = option.pass_move_to; // Assume movement stays same usually
                break;
            case 'fail':
                body = option.fail_long || "";
                changeString = option.fail_quality_change;
                redirectId = option.fail_redirect;
                moveId = option.fail_move_to;
                break;
            case 'rare_fail':
                body = option.rare_fail_long || option.fail_long || "";
                changeString = option.rare_fail_quality_change || option.fail_quality_change;
                redirectId = option.rare_fail_redirect || option.fail_redirect;
                moveId = option.fail_move_to;
                break;
        }
        
        if (changeString) {
            this.evaluateEffects(changeString);
        }
        
        return {
            wasSuccess: isSuccess,
            isRare: isRare, // Pass this to frontend if you want special FX
            body,
            redirectId,
            moveToId: moveId,
            qualityChanges: this.changes,
        };
    }

    public evaluateCondition(expression?: string, isSkillCheck: boolean = false): boolean | SkillCheckResult { 
        if (!expression) return true;
        
        const finalExpression = this.evaluateBlock(expression);

        if (isSkillCheck) {
            const skillCheckMatch = finalExpression.match(/^\s*\$(.*?)\s*(>=|<=)\s*([^\[]+)(?:\s*\[([^\]]+)\])?\s*$/);
            if (skillCheckMatch) {
                return this.performSkillCheck(skillCheckMatch);
            }
            // If it's just a boolean check (no skill roll), assume success if true
            const result = evaluateSimpleExpression(finalExpression);
            return typeof result === 'boolean' ? result : Number(result) > 0;
        }

        const replaced = finalExpression.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => this.getQualityValue(qid).toString());
        const result = evaluateSimpleExpression(replaced);
        return typeof result === 'boolean' ? result : Number(result) > 0;
    }

    private evaluateEffects(effects: string): void {
        const individualEffects = effects.split(',');
        for (const effect of individualEffects) {
            this.applyEffect(effect.trim());
        }
    }

    private applyEffect(effect: string): void {
        // 1. Conditional Effects
        const conditionalMatch = effect.match(/^{\s*(.*?)\s*:\s*(.*?)(?:\s*\|\s*(.*))?\s*}$/);
        if (conditionalMatch) {
            const [, condition, effectIfTrue, effectIfFalse] = conditionalMatch;
            // Check condition (boolean result)
            const result = this.evaluateCondition(condition);
            const isTrue = typeof result === 'boolean' ? result : result.wasSuccess;

            if (isTrue) {
                this.evaluateEffects(effectIfTrue);
            } else if (effectIfFalse) {
                this.evaluateEffects(effectIfFalse);
            }
            return;
        }

        // 2. $all effects
        const allMatch = effect.match(/^\s*\$all\[(.*?)\]\s*(\+=|-=|\*=|\/=|%=|=)\s*(.*)\s*$/);
        if (allMatch) {
            const [, category, op, valueStr] = allMatch;
            const targetCategory = category.trim();

            console.log(`[GameEngine] Applying '$all' effect to category '${targetCategory}'`);

            const affectedQids = Object.keys(this.worldContent.qualities).filter(qid => {
                const def = this.worldContent.qualities[qid];
                return def.category?.split(',').map(c => c.trim()).includes(targetCategory);
            });
            
            if (affectedQids.length > 0) {
                for (const qid of affectedQids) {
                    const simpleEffect = `$${qid} ${op} ${valueStr}`;
                    this.applyEffect(simpleEffect);
                }
            }
            return;
        }

        // 3. Increment/Decrement shortcuts
        const incrementDecrementMatch = effect.match(/^\s*\$([a-zA-Z0-9_]+)\s*(\+\+|--)\s*$/);
        if (incrementDecrementMatch) {
            const [, qid, op] = incrementDecrementMatch;
            this.changeQuality(qid, op, 1);
            return;
        }

        // 4. Standard Math Operations (+=, -=, *=, /=, %=, =)
        const simpleMatch = effect.match(/^\s*\$([a-zA-Z0-9_]+)(?:\[source:([^\]]+)\])?\s*(\+=|-=|\*=|\/=|%=|=)\s*(.*)\s*$/);
        if (simpleMatch) {
            const [, qid, source, op, valueStr] = simpleMatch;
            
            const resolvedStr = this.evaluateBlock(valueStr);
            
            let value: number | string;

            if (valueStr.includes('"') || valueStr.includes("'")) {
                value = resolvedStr.replace(/['"]/g, '');
            } 
            else {
                const mathResult = evaluateSimpleExpression(resolvedStr);
                // We keep floats during calculation, but changeQuality usually floors them
                value = typeof mathResult === 'number' ? mathResult : mathResult.toString();
            }

            this.changeQuality(qid, op, value, source);
        }
    }

    public evaluateBlock(content: string): string {
        if (!content) return "";
        let currentExpression = content.trim();
        
        if (!currentExpression.startsWith('{') || !currentExpression.endsWith('}')) {
            return currentExpression;
        }

        for (let i = 0; i < 10; i++) {
            const innermostBlockMatch = currentExpression.match(/\{([^{}]+?)\}/);
            if (!innermostBlockMatch) break;

            const blockWithBraces = innermostBlockMatch[0];
            const innerContent = innermostBlockMatch[1].trim();

            let evaluatedValue: string;

            const randomMatch = innerContent.match(/^(\d+)\s*~\s*(\d+)$/);
            
            let processedContent = innerContent.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => this.getQualityValue(qid).toString());

            if (randomMatch) {
                const min = parseInt(randomMatch[1], 10);
                const max = parseInt(randomMatch[2], 10);
                evaluatedValue = (Math.floor(Math.random() * (max - min + 1)) + min).toString();
            } 
            else if (processedContent.includes(':') || processedContent.includes('|')) {
                const parts = processedContent.split('|');
                let foundMatch = false;
                evaluatedValue = ""; // Default empty

                for (const part of parts) {
                    const colonIndex = part.indexOf(':');
                    if (colonIndex > -1) {
                        const condition = part.substring(0, colonIndex).trim();
                        const text = part.substring(colonIndex + 1).trim();
                        
                        const result = evaluateSimpleExpression(condition);
                        const isTrue = typeof result === 'boolean' ? result : Number(result) > 0;
                        
                        if (isTrue) {
                            evaluatedValue = text;
                            foundMatch = true;
                            break;
                        }
                    } else {
                        evaluatedValue = part.trim();
                        foundMatch = true;
                        break;
                    }
                }
            }
            else {
                const result = evaluateSimpleExpression(processedContent);
                evaluatedValue = result.toString();
            }
            
            currentExpression = currentExpression.replace(blockWithBraces, evaluatedValue);
        }
        
        return currentExpression;
    }


    public getQualityValue(id: string): number | string {
        const state = this.qualities[id];
        
        if (state?.type === 'S' && 'stringValue' in state) {
             return `'${state.stringValue.replace(/'/g, "\\'")}'`;
        }
        return this.getEffectiveLevel(id);
    }
    
    private performSkillCheck(match: RegExpMatchArray): SkillCheckResult {
        const [, qualitiesPart, operator, targetStr, bracketContent] = match;
        
        const target = parseInt(this.evaluateBlock(targetStr), 10);

        // 2. Parse Brackets: [Margin, Min%, Max%]
        let margin = target; // Default margin = target (Narrow difficulty)
        let minChance = 0;
        let maxChance = 100;

        if (bracketContent) {
            const args = bracketContent.split(',').map(s => s.trim());
            
            // Resolve Margin (Arg 0)
            if (args[0]) {
                const val = this.evaluateBlock(args[0]);
                margin = parseInt(val, 10);
            }
            
            // Resolve Min Chance (Arg 1)
            if (args[1]) {
                const val = this.evaluateBlock(args[1]);
                minChance = parseInt(val, 10);
            }

            // Resolve Max Chance (Arg 2)
            if (args[2]) {
                const val = this.evaluateBlock(args[2]);
                maxChance = parseInt(val, 10);
            }
        }

        // 3. Evaluate Skill Level
        // Support addition in skill part: "$strength + $sword"
        const skillExpression = qualitiesPart.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => this.getQualityValue(qid).toString());
        const skillLevelResult = evaluateSimpleExpression(skillExpression);
        const skillLevel = typeof skillLevelResult === 'number' ? skillLevelResult : 0;
        
        // 4. Calculate Difficulty Probability
        const lowerBound = target - margin;
        const upperBound = target + margin;

        let successChance = 0.0;
        if (skillLevel <= lowerBound) {
            successChance = 0.0;
        } else if (skillLevel >= upperBound) {
            successChance = 1.0;
        } else {
            if (skillLevel < target) {
                // Range: [Lower ... Target] -> 0% ... 50%
                const denominator = target - lowerBound;
                if (denominator <= 0) successChance = 0.5;
                else {
                    const progress = (skillLevel - lowerBound) / denominator;
                    successChance = progress * 0.5;
                }
            } else { 
                // Range: [Target ... Upper] -> 50% ... 100%
                const denominator = upperBound - target;
                if (denominator <= 0) successChance = 0.5;
                else {
                    const progress = (skillLevel - target) / denominator;
                    successChance = 0.5 + (progress * 0.5);
                }
            }
        }
        
        // Invert if operator is <= (Roll UNDER)
        if (operator === '<=') {
            successChance = 1.0 - successChance;
        }

        // 5. Apply Clamps (Min/Max Chance)
        // Convert 0.0-1.0 to 0-100 for clamping
        let finalPercent = successChance * 100;
        
        // Clamp
        finalPercent = Math.max(minChance, Math.min(maxChance, finalPercent));
        
        const targetPercent = Math.round(finalPercent);
        const rollPercent = Math.floor(Math.random() * 101); // 0-100
        const wasSuccess = rollPercent <= targetPercent;

        return {
            wasSuccess,
            roll: rollPercent,
            target: targetPercent,
            description: `Rolled ${rollPercent} vs ${targetPercent}% (Clamped: ${minChance}-${maxChance}%)`
        };
    }

    private changeQuality(qid: string, op: string, value: number | string, source?: string): void {
        const def = this.worldContent.qualities[qid];
        if (!def) return;

        const stateBefore = this.qualities[qid] ? JSON.parse(JSON.stringify(this.qualities[qid])) : null;
        const previousLevel = (stateBefore && 'level' in stateBefore) ? stateBefore.level : 0;

        if (!this.qualities[qid]) {
            this.qualities[qid] = this.createInitialState(qid, def.type);
        }

        const qState = this.qualities[qid];

        // --- SECTION 1: Perform all state changes ---
        
        if (qState.type === QualityType.String) {
            if (typeof value === 'string' && op === '=') { qState.stringValue = value; }
        }
        
        else if (typeof value === 'number') { 
            const val = Number(value);

            if (qState.type === QualityType.Pyramidal) {
                if (op === '=' || op === '*=' || op === '/=' || op === '%=') {
                    if (op === '=') qState.level = val;
                    if (op === '*=') qState.level = Math.floor(qState.level * val);
                    if (op === '/=') qState.level = Math.floor(qState.level / val);
                    if (op === '%=') qState.level = Math.floor(qState.level % val);
                    
                    qState.changePoints = 0; // Reset CP on hard level set
                } 
                else {
                    switch(op) {
                        case '++': case '+=': qState.changePoints += val; break;
                        case '--': case '-=': qState.changePoints -= val; break;
                    }
                    this.updatePyramidalLevel(qState);
                }
            }

            else if (qState.type === QualityType.Item) {
                switch(op) {
                    case '++': qState.level++; break;
                    case '--': qState.level--; break;
                    case '=': qState.level = val; qState.sources = []; qState.spentTowardsPrune = 0; break;
                    case '+=': qState.level += val; break;
                    case '-=': qState.level -= val; break;
                    case '*=': qState.level = Math.floor(qState.level * val); break;
                    case '/=': qState.level = Math.floor(qState.level / val); break;
                    case '%=': qState.level = Math.floor(qState.level % val); break;
                }
                if (source) qState.sources.push(source);
                if(qState.level < previousLevel){
                    this.pruneItemSourcesIfNeeded(qid, previousLevel - qState.level);
                }
            }

            else if ('level' in qState) { // Counter, Tracker, Equipable
                switch(op) {
                    case '++': qState.level++; break;
                    case '--': qState.level--; break;
                    case '=': qState.level = val; break;
                    case '+=': qState.level += val; break;
                    case '-=': qState.level -= val; break;
                    case '*=': qState.level = Math.floor(qState.level * val); break;
                    case '/=': qState.level = Math.floor(qState.level / val); break;
                    case '%=': qState.level = Math.floor(qState.level % val); break;
                }
            }
        }

        // --- SECTION 2: Generate the report based on the final state ---
        
        const stateAfter = this.qualities[qid]; 

        const levelBefore = (stateBefore && 'level' in stateBefore) ? stateBefore.level : 0;
        const cpBefore = (stateBefore && 'changePoints' in stateBefore) ? stateBefore.changePoints : 0;
        const levelAfter = (stateAfter && 'level' in stateAfter) ? stateAfter.level : 0;
        const cpAfter = (stateAfter && 'changePoints' in stateAfter) ? stateAfter.changePoints : 0;

        let changeText = `${def.name} has changed.`;

        if (levelAfter > levelBefore) {
            changeText = `${def.name} has increased to ${levelAfter}!`;
        } else if (levelAfter < levelBefore) {
            changeText = `${def.name} has decreased to ${levelAfter}.`;
        } else if (qState.type === QualityType.Pyramidal && 'changePoints' in stateAfter && cpAfter > cpBefore) {
            changeText = `${def.name} has increased...`;
        } else if (qState.type === QualityType.Pyramidal && 'changePoints' in stateAfter && cpAfter < cpBefore) {
            changeText = `${def.name} has decreased...`;
        } else if (qState.type === QualityType.String && 'stringValue' in stateAfter) {
            changeText = `${def.name} is now ${stateAfter.stringValue}.`;
        }
        
        const stringValueAfter = ('stringValue' in stateAfter) ? stateAfter.stringValue : undefined;

        this.changes.push({
            qid,
            qualityName: def.name || qid,
            type: def.type,
            category: def.category, 
            levelBefore,
            cpBefore,
            levelAfter,
            cpAfter,
            stringValue: stringValueAfter,
            changeText,
        });
    }

    private createInitialState(qid: string, type: QualityType): QualityState {
        switch (type) {
            case QualityType.String:
                return { qualityId: qid, type, stringValue: "" };
            case QualityType.Item:
                return { qualityId: qid, type, level: 0, sources: [], spentTowardsPrune: 0 };
            case QualityType.Pyramidal:
                return { qualityId: qid, type, level: 0, changePoints: 0 };
            case QualityType.Equipable:
                return { qualityId: qid, type, level: 0 }; 
            case QualityType.Counter:
            case QualityType.Tracker:
                return { qualityId: qid, type, level: 0 };
        }
    }
    
    private updatePyramidalLevel(qState: QualityState) {
        if (qState.type !== QualityType.Pyramidal) return;

        let cpNeeded = getCPforNextLevel(qState.level);
        while (qState.changePoints >= cpNeeded && cpNeeded > 0) {
            qState.level++;
            qState.changePoints -= cpNeeded;
            cpNeeded = getCPforNextLevel(qState.level);
        }

        while (qState.changePoints < 0) {
            if (qState.level === 0) {
                qState.changePoints = 0; 
                break;
            }
            const cpForPrevious = getCPforNextLevel(qState.level - 1);
            qState.changePoints += cpForPrevious;
            qState.level--;
        }
    }

    private pruneItemSourcesIfNeeded(id: string, amountDecreased: number): void {
        const qState = this.qualities[id];
        if (qState?.type !== QualityType.Item || qState.sources.length <= 1) return;

        qState.spentTowardsPrune += amountDecreased;
        
        const itemsBeforeDecrease = qState.level + amountDecreased;
        const itemsPerSource = itemsBeforeDecrease / qState.sources.length;

        if (itemsPerSource <= 0 || qState.spentTowardsPrune < itemsPerSource) return;

        let sourcesToPrune = Math.floor(qState.spentTowardsPrune / itemsPerSource);
        
        for (let i = 0; i < sourcesToPrune; i++) {
            if (qState.sources.length <= 1) break;

            const primaryTarget = this.resolutionPruneTargets[id];
            let removed = false;

            if (primaryTarget && qState.sources.includes(primaryTarget)) {
                const index = qState.sources.indexOf(primaryTarget);
                qState.sources.splice(index, 1);
                delete this.resolutionPruneTargets[id];
                removed = true;
            } else {
                const counts = qState.sources.reduce((acc, val) => acc.set(val, (acc.get(val) || 0) + 1), new Map<string, number>());
                const duplicate = Array.from(counts.entries()).find(([_, count]) => count > 1);
                if (duplicate) {
                    const index = qState.sources.indexOf(duplicate[0]);
                    qState.sources.splice(index, 1);
                    removed = true;
                }
            }

            if (removed) {
                qState.spentTowardsPrune -= itemsPerSource;
            } else {
                break;
            }
        }
    }

    private parseQualityChangesForDisplay(effects?: string, qualitiesBefore?: PlayerQualities): string[] {
        return [];
    }

    public renderStorylet(storylet: Storylet | Opportunity): Storylet | Opportunity {
        // Deep copy to avoid mutating the cache
        const rendered = JSON.parse(JSON.stringify(storylet));

        // 1. Render Main Fields
        rendered.name = this.evaluateBlock(rendered.name);
        rendered.text = this.evaluateBlock(rendered.text);
        if (rendered.short) rendered.short = this.evaluateBlock(rendered.short);
        if (rendered.metatext) rendered.metatext = this.evaluateBlock(rendered.metatext);

        // 2. Render Options
        if (rendered.options) {
            rendered.options = rendered.options.map((opt: ResolveOption) => {
                const rOpt = { ...opt };
                rOpt.name = this.evaluateBlock(rOpt.name);
                if (rOpt.short) rOpt.short = this.evaluateBlock(rOpt.short);
                if (rOpt.meta) rOpt.meta = this.evaluateBlock(rOpt.meta);
                
                if (rOpt.action_cost) {
                    const val = this.evaluateBlock(rOpt.action_cost);
                    rOpt.computed_action_cost = parseInt(val, 10) || 0;
                } else {
                    // Default is 1.
                    rOpt.computed_action_cost = 1;
                }
                
                return rOpt;
            });
        }

        return rendered;
    }
}