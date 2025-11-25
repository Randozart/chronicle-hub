import { unstable_cache } from 'next/cache';
import { loadGameData } from './dataLoader'; // Your existing loader that hits Mongo
import { WorldContent } from './models';
import { getWorldContent } from './worldService';

// Cache the entire world content for 1 hour (3600 seconds)
// This dramatically reduces MongoDB hits.
const getCachedWorld = unstable_cache(
    async (storyId: string) => loadGameData(storyId),
    ['world-content'],
    { revalidate: 3600, tags: ['world'] }
);

export const getContent = async (storyId: string): Promise<WorldContent> => {
    return getCachedWorld(storyId);
};

// Helper to get just settings (fast)
export const getSettings = async (storyId: string) => {
    const data = await getCachedWorld(storyId);
    return data.settings;
};

export const getAutofireStorylets = async (storyId: string) => {
    const content = await getWorldContent(storyId); // or getContent(storyId)
    // Filter only storylets that have an 'autofire_if' property
    return Object.values(content.storylets).filter(s => s.autofire_if);
};