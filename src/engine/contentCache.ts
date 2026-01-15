import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; 
import { getWorldConfig as serviceGetWorldConfig, getAutofireStorylets as serviceGetAutofire } from './worldService';
import clientPromise from '@/engine/database';
import { Storylet, Opportunity } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

const getCachedWorld = (storyId: string) => {
    const cachedLoader = unstable_cache(
        async () => loadGameData(storyId),
        [`world-content-${storyId}`],
        { 
            revalidate: 3600, 
            tags: [`world-${storyId}`]
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
        [`world-storylets-${storyId}`],
        { 
            revalidate: 3600, 
            tags: [`storylets-${storyId}`]
        }
    );
    return cachedLoader();
};

export const getSettings = async (storyId: string) => {
    const data = await getCachedWorld(storyId);
    return data.settings;
};

export const getStorylets = async (storyId: string) => {
    return getCachedStorylets(storyId);
};
export const getContent = serviceGetWorldConfig;
export const getAutofireStorylets = serviceGetAutofire;