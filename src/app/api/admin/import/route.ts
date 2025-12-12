import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// --- 1. Zod Schemas for Validation ---

// Basic Quality Schema
const qualitySchema = z.object({
    id: z.string().optional(),
    type: z.enum(['P', 'C', 'I', 'S', 'E', 'T']),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    image: z.string().optional(),
}).catchall(z.any()); 

// World Settings Schema (Basic checks)
const settingsSchema = z.object({
    useActionEconomy: z.boolean().optional(),
    maxActions: z.union([z.string(), z.number()]).optional(),
}).catchall(z.any());

// The Main Import Structure
const importSchema = z.object({
    metadata: z.object({
        version: z.string(),
        sourceWorldId: z.string()
    }).catchall(z.any()).optional(), 
    
    world: z.object({
        worldId: z.string().optional(),
        settings: settingsSchema,
        content: z.object({
            qualities: z.record(z.string(), qualitySchema).optional(),
            locations: z.record(z.string(), z.any()).optional(),
            decks: z.record(z.string(), z.any()).optional(),
            regions: z.record(z.string(), z.any()).optional(),
            markets: z.record(z.string(), z.any()).optional(),
            images: z.record(z.string(), z.any()).optional(),
            char_create: z.record(z.string(), z.any()).optional(),
        }).catchall(z.any())
    }).catchall(z.any()),

    storylets: z.array(z.object({
        id: z.string(),
        name: z.string(),
        text: z.string(),
    }).catchall(z.any())),

    opportunities: z.array(z.object({
        id: z.string(),
        deck: z.string(),
    }).catchall(z.any()))
});

// --- 2. Helper: HTML Sanitization ---
const cleanText = (text: string) => {
    if (!text) return "";
    return sanitizeHtml(text, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'br', 'hr']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            'img': ['src', 'alt', 'class', 'style']
        },
        textFilter: (text) => text.length > 50000 ? text.substring(0, 50000) : text
    });
};

const cleanString = (str: string) => {
    if (!str) return "";
    return sanitizeHtml(str, { allowedTags: [] }).substring(0, 255);
};

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const currentUserId = (session.user as any).id;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const targetStoryId = formData.get('storyId') as string;

        if (!file || !targetStoryId) {
            return NextResponse.json({ error: 'Missing file or storyId' }, { status: 400 });
        }

        if (!await verifyWorldAccess(targetStoryId, 'owner')) {
            return NextResponse.json({ error: 'Forbidden: Only Owners can import data.' }, { status: 403 });
        }

        if (file.size > 5 * 1024 * 1024) {
             return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 413 });
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
            // FIX: Changed .errors to .issues
            return NextResponse.json({ error: 'Invalid JSON schema structure', details: result.error.issues }, { status: 400 });
        }
        const data = result.data;

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { worldId, _id, ownerId, collaborators, ...safeWorldData } = data.world;

        const sanitizedWorldData = {
            ...safeWorldData,
            worldId: targetStoryId,
            ownerId: currentUserId,
        };

        await db.collection('worlds').updateOne(
            { worldId: targetStoryId },
            { $set: sanitizedWorldData } 
        );

        if (data.storylets.length > 0) {
            const storyletOps = data.storylets.map((s: any) => {
                s.name = cleanString(s.name);
                s.text = cleanText(s.text);
                if (s.short) s.short = cleanText(s.short);
                s.worldId = targetStoryId;

                return {
                    updateOne: {
                        filter: { worldId: targetStoryId, id: s.id },
                        update: { $set: s },
                        upsert: true
                    }
                };
            });
            await db.collection('storylets').bulkWrite(storyletOps);
        }

        if (data.opportunities.length > 0) {
            const cardOps = data.opportunities.map((o: any) => {
                o.name = cleanString(o.name);
                o.text = cleanText(o.text);
                if (o.short) o.short = cleanText(o.short);
                o.worldId = targetStoryId;

                return {
                    updateOne: {
                        filter: { worldId: targetStoryId, id: o.id },
                        update: { $set: o },
                        upsert: true
                    }
                };
            });
            await db.collection('opportunities').bulkWrite(cardOps);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Imported ${data.storylets.length} storylets and ${data.opportunities.length} cards.` 
        });

    } catch (e: any) {
        console.error("Import failed:", e);
        return NextResponse.json({ error: `Import failed: ${e.message}` }, { status: 500 });
    }
}