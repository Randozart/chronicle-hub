// src/engine/characterService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities, WorldContent, QualityType, CharacterDocument, WorldSettings } from '@/engine/models';
import { GameEngine } from './gameEngine'; // <-- Import GameEngine


const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';


// Gets the character for a given user playing a specific story
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

export const getOrCreateCharacter = async (
    userId: string, 
    storyId: string, 
    worldContent: WorldContent
): Promise<CharacterDocument> => {
    
    const existingCharacter = await getCharacter(userId, storyId);
    if (existingCharacter) {
        return existingCharacter;
    }

    const initialQualities: PlayerQualities = {};
    
     for (const qidWithPrefix in worldContent.char_create) {
        const qid = qidWithPrefix.replace('$', '');
        const value = worldContent.char_create[qidWithPrefix];
        const def = worldContent.qualities[qid];
        if (!def) continue;

        const isNumeric = !isNaN(parseInt(value, 10));
        const numValue = isNumeric ? parseInt(value, 10) : 0;

        switch (def.type) {
            case QualityType.String:
                initialQualities[qid] = { qualityId: qid, type: QualityType.String, stringValue: value };
                break;
            case QualityType.Pyramidal:
                initialQualities[qid] = { qualityId: qid, type: QualityType.Pyramidal, level: numValue, changePoints: 0 };
                break;
            case QualityType.Item:
                initialQualities[qid] = { qualityId: qid, type: QualityType.Item, level: numValue, sources: [], spentTowardsPrune: 0 };
                break;
            case QualityType.Counter:
            case QualityType.Tracker:
                 initialQualities[qid] = { qualityId: qid, type: def.type, level: numValue };
                 break;
        }
    }

    if (worldContent.settings.useActionEconomy) {
        // Resolve the maxActions value BEFORE creating the quality.
        const maxActionsValue = typeof worldContent.settings.maxActions === 'string'
            ? 0 // Start at 0 if it's dynamic, let the engine calculate the real value later.
            : worldContent.settings.maxActions;
            
        const actionQid = worldContent.settings.actionId.replace('$', '');

        initialQualities[actionQid] = {
            qualityId: actionQid,
            type: QualityType.Counter,
            level: maxActionsValue // Now it's guaranteed to be a number.
        };
    }
    
    // Determine starting location. It assumes 'location' is a String quality.
    let startingLocationId = 'village'; // Default fallback
    const locQuality = initialQualities['location'];
    if (locQuality && locQuality.type === QualityType.String) {
        startingLocationId = locQuality.stringValue;
    }

     const initialEquipment: Record<string, string | null> = {};
    if (worldContent.settings.equipCategories) {
        for (const category of worldContent.settings.equipCategories) {
            initialEquipment[category] = null;
        }
    }

    const newCharacter: CharacterDocument = {
        userId,
        storyId,
        qualities: initialQualities,
        currentLocationId: startingLocationId,
        currentStoryletId: "",
        opportunityHand: [],
        lastActionTimestamp: new Date(),
        equipment: initialEquipment, 
    };

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        await db.collection<CharacterDocument>(COLLECTION_NAME).insertOne(newCharacter);
        console.log(`Created new character for user ${userId} in world ${storyId}`);
        return newCharacter;
    } catch (error) {
        console.error("Failed to save new character:", error);
        throw error;
    }
};

// Saves the character's state
export const saveCharacterState = async (character: CharacterDocument): Promise<boolean> => {
    // We need the userId and storyId for the filter, and the rest for the update.
    const { userId, storyId, ...characterDataToSet } = character;

    if (!userId || !storyId) {
        console.error("saveCharacterState failed: missing userId or storyId");
        return false;
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<CharacterDocument>(COLLECTION_NAME);

        // The filter finds the correct document to update.
        const filter = { userId, storyId };

        // The `$set` operator updates only the fields provided in characterDataToSet.
        // This includes qualities, currentLocationId, opportunityHand, etc.
        const updateDoc = {
            $set: characterDataToSet
        };

        const result = await collection.updateOne(filter, updateDoc);
        
        // Return true if a document was found and modified.
        return result.modifiedCount > 0;
    } catch (e) {
        console.error('Database error saving character state:', e);
        return false;
    }
};

export const regenerateActions = (character: CharacterDocument, settings: WorldSettings, gameData: WorldContent): CharacterDocument => {
    if (!settings.useActionEconomy) return character;

    const tempEngine = new GameEngine(character.qualities, gameData);

    const maxActions = typeof settings.maxActions === 'string'
        ? parseInt(tempEngine.evaluateBlock(`{${settings.maxActions}}`), 10)
        : settings.maxActions;
    
    const lastTimestamp = character.lastActionTimestamp || new Date();
    const now = new Date();
    // Use the correct property name from the interface
    const minutesPassed = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60);
    const actionsToRegen = Math.floor(minutesPassed / settings.regenIntervalInMinutes);

    if (actionsToRegen > 0) {
        const actionQid = settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid];

        if (actionsState && 'level' in actionsState) {
            // Also use regenAmount from settings
            const newActionTotal = Math.min(maxActions, actionsState.level + (actionsToRegen * settings.regenAmount));
            actionsState.level = newActionTotal;
            // Use the correct property name again here
            character.lastActionTimestamp = new Date(lastTimestamp.getTime() + actionsToRegen * settings.regenIntervalInMinutes * 60 * 1000);
        }
    }
    
    return character;
}