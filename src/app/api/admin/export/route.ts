import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const worldDoc = await db.collection('worlds').findOne(
            { worldId: storyId },
            { projection: { _id: 0, ownerId: 0, collaborators: 0 } } 
        );

        if (!worldDoc) return NextResponse.json({ error: 'World not found' }, { status: 404 });

        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .project({ _id: 0 }) 
            .toArray();

        const opportunities = await db.collection('opportunities')
            .find({ worldId: storyId })
            .project({ _id: 0 })
            .toArray();

        const exportData = {
            metadata: {
                version: "2.0", 
                exportDate: new Date().toISOString(),
                sourceWorldId: storyId
            },
            world: {
                ...worldDoc,
                // Ensure the content object structure is explicitly defined for JSON readability
                content: {
                    qualities: worldDoc.content?.qualities || {},
                    locations: worldDoc.content?.locations || {},
                    decks: worldDoc.content?.decks || {},
                    regions: worldDoc.content?.regions || {},
                    markets: worldDoc.content?.markets || {},
                    images: worldDoc.content?.images || {},
                    categories: worldDoc.content?.categories || {},
                    char_create: worldDoc.content?.char_create || {},
                    instruments: worldDoc.content?.instruments || {},
                    music: worldDoc.content?.music || {}
                }
            },
            storylets: storylets,
            opportunities: opportunities
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        
        return new NextResponse(jsonString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="chronicle_backup_${storyId}_${Date.now()}.json"`
            }
        });

    } catch (e) {
        console.error("Export failed:", e);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}