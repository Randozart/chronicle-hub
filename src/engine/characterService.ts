// src/engine/characterService.ts
import { processAutoEquip } from './resolutionService'; 
import clientPromise from '@/engine/database';
import { PlayerQualities, CharacterDocument, WorldConfig, QualityType, PendingEvent, QualityChangeInfo } from '@/engine/models';
import { getWorldConfig, getSettings } from '@/engine/worldService'; 
import { GameEngine } from './gameEngine';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';

// --- LIVING STORIES EXECUTION ---

export const checkLivingStories = async (character: CharacterDocument): Promise<CharacterDocument> => {
    if (!character.pendingEvents || character.pendingEvents.length === 0) return character;

    const now = new Date();
    // Find events that are due
    const eventsToFire = character.pendingEvents.filter(e => now >= new Date(e.triggerTime));
    
    if (eventsToFire.length === 0) return character;

    console.log(`[LivingStory] Processing ${eventsToFire.length} events for ${character.characterId}`);

    const gameData = await getWorldConfig(character.storyId);
    
    // Instantiate Engine to apply effects
    // We pass the character's current state. The engine will mutate a copy, so we need to grab it back.
    const engine = new GameEngine(character.qualities, gameData, character.equipment);

    // Keep track of events to remove or re-schedule
    const eventsToRemoveIds = new Set<string>();
    const newRecurrences: PendingEvent[] = [];

    for (const event of eventsToFire) {
        eventsToRemoveIds.add(event.instanceId);

        // 1. APPLY EFFECT
        if (event.scope === 'category') {
            // Batch Operation: Find all qualities in this category
            const categoryName = event.targetId; // targetId holds category name for scope='category'
            
            const affectedQids = Object.values(gameData.qualities)
                .filter(q => q.category?.split(',').map(c => c.trim()).includes(categoryName))
                .map(q => q.id);

            console.log(`[LivingStory] Batch executing on category '${categoryName}'. Qualities: ${affectedQids.join(', ')}`);

            for (const qid of affectedQids) {
                // Construct effect string: "$quality += 1"
                const effectString = `$${qid} ${event.op} ${event.value}`;
                engine.applyEffects(effectString);
            }
        } else {
            // Single Quality Operation
            const effectString = `$${event.targetId} ${event.op} ${event.value}`;
            engine.applyEffects(effectString);
        }

        // 2. HANDLE RECURRENCE
        if (event.recurring && event.intervalMs && event.intervalMs > 0) {
            
            const oldTriggerTime = new Date(event.triggerTime).getTime();
            const nextTriggerTime = new Date(oldTriggerTime + event.intervalMs);
            
            newRecurrences.push({
                ...event,
                instanceId: uuidv4(),
                triggerTime: nextTriggerTime,
                // recurring: true // (Implicitly copied via ...event)
            });
            console.log(`[LivingStory] Re-scheduling recurring event...`);
        }
    }

    // 3. UPDATE CHARACTER STATE
    character.qualities = engine.getQualities();
    
    // Remove fired events
    character.pendingEvents = character.pendingEvents.filter(e => !eventsToRemoveIds.has(e.instanceId));
    
    // Add recurrences
    character.pendingEvents.push(...newRecurrences);
    
    // 4. SAVE
    await saveCharacterState(character);

    return character;
};


// --- INSTRUCTION PROCESSING (Called by API) ---

export const processScheduledUpdates = (character: CharacterDocument, instructions: any[]) => {
    if (!instructions || instructions.length === 0) return;

    if (!character.pendingEvents) character.pendingEvents = [];

    const removals = instructions.filter(i => ['cancel', 'reset', 'update'].includes(i.type));
    const additions = instructions.filter(i => ['schedule', 'reset', 'update'].includes(i.type));

    // 1. PROCESS REMOVALS
    for (const instr of removals) {
        const { scope, targetId, target } = instr; 
        
        // FIX: Explicitly type 'e' as PendingEvent
        let matches: PendingEvent[] = character.pendingEvents.filter((e: PendingEvent) => 
            e.scope === scope && e.targetId === targetId
        );

        if (matches.length === 0) continue;

        // Sort based on target type
        if (target.type === 'first') {
            // FIX: Explicitly type 'a' and 'b'
            matches.sort((a: PendingEvent, b: PendingEvent) => new Date(a.triggerTime).getTime() - new Date(b.triggerTime).getTime());
        } else if (target.type === 'last') {
            matches.sort((a: PendingEvent, b: PendingEvent) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime());
        }

        // Slice the count
        const count = target.count || (target.type === 'all' ? Infinity : 1);
        
        // FIX: Explicitly type 'toRemove'
        const toRemove: PendingEvent[] = matches.slice(0, count);
        
        // FIX: Explicitly type 'e' inside map
        const toRemoveIds = new Set(toRemove.map((e: PendingEvent) => e.instanceId));

        // Remove them
        character.pendingEvents = character.pendingEvents.filter((e: PendingEvent) => !toRemoveIds.has(e.instanceId));
    }

    // 2. PROCESS ADDITIONS (This part was fine, but including context)
    for (const instr of additions) {
        if (instr.op && instr.intervalMs) {
            
            // CHANGED: Check 'unique' boolean flag
            if (instr.unique) {
                const exists = character.pendingEvents.some(e => 
                    e.scope === instr.scope && 
                    e.targetId === instr.targetId && 
                    e.op === instr.op && 
                    e.value === instr.value
                );
                if (exists) continue; // Skip if unique and exists
            }

            const newEvent: PendingEvent = {
                instanceId: uuidv4(),
                scope: instr.scope,
                targetId: instr.targetId,
                op: instr.op,
                value: instr.value,
                triggerTime: new Date(Date.now() + instr.intervalMs),
                
                // CHANGED: Map instruction flag to event property
                recurring: !!instr.recurring,
                
                intervalMs: instr.intervalMs,
                description: instr.description
            };
            
            character.pendingEvents.push(newEvent);
        }
    }
};


// --- DATABASE INTERACTION ---

export const getCharacter = async (userId: string, storyId: string, characterId?: string): Promise<CharacterDocument | null> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const query: any = { userId, storyId };
        if (characterId) query.characterId = characterId;

        const chars = await db.collection<CharacterDocument>(COLLECTION_NAME)
            .find(query)
            .sort({ lastActionTimestamp: -1 })
            .limit(1)
            .toArray();

        return chars.length > 0 ? chars[0] : null;
    } catch (e) {
        console.error('DB Error:', e);
        return null;
    }
};

export const getCharactersList = async (userId: string, storyId: string) => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const chars = await db.collection<CharacterDocument>(COLLECTION_NAME)
        .find({ userId, storyId })
        .project({ 
            _id: 1, 
            characterId: 1, 
            name: 1, 
            currentLocationId: 1, 
            lastActionTimestamp: 1,
            "qualities.player_portrait": 1 
        })
        .sort({ lastActionTimestamp: -1 })
        .toArray();

    return chars.map(c => {
        const portraitQ = c.qualities?.['player_portrait'];
        const portraitCode = (portraitQ && portraitQ.type === 'S') ? portraitQ.stringValue : null;

        return {
            characterId: c.characterId || c._id.toString(),
            name: c.name || "Unknown Drifter",
            currentLocationId: c.currentLocationId || "start",
            lastActionTimestamp: c.lastActionTimestamp?.toString(),
            portrait: portraitCode
        };
    });
};

export const getOrCreateCharacter = async (
    userId: string, 
    storyId: string,
    choices?: Record<string, string>
): Promise<CharacterDocument> => {
    console.log(`[CharCreate] Starting for ${storyId}`);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<CharacterDocument>(COLLECTION_NAME);
    const worldContent = await getWorldConfig(storyId);
    const initialQualities: PlayerQualities = {};
    const rules = worldContent.char_create || {};
    
    // PHASE 1: Direct Values
    for (const key in rules) {
        // ... (standard logic)
        const qid = key.replace('$', '');
        const ruleObj = rules[key]; // Now an object or string
        let rule = typeof ruleObj === 'string' ? ruleObj : ruleObj.rule;

        const def = worldContent.qualities[qid];
        let type = def?.type || inferType(rule);
        
        let value: string | number | null = null;

        if (choices && choices[qid] !== undefined) {
             value = choices[qid];
        } else if (rule.includes('|')) {
             // Default to first option logic if needed
             // ...
        } else if (!isNaN(Number(rule))) {
             value = Number(rule);
        } else if (rule === 'string') {
             value = "";
        }

        if (value !== null) {
            const numVal = Number(value);
            if (type === QualityType.String) {
                initialQualities[qid] = { qualityId: qid, type, stringValue: String(value) };
            } else {
                initialQualities[qid] = { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal, changePoints: 0 } as any;
            }
        }
    }

    // PHASE 2: Calculations
    const tempEngine = new GameEngine(initialQualities, worldContent);
    for (const key in rules) {
        const qid = key.replace('$', '');
        if (initialQualities[qid]) continue;
        
        const ruleObj = rules[key];
        const rule = typeof ruleObj === 'string' ? ruleObj : ruleObj.rule;

        if (rule.includes('$') || rule.includes('+') || rule.includes('*') || rule.includes('{')) {
            try {
                // Use evaluateText for robustness
                const result = tempEngine.evaluateText(`{${rule}}`);
                const def = worldContent.qualities[qid];
                const isNumber = !isNaN(Number(result)) && result.trim() !== "";
                let type = def?.type || (isNumber ? QualityType.Pyramidal : QualityType.String);
                
                if (type === QualityType.String) {
                     initialQualities[qid] = { qualityId: qid, type, stringValue: result };
                } else {
                     initialQualities[qid] = { qualityId: qid, type, level: Number(result) || 0 } as any;
                }
            } catch (e) { console.error(e); }
        }
    }

    const initialDeckCharges: Record<string, number> = {};
    const initialLastDeckUpdate: Record<string, Date> = {};
    if (worldContent.decks) {
        for (const deckId in worldContent.decks) {
            const deckDef = worldContent.decks[deckId];
            const sizeStr = tempEngine.evaluateText(`{${deckDef.deck_size || '0'}}`);
            initialDeckCharges[deckId] = parseInt(sizeStr) || 0;
            initialLastDeckUpdate[deckId] = new Date();
        }
    }

    if (worldContent.settings.useActionEconomy) {
        const actionQid = worldContent.settings.actionId.replace('$', '');
        if (!initialQualities[actionQid]) {
             initialQualities[actionQid] = { qualityId: actionQid, type: QualityType.Counter, level: 20 };
        }
    }

    const startingLocation = choices?.['location'] || worldContent.settings.startLocation || 'village';
    let charName = choices?.['player_name'] || (initialQualities['player_name'] as any)?.stringValue || "Unknown";

    const newCharacter: CharacterDocument = {
        characterId: uuidv4(),
        name: charName,
        userId,
        storyId,
        qualities: initialQualities,
        currentLocationId: startingLocation,
        currentStoryletId: "",
        opportunityHands: {},
        deckCharges: initialDeckCharges,
        lastDeckUpdate: initialLastDeckUpdate,
        equipment: {},
        lastActionTimestamp: new Date(),
        pendingEvents: [],
        acknowledgedMessages: []
    };

    const initialChanges: QualityChangeInfo[] = [];
    for (const qid in newCharacter.qualities) {
        const qualityState = newCharacter.qualities[qid];
        const qualityDef = worldContent.qualities[qid];

        // We only care about equippable items that the character is starting with.
        if (qualityDef?.type === QualityType.Equipable && 'level' in qualityState && qualityState.level > 0) {
            initialChanges.push({
                qid: qid,
                qualityName: qualityDef?.name || qid,
                type: QualityType.Equipable,
                levelBefore: 0, // It came from nothing
                cpBefore: 0,
                levelAfter: qualityState.level, // The level it was created with
                cpAfter: 0,
                changeText: "Character started with this item." // A descriptive text
            });
        }
    }

    if (initialChanges.length > 0) {
        console.log(`[CharCreate] Found ${initialChanges.length} equippable items. Checking for auto-equip.`);
        processAutoEquip(newCharacter, initialChanges, worldContent);
    }

    await collection.insertOne(newCharacter);
    
    return newCharacter;
};

export const saveCharacterState = async (character: CharacterDocument): Promise<boolean> => {
    const { userId, storyId, characterId, ...data } = character;
    if (!characterId) return false;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION_NAME).updateOne(
        { characterId, userId }, 
        { $set: data }
    );
    return true;
};

export const regenerateActions = async (character: CharacterDocument): Promise<CharacterDocument> => {
    const settings = await getSettings(character.storyId);
    if (!settings.useActionEconomy) return character;
    const lastTimestamp = character.lastActionTimestamp ? new Date(character.lastActionTimestamp) : new Date();
    const now = new Date();
    const minutesPassed = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60);
    const regenInterval = settings.regenIntervalInMinutes || 10;
    const ticks = Math.floor(minutesPassed / regenInterval);
    if (ticks <= 0) return character;
    
    const worldConfig = await getWorldConfig(character.storyId);
    const engine = new GameEngine(character.qualities, worldConfig, character.equipment);
    const regenRaw = settings.regenAmount || 1;
    const actionQid = settings.actionId.replace('$', '');
    
    if (!isNaN(Number(regenRaw))) {
        const amount = Number(regenRaw) * ticks;
        const maxStr = settings.maxActions || 20;
        const maxVal = parseInt(engine.evaluateText(`{${maxStr}}`), 10) || 20;
        const current = engine.getEffectiveLevel(actionQid);
        if (character.qualities[actionQid]) {
            (character.qualities[actionQid] as any).level = Math.min(maxVal, current + amount);
        }
    } else {
        const effectString = String(regenRaw);
        const safeTicks = Math.min(ticks, 100);
        for (let i = 0; i < safeTicks; i++) { engine.applyEffects(effectString); }
        character.qualities = engine.getQualities();
    }
    character.lastActionTimestamp = new Date(lastTimestamp.getTime() + ticks * regenInterval * 60 * 1000);
    return character;
};

// Helper for inferType
const inferType = (value: any): QualityType => {
    if (typeof value === 'string' && isNaN(Number(value))) return QualityType.String;
    return QualityType.Pyramidal;
};