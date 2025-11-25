// scripts/migrate_world.ts

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const WORLD_ID = 'trader_johns_world'; // Target world

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

async function migrate() {
    console.log('Starting migration...');
    const client = new MongoClient(MONGODB_URI as string);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        // 1. Fetch the Monolith
        const worldDoc = await db.collection('worlds').findOne({ worldId: WORLD_ID });
        if (!worldDoc) {
            throw new Error(`World '${WORLD_ID}' not found.`);
        }

        console.log(`Found world: ${worldDoc.title}`);
        const content = worldDoc.content;

        // 2. Prepare Storylets
        const storyletsToInsert = [];
        if (content.storylets) {
            for (const [id, data] of Object.entries(content.storylets)) {
                storyletsToInsert.push({
                    ...(data as any),
                    id: id,
                    worldId: WORLD_ID, // Link it to the world
                });
            }
        }

        // 3. Prepare Opportunities
        const opportunitiesToInsert = [];
        if (content.opportunities) {
            for (const [id, data] of Object.entries(content.opportunities)) {
                opportunitiesToInsert.push({
                    ...(data as any),
                    id: id,
                    worldId: WORLD_ID,
                });
            }
        }

        // 4. Insert into new collections (Clear them first to avoid duplicates during testing)
        if (storyletsToInsert.length > 0) {
            await db.collection('storylets').deleteMany({ worldId: WORLD_ID });
            await db.collection('storylets').insertMany(storyletsToInsert);
            console.log(`Migrated ${storyletsToInsert.length} storylets.`);
        }

        if (opportunitiesToInsert.length > 0) {
            await db.collection('opportunities').deleteMany({ worldId: WORLD_ID });
            await db.collection('opportunities').insertMany(opportunitiesToInsert);
            console.log(`Migrated ${opportunitiesToInsert.length} opportunities.`);
        }

        // 5. Clean up the original document (Remove the exploded data)
        // We KEEP qualities, locations, decks, settings, and char_create
        await db.collection('worlds').updateOne(
            { worldId: WORLD_ID },
            { 
                $unset: { 
                    "content.storylets": "", 
                    "content.opportunities": "" 
                } 
            }
        );
        console.log('Removed heavy content from World config.');

        // 6. Create Indexes (CRITICAL STEP)
        console.log('Creating indexes...');
        
        // Ensure we can fetch a specific storylet instantly
        await db.collection('storylets').createIndex({ worldId: 1, id: 1 }, { unique: true });
        // Ensure we can fetch all storylets in a location instantly
        await db.collection('storylets').createIndex({ worldId: 1, location: 1 });
        // Ensure autofire checks are fast
        await db.collection('storylets').createIndex({ worldId: 1, autofire_if: 1 });

        // Opportunity indexes
        await db.collection('opportunities').createIndex({ worldId: 1, id: 1 }, { unique: true });
        await db.collection('opportunities').createIndex({ worldId: 1, deck: 1 });

        console.log('Migration complete!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
    }
}

migrate();