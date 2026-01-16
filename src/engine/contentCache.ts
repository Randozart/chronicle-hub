import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; 
import { getAutofireStorylets as serviceGetAutofire } from './worldService';
import clientPromise from '@/engine/database';
import { Storylet, Opportunity } from './models';

const NEW_QUALITY_REGEX = /%new\[(.*?)(?:;|\])/g;

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

const fetchRawStorylets = async (storyId: string): Promise<(Storylet | Opportunity)[]> => {
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
};

const scanRawDynamicIds = async (storyId: string, providedEvents?: (Storylet | Opportunity)[]): Promise<string[]> => {
    const allEvents = providedEvents || await fetchRawStorylets(storyId);
    const dynamicIds = new Set<string>();

    const scan = (text: string | undefined) => {
        if (!text) return;
        const matches = text.matchAll(NEW_QUALITY_REGEX);
        for (const m of matches) {
            if (m[1]) dynamicIds.add(m[1].trim());
        }
    };

    for (const event of allEvents) {
        scan(event.text);
        if (event.options && Array.isArray(event.options)) {
            for (const opt of event.options) {
                scan(opt.pass_quality_change);
                scan(opt.fail_quality_change);
                scan(opt.pass_long);
                scan(opt.fail_long);
            }
        }
    }

    return Array.from(dynamicIds);
};

const getCachedWorld = (storyId: string) => {
    const cachedLoader = unstable_cache(
        async () => loadGameData(storyId),
        [`world-content-${storyId}`], 
        { revalidate: 3600, tags: [`world-${storyId}`] }
    );
    return cachedLoader();
};

const getCachedStorylets = (storyId: string) => {
    const cachedLoader = unstable_cache(
        async () => fetchRawStorylets(storyId),
        [`world-storylets-${storyId}`], 
        { revalidate: 3600, tags: [`storylets-${storyId}`] }
    );
    return cachedLoader();
};

const getCachedDynamicIds = (storyId: string) => {
    const cachedLoader = unstable_cache(
        async () => scanRawDynamicIds(storyId),
        [`world-dynamic-ids-${storyId}`], 
        { revalidate: 3600, tags: [`storylets-${storyId}`] } 
    );
    return cachedLoader();
};

export const getSettings = async (storyId: string, forceFresh = false) => {
    if (forceFresh) {
        const data = await loadGameData(storyId);
        return data.settings;
    }
    const data = await getCachedWorld(storyId);
    return data.settings;
};

export const getGlobalDynamicQualities = async (storyId: string, forceFresh = false) => {
    if (forceFresh) {
        return scanRawDynamicIds(storyId);
    }
    return getCachedDynamicIds(storyId);
};

export const getStorylets = async (storyId: string, forceFresh = false) => {
    if (forceFresh) {
        console.log(`[ContentCache] Playtest: Forcing fresh storylets for ${storyId}`);
        return fetchRawStorylets(storyId);
    }
    return getCachedStorylets(storyId);
};

export const getContent = async (storyId: string, forceFresh = false) => {
    if (forceFresh) {
        console.log(`[ContentCache] Playtest: Forcing fresh world config for ${storyId}`);
        return loadGameData(storyId);
    }
    return getCachedWorld(storyId);
};

export const getAutofireStorylets = serviceGetAutofire;