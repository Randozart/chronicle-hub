import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; 
import { getWorldConfig as serviceGetWorldConfig, getAutofireStorylets as serviceGetAutofire } from './worldService';
import clientPromise from '@/engine/database';
import { Storylet, Opportunity } from './models';

const NEW_QUALITY_REGEX = /%new\[(.*?)(?:;|\])/g;

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

const getCachedDynamicIds = (storyId: string): Promise<string[]> => {
    const cachedLoader = unstable_cache(
        async (): Promise<string[]> => {
            const allEvents = await getCachedStorylets(storyId);
            const dynamicIds = new Set<string>();

            const scan = (text: string | undefined) => {
                if (!text) return;
                const matches = text.matchAll(NEW_QUALITY_REGEX);
                for (const m of matches) {
                    if (m[1]) dynamicIds.add(m[1].trim());
                }
            };

            for (const event of allEvents) {
                // 1. Scan the main text of the card/storylet
                scan(event.text);
                
                // 2. Scan the options (where logic usually lives)
                if (event.options && Array.isArray(event.options)) {
                    for (const opt of event.options) {
                        scan(opt.pass_quality_change);
                        scan(opt.fail_quality_change);
                        
                        // Also scan body text in case definitions happen there
                        scan(opt.pass_long);
                        scan(opt.fail_long);
                    }
                }
            }

            return Array.from(dynamicIds);
        },
        [`world-dynamic-ids-${storyId}`], 
        { revalidate: 3600, tags: [`storylets-${storyId}`] } 
    );
    return cachedLoader();
};


export const getSettings = async (storyId: string) => {
    const data = await getCachedWorld(storyId);
    return data.settings;
};

export const getGlobalDynamicQualities = async (storyId: string) => {
    return getCachedDynamicIds(storyId);
};

export const getStorylets = async (storyId: string) => {
    return getCachedStorylets(storyId);
};

// Use the service functions directly for non-cached or differently cached data
export const getContent = serviceGetWorldConfig;
export const getAutofireStorylets = serviceGetAutofire;