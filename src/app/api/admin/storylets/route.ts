// src/app/api/admin/storylets/route.ts
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
    const full = searchParams.get('full');
    console.log(`[API: GET /admin/storylets] Fetching storylets for story '${storyId}'. Mode: ${id ? `single (id: ${id})` : (full ? 'full' : 'summary')}.`);

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    if (id) {
        const storylet = await db.collection('storylets').findOne({ worldId: storyId, id });
        return NextResponse.json(storylet);
    } else if (full === 'true') {
        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .sort({ ordering: 1, id: 1 }) // SORTING APPLIED
            .toArray();
        return NextResponse.json(storylets);
    } else {
        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .project({ id: 1, name: 1, location: 1, folder: 1, status: 1, ordering: 1 })
            .sort({ ordering: 1, id: 1 }) // SORTING APPLIED
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
    console.log(`[API: POST /admin/storylets] User saving storylet '${data.id}' for story '${storyId}'.`);

    // NEW: Auto-generate IDs for options that are missing them
    if (data.options && Array.isArray(data.options)) {
        data.options.forEach((opt: any, index: number) => {
            if (!opt.id || opt.id.trim() === '') {
                opt.id = `${data.id}_${index}`;
            }
        });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
        
    const { _id, ...cleanData } = data;

    const result = await db.collection('storylets').updateOne(
        { worldId: storyId, id: data.id },
        { $set: { ...cleanData, worldId: storyId } }, 
        { upsert: true }
    );

    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');
    console.log(`[API: DELETE /admin/storylets] Deleting storylet '${id}' from story '${storyId}'.`);

    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    
    
    if (!storyId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    await db.collection('storylets').deleteOne({ worldId: storyId, id });
    return NextResponse.json({ success: true });
}