// src/engine/dataLoader.ts
// This file is designed to be imported ONLY in Server Components or API routes.

import fs from 'fs';
import path from 'path';
import { QualityDefinition, Storylet } from '@/engine/models';

interface GameData {
    qualities: Record<string, QualityDefinition>;
    storylets: Record<string, Storylet>;
}

let cachedData: GameData | null = null;

export const loadGameData = (): GameData => {
    // Use a simple cache to avoid re-reading files on every request in development
    if (cachedData) {
        return cachedData;
    }

    const qualitiesPath = path.join(process.cwd(), 'data', 'qualities.json');
    const qualitiesFile = fs.readFileSync(qualitiesPath, 'utf8');
    const qualitiesJson = JSON.parse(qualitiesFile);

    const storyletsPath = path.join(process.cwd(), 'data', 'storylets.json');
    const storyletsFile = fs.readFileSync(storyletsPath, 'utf8');
    const storyletsJson = JSON.parse(storyletsFile);

    const qualities: Record<string, QualityDefinition> = {};
    for (const key in qualitiesJson) {
        qualities[key] = { ...qualitiesJson[key], id: key };
    }

    const storylets: Record<string, Storylet> = {};
    for (const key in storyletsJson) {
        storylets[key] = { ...storyletsJson[key], id: key };
    }

    cachedData = { qualities, storylets };
    console.log(`[Data Loader] Loaded ${Object.keys(qualities).length} qualities and ${Object.keys(storylets).length} storylets.`);
    
    return cachedData;
};