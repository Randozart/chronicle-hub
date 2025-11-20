// src/engine/playerService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities } from '@/engine/models';

const DB_NAME = 'chronicle-hub-db';
const COLLECTION_NAME = 'players';

// Define what a Player document looks like in the database
interface PlayerDocument {
    _id: string;
    username: string;
    qualities: PlayerQualities;
}

// Function to get the player's data from MongoDB
export const getPlayer = async (playerId: string): Promise<PlayerDocument | null> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<PlayerDocument>(COLLECTION_NAME);

        // Find the player by their unique ID
        const player = await collection.findOne({ _id: playerId });
        
        return player;
    } catch (e) {
        console.error('Database error fetching player:', e);
        return null;
    }
};

// Function to save the player's updated qualities to MongoDB
export const savePlayerQualities = async (playerId: string, qualities: PlayerQualities): Promise<boolean> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<PlayerDocument>(COLLECTION_NAME);

        // Define the replacement document WITHOUT the _id field.
        const replacementDocument = {
            username: 'Test User', // We can update other fields here too if needed
            qualities: qualities 
        };

        // Use 'replaceOne' with 'upsert'.
        // The filter `{ _id: playerId }` finds the document.
        // The replacement document provides the new content.
        const result = await collection.replaceOne(
            { _id: playerId },
            replacementDocument,
            { upsert: true }
        );
        
        return result.acknowledged;
    } catch (e) {
        console.error('Database error saving player qualities:', e);
        return false;
    }
};