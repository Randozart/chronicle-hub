import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    // Allow writers to export backups
    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. Fetch Main Config
        const worldDoc = await db.collection('worlds').findOne(
            { worldId: storyId },
            { projection: { _id: 0, ownerId: 0, collaborators: 0 } } // Exclude security fields
        );

        if (!worldDoc) return NextResponse.json({ error: 'World not found' }, { status: 404 });

        // 2. Fetch Dynamic Content
        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .project({ _id: 0 }) // Clean output
            .toArray();

        const opportunities = await db.collection('opportunities')
            .find({ worldId: storyId })
            .project({ _id: 0 })
            .toArray();

        // 3. Construct Export Bundle
        const exportData = {
            metadata: {
                version: "1.0",
                exportDate: new Date().toISOString(),
                sourceWorldId: storyId
            },
            world: worldDoc,
            storylets: storylets,
            opportunities: opportunities
        };

        // 4. Return as Downloadable JSON
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