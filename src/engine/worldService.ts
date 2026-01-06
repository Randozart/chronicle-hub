// src/engine/worldService.ts

import { cache } from 'react';
import clientPromise from '@/engine/database';
import { WorldConfig, Storylet, Opportunity, LocationDefinition, QualityDefinition, WorldSettings, PlayerQualities } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export const getWorldState = async (worldId: string): Promise<PlayerQualities> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const world = await db.collection('worlds').findOne(
        { worldId }, 
        { projection: { worldState: 1 } }
    );

    return (world?.worldState as PlayerQualities) || {};
};

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
        qualities: injectIds(worldDoc.content.qualities),
        locations: injectIds(worldDoc.content.locations),
        decks: injectIds(worldDoc.content.decks),
        settings: worldDoc.settings,
        char_create: worldDoc.content.char_create || {},
        images: injectIds(worldDoc.content.images) || {},
        categories: injectIds(worldDoc.content.categories) || {},
        regions: injectIds(worldDoc.content.regions) || {},
        markets: injectIds(worldDoc.content.markets) || {},
        instruments: injectIds(worldDoc.content.instruments) || {},
        music: injectIds(worldDoc.content.music) || {}
    };
});

// Alias for backward compatibility
export const getContent = getWorldConfig; 
export const getWorldContent = getWorldConfig; 

export const getSettings = async (worldId: string): Promise<WorldSettings> => {
    const config = await getWorldConfig(worldId);
    return config.settings;
};

// 2. Fetch Single Event (Storylet or Opportunity)
export const getEvent = async (worldId: string, eventId: string): Promise<Storylet | Opportunity | null> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Try Storylets first
    const storylet = await db.collection('storylets').findOne({ worldId, id: eventId });
    if (storylet) return storylet as unknown as Storylet;

    // Then Opportunities
    const opportunity = await db.collection('opportunities').findOne({ worldId, id: eventId });
    if (opportunity) return opportunity as unknown as Opportunity;

    return null;
};

// 3. Fetch Location Storylets
export const getLocationStorylets = async (worldId: string, locationId: string): Promise<Storylet[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('storylets').find({ worldId, location: locationId, status: 'published' }).toArray();
    return docs as unknown as Storylet[];
};

// 4. Fetch Autofire Candidates
export const getAutofireStorylets = async (worldId: string): Promise<Storylet[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    // Autofires can technically be opportunities too if forced, but usually storylets
    const docs = await db.collection('storylets').find(
        { worldId, autofire_if: { $exists: true, $ne: null } },
        { projection: { id: 1, autofire_if: 1, urgency: 1, location: 1 } }
    ).toArray();
    return docs as unknown as Storylet[];
};

// 5. Fetch Cards for a specific Deck (Direct DB access if needed)
export const getOpportunitiesForDeck = async (worldId: string, deckId: string): Promise<Opportunity[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('opportunities').find({ worldId, deck: deckId, status: 'published' }).toArray();
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

// 6. Update Configuration
export const updateWorldConfigItem = async (
    worldId: string, 
    category: 'qualities' | 'locations' | 'decks' | 'images' | 'settings' | 'char_create' | 'categories' | 'root' | 'regions' | 'markets' | 'instruments' | 'music', 
    itemId: string, 
    data: any
): Promise<boolean> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Handle Settings (Top level, no ID)
    if (category === 'root') {
        const result = await db.collection('worlds').updateOne(
            { worldId },
            { $set: { [itemId]: data } }
        );
        return result.acknowledged;
    }

    if (category === 'settings') {
        const result = await db.collection('worlds').updateOne(
            { worldId },
            { $set: { settings: data } }
        );
        return result.acknowledged;
    }

    if (category === 'char_create') {
        const result = await db.collection('worlds').updateOne(
            { worldId },
            { $set: { "content.char_create": data } }
        );
        return result.acknowledged;
    }

    // 2. Handle Collections
    const path = `content.${category}.${itemId}`;

    const result = await db.collection('worlds').updateOne(
        { worldId },
        { $set: { [path]: data } }
    );

    return result.acknowledged;
};

// Helper to DELETE an item
export const deleteWorldConfigItem = async (
    worldId: string, 
    category: 'qualities' | 'locations' | 'decks' | 'images' | 'regions' | 'markets', 
    itemId: string
): Promise<boolean> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const path = `content.${category}.${itemId}`;

    const result = await db.collection('worlds').updateOne(
        { worldId },
        { $unset: { [path]: "" } }
    );

    return result.acknowledged;
};