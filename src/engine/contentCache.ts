import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; 
import { getWorldConfig as serviceGetWorldConfig, getAutofireStorylets as serviceGetAutofire } from './worldService';
import clientPromise from '@/engine/database';
import { Storylet, Opportunity } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// --- CORRECTED CACHING FUNCTIONS ---

const getCachedWorld = (storyId: string) => {
    // This function now dynamically creates a cached loader for a SPECIFIC storyId
    const cachedLoader = unstable_cache(
        async () => loadGameData(storyId),
        [`world-content-${storyId}`], // CRITICAL FIX: The key MUST be unique per world
        { 
            revalidate: 3600, 
            tags: [`world-${storyId}`] // CRITICAL FIX: The tag is now unique per world
        }
    );
    return cachedLoader();
};

const getCachedStorylets = (storyId: string): Promise<(Storylet | Opportunity)[]> => {
    const cachedLoader = unstable_cache(
        async (): Promise<(Storylet | Opportunity)[]> => {
            try {
                const client = await clientPromise;
                const db = client.db(DB_NAME);
                
                const [storylets, opportunities] = await Promise.all([
                    db.collection('storylets').find({ worldId: storyId }).toArray(),
                    db.collection('opportunities').find({ worldId: storyId }).toArray()
                ]);
                
                const allEvents = [...storylets, ...opportunities];

                return allEvents.map(e => ({
                    ...e, 
                    _id: e._id.toString()
                })) as unknown as (Storylet | Opportunity)[]; 
                
            } catch (e) {
                console.error("Failed to fetch storylets:", e);
                return [];
            }
        },
        [`world-storylets-${storyId}`], // CRITICAL FIX: The key MUST be unique per world
        { 
            revalidate: 3600, 
            tags: [`storylets-${storyId}`] // CRITICAL FIX: The tag is now unique per world
        }
    );
    return cachedLoader();
};

// --- EXPORTED FUNCTIONS ---
// These functions now call the corrected caching logic

export const getSettings = async (storyId: string) => {
    const data = await getCachedWorld(storyId);
    return data.settings;
};

export const getStorylets = async (storyId: string) => {
    return getCachedStorylets(storyId);
};

// Use the service functions directly for non-cached or differently cached data
export const getContent = serviceGetWorldConfig;
export const getAutofireStorylets = serviceGetAutofire;