import clientPromise from '@/engine/database';
import { PlayerQualities, CharacterDocument, WorldContent, QualityType } from '@/engine/models';
import { getWorldConfig, getSettings } from '@/engine/worldService'; 
import { GameEngine } from './gameEngine';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';

// ... getCharacter and getCharactersList (keep existing) ...
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
        // Fetch specific fields needed for the menu
        .project({ 
            _id: 1, 
            characterId: 1, 
            name: 1, 
            currentLocationId: 1, 
            lastActionTimestamp: 1,
            // Try to grab the portrait quality directly using dot notation
            "qualities.player_portrait": 1 
        })
        .sort({ lastActionTimestamp: -1 })
        .toArray();

    return chars.map(c => {
        // Extract portrait string safely
        const portraitQ = c.qualities?.['player_portrait'];
        const portraitCode = (portraitQ && portraitQ.type === 'S') ? portraitQ.stringValue : null;

        return {
            characterId: c.characterId || c._id.toString(),
            name: c.name || "Unknown Drifter",
            currentLocationId: c.currentLocationId || "start",
            lastActionTimestamp: c.lastActionTimestamp?.toString(),
            portrait: portraitCode // <--- NEW FIELD
        };
    });
};

// --- ROBUST CREATION LOGIC ---

// Helper to infer type if definition is missing
const inferType = (value: any): QualityType => {
    if (typeof value === 'string' && isNaN(Number(value))) return QualityType.String;
    return QualityType.Pyramidal; // Default to stats
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
    
    // PHASE 1: Direct Values (Inputs & Static Numbers)
    for (const key in rules) {
        const qid = key.replace('$', '');
        const rule = rules[key];
        
        // Try to find definition, otherwise fallback
        const def = worldContent.qualities[qid];
        let type = def?.type; 
        
        let value: string | number | null = null;

        // User Choice
        if (rule === 'string' || rule.includes('|')) {
            if (choices && choices[qid] !== undefined) {
                value = choices[qid];
            } else {
                // Fallback if user wasn't asked (e.g. missing from form) but rule exists
                value = rule.includes('|') ? rule.split('|')[0].trim() : "";
            }
        } 
        // Static Number
        else if (!isNaN(Number(rule))) {
            value = Number(rule);
        }

        if (value !== null) {
            // If type wasn't found in DB, infer it from the value
            if (!type) type = inferType(value);

            // Construct State
            const numVal = Number(value);
            if (type === QualityType.String) {
                initialQualities[qid] = { qualityId: qid, type, stringValue: String(value) };
            } else {
                // Pyramidal, Counter, etc.
                initialQualities[qid] = { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal, changePoints: 0 } as any;
            }
        }
    }

    // PHASE 2: Calculations (Derived Values)
    // Now that Phase 1 is done, we can use those values in formulas
    const tempEngine = new GameEngine(initialQualities, worldContent);
    
    for (const key in rules) {
        const qid = key.replace('$', '');
        const rule = rules[key];
        
        // Skip if already set in Phase 1
        if (initialQualities[qid]) continue;

        // If it looks like a formula (contains $)
        if (rule.includes('$') || rule.includes('+') || rule.includes('*')) {
            try {
                const result = tempEngine.evaluateBlock(`{${rule}}`);
                
                const def = worldContent.qualities[qid];
                // Logic to guess if result is string or number
                const isNumber = !isNaN(Number(result)) && result.trim() !== "";
                
                let type = def?.type;
                if (!type) type = isNumber ? QualityType.Pyramidal : QualityType.String;

                if (type === QualityType.String) {
                     initialQualities[qid] = { qualityId: qid, type, stringValue: result };
                } else {
                     initialQualities[qid] = { qualityId: qid, type, level: Number(result) || 0 } as any;
                }
                console.log(`[CharCreate] Calculated ${qid} = ${result}`);
            } catch (e) {
                console.error(`[CharCreate] Failed to calculate ${qid}:`, e);
            }
        }
    }

    // Deck Defaults
    const initialDeckCharges: Record<string, number> = {};
    const initialLastDeckUpdate: Record<string, Date> = {};
    if (worldContent.decks) {
        for (const deckId in worldContent.decks) {
            const deckDef = worldContent.decks[deckId];
            const sizeStr = tempEngine.evaluateBlock(`{${deckDef.deck_size || '0'}}`);
            initialDeckCharges[deckId] = parseInt(sizeStr) || 0;
            initialLastDeckUpdate[deckId] = new Date();
        }
    }

    // Action Economy Defaults
    if (worldContent.settings.useActionEconomy) {
        const maxActionsValue = typeof worldContent.settings.maxActions === 'number'
            ? worldContent.settings.maxActions
            : 20; // Default safe fallback
        
        const actionQid = worldContent.settings.actionId.replace('$', '');
        // Only set if not already set by rules
        if (!initialQualities[actionQid]) {
            initialQualities[actionQid] = {
                qualityId: actionQid,
                type: QualityType.Counter,
                level: maxActionsValue
            };
        }
    }

    // Location & Name Extraction
    const startingLocation = choices?.['location'] || worldContent.char_create['$location'] || 'village';
    
    let charName = choices?.['player_name'];
    // Try to grab from calculated qualities
    if (!charName && initialQualities['player_name']?.type === 'S') {
        charName = initialQualities['player_name'].stringValue;
    }
    if (!charName) charName = "Unknown Drifter";

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
        lastActionTimestamp: new Date()
    };

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
    
    let maxActions: number;
    if (typeof settings.maxActions === 'string') {
        const worldConfig = await getWorldConfig(character.storyId);
        const tempEngine = new GameEngine(character.qualities, worldConfig);
        const val = tempEngine.evaluateBlock(`{${settings.maxActions}}`);
        maxActions = parseInt(val, 10) || 20; 
    } else {
        maxActions = settings.maxActions || 20;
    }

    const lastTimestamp = character.lastActionTimestamp ? new Date(character.lastActionTimestamp) : new Date();
    const now = new Date();
    const minutesPassed = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60);
    const regenInterval = settings.regenIntervalInMinutes || 10;
    const actionsToRegen = Math.floor(minutesPassed / regenInterval);

    if (actionsToRegen > 0) {
        const actionQid = settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid];
        if (actionsState && 'level' in actionsState) {
            const newActionTotal = Math.min(maxActions, actionsState.level + (actionsToRegen * (settings.regenAmount || 1)));
            actionsState.level = newActionTotal;
            character.lastActionTimestamp = new Date(lastTimestamp.getTime() + actionsToRegen * regenInterval * 60 * 1000);
        }
    }
    return character;
}