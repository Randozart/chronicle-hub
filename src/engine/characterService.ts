// src/engine/characterService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities, WorldContent, QualityType, CharacterDocument, WorldSettings } from '@/engine/models';
//import { GameEngine } from './gameEngine'; // <-- Import GameEngine
import { getWorldContent, getSettings } from './worldService';
import { GameEngine } from './gameEngine';

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
    storyId: string
    // `worldContent` is no longer needed as a parameter
): Promise<CharacterDocument> => {
    
    const existingCharacter = await getCharacter(userId, storyId);
    if (existingCharacter) return existingCharacter;

    console.log(`[CharacterService] No character found for user ${userId} in story ${storyId}. Creating a new one...`);
    
    // Fetch the necessary world data on-demand
    const worldContent = await getWorldContent(storyId);

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
                initialQualities[qid] = { qualityId: qid, type: QualityType.String, stringValue: value }; break;
            case QualityType.Pyramidal:
                initialQualities[qid] = { qualityId: qid, type: QualityType.Pyramidal, level: numValue, changePoints: 0 }; break;
            case QualityType.Item:
                initialQualities[qid] = { qualityId: qid, type: QualityType.Item, level: numValue, sources: [], spentTowardsPrune: 0 }; break;
            case QualityType.Equipable:
                initialQualities[qid] = { qualityId: qid, type: QualityType.Equipable, level: numValue }; break;
            case QualityType.Counter:
            case QualityType.Tracker:
                 initialQualities[qid] = { qualityId: qid, type: def.type, level: numValue }; break;
        }
    }

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
    
    const locQuality = initialQualities['location'];
    const startingLocationId = (locQuality?.type === QualityType.String) ? locQuality.stringValue : 'village';

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

export const regenerateActions = async (character: CharacterDocument): Promise<CharacterDocument> => {
    // This function now fetches its own dependencies.
    const settings = await getSettings(character.storyId);
    if (!settings.useActionEconomy) return character;
    
    let maxActions: number;
    if (typeof settings.maxActions === 'string') {
        // If maxActions is a string like "$stamina", we need the full world content
        // to create an engine to evaluate it.
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