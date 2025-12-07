// src/engine/gameEngine.ts

import {
    PlayerQualities, QualityState, QualityType, ResolveOption, Storylet,
    QualityChangeInfo, WorldConfig, Opportunity, QualityDefinition
} from '@/engine/models';

// Import the new parser we just built
import { evaluateText } from './textProcessor';

// --- TYPE DEFINITIONS for GameEngine ---

type SkillCheckResult = {
    wasSuccess: boolean;
    roll: number;
    targetChance: number;
    description: string;
};

type ScheduleInstruction = any; // We'll let the API handle the specific types

// --- MAIN GAME ENGINE CLASS ---

export class GameEngine {
    private qualities: PlayerQualities;
    private worldQualities: PlayerQualities;
    private worldContent: WorldConfig;
    private equipment: Record<string, string | null>;

    // State for a single resolution
    private changes: QualityChangeInfo[] = [];
    private scheduledUpdates: ScheduleInstruction[] = [];
    private resolutionRoll: number; // The single d100 roll for this action

    constructor(
        initialQualities: PlayerQualities,
        worldContent: WorldConfig,
        currentEquipment: Record<string, string | null> = {},
        worldQualities: PlayerQualities = {}
    ) {
        // Deep copy to prevent state mutations from leaking
        this.qualities = JSON.parse(JSON.stringify(initialQualities));
        this.worldContent = worldContent;
        this.equipment = currentEquipment;
        this.worldQualities = worldQualities;

        // Generate the single random number for this entire action's context
        this.resolutionRoll = Math.random() * 100;
    }

    // --- PUBLIC GETTERS ---

    public getQualities(): PlayerQualities {
        return this.qualities;
    }

     /**
     * Calculates the effective level of a quality, including equipment bonuses.
     * Restored for use in route.ts and regeneration logic.
     */
    public getEffectiveLevel(qid: string): number {
        const baseState = this.qualities[qid];
        let total = (baseState && 'level' in baseState) ? baseState.level : 0;
        
        // Check World State fallback
        if (!baseState && this.worldQualities[qid]) {
             const worldState = this.worldQualities[qid];
             total = ('level' in worldState) ? worldState.level : 0;
        }

        // Add Equipment Bonuses
        for (const slot in this.equipment) {
            const itemId = this.equipment[slot];
            if (!itemId) continue;

            const itemDef = this.worldContent.qualities[itemId];
            if (!itemDef || !itemDef.bonus) continue;

            // Parse bonus string: "$stat + 1, $other - 2"
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

    public evaluateCondition(expression?: string): boolean {
        if (!expression) return true;
        
        // We wrap the expression in a ScribeScript block that returns "true" or "false" string.
        // e.g. "{ $gold > 10 : true | false }"
        // This reuses the robust parser logic we already built.
        const script = `{ ${expression} : true | false }`;
        const result = this.evaluateText(script);
        
        return result.trim() === 'true';
    }

    // --- CORE RESOLUTION LOGIC ---

    /**
     * Resolves a player's choice on an option, returning the outcome.
     * This is the primary "write" function of the engine.
     */
    public resolveOption(storylet: Storylet | Opportunity, option: ResolveOption) {
        this.changes = [];
        this.scheduledUpdates = [];

        // 1. Determine Success or Failure via the new Challenge field
        const challengeResult = this.evaluateChallenge(option.challenge);
        const isSuccess = challengeResult.wasSuccess;

        // 2. Deprecated "Rare" outcomes are now handled by %random inside text/effects
        const outcomeType = isSuccess ? 'pass' : 'fail';

        // 3. Select the correct text and effects
        const body = isSuccess ? option.pass_long : option.fail_long || "";
        const changeString = isSuccess ? option.pass_quality_change : option.fail_quality_change;
        const redirectId = isSuccess ? option.pass_redirect : option.fail_redirect;
        const moveToId = isSuccess ? option.pass_move_to : option.fail_move_to;
        
        // 4. Apply the effects for the chosen outcome
        if (changeString) {
            this.applyEffects(changeString);
        }

        // 5. Return the complete result for the API to process
        return {
            wasSuccess: isSuccess,
            body: this.evaluateText(body), // Render the result text
            redirectId,
            moveToId,
            qualityChanges: this.changes,
            scheduledUpdates: this.scheduledUpdates,
            skillCheckDetails: challengeResult
        };
    }

    /**
     * The main "read" function. Renders a full storylet object with all ScribeScript evaluated.
     */
    public renderStorylet(storylet: Storylet | Opportunity): Storylet | Opportunity {
        const rendered = JSON.parse(JSON.stringify(storylet)); // Deep copy

        const evalAndAssign = (obj: any, key: string) => {
            if (obj[key]) {
                obj[key] = this.evaluateText(obj[key]);
            }
        };

        // Render all player-facing text fields
        evalAndAssign(rendered, 'name');
        evalAndAssign(rendered, 'text');
        evalAndAssign(rendered, 'short');
        evalAndAssign(rendered, 'metatext');
        evalAndAssign(rendered, 'image_code'); // Universal evaluation!

        if (rendered.options) {
            rendered.options = rendered.options.map((opt: ResolveOption) => {
                const rOpt = { ...opt };
                evalAndAssign(rOpt, 'name');
                evalAndAssign(rOpt, 'short');
                evalAndAssign(rOpt, 'meta');
                return rOpt;
            });
        }
        return rendered;
    }

    /**
     * Public wrapper for the text processor, using this engine's state.
     */
    public evaluateText(rawText: string | undefined): string {
        // The GameEngine provides the state (qualities, defs) and the resolutionRoll to the stateless parser.
        return evaluateText(rawText, this.qualities, this.worldContent.qualities, null, this.resolutionRoll);
    }
    
    // --- PRIVATE HELPER FUNCTIONS ---

    /**
     * Evaluates the new challenge field, which expects a 0-100 probability.
     */
    private evaluateChallenge(challengeString?: string): SkillCheckResult {
        if (!challengeString) {
            return { wasSuccess: true, roll: -1, targetChance: 100, description: "Automatic success." };
        }

        const evaluatedChance = this.evaluateText(`{${challengeString}}`);
        let targetChance = parseInt(evaluatedChance, 10);

        if (isNaN(targetChance)) {
            console.warn(`[GameEngine] Challenge expression "${challengeString}" did not resolve to a number. Defaulting to 100% success.`);
            targetChance = 100;
        }
        
        targetChance = Math.max(0, Math.min(100, targetChance));
        const wasSuccess = this.resolutionRoll < targetChance;

        return {
            wasSuccess,
            roll: Math.floor(this.resolutionRoll),
            targetChance,
            description: `Rolled ${Math.floor(this.resolutionRoll)} vs Target ${targetChance}%`
        };
    }

    /**
     * Parses and executes a comma-separated list of effect strings.
     */
    public applyEffects(effectsString: string): void {
        const resolvedString = this.evaluateText(`{${effectsString}}`);
        
        const effects = resolvedString.split(',');
        for (const effect of effects) {
            this.applySingleEffect(effect.trim());
        }
    }

    /**
     * Parses and executes a single ScribeScript effect. This is the heart of the "write" engine.
     */
    private applySingleEffect(effect: string): void {
        if (!effect) return;

        // --- 1. PARSE MACROS FIRST ---
        const macroMatch = effect.match(/^\{%([a-zA-Z_]+)\[(.*?)\]\}$/);
        if (macroMatch) {
            const [, command, fullArgsStr] = macroMatch;
            if (['schedule', 'reset', 'update', 'cancel'].includes(command)) {
                this.parseAndQueueTimerInstruction(command, fullArgsStr);
                return;
            }
        }

        // --- 2. PARSE CUSTOM PROPERTY ASSIGNMENT ---
        const customPropMatch = effect.match(/^\$([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
        if (customPropMatch) {
            const [, qid, propName, valueStr] = customPropMatch;
            const value = this.evaluateText(`{${valueStr}}`);
            
            if (!this.qualities[qid]) {
                const def = this.worldContent.qualities[qid];
                if (def) this.qualities[qid] = { qualityId: qid, type: def.type } as any;
                else return;
            }
            if (!this.qualities[qid].customProperties) {
                this.qualities[qid].customProperties = {};
            }
            this.qualities[qid].customProperties![propName] = isNaN(Number(value)) ? value : Number(value);
            return;
        }
        
        // --- 3. PARSE STANDARD EFFECT: $QUALITY[METADATA] OP VALUE ---
        const effectRegex = /^\$([a-zA-Z0-9_]+)(?:\[(.*?)\])?\s*(\+\+|--|[\+\-\*\/%]=|=)\s*(.*)$/;
        const effectMatch = effect.match(effectRegex);
        
        if (effectMatch) {
            const [, qid, metadataStr, op, valueStr] = effectMatch;
            
            const metadata: { desc?: string; source?: string } = {};
            if (metadataStr) {
                const metaParts = metadataStr.split(',');
                for (const part of metaParts) {
                    const [key, ...val] = part.split(':');
                    const value = val.join(':').trim();
                    if (key.trim() === 'desc') metadata.desc = value;
                    if (key.trim() === 'source') metadata.source = value;
                }
            }

            const resolvedValueStr = this.evaluateText(`{${valueStr}}`);
            let value: number | string;
            const def = this.worldContent.qualities[qid];
            if (def && def.type === QualityType.String) {
                value = resolvedValueStr;
            } else {
                value = parseFloat(resolvedValueStr);
            }

            this.changeQuality(qid, op, value, metadata);
            return;
        }
    }

    /**
     * NEW FUNCTION: Parses a timer macro string and adds a structured instruction
     * to the `scheduledUpdates` queue for the API to process.
     */
    private parseAndQueueTimerInstruction(command: string, fullArgsStr: string): void {
        const [requiredArgsStr, optionalArgsStr] = fullArgsStr.split(';').map(s => s ? s.trim() : '');
        
        let effect: string | undefined, timeStr: string | undefined;
        let targetId = '';
        let scope: 'quality' | 'category' = 'quality';

        if (command === 'cancel') {
            targetId = requiredArgsStr;
        } else {
            const parts = requiredArgsStr.split(':');
            effect = parts.slice(0, -1).join(':').trim();
            timeStr = parts.slice(-1)[0].trim();
        }

        const allMatch = targetId.match(/\{%all\[(.*?)\]\}/) || effect?.match(/\{%all\[(.*?)\]\}/);
        if (allMatch) {
            scope = 'category';
            targetId = allMatch[1];
        } else {
            const qualityMatch = targetId.match(/\$([a-zA-Z0-9_]+)/) || effect?.match(/\$([a-zA-Z0-9_]+)/);
            if (qualityMatch) {
                targetId = qualityMatch[1];
            }
        }
        
        if (!targetId) {
            console.warn(`[GameEngine] Could not parse target for timer macro: ${command}`);
            return;
        }

        const modifiers: any = { 
            target: { type: 'all', count: Infinity },
            unique: false,    // Admission Control
            recurring: false  // Execution Behavior
        };

        if (optionalArgsStr) {
            const descIndex = optionalArgsStr.indexOf('desc:');
            let keywordPart = optionalArgsStr;
            if (descIndex !== -1) {
                modifiers.description = this.evaluateText(optionalArgsStr.substring(descIndex + 5).trim());
                keywordPart = optionalArgsStr.substring(0, descIndex);
            }

            const keywords = keywordPart.split(',').map(s => s.trim()).filter(Boolean);
            for (const kw of keywords) {
                // CHANGED: Independent checks
                if (kw === 'unique') modifiers.unique = true;
                if (kw === 'recur') modifiers.recurring = true;
                
                if (kw === 'invert') modifiers.invert = true;
                else {
                    const targetMatch = kw.match(/^(first|last)(?:\s+(\d+))?$/);
                    if (targetMatch) {
                        modifiers.target = {
                            type: targetMatch[1],
                            count: targetMatch[2] ? parseInt(targetMatch[2], 10) : 1
                        };
                    }
                }
            }
        }
        
        const instruction: any = {
            type: command,
            scope,
            targetId,
            ...modifiers
        };

        if (effect && timeStr) {
            const effectMatch = effect.match(/(?:=|\+=|-=)\s*(.*)/);
            if (effectMatch) {
                instruction.op = effectMatch[0].match(/(=|\+=|-=)/)![0];
                instruction.value = parseInt(effectMatch[1].trim(), 10);
            }
            const timeMatch = timeStr.match(/(\{.*\d+\}|\d+)\s*([mhd])/);
            if (timeMatch) {
                const timeValue = parseInt(this.evaluateText(timeMatch[1]), 10);
                const unit = timeMatch[2];
                instruction.intervalMs = timeValue * (unit === 'h' ? 3600000 : unit === 'd' ? 86400000 : 60000);
            }
        }
        
        this.scheduledUpdates.push(instruction);
    }
    
    /**
     * The core state-mutation function.
     */
    private changeQuality(qid: string, op: string, value: number | string, metadata: { desc?: string; source?: string }): void {
        const def = this.worldContent.qualities[qid];
        if (!def) {
            console.warn(`[GameEngine] Attempted to change non-existent quality: ${qid}`);
            return;
        }

        const stateBefore = this.qualities[qid] ? JSON.parse(JSON.stringify(this.qualities[qid])) : null;
        
        if (!this.qualities[qid]) {
            this.qualities[qid] = { qualityId: qid, type: def.type, level: 0, changePoints: 0, stringValue: "", sources: [], customProperties: {} } as any;
        }

        const qState = this.qualities[qid] as any;
        const levelBefore = qState.level || 0;
        const cpBefore = qState.changePoints || 0;

        if (qState.type === QualityType.String) {
            if (typeof value === 'string' && op === '=') qState.stringValue = value;
        } 
        else if (typeof value === 'number') {
            if (isNaN(value)) {
                console.error(`[GameEngine] Invalid value for effect on ${qid}: Expected number, got '${value}'`);
                return;
            }
            
            const numValue = Math.floor(value);
            const isIncremental = ['+=', '-=', '++', '--'].includes(op);

            if (qState.type === QualityType.Pyramidal) {
                if (isIncremental) {
                    // Check grind cap BEFORE changing
                    if (op === '++' || op === '+=') {
                        if (def.grind_cap) {
                            const grindCapValue = parseInt(this.evaluateText(`{${def.grind_cap}}`), 10);
                            if (!isNaN(grindCapValue) && qState.level >= grindCapValue) {
                                return; // At or above grind cap, do nothing
                            }
                        }
                    }
                    if (op === '++') qState.changePoints += 1;
                    else if (op === '--') qState.changePoints -= 1;
                    else if (op === '+=') qState.changePoints += numValue;
                    else if (op === '-=') qState.changePoints -= numValue;
                    this.updatePyramidalLevel(qState, def);
                } else { // '=' or other hard sets
                    if (op === '=') qState.level = numValue;
                    qState.changePoints = 0;
                }
            } else { // Counter, Tracker, Item, Equipable
                if (isIncremental) {
                    if ((op === '++' || op === '+=') && def.grind_cap) {
                         const grindCapValue = parseInt(this.evaluateText(`{${def.grind_cap}}`), 10);
                         if (!isNaN(grindCapValue) && qState.level >= grindCapValue) return;
                    }
                    if (op === '+=') qState.level += numValue;
                    else if (op === '-=') qState.level -= numValue;
                    else if (op === '++') qState.level += 1;
                    else if (op === '--') qState.level -= 1;
                } else { // '='
                    qState.level = numValue;
                }
            }
            
            if (def.grind_cap && isIncremental && (op === '++' || op === '+=')) {
                const grindCapValue = parseInt(this.evaluateText(`{${def.grind_cap}}`), 10);
                if (!isNaN(grindCapValue) && qState.level > grindCapValue) {
                    qState.level = grindCapValue;
                    if (qState.type === QualityType.Pyramidal) qState.changePoints = 0;
                }
            }

            if (def.max) {
                const maxCap = parseInt(this.evaluateText(`{${def.max}}`), 10);
                if (!isNaN(maxCap) && qState.level > maxCap) {
                    qState.level = maxCap;
                    if (qState.type === QualityType.Pyramidal) qState.changePoints = 0;
                }
            }

            qState.level = Math.floor(qState.level);
        }

        const levelAfter = qState.level || 0;
        const cpAfter = qState.changePoints || 0;
        
        let defaultChangeText = "";

        // CORRECTED LOGIC: Create a temporary engine to evaluate text based on the PREVIOUS state.
        const tempEngineBefore = new GameEngine(stateBefore ? { ...this.qualities, [qid]: stateBefore } : this.qualities, this.worldContent, this.equipment, this.worldQualities);
        const displayName = tempEngineBefore.evaluateText(def.name || qid);

        if (levelAfter > levelBefore) {
            defaultChangeText = this.evaluateText(def.increase_description || `${displayName} has increased to ${levelAfter}!`);
        } else if (levelAfter < levelBefore) {
            defaultChangeText = this.evaluateText(def.decrease_description || `${displayName} has decreased to ${levelAfter}.`);
        } else if (qState.type === QualityType.Pyramidal && cpAfter !== cpBefore) {
            defaultChangeText = `${displayName} has changed...`;
        } else if (qState.type === QualityType.String) {
            defaultChangeText = `${displayName} is now ${qState.stringValue}.`;
        } else if (op === '=') { // Handle cases where a value is set to itself but should still be reported
             defaultChangeText = `${displayName} is set to ${levelAfter}.`;
        } else {
             return; // No change occurred
        }

        this.changes.push({
            qid, qualityName: displayName, type: def.type, category: def.category,
            levelBefore, cpBefore, levelAfter, cpAfter, stringValue: qState.stringValue,
            changeText: defaultChangeText,
            overrideDescription: metadata.desc ? this.evaluateText(metadata.desc) : undefined,
        });
    }
    private updatePyramidalLevel(qState: any, def: QualityDefinition): void {
        if (qState.type !== QualityType.Pyramidal) return;

        // Evaluate the CP cap using the current engine state
        let cpCapValue = Infinity;
        if (def.cp_cap) {
            const parsedCap = parseInt(this.evaluateText(`{${def.cp_cap}}`), 10);
            if (!isNaN(parsedCap)) {
                cpCapValue = parsedCap;
            }
        }
        
        // Leveling Up
        let cpNeeded = Math.min(qState.level + 1, cpCapValue);
        while (qState.changePoints >= cpNeeded && cpNeeded > 0) {
            qState.level++;
            qState.changePoints -= cpNeeded;
            cpNeeded = Math.min(qState.level + 1, cpCapValue);
        }

        // Leveling Down
        while (qState.changePoints < 0) {
            if (qState.level === 0) {
                qState.changePoints = 0; 
                break;
            }
            // The CP needed to *lose* a level is the amount required to *gain* the previous one.
            const cpForPrevious = Math.min(qState.level, cpCapValue);
            qState.changePoints += cpForPrevious;
            qState.level--;
        }
    }
}

