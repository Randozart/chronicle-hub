import { NextRequest, NextResponse } from 'next/server';
import { updateWorldConfigItem, deleteWorldConfigItem } from '@/engine/worldService';
import { verifyWorldAccess } from '@/engine/accessControl';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, category, itemId, data } = body;
        
        if (!storyId || !category || !itemId || data === undefined) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!await verifyWorldAccess(storyId, 'writer')) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (category === 'settings') {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const rootUpdates: Record<string, any> = {};
            
            if ('isPublished' in data) rootUpdates.published = data.isPublished;
            if ('coverImage' in data) rootUpdates.coverImage = data.coverImage;
            if ('summary' in data) rootUpdates.summary = data.summary;
            if ('tags' in data) rootUpdates.tags = data.tags;
            if ('contentConfig' in data) rootUpdates.contentConfig = data.contentConfig;

            if (Object.keys(rootUpdates).length > 0) {
                console.log(`[API: POST /admin/config] Syncing root metadata for ${storyId}`);
                await db.collection('worlds').updateOne(
                    { worldId: storyId },
                    { $set: rootUpdates }
                );
            }
        }

        let dataToSave = data;
        let newVersion = (data?.version || 0) + 1;

        if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
            dataToSave = { ...data, version: newVersion, lastModifiedAt: new Date() };
            console.log(`[API: POST /admin/config] Updating OBJECT ${category}/${itemId} (v${newVersion})`);
        } else {
            newVersion = 0;
            console.log(`[API: POST /admin/config] Updating PRIMITIVE ${category}/${itemId}`);
        }

        const success = await updateWorldConfigItem(storyId, category, itemId, dataToSave);
        
        if (success) {
            return NextResponse.json({ success: true, newVersion });
        } else {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

    } catch (error) {
        console.error("Admin Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const category = searchParams.get('category') as any;
    const itemId = searchParams.get('itemId');

    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!storyId || !category || !itemId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const success = await deleteWorldConfigItem(storyId, category, itemId);
    return NextResponse.json({ success });
}