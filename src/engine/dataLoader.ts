// src/engine/dataLoader.ts

import { cache } from 'react';
import { WorldContent } from '@/engine/models';
import clientPromise from '@/engine/database';

export const loadGameData = cache(async (worldId: string = 'trader_johns_world'): Promise<WorldContent> => {
    console.log(`[Data Loader] Loading data for world '${worldId}'...`);

    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const collection = db.collection('worlds');
        const worldDocument = await collection.findOne({ worldId: worldId });

        if (!worldDocument || !worldDocument.content) {
            throw new Error(`World with ID '${worldId}' not found in the database.`);
        }

        const rawContent = worldDocument.content;

        // --- THIS IS THE FIX ---
        // Create a new, corrected WorldContent object.
        const processedContent: WorldContent = {
            qualities: {},
            storylets: {},
            opportunities: {},
            locations: {},
            starting: rawContent.starting,
        };

        // Iterate over each item and add the 'id' property from its key.
        for (const key in rawContent.qualities) {
            processedContent.qualities[key] = { ...rawContent.qualities[key], id: key };
        }
        for (const key in rawContent.storylets) {
            processedContent.storylets[key] = { ...rawContent.storylets[key], id: key };
        }
        for (const key in rawContent.opportunities) {
            processedContent.opportunities[key] = { ...rawContent.opportunities[key], id: key };
        }
        for (const key in rawContent.locations) {
            processedContent.locations[key] = { ...rawContent.locations[key], id: key };
        }
        // --- END OF FIX ---

        console.log(`[Data Loader] Data successfully processed from DB.`);
        return processedContent; // Return the new object with IDs

    } catch (error) {
        console.error("Failed to load game data from DB:", error);
        throw error;
    }
});