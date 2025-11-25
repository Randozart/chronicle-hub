// src/engine/characterService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities, CharacterDocument, WorldContent, QualityType } from '@/engine/models';
// If you implemented contentCache, use that. Otherwise use worldService.
// import { getContent, getSettings } from '@/engine/contentCache'; 
import { getWorldContent, getSettings } from '@/engine/worldService'; 
import { GameEngine } from './gameEngine';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';

// --- RETRIEVAL FUNCTIONS ---

export const getCharacter = async (userId: string, storyId: string): Promise<CharacterDocument | null> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<CharacterDocument>(COLLECTION_NAME);
        const character = await collection.findOne({ userId, storyId });
        return character;
    } catch (e) {
        console.error('Database error fetching character:', e);
        return null;
    }
};

// --- CREATION FUNCTIONS ---

// Helper to determine type from JSON definition
const getQualityType = (content: WorldContent, qid: string): QualityType => {
    return content.qualities[qid]?.type || QualityType.Counter;
};

// Helper to standardise state creation
function createQualityState(qid: string, type: QualityType, value: string | number) {
    const numVal = Number(value);
    switch (type) {
        case QualityType.String: return { qualityId: qid, type, stringValue: String(value) };
        case QualityType.Pyramidal: return { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal, changePoints: 0 };
        case QualityType.Item: return { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal, sources: [], spentTowardsPrune: 0 };
        case QualityType.Equipable: return { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal }; 
        default: return { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal };
    }
}

export const getOrCreateCharacter = async (
    userId: string, 
    storyId: string,
    choices?: Record<string, string>
): Promise<CharacterDocument> => {
    
    // 1. Check if character exists
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<CharacterDocument>(COLLECTION_NAME);
    const existingCharacter = await collection.findOne({ userId, storyId });
    
    if (existingCharacter) return existingCharacter;

    // 2. Load World Data
    // NOTE: If you are using contentCache, change this to getContent(storyId)
    const worldContent = await getWorldContent(storyId);
    
    const initialQualities: PlayerQualities = {};
    const rules = worldContent.char_create;
    
    // 3. PHASE 1: Apply User Choices & Static Values
    for (const key in rules) {
        const qid = key.replace('$', '');
        const rule = rules[key];
        const type = getQualityType(worldContent, qid);

        let value: string | number | null = null;

        // Is it a user input? (Defined as 'string' or choice 'A|B' in JSON)
        if (rule === 'string' || rule.includes('|')) {
            const userChoice = choices?.[qid];
            if (userChoice) value = userChoice;
            else value = rule.includes('|') ? rule.split('|')[0].trim() : ""; // Default fallback
        } 
        // Is it a static number?
        else if (!isNaN(Number(rule))) {
            value = Number(rule);
        }

        // Apply if we found a direct value
        if (value !== null) {
            initialQualities[qid] = createQualityState(qid, type, value);
        }
    }

    // 4. PHASE 2: Calculate Derived Values (e.g., "$player_name")
    // We instantiate a temporary engine populated with Phase 1 data
    const tempEngine = new GameEngine(initialQualities, worldContent);

    for (const key in rules) {
        const qid = key.replace('$', '');
        const rule = rules[key];
        
        // Skip things we already processed
        if (initialQualities[qid]) continue;

        // If it involves other variables (contains '$'), evaluate it
        if (rule.includes('$')) {
            const result = tempEngine.evaluateBlock(`{${rule}}`);
            const type = getQualityType(worldContent, qid);
            initialQualities[qid] = createQualityState(qid, type, result);
        }
    }

    // 5. Setup System Defaults
    const initialDeckCharges: Record<string, number> = {};
    const initialLastDeckUpdate: Record<string, Date> = {};
    
    for (const deckId in worldContent.decks) {
        const deckDef = worldContent.decks[deckId];
        const sizeStr = tempEngine.evaluateBlock(`{${deckDef.deck_size || '0'}}`);
        initialDeckCharges[deckId] = parseInt(sizeStr) || 0;
        initialLastDeckUpdate[deckId] = new Date();
    }

    const startingLocation = choices?.['location'] || worldContent.char_create['$location'] || 'village';

    // 6. Action Economy Setup
    if (worldContent.settings.useActionEconomy) {
        const maxActionsValue = typeof worldContent.settings.maxActions === 'number'
            ? worldContent.settings.maxActions
            : 0;
            
        const actionQid = worldContent.settings.actionId.replace('$', '');
        initialQualities[actionQid] = {
            qualityId: actionQid,
            type: QualityType.Counter,
            level: maxActionsValue
        };
    }

    const newCharacter: CharacterDocument = {
        userId,
        storyId,
        qualities: initialQualities,
        currentLocationId: startingLocation,
        currentStoryletId: "",
        opportunityHands: {},
        deckCharges: initialDeckCharges,
        lastDeckUpdate: initialLastDeckUpdate,
        equipment: {},
        lastActionTimestamp: new Date()
    };

    await collection.insertOne(newCharacter);
    return newCharacter;
};

// --- UPDATE FUNCTIONS ---

export const saveCharacterState = async (character: CharacterDocument): Promise<boolean> => {
    const { userId, storyId, ...characterDataToSet } = character;
    if (!userId || !storyId) return false;

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<CharacterDocument>(COLLECTION_NAME);
        const result = await collection.updateOne({ userId, storyId }, { $set: characterDataToSet });
        return result.modifiedCount > 0;
    } catch (e) {
        console.error('Database error saving character state:', e);
        return false;
    }
};

export const regenerateActions = async (character: CharacterDocument): Promise<CharacterDocument> => {
    const settings = await getSettings(character.storyId);
    if (!settings.useActionEconomy) return character;
    
    let maxActions: number;
    if (typeof settings.maxActions === 'string') {
        const worldContent = await getWorldContent(character.storyId);
        const tempEngine = new GameEngine(character.qualities, worldContent);
        maxActions = parseInt(tempEngine.evaluateBlock(`{${settings.maxActions}}`), 10);
    } else {
        maxActions = settings.maxActions;
    }

    const lastTimestamp = character.lastActionTimestamp || new Date();
    const now = new Date();
    const minutesPassed = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60);
    const actionsToRegen = Math.floor(minutesPassed / settings.regenIntervalInMinutes);

    if (actionsToRegen > 0) {
        const actionQid = settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid];
        if (actionsState && 'level' in actionsState) {
            const newActionTotal = Math.min(maxActions, actionsState.level + (actionsToRegen * settings.regenAmount));
            actionsState.level = newActionTotal;
            character.lastActionTimestamp = new Date(lastTimestamp.getTime() + actionsToRegen * settings.regenIntervalInMinutes * 60 * 1000);
        }
    }
    
    return character;
}