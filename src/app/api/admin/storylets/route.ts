import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// GET: List all storylets for a world
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id'); // Optional ID for single fetch

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    if (id) {
        // Fetch FULL single storylet
        const storylet = await db.collection('storylets').findOne({ worldId: storyId, id });
        return NextResponse.json(storylet);
    } else {
        // Fetch LIST summary
        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .project({ id: 1, name: 1, location: 1 }) // Light payload
            .sort({ id: 1 })
            .toArray();
        return NextResponse.json(storylets);
    }
}

// POST: Create or Update a Storylet
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { storyId, data } = body;
    
    // Validation
    if (!storyId || !data.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Upsert (Update if exists, Insert if new)
    const result = await db.collection('storylets').updateOne(
        { worldId: storyId, id: data.id },
        { $set: { ...data, worldId: storyId } }, // Ensure worldId is set
        { upsert: true }
    );

    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');

    if (!storyId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    await db.collection('storylets').deleteOne({ worldId: storyId, id });
    return NextResponse.json({ success: true });
}