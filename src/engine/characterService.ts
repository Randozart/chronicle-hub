// src/engine/characterService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities, QualityState, WorldContent, QualityType, CharacterDocument, WorldSettings } from '@/engine/models';


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
    
    for (const qid in worldContent.starting) {
        const value = worldContent.starting[qid];
        const def = worldContent.qualities[qid];
        
        if (!def) {
            console.warn(`Warning: Starting quality '${qid}' not found in qualities.json`);
            continue;
        }

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
        initialQualities['actions'] = {
            qualityId: 'actions',
            type: QualityType.Counter, // Assuming 'C' for actions
            level: worldContent.settings.maxActions
        };
    }
    
    // Determine starting location. It assumes 'location' is a String quality.
    let startingLocationId = 'village'; // Default fallback
    const locQuality = initialQualities['location'];
    if (locQuality && locQuality.type === QualityType.String) {
        startingLocationId = locQuality.stringValue;
    }

    const newCharacter: CharacterDocument = {
        userId,
        storyId,
        qualities: initialQualities,
        currentLocationId: startingLocationId,
        currentStoryletId: "",
        opportunityHand: [],
        lastActionTimestamp: new Date(),
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

export const regenerateActions = (character: CharacterDocument, settings: WorldSettings): CharacterDocument => {
    if (!settings.useActionEconomy) {
        return character;
    }

    const lastTimestamp = character.lastActionTimestamp || new Date();
    const now = new Date();
    
    const minutesPassed = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60);
    const actionsToRegen = Math.floor(minutesPassed / settings.actionRegenMinutes);

    if (actionsToRegen > 0) {
        const actionsState = character.qualities['actions'];
        if (actionsState && 'level' in actionsState) {
            const newActionTotal = Math.min(settings.maxActions, actionsState.level + actionsToRegen);
            actionsState.level = newActionTotal;
            // Update the timestamp to the last time an action would have been earned
            character.lastActionTimestamp = new Date(lastTimestamp.getTime() + actionsToRegen * settings.actionRegenMinutes * 60 * 1000);
        }
    }
    
    return character;
}