import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const world = await db.collection('worlds').findOne({ worldId: storyId });

    if (!world) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
        id: 'console', // Synthetic ID for the hook
        version: world.version || 1, // Use World Version
        worldState: world.worldState || {},
        systemMessage: world.settings?.systemMessage || { id: 'msg_01', enabled: false, title: '', content: '', severity: 'info' }
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, data } = body;
        
        if (!storyId || !data) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        if (!await verifyWorldAccess(storyId, 'writer')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // Optimistic Locking on the WORLD document
        const currentVersion = data.version || 0;
        const newVersion = currentVersion + 1;

        // Atomic Update of State AND Settings
        const result = await db.collection('worlds').updateOne(
            { worldId: storyId, version: currentVersion },
            { 
                $set: { 
                    worldState: data.worldState,
                    "settings.systemMessage": data.systemMessage,
                    lastModified: new Date()
                },
                $inc: { version: 1 }
            }
        );

        if (result.modifiedCount > 0) {
            return NextResponse.json({ success: true, newVersion });
        } else {
            // Check if it failed due to conflict
            const exists = await db.collection('worlds').findOne({ worldId: storyId });
            if (exists && exists.version !== currentVersion) {
                return NextResponse.json({ error: 'Conflict' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }
    } catch (error) {
        console.error("Console Save Error:", error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}