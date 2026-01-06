import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; 
import { getWorldConfig, getAutofireStorylets as serviceGetAutofire } from './worldService';
import clientPromise from '@/engine/database';
import { Storylet, Opportunity } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

const getCachedWorld = unstable_cache(
    async (storyId: string) => loadGameData(storyId),
    ['world-content'],
    { revalidate: 3600, tags: ['world'] }
);

// FIX: Fetch BOTH storylets and opportunities
const getCachedStorylets = unstable_cache(
    async (storyId: string): Promise<(Storylet | Opportunity)[]> => {
        try {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            
            // Parallel fetch for speed
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
    ['world-storylets'],
    { revalidate: 3600, tags: ['storylets'] }
);

export const getSettings = async (storyId: string) => {
    const data = await getCachedWorld(storyId);
    return data.settings;
};

// Now returns both Storylets AND Opportunities
export const getStorylets = async (storyId: string) => {
    return getCachedStorylets(storyId);
};

export const getContent = getWorldConfig;
export const getAutofireStorylets = serviceGetAutofire;