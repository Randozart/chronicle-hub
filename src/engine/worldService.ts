// src/engine/worldService.ts

import { cache } from 'react';
import clientPromise from '@/engine/database';
import { WorldContent, WorldSettings, Storylet, Opportunity, LocationDefinition, QualityDefinition } from './models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const WORLDS_COLLECTION = 'worlds';

/**
 * The core function to fetch a world document. All other functions will use this.
 * It uses React's `cache` to ensure we only hit the database once per world, per request.
 * It uses projection to avoid fetching overly large fields unless necessary.
 */
const getWorldDocument = cache(async (worldId: string) => {
    console.log(`[WorldService] DB CALL: Fetching document for world '${worldId}'...`);
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const worldDocument = await db.collection(WORLDS_COLLECTION).findOne({ worldId });

        if (!worldDocument) {
            throw new Error(`World with ID '${worldId}' not found in the database.`);
        }
        return worldDocument;
    } catch (error) {
        console.error(`Failed to fetch world document for '${worldId}':`, error);
        throw error;
    }
});


// === High-Level Content Functions ===

/**
 * Fetches the entire WorldContent object for a given worldId.
 * This is a heavy operation, processed from the full document.
 * Primarily for use by the server-side GameEngine.
 */
export const getWorldContent = async (worldId: string): Promise<WorldContent> => {
    const worldDocument = await getWorldDocument(worldId);
    if (!worldDocument.content || !worldDocument.settings) {
        throw new Error(`World '${worldId}' is malformed (missing content or settings).`);
    }

    // Process the raw content to add IDs to each object
    const rawContent = worldDocument.content;
    const processedContent: WorldContent = {
        qualities: {}, storylets: {}, opportunities: {}, locations: {}, decks: {}, char_create: {},
        settings: worldDocument.settings,
    };
    for (const key in rawContent.qualities) processedContent.qualities[key] = { ...rawContent.qualities[key], id: key };
    for (const key in rawContent.storylets) processedContent.storylets[key] = { ...rawContent.storylets[key], id: key };
    for (const key in rawContent.opportunities) processedContent.opportunities[key] = { ...rawContent.opportunities[key], id: key };
    for (const key in rawContent.locations) processedContent.locations[key] = { ...rawContent.locations[key], id: key };
    for (const key in rawContent.decks) processedContent.decks[key] = { ...rawContent.decks[key], id: key };
    processedContent.char_create = rawContent.char_create || {};
    
    return processedContent;
};


// === Targeted, Lightweight "Getter" Functions ===

/**
 * Fetches ONLY the settings object for a given world. Very fast.
 */
export const getSettings = async (worldId: string): Promise<WorldSettings> => {
    const worldDocument = await getWorldDocument(worldId);
    if (!worldDocument.settings) throw new Error(`Settings for world '${worldId}' not found.`);
    return worldDocument.settings;
};

/**
 * Fetches a single event (Storylet or Opportunity) definition from the database.
 */
export const getEvent = async (worldId: string, eventId: string): Promise<Storylet | Opportunity | null> => {
    const worldDocument = await getWorldDocument(worldId);
    const eventData = worldDocument?.content?.storylets?.[eventId] || worldDocument?.content?.opportunities?.[eventId];
    
    if (!eventData) return null;
    
    return { ...eventData, id: eventId };
};

/**
 * Fetches a single location definition from the database.
 */
export const getLocation = async (worldId: string, locationId: string): Promise<LocationDefinition | null> => {
    const worldDocument = await getWorldDocument(worldId);
    const locationData = worldDocument?.content?.locations?.[locationId];

    if (!locationData) return null;

    return { ...locationData, id: locationId };
};

/**
 * Fetches the definitions for a specific list of quality IDs.
 */
export const getQualityDefinitions = async (worldId: string, qids: string[]): Promise<Record<string, QualityDefinition>> => {
    const worldDocument = await getWorldDocument(worldId);
    const allDefs = worldDocument?.content?.qualities;
    if (!allDefs) return {};

    const requestedDefs: Record<string, QualityDefinition> = {};
    for (const qid of qids) {
        if (allDefs[qid]) {
            requestedDefs[qid] = { ...allDefs[qid], id: qid };
        }
    }
    return requestedDefs;
};

export const getLocationStorylets = cache(async (worldId: string, locationId: string): Promise<Storylet[]> => {
    console.log(`[WorldService] Fetching location storylets for '${locationId}'...`);
    try {
        const worldDocument = await getWorldDocument(worldId);
        if (!worldDocument?.content?.storylets) return [];
        
        const allStorylets = worldDocument.content.storylets;
        const locationStorylets = Object.keys(allStorylets)
            .filter(key => allStorylets[key].location === locationId)
            .map(key => ({ ...allStorylets[key], id: key }));

        return locationStorylets;
    } catch (error) {
        console.error(`Failed to get location storylets for '${locationId}':`, error);
        throw error;
    }
});