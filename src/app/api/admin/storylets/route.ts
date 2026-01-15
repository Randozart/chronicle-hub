// src/app/api/admin/storylets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { verifyWorldAccess } from '@/engine/accessControl';
import { updateStoryletOrCard } from '@/engine/worldService';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
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
            .sort({ ordering: 1, id: 1 })
            .toArray();
        return NextResponse.json(storylets);
    } else {
        const storylets = await db.collection('storylets')
            .find({ worldId: storyId })
            .project({ id: 1, name: 1, location: 1, folder: 1, status: 1, ordering: 1 })
            .sort({ ordering: 1, id: 1 })
            .toArray();
        return NextResponse.json(storylets);
    }
}
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, data } = body; 
        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!storyId || !data.id) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        
        console.log(`[API: POST /admin/storylets] Saving '${data.id}' (Client v${data.version || 0})`);
        const result = await updateStoryletOrCard(storyId, 'storylets', data.id, data);
        if (result.success) {
            return NextResponse.json({ success: true, newVersion: result.newVersion });
        } else if (result.error === 'CONFLICT') {
            return NextResponse.json({ error: 'Conflict: Data has changed on server.' }, { status: 409 });
        } else {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

    } catch (e) {
        console.error("Storylet Save Error:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
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