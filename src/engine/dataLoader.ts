// src/engine/dataLoader.ts

import fs from 'fs';
import path from 'path';
import { WorldContent } from '@/engine/models';

let cachedData: WorldContent | null = null;

// This function now loads all data for a given world.
// For now, it's hardcoded, but later `worldId` could be a parameter.
export const loadGameData = (worldId: string = 'default'): WorldContent => {
    if (cachedData) {
        return cachedData;
    }

    const dataPath = path.join(process.cwd(), 'data'); // Base data folder

    const qualitiesJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'qualities.json'), 'utf8'));
    const storyletsJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'storylets.json'), 'utf8'));
    const opportunitiesJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'opportunities.json'), 'utf8'));
    const locationsJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'locations.json'), 'utf8'));
    const startingJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'starting.json'), 'utf8'));

    const worldContent: WorldContent = {
        qualities: {},
        storylets: {},
        opportunities: {},
        locations: {},
        starting: startingJson, // This one is already in the right format
    };

    // Populate with IDs
    for (const key in qualitiesJson) worldContent.qualities[key] = { ...qualitiesJson[key], id: key };
    for (const key in storyletsJson) worldContent.storylets[key] = { ...storyletsJson[key], id: key };
    for (const key in opportunitiesJson) worldContent.opportunities[key] = { ...opportunitiesJson[key], id: key };
    for (const key in locationsJson) worldContent.locations[key] = { ...locationsJson[key], id: key };

    cachedData = worldContent;
    console.log(`[Data Loader] Loaded world '${worldId}' successfully.`);
    
    return cachedData;
};