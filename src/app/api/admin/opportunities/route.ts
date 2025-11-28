import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    if (id) {
        const item = await db.collection('opportunities').findOne({ worldId: storyId, id });
        return NextResponse.json(item);
    } else {
        const items = await db.collection('opportunities')
            .find({ worldId: storyId })
            .project({ id: 1, name: 1, deck: 1, frequency: 1, folder: 1, status: 1 }) // <--- Add folder + status
            .sort({ id: 1 })
            .toArray();
        return NextResponse.json(items);
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { storyId, data } = body; // We need storyId before anything else

    // SECURITY CHECK
    if (!await verifyWorldAccess(storyId, 'owner')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    
    
    if (!storyId || !data.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const { _id, ...cleanData } = data;

    await db.collection('opportunities').updateOne(
        { worldId: storyId, id: data.id },
        { $set: { ...cleanData, worldId: storyId } }, // Use cleanData
        { upsert: true }
    );
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');

    // SECURITY CHECK
    if (!storyId || !await verifyWorldAccess(storyId, 'owner')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    
    
    if (!storyId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection('opportunities').deleteOne({ worldId: storyId, id });
    return NextResponse.json({ success: true });
}