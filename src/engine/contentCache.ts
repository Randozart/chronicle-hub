import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; // Your existing loader that hits Mongo
import { WorldContent, WorldConfig } from './models';
import { getWorldConfig, getAutofireStorylets as serviceGetAutofire } from './worldService';

// Cache the entire world content for 1 hour (3600 seconds)
// This dramatically reduces MongoDB hits.
const getCachedWorld = unstable_cache(
    async (storyId: string) => loadGameData(storyId),
    ['world-content'],
    { revalidate: 3600, tags: ['world'] }
);


// Helper to get just settings (fast)
export const getSettings = async (storyId: string) => {
    const data = await getCachedWorld(storyId);
    return data.settings;
};

export const getContent = getWorldConfig;
export const getAutofireStorylets = serviceGetAutofire;

