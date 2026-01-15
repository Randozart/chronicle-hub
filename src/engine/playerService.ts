// src/engine/playerService.ts

import clientPromise from '@/engine/database';
import { PlayerQualities } from '@/engine/models';

const DB_NAME = 'chronicle-hub-db';
const COLLECTION_NAME = 'players';
interface PlayerDocument {
    _id: string;
    username: string;
    qualities: PlayerQualities;
}
export const getPlayer = async (playerId: string): Promise<PlayerDocument | null> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<PlayerDocument>(COLLECTION_NAME);
        const player = await collection.findOne({ _id: playerId });
        
        return player;
    } catch (e) {
        console.error('Database error fetching player:', e);
        return null;
    }
};
export const savePlayerQualities = async (playerId: string, qualities: PlayerQualities): Promise<boolean> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const collection = db.collection<PlayerDocument>(COLLECTION_NAME);
        const replacementDocument = {
            username: 'Test User',
            qualities: qualities 
        };
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