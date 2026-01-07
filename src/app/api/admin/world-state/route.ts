import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';
import { QualityType } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// GET: Fetch current global state
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!await verifyWorldAccess(storyId, 'writer')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const world = await db.collection('worlds').findOne(
        { worldId: storyId },
        { projection: { worldState: 1 } }
    );

    return NextResponse.json(world?.worldState || {});
}

// POST: Update specific keys (Partial Update)
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { storyId, updates } = body; // updates: { "season": { type: "S", stringValue: "Winter" } }
    console.log(`[API: POST /admin/world-state] Owner updating global state for '${storyId}'. Keys: ${Object.keys(updates).join(', ')}`);

    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Construct mongo update
    const mongoSet: Record<string, any> = {};
    for (const key in updates) {
        mongoSet[`worldState.${key}`] = updates[key];
    }

    const result = await db.collection('worlds').updateOne(
        { worldId: storyId },
        { $set: mongoSet }
    );

    return NextResponse.json({ success: true });
}

// DELETE: Remove a key
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const key = searchParams.get('key');
    console.log(`[API: DELETE /admin/world-state] Owner deleting global state key '${key}' from '${storyId}'.`);

    if (!storyId || !key) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection('worlds').updateOne(
        { worldId: storyId },
        { $unset: { [`worldState.${key}`]: "" } }
    );

    return NextResponse.json({ success: true });
}