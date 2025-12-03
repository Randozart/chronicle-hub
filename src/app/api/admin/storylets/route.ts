import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// GET: List all storylets for a world
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');
    const full = searchParams.get('full'); // <--- NEW FLAG

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    if (id) {
        const storylet = await db.collection('storylets').findOne({ worldId: storyId, id });
        return NextResponse.json(storylet);
    } else if (full === 'true') {
        // MUST BE HERE
        const storylets = await db.collection('storylets').find({ worldId: storyId }).toArray();
        return NextResponse.json(storylets);
    } else {
        // Default: Summary for Sidebar
        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .project({ id: 1, name: 1, location: 1, folder: 1, status: 1 })
            .sort({ id: 1 })
            .toArray();
        return NextResponse.json(storylets);
    }
}

// POST: Create or Update a Storylet
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { storyId, data } = body; // We need storyId before anything else

    // SECURITY CHECK
    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Validation
    if (!storyId || !data.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
        
    const { _id, ...cleanData } = data;

    // Upsert (Update if exists, Insert if new)
    const result = await db.collection('storylets').updateOne(
        { worldId: storyId, id: data.id },
        { $set: { ...cleanData, worldId: storyId } }, // Ensure worldId is set
        { upsert: true }
    );

    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');

    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    
    
    if (!storyId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    await db.collection('storylets').deleteOne({ worldId: storyId, id });
    return NextResponse.json({ success: true });
}