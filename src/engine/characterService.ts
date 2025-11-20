// src/engine/characterService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities, QualityType } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';

export interface CharacterDocument {
    _id?: any; // ObjectId
    userId: string;
    storyId: string;
    qualities: PlayerQualities;
    currentStoryletId: string;
}

const newPlayerQualities: PlayerQualities = { /* ... your default qualities ... */ };

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

// Creates a new character if one doesn't exist
export const getOrCreateCharacter = async (userId: string, storyId: string, username: string): Promise<CharacterDocument> => {
    const existingCharacter = await getCharacter(userId, storyId);
    if (existingCharacter) {
        return existingCharacter;
    }

    // If no character exists for this user/story combo, create one.
    const initialQualities: PlayerQualities = {
        'player_name': { qualityId: 'player_name', type: QualityType.String, stringValue: username },
        'player_first_name': { qualityId: 'player_first_name', type: QualityType.String, stringValue: username.split(' ')[0] },
        'scholar': { qualityId: 'scholar', type: QualityType.Pyramidal, level: 10, changePoints: 0 },
        'fellowship': { qualityId: 'fellowship', type: QualityType.Pyramidal, level: 10, changePoints: 0 },
        'wounds': { qualityId: 'wounds', type: QualityType.Pyramidal, level: 10, changePoints: 0 },
        'charm': { qualityId: 'charm', type: QualityType.Pyramidal, level: 10, changePoints: 0 },
    };
    
    const newCharacter: CharacterDocument = {
        userId,
        storyId,
        qualities: initialQualities,
        currentStoryletId: 'trader_john_entry', // The starting point of the story
    };

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection<CharacterDocument>(COLLECTION_NAME).insertOne(newCharacter);
    
    return newCharacter;
};

// Saves the character's state
export const saveCharacterState = async (userId: string, storyId: string, qualities: PlayerQualities, currentStoryletId: string): Promise<boolean> => {
     try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<CharacterDocument>(COLLECTION_NAME);

        const result = await collection.updateOne(
            { userId, storyId },
            { $set: { qualities, currentStoryletId } }
        );
        
        return result.modifiedCount > 0;
    } catch (e) {
        console.error('Database error saving character state:', e);
        return false;
    }
};