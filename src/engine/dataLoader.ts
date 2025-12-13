// src/engine/dataLoader.ts

import { cache } from 'react';
import { WorldConfig } from '@/engine/models'; // Changed from WorldContent to WorldConfig
import clientPromise from '@/engine/database';

export const loadGameData = cache(async (worldId: string = 'trader_johns_world'): Promise<WorldConfig> => {
    console.log(`[Data Loader] Loading config for world '${worldId}'...`);

    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        const collection = db.collection('worlds');
        
        // We use projection to ensure we don't accidentally fetch heavy data
        const worldDocument = await collection.findOne(
            { worldId: worldId },
            { projection: { 'content.storylets': 0, 'content.opportunities': 0 } }
        );

        if (!worldDocument || !worldDocument.content) {
            throw new Error(`World with ID '${worldId}' not found in the database.`);
        }

        const rawContent = worldDocument.content;

        // We only initialize the properties that exist on WorldConfig
        const processedContent: WorldConfig = {
            qualities: {},
            locations: {},
            decks: {},
            char_create: rawContent.char_create || rawContent.starting || {},
            settings: worldDocument.settings,
            images: worldDocument.images,
            regions: {},
            markets: {},
            instruments: {}, // <-- ADD THIS
            music: {}        // <-- ADD THIS
        };

        // Inject IDs into the config objects
        for (const key in rawContent.qualities) {
            processedContent.qualities[key] = { ...rawContent.qualities[key], id: key };
        }
        for (const key in rawContent.locations) {
            processedContent.locations[key] = { ...rawContent.locations[key], id: key };
        }
        // Check if decks exist before iterating
        if (rawContent.decks) {
            for (const key in rawContent.decks) {
                processedContent.decks[key] = { ...rawContent.decks[key], id: key };
            }
        }
        if (rawContent.regions) {
            for (const key in rawContent.regions) {
                processedContent.regions[key] = { ...rawContent.regions[key], id: key };
            }
        }

        if (rawContent.instruments) {
            for (const key in rawContent.instruments) {
                processedContent.instruments[key] = { ...rawContent.instruments[key], id: key };
            }
        }
        if (rawContent.music) {
            for (const key in rawContent.music) {
                processedContent.music[key] = { ...rawContent.music[key], id: key };
            }
        }
        
        console.log(`[Data Loader] Config successfully processed from DB.`);
        return processedContent;

    } catch (error) {
        console.error("Failed to load game data from DB:", error);
        throw error;
    }
});