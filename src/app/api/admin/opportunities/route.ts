// src/app/api/admin/opportunities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');
    console.log(`[API: GET /admin/opportunities] Fetching opportunities for story '${storyId}'. ID: ${id || 'all'}.`);

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
    const { storyId, data } = body;
    console.log(`[API: POST /admin/opportunities] User saving opportunity '${data.id}' for story '${storyId}'.`);

    // SECURITY CHECK
    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    

    if (!storyId || !data.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

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

    await db.collection('opportunities').updateOne(
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
    console.log(`[API: DELETE /admin/opportunities] Deleting opportunity '${id}' from story '${storyId}'.`);

    // SECURITY CHECK
    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    
    
    if (!storyId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection('opportunities').deleteOne({ worldId: storyId, id });
    return NextResponse.json({ success: true });
}