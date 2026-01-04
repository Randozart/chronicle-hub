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

const getCachedStorylets = unstable_cache(
    async (storyId: string): Promise<(Storylet | Opportunity)[]> => {
        try {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const events = await db.collection('storylets').find({ worldId: storyId }).toArray();
            
            return events.map(e => ({
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

export const getStorylets = async (storyId: string) => {
    return getCachedStorylets(storyId);
};

export const getContent = getWorldConfig;
export const getAutofireStorylets = serviceGetAutofire;