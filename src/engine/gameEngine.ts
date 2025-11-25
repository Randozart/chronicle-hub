// src/engine/gameEngine.ts

import { PlayerQualities, QualityState, QualityType, ResolveOption, Storylet, WorldContent, QualityChangeInfo, WorldConfig } from '@/engine/models';
// import { repositories } from '@/engine/repositories';

const getCPforNextLevel = (level: number): number => {
    // Formula: (Current Level + 1) * 10.
    // Level 0 -> 1 requires 1 CP. Level 1 -> 2 requires 2 CP.
    return level + 1;
};

const evaluateSimpleExpression = (expr: string): number | boolean | string => {
    const sanitizedExpr = expr.trim();
    if (!sanitizedExpr) return 0;

    try {
        // ALLOW STRINGS: If the expression looks like "Hello " + "World", let it run.
        // We do basic sanitization but allow quotes for strings.
        if (/[^a-zA-Z0-9_+\-/*%&|=!<>.\s'"()]/.test(sanitizedExpr)) {
             console.warn(`Unsafe expression: "${sanitizedExpr}"`);
             return sanitizedExpr; 
        }
        
        // This evaluates "10 + 10" -> 20, and "'John' + ' ' + 'Doe'" -> "John Doe"
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
        currentEquipment: Record<string, string | null> = {} // Default to empty
    ) {
        this.qualities = JSON.parse(JSON.stringify(initialQualities));
        this.worldContent = worldContent;
        this.equipment = currentEquipment;
    }

    public getEffectiveLevel(qid: string): number {
        const baseState = this.qualities[qid];
        let total = (baseState && 'level' in baseState) ? baseState.level : 0;

        // Loop through equipped items
        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;

            const itemDef = this.worldContent.qualities[itemId];
            if (!itemDef || !itemDef.bonus) continue;

            // Parse the bonus string. Example: "$mettle + 3, $fellowship + 1"
            const bonuses = itemDef.bonus.split(',');
            for (const bonus of bonuses) {
                // Check if this bonus applies to the requested QID
                // Matches "$mettle + 3" or "$mettle - 1"
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
        // Clear the changes array at the start of every action
        this.changes = []; 
        
        const wasSuccess = this.evaluateCondition(option.random, true);
        const changeString = wasSuccess ? option.pass_quality_change : option.fail_quality_change;
        
        if (changeString) {
            this.evaluateEffects(changeString);
        }
        
        // The return object no longer needs `qualityChanges` as text.
        // It will now return our detailed `changes` array.
        return {
            wasSuccess,
            body: wasSuccess ? option.pass_long : option.fail_long,
            redirectId: wasSuccess ? option.pass_redirect : option.fail_redirect,
            qualityChanges: this.changes, // <-- RETURN THE DETAILED OBJECTS
        };
    }

    public evaluateCondition(expression?: string, isSkillCheck: boolean = false): boolean | SkillCheckResult { // Return type is now a union
        if (!expression) return true;
        
        const finalExpression = this.evaluateBlock(expression);

        if (isSkillCheck) {
            const skillCheckMatch = finalExpression.match(/^\s*\$(.*?)\s*(>=|<=)\s*(\d+)(?:\s*\[(\d+)\])?\s*$/);
            if (skillCheckMatch) {
                // Pass the result object straight through
                return this.performSkillCheck(skillCheckMatch);
            }
            console.warn(`[evaluateCondition] Could not parse skill check format: "${finalExpression}". Assuming success.`);
            return true;
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
        const conditionalMatch = effect.match(/^{\s*(.*?)\s*:\s*(.*?)(?:\s*\|\s*(.*))?\s*}$/);
        if (conditionalMatch) {
            const [, condition, effectIfTrue, effectIfFalse] = conditionalMatch;
            if (this.evaluateCondition(condition)) {
                this.evaluateEffects(effectIfTrue);
            } else if (effectIfFalse) {
                this.evaluateEffects(effectIfFalse);
            }
            return;
        }

        // Regex to match: $all[category_name] = 0
        const allMatch = effect.match(/^\s*\$all\[(.*?)\]\s*(\+=|-=|=)\s*(.*)\s*$/);
        if (allMatch) {
            const [, category, op, valueStr] = allMatch;
            const targetCategory = category.trim();

            console.log(`[GameEngine] Applying '$all' effect to category '${targetCategory}'`);

            // Find all qualities that belong to the target category
            const affectedQids = Object.keys(this.worldContent.qualities).filter(qid => {
                const def = this.worldContent.qualities[qid];
                return def.category?.split(',').map(c => c.trim()).includes(targetCategory);
            });
            
            if (affectedQids.length > 0) {
                // Loop through each affected quality ID and apply the simple effect
                for (const qid of affectedQids) {
                    // Reconstruct the simple effect string (e.g., "$quality_name = 0")
                    const simpleEffect = `$${qid} ${op} ${valueStr}`;
                    // Recursively call applyEffect with the simple string.
                    // This is powerful because it reuses all our existing parsing logic.
                    this.applyEffect(simpleEffect);
                }
            }
            return; // We're done with this effect.
        }

        // Handle ++ and -- operators first, as they have no value part.
        const incrementDecrementMatch = effect.match(/^\s*\$([a-zA-Z0-9_]+)\s*(\+\+|--)\s*$/);
        if (incrementDecrementMatch) {
            const [, qid, op] = incrementDecrementMatch;
            // We pass a value of 1, and the operator will tell changeQuality what to do.
            this.changeQuality(qid, op, 1);
            return; // We're done with this effect.
        }

        const simpleMatch = effect.match(/^\s*\$([a-zA-Z0-9_]+)(?:\[source:([^\]]+)\])?\s*(\+=|-=|=)\s*(.*)\s*$/);
        if (simpleMatch) {
            const [, qid, source, op, valueStr] = simpleMatch;
            
            const resolvedStr = this.evaluateBlock(valueStr);
            
            let value: number | string;

            if (valueStr.includes('"') || valueStr.includes("'")) {
                value = resolvedStr.replace(/['"]/g, '');
            } 
            else {
                const mathResult = evaluateSimpleExpression(resolvedStr);
                value = typeof mathResult === 'number' ? Math.floor(mathResult) : mathResult.toString();
            }

            this.changeQuality(qid, op, value, source);
        }
    }

    public evaluateBlock(content: string): string {
        if (!content) return "";
        let currentExpression = content.trim();
        
        console.log(`[evaluateBlock ENTRY] Processing: "${currentExpression}"`); // DEBUG

        if (!currentExpression.startsWith('{') || !currentExpression.endsWith('}')) {
            return currentExpression;
        }

        // Iteratively resolve blocks
        for (let i = 0; i < 10; i++) {
            const innermostBlockMatch = currentExpression.match(/\{([^{}]+?)\}/);
            if (!innermostBlockMatch) break;

            const blockWithBraces = innermostBlockMatch[0];
            const innerContent = innermostBlockMatch[1].trim();

            let evaluatedValue: string;
            console.log(`[evaluateBlock LOOP] Evaluating inner block: "${innerContent}"`); // DEBUG

            const randomMatch = innerContent.match(/^(\d+)\s*~\s*(\d+)$/);
            if (randomMatch) {
                const min = parseInt(randomMatch[1], 10);
                const max = parseInt(randomMatch[2], 10);
                evaluatedValue = (Math.floor(Math.random() * (max - min + 1)) + min).toString();
            } else {
                let processedContent = innerContent.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => this.getQualityValue(qid).toString());
                
                const result = evaluateSimpleExpression(processedContent);
                console.log(`[evaluateBlock LOOP] Simple expression "${processedContent}" evaluated to:`, result); // DEBUG
                
                // This is now safe because result cannot be undefined
                evaluatedValue = result.toString();
            }
            console.log(`[evaluateBlock LOOP] Replacing "${blockWithBraces}" with "${evaluatedValue}"`); // DEBUG
            currentExpression = currentExpression.replace(blockWithBraces, evaluatedValue);
        }
        
        console.log(`[evaluateBlock EXIT] Final result: "${currentExpression}"`); // DEBUG
        return currentExpression;
    }


    public getQualityValue(id: string): number | string {
        const state = this.qualities[id];
        
        // Return string literals for names, etc.
        if (state?.type === 'S' && 'stringValue' in state) {
             return `'${state.stringValue.replace(/'/g, "\\'")}'`;
        }

        // For everything else, calculate the effective level (Base + Gear)
        return this.getEffectiveLevel(id);
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
        
        else if (typeof value === 'number') { // Added else if for clarity
            if (qState.type === QualityType.Pyramidal) {
                if (op === '=') {
                    qState.level = value;
                    qState.changePoints = 0;
                } else {
                    switch(op) {
                        case '++': case '+=': qState.changePoints += value; break;
                        case '--': case '-=': qState.changePoints -= value; break;
                    }
                    this.updatePyramidalLevel(qState);
                }
            }

            else if (qState.type === QualityType.Item) {
                switch(op) {
                    case '++': qState.level++; break;
                    case '--': qState.level--; break;
                    case '=': qState.level = value; qState.sources = []; qState.spentTowardsPrune = 0; break;
                    case '+=': qState.level += value; break;
                    case '-=': qState.level -= value; break;
                }
                if (source) qState.sources.push(source);
                if(qState.level < previousLevel){
                    this.pruneItemSourcesIfNeeded(qid, previousLevel - qState.level);
                }
            }

            else if ('level' in qState) { // For Counter and Tracker
                switch(op) {
                    case '++': qState.level++; break;
                    case '--': qState.level--; break;
                    case '=': qState.level = value; break;
                    case '+=': qState.level += value; break;
                    case '-=': qState.level -= value; break;
                }
            }
        }

        // --- SECTION 2: Generate the report based on the final state ---
        
        const stateAfter = this.qualities[qid]; // Re-fetch the final state for clarity

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
        
        // Safety check `stringValue` for the push
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
                return { qualityId: qid, type, level: 0 }; // Equipables are like items but simpler state
            case QualityType.Counter:
            case QualityType.Tracker:
                return { qualityId: qid, type, level: 0 };
        }
    }

    private performSkillCheck(match: RegExpMatchArray): boolean {
        const [, qualitiesPart, operator, targetStr, marginStr] = match;
        const target = parseInt(targetStr, 10);
        const margin = marginStr ? parseInt(marginStr, 10) : target;

        // 1. Replace the $quality names with their numerical values.
        const skillExpression = qualitiesPart.replace(/\$([a-zA-Z0-9_]+)/g, (_, qid) => this.getQualityValue(qid).toString());
        
        // 2. Use our existing math evaluator to get the final number.
        const skillLevelResult = evaluateSimpleExpression(skillExpression);
        const skillLevel = typeof skillLevelResult === 'number' ? skillLevelResult : 0;
        
        const lowerBound = target - margin;
        const upperBound = target + margin;

        let successChance = 0.0;
        if (skillLevel <= lowerBound) {
            successChance = 0.0;
        } else if (skillLevel >= upperBound) {
            successChance = 1.0;
        } else {
            if (skillLevel < target) {
                const denominator = target - lowerBound;
                if (denominator <= 0) {
                    successChance = 0.5;
                } else {
                    const progress = (skillLevel - lowerBound) / denominator;
                    successChance = progress * 0.5;
                }
            } else { // skillLevel >= target
                const denominator = upperBound - target;
                if (denominator <= 0) {
                    successChance = 0.5;
                } else {
                    const progress = (skillLevel - target) / denominator;
                    successChance = 0.5 + (progress * 0.5);
                }
            }
        }
        
        if (operator === '<=') {
            successChance = 1.0 - successChance;
        }

        const finalChance = Math.max(0.0, Math.min(1.0, successChance));
        
        const targetPercent = Math.round(finalChance * 100);
        const rollPercent = Math.floor(Math.random() * 101);
        const wasSuccess = rollPercent <= targetPercent;

        console.log('--- SKILL CHECK ---');
        console.log(`Player's effective skill level: ${skillLevel}`); // This will now be a number
        console.log(`Target: ${target}, Margin: ${marginStr || target}`);
        console.log(`Calculated Success Chance: ${targetPercent}%`);
        console.log(`Dice Roll (0-100): ${rollPercent}`);
        console.log(`Result: ${wasSuccess ? 'SUCCESS' : 'FAILURE'}`);
        console.log('-------------------');

        return wasSuccess;
    }
    
    private updatePyramidalLevel(qState: QualityState) {
        if (qState.type !== QualityType.Pyramidal) return;

        // Loop to handle multiple level ups from a single large CP gain
        let cpNeeded = getCPforNextLevel(qState.level);
        while (qState.changePoints >= cpNeeded && cpNeeded > 0) {
            qState.level++;
            qState.changePoints -= cpNeeded;
            cpNeeded = getCPforNextLevel(qState.level);
        }

        // Handle level downs
        while (qState.changePoints < 0) {
            if (qState.level === 0) {
                qState.changePoints = 0; // Can't go below level 0
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
        if (!effects) return [];
        
        const descriptions: string[] = [];
        const effectParts = effects.split(/,\s*/);

        for (const part of effectParts) {
            const effect = part.trim();
            if (!effect) continue;

            // NEW LOGIC: We don't re-evaluate the condition. We just parse out the effect part.
            const conditionalMatch = effect.match(/^{\s*.*?\s*:\s*(.*?)(?:\s*\|.*)?\s*}$/);

            if (conditionalMatch) {
                // If it's a conditional, we assume the 'true' branch was taken and parse its contents.
                // This is a simplification, but it will work for your current case.
                const effectIfTrue = conditionalMatch[1];
                const innerDescriptions = this.parseQualityChangesForDisplay(effectIfTrue);
                descriptions.push(...innerDescriptions);
            } else {
                // This is the same simple match logic that works.
                const simpleMatch = effect.match(/^\s*\$([a-zA-Z0-9_]+)\s*(\+\+|--|\+=|-=|=)\s*(.*)\s*$/);
                
                if (simpleMatch) {
                    const [, qid, op] = simpleMatch;
                    const def = this.worldContent.qualities[qid];
                    if (!def) continue;

                    const finalState = this.qualities[qid];
                    let finalValue = '';
                    if (finalState) {
                        if ('level' in finalState) finalValue = finalState.level.toString();
                        else if ('stringValue' in finalState) finalValue = finalState.stringValue;
                    }

                    let desc = `${def.name} has changed.`;
                    if (op === '++' || op === '+=') desc = `${def.name} has increased.`;
                    else if (op === '--' || op === '-=') desc = `${def.name} has decreased.`;
                    else if (op === '=') desc = `${def.name} is now ${finalValue}.`;
                    
                    descriptions.push(desc);
                }
            }
        }
        return descriptions;
    }
}