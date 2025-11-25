// src/engine/worldService.ts

import { cache } from 'react';
import clientPromise from '@/engine/database';
import { WorldConfig, Storylet, Opportunity, LocationDefinition, QualityDefinition, WorldSettings } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// 1. Get "Hot" Config (Qualities, Decks, Locations)
export const getWorldConfig = cache(async (worldId: string): Promise<WorldConfig> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const worldDoc = await db.collection('worlds').findOne(
        { worldId },
        { projection: { 'content.storylets': 0, 'content.opportunities': 0 } }
    );

    if (!worldDoc || !worldDoc.content) throw new Error(`World ${worldId} not found`);

    return {
        // Use the helper here:
        qualities: injectIds(worldDoc.content.qualities),
        locations: injectIds(worldDoc.content.locations),
        decks: injectIds(worldDoc.content.decks),
        settings: worldDoc.settings,
        char_create: worldDoc.content.char_create || {},
        images: injectIds(worldDoc.content.images) || {} 
    };
});

// Alias for backward compatibility (renaming it helps migration)
export const getContent = getWorldConfig; 
export const getWorldContent = getWorldConfig; // Satisfies 'characterService' imports

export const getSettings = async (worldId: string): Promise<WorldSettings> => {
    const config = await getWorldConfig(worldId);
    return config.settings;
};

// 2. Fetch Single Event (Storylet or Opportunity)
export const getEvent = async (worldId: string, eventId: string): Promise<Storylet | Opportunity | null> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Cast to unknown first to fix the "overlap" error
    const storylet = await db.collection('storylets').findOne({ worldId, id: eventId });
    if (storylet) return storylet as unknown as Storylet;

    const opportunity = await db.collection('opportunities').findOne({ worldId, id: eventId });
    if (opportunity) return opportunity as unknown as Opportunity;

    return null;
};

// 3. Fetch Location Storylets
export const getLocationStorylets = async (worldId: string, locationId: string): Promise<Storylet[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('storylets').find({ worldId, location: locationId }).toArray();
    return docs as unknown as Storylet[];
};

// 4. Fetch Autofire Candidates
export const getAutofireStorylets = async (worldId: string): Promise<Storylet[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('storylets').find(
        { worldId, autofire_if: { $exists: true, $ne: null } },
        { projection: { id: 1, autofire_if: 1 } }
    ).toArray();
    return docs as unknown as Storylet[];
};

// 5. Fetch Cards for a specific Deck
export const getOpportunitiesForDeck = async (worldId: string, deckId: string): Promise<Opportunity[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('opportunities').find({ worldId, deck: deckId }).toArray();
    return docs as unknown as Opportunity[];
};

const injectIds = <T>(dict: Record<string, T> | undefined): Record<string, T> => {
    if (!dict) return {};
    const newDict: Record<string, any> = {};
    for (const key in dict) {
        newDict[key] = { ...dict[key], id: key };
    }
    return newDict;
};