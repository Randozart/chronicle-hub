import { cache } from 'react';
import { updateTag } from 'next/cache'; 
import clientPromise from '@/engine/database';
import { WorldConfig, Storylet, Opportunity, WorldSettings, PlayerQualities } from './models';

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

// --- FIX IS HERE ---
// This helper is now robust and handles both Objects and Arrays from the database.
const injectIds = <T>(data: Record<string, T> | T[] | undefined): Record<string, T> | T[] => {
    if (!data) {
        // If data is null or undefined, return an empty object as a safe default.
        return {}; 
    }

    // If the data is already an array, do not process it further.
    // This prevents the bug where arrays like ['a', 'b'] were being
    // converted to objects like { '0': 'a', '1': 'b' }.
    if (Array.isArray(data)) {
        return data;
    }

    // If it's a dictionary/object, proceed with injecting IDs into each value.
    const newDict: Record<string, any> = {};
    for (const key in data) {
        // Ensure we only process own properties, not inherited ones
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            newDict[key] = { ...(data[key] as object), id: key };
        }
    }
    return newDict;
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

    // Cast the results of injectIds to satisfy TypeScript
    return {
        qualities: injectIds(worldDoc.content.qualities) as Record<string, any>,
        locations: injectIds(worldDoc.content.locations) as Record<string, any>,
        decks: injectIds(worldDoc.content.decks) as Record<string, any>,
        settings: worldDoc.settings,
        char_create: worldDoc.content.char_create || {},
        images: injectIds(worldDoc.content.images) as Record<string, any> || {},
        categories: injectIds(worldDoc.content.categories) as Record<string, any> || {},
        regions: injectIds(worldDoc.content.regions) as Record<string, any> || {},
        markets: injectIds(worldDoc.content.markets) as Record<string, any> || {},
        instruments: injectIds(worldDoc.content.instruments) as Record<string, any> || {},
        music: injectIds(worldDoc.content.music) as Record<string, any> || {}
    };
});

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
    const docs = await db.collection('storylets').find({ worldId, location: locationId, status: 'published' }).toArray();
    return docs as unknown as Storylet[];
};

// 4. Fetch Autofire Candidates
export const getAutofireStorylets = async (worldId: string): Promise<Storylet[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('storylets').find(
        { worldId, autofire_if: { $exists: true, $ne: null } },
        { projection: { id: 1, autofire_if: 1, urgency: 1, location: 1 } }
    ).toArray();
    return docs as unknown as Storylet[];
};

// 5. Fetch Cards for a specific Deck
export const getOpportunitiesForDeck = async (worldId: string, deckId: string): Promise<Opportunity[]> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const docs = await db.collection('opportunities').find({ worldId, deck: deckId, status: 'published' }).toArray();
    return docs as unknown as Opportunity[];
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

    let result;

    if (category === 'root') {
        result = await db.collection('worlds').updateOne({ worldId }, { $set: { [itemId]: data } });
    } else if (category === 'settings') {
        result = await db.collection('worlds').updateOne({ worldId }, { $set: { settings: data } });
    } else if (category === 'char_create') {
        result = await db.collection('worlds').updateOne({ worldId }, { $set: { "content.char_create": data } });
    } else {
        const path = `content.${category}.${itemId}`;
        result = await db.collection('worlds').updateOne({ worldId }, { $set: { [path]: data } });
    }

    if (result.acknowledged) {
        const tag = `world-${worldId}`;
        console.log(`[Cache] Invalidating tag '${tag}' due to update in ${category}`);
        updateTag(tag); 
    }

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

    if (result.acknowledged) {
        const tag = `world-${worldId}`;
        console.log(`[Cache] Invalidating tag '${tag}' due to deletion in ${category}`);
        updateTag(tag); 
    }

    return result.acknowledged;
};

// Helper to handle optimistic locking update
async function performVersionedUpdate(
    collection: any, 
    filter: any, 
    data: any, 
    clientVersion: number = 0
): Promise<{ success: boolean; versionMismatch: boolean; newVersion?: number }> {
    
    const { _id, version, ...cleanData } = data;
    
    const updateOp = {
        $set: {
            ...cleanData,
            lastModifiedAt: new Date()
        },
        $inc: { version: 1 }
    };

    let query = { ...filter };
    if (clientVersion > 0) {
        query.version = clientVersion;
    }

    const result = await collection.updateOne(query, updateOp, { upsert: false });

    if (result.modifiedCount > 0) {
        return { success: true, versionMismatch: false, newVersion: clientVersion + 1 };
    }

    const existing = await collection.findOne(filter);
    
    if (!existing) {
        const initialData = {
            ...cleanData,
            ...filter, 
            version: 1,
            lastModifiedAt: new Date()
        };
        await collection.insertOne(initialData);
        return { success: true, versionMismatch: false, newVersion: 1 };
    }

    return { success: false, versionMismatch: true };
}

export const updateStoryletOrCard = async (
    worldId: string,
    collectionName: 'storylets' | 'opportunities',
    id: string,
    data: any
): Promise<{ success: boolean; error?: string; newVersion?: number }> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(collectionName);

    const clientVersion = data.version || 0;

    const result = await performVersionedUpdate(
        collection, 
        { worldId, id }, 
        data, 
        clientVersion
    );

    if (result.success) {
        if (process.env.NODE_ENV !== 'production') console.log(`[Cache] Invalidating ${collectionName}-${worldId}`);
        updateTag(`${collectionName}-${worldId}`);
        return { success: true, newVersion: result.newVersion };
    }

    if (result.versionMismatch) {
        return { success: false, error: 'CONFLICT' };
    }

    return { success: false, error: 'DB_ERROR' };
};

export const deleteStoryletOrCard = async (
    worldId: string,
    collection: 'storylets' | 'opportunities',
    id: string
): Promise<boolean> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const result = await db.collection(collection).deleteOne({ worldId, id });

        if (result.acknowledged && result.deletedCount > 0) {
            const tag = `storylets-${worldId}`;
            console.log(`[Cache] Invalidating tag '${tag}' due to deletion of ${id}`);
            
            updateTag(tag); 
        }

        return result.acknowledged;

    } catch (e) {
        console.error(`Error deleting ${collection}:`, e);
        return false;
    }
};