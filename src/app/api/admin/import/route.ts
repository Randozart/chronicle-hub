import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// ZOD SCHEMAS

const idString = z.string().min(1);

// 1. Qualities
const qualitySchema = z.object({
    id: idString,
    type: z.enum(['P', 'C', 'I', 'S', 'E', 'T']),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    image: z.string().optional(),
    max: z.string().optional(),
    min: z.string().optional(),
    folder: z.string().optional(),
    tags: z.array(z.string()).optional()
}).catchall(z.any());

// 2. Character Creation Rules
const charCreateRuleSchema = z.object({
    type: z.enum(['string', 'static', 'label_select', 'image_select', 'labeled_image_select', 'header']),
    rule: z.string(), // Can be empty string
    visible: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    visible_if: z.string().optional(),
    ordering: z.number().optional()
}).catchall(z.any());

// 3. Markets
const listingSchema = z.object({
    id: z.string(),
    qualityId: z.string(),
    price: z.string(),
    currencyId: z.string().optional(),
    visible_if: z.string().optional()
}).catchall(z.any());

const stallSchema = z.object({
    id: z.string(),
    name: z.string(),
    mode: z.enum(['buy', 'sell']),
    listings: z.array(listingSchema)
}).catchall(z.any());

const marketSchema = z.object({
    id: idString,
    name: z.string(),
    defaultCurrencyId: z.string().optional(),
    stalls: z.array(stallSchema).optional()
}).catchall(z.any());

// 4. Settings
const settingsSchema = z.object({
    useActionEconomy: z.boolean().optional(),
    maxActions: z.union([z.string(), z.number()]).optional(),
    actionId: z.string().optional(),
    publicationStatus: z.enum(['private', 'in_progress', 'published']).optional(),
    deletionScheduledAt: z.string().optional(),
    contentConfig: z.object({
        mature: z.boolean().optional(),
        erotica: z.boolean().optional(),
        triggers: z.boolean().optional()
    }).catchall(z.any()).optional()
}).catchall(z.any());

// 5. Audio
const instrumentSchema = z.object({
    id: idString,
    type: z.enum(['synth', 'sampler']),
    config: z.record(z.string(), z.any())
}).catchall(z.any());

const musicTrackSchema = z.object({
    id: idString,
    source: z.string(),
    config: z.record(z.string(), z.any()).optional()
}).catchall(z.any());

// MAIN SCHEMA
const contentSchema = z.object({
    qualities: z.record(z.string(), qualitySchema).optional(),
    locations: z.record(z.string(), z.any()).optional(),
    decks: z.record(z.string(), z.any()).optional(),
    regions: z.record(z.string(), z.any()).optional(),
    images: z.record(z.string(), z.any()).optional(),
    categories: z.record(z.string(), z.any()).optional(),
    
    // Explicit validation for complex objects
    markets: z.record(z.string(), marketSchema).optional(),
    
    char_create: z.record(z.string(), z.union([
        charCreateRuleSchema, 
        z.number(), 
        z.string(), 
        z.null()
    ])).optional(),

    instruments: z.record(z.string(), instrumentSchema).optional(),
    music: z.record(z.string(), musicTrackSchema).optional(),
    
}).catchall(z.any());

const importSchema = z.object({
    metadata: z.object({
        version: z.string().optional(),
        sourceWorldId: z.string().optional()
    }).catchall(z.any()).optional(), 
    
    world: z.object({
        worldId: z.string().optional(),
        settings: settingsSchema,
        content: contentSchema
    }).catchall(z.any()),

    storylets: z.array(z.object({
        id: z.string(),
        name: z.string().optional(), 
        text: z.string().optional(),
    }).catchall(z.any())).optional(),

    opportunities: z.array(z.object({
        id: z.string(),
        deck: z.string().optional(),
    }).catchall(z.any())).optional()
});

// Sanitization Helpers
const cleanText = (text: string | undefined) => {
    if (!text) return "";
    return sanitizeHtml(text, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'br', 'hr', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            'img': ['src', 'alt', 'class', 'style'],
            'span': ['class', 'style', 'data-tooltip'],
            'div': ['class', 'style']
        },
        textFilter: (text) => text.length > 100000 ? text.substring(0, 100000) : text
    });
};

const cleanString = (str: string | undefined) => {
    if (!str) return "";
    return sanitizeHtml(str, { allowedTags: [] }).substring(0, 255);
};

// Route Handler
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const currentUserId = (session.user as any).id;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const targetStoryId = formData.get('storyId') as string;
        
        console.log(`[API: POST /admin/import] User ${currentUserId} attempting to import file '${file.name}' into story '${targetStoryId}'.`);
        
        if (!file || !targetStoryId) {
            return NextResponse.json({ error: 'Missing file or storyId' }, { status: 400 });
        }

        if (!await verifyWorldAccess(targetStoryId, 'owner')) {
            return NextResponse.json({ error: 'Forbidden: Only Owners can import data.' }, { status: 403 });
        }

        if (file.size > 20 * 1024 * 1024) {
             return NextResponse.json({ error: 'File size exceeds 20MB limit.' }, { status: 413 });
        }

        const fileContent = await file.text();
        let rawData;
        try {
            rawData = JSON.parse(fileContent);
        } catch (jsonError) {
            return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
        }

        const result = importSchema.safeParse(rawData);
        if (!result.success) {
            console.error("Zod Validation Error:", result.error);
            // Return first error for clarity
            const firstIssue = result.error.issues[0];
            const path = firstIssue.path.join('.');
            return NextResponse.json({ error: `Invalid Schema at '${path}': ${firstIssue.message}` }, { status: 400 });
        }
        
        const data = result.data;
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. World Config Update
        const { worldId, _id, ownerId, collaborators, ...safeWorldData } = data.world;

        // Force overwrite ownership to current user and target ID
        const sanitizedWorldData = {
            ...safeWorldData,
            worldId: targetStoryId,
            ownerId: currentUserId,
            collaborators: undefined, 
        };

        await db.collection('worlds').updateOne(
            { worldId: targetStoryId },
            { $set: sanitizedWorldData } 
        );

        // 2. Storylets Bulk Write
        if (data.storylets && data.storylets.length > 0) {
            const storyletOps = data.storylets.map((s: any) => {
                if (s.name) s.name = cleanString(s.name);
                if (s.text) s.text = cleanText(s.text);
                if (s.short) s.short = cleanText(s.short);
                
                s.worldId = targetStoryId;
                delete s._id;

                return {
                    updateOne: {
                        filter: { worldId: targetStoryId, id: s.id },
                        update: { $set: s },
                        upsert: true
                    }
                };
            });
            
            const BATCH_SIZE = 500;
            for (let i = 0; i < storyletOps.length; i += BATCH_SIZE) {
                const batch = storyletOps.slice(i, i + BATCH_SIZE);
                await db.collection('storylets').bulkWrite(batch);
            }
        }

        // 3. Opportunities Bulk Write
        if (data.opportunities && data.opportunities.length > 0) {
            const cardOps = data.opportunities.map((o: any) => {
                if (o.name) o.name = cleanString(o.name);
                if (o.text) o.text = cleanText(o.text);
                if (o.short) o.short = cleanText(o.short);
                
                o.worldId = targetStoryId;
                delete o._id;

                return {
                    updateOne: {
                        filter: { worldId: targetStoryId, id: o.id },
                        update: { $set: o },
                        upsert: true
                    }
                };
            });

            const BATCH_SIZE = 500;
            for (let i = 0; i < cardOps.length; i += BATCH_SIZE) {
                const batch = cardOps.slice(i, i + BATCH_SIZE);
                await db.collection('opportunities').bulkWrite(batch);
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Imported successfully. Settings, ${data.storylets?.length || 0} storylets, and ${data.opportunities?.length || 0} cards updated.` 
        });

    } catch (e: any) {
        console.error("Import failed:", e);
        return NextResponse.json({ error: `Import failed: ${e.message}` }, { status: 500 });
    }
}