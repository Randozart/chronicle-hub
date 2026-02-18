import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import { updateStoryletOrCard, deleteStoryletOrCard } from '@/engine/worldService';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');
    
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!await verifyWorldAccess(storyId, 'reader')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    if (id) {
        const item = await db.collection('opportunities').findOne({ worldId: storyId, id });
        return NextResponse.json(item);
    } else {
        const items = await db.collection('opportunities')
            .find({ worldId: storyId })
            .project({ id: 1, name: 1, deck: 1, frequency: 1, folder: 1, status: 1 })
            .sort({ id: 1 })
            .toArray();
        return NextResponse.json(items);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, data } = body;
        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }    
        if (!storyId || !data || !data.id) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        
        console.log(`[API: POST /admin/opportunities] Saving '${data.id}' (v${data.version || 0})`);
        if (data.options && Array.isArray(data.options)) {
            data.options.forEach((opt: any, index: number) => {
                if (!opt.id || opt.id.trim() === '') {
                    opt.id = `${data.id}_opt${index}`;
                }
            });
        }
        const result = await updateStoryletOrCard(storyId, 'opportunities', data.id, data);
        if (result.success) {
            return NextResponse.json({ success: true, newVersion: result.newVersion });
        } else if (result.error === 'CONFLICT') {
            return NextResponse.json({ error: 'Conflict: Data has changed on server.' }, { status: 409 });
        } else {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

    } catch (e) {
        console.error("Error in POST /api/admin/opportunities:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get('storyId');
        const id = searchParams.get('id');
        console.log(`[API: DELETE /admin/opportunities] Deleting opportunity '${id}' from story '${storyId}'.`);
        if (!storyId || !id) {
            return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
        }
        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }    
        const success = await deleteStoryletOrCard(storyId, 'opportunities', id);
        
        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Database deletion failed' }, { status: 500 });
        }

    } catch (e) {
        console.error("Error in DELETE /api/admin/opportunities:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}