import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import { updateStoryletOrCard, deleteStoryletOrCard } from '@/engine/worldService'; // <-- IMPORT SERVICE FUNCTIONS
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// --- GET Request (No changes needed, it's for reading) ---
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');
    
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!await verifyWorldAccess(storyId, 'writer')) {
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

// --- POST Request (UPDATED) ---
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, data } = body;
        console.log(`[API: POST /admin/opportunities] Saving opportunity '${data.id}' for story '${storyId}'.`);

        // 1. Security & Validation
        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }    
        if (!storyId || !data || !data.id) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // 2. Data Sanitization (Auto-generate option IDs if missing)
        if (data.options && Array.isArray(data.options)) {
            data.options.forEach((opt: any, index: number) => {
                if (!opt.id || opt.id.trim() === '') {
                    opt.id = `${data.id}_opt${index}`;
                }
            });
        }

        // 3. Call Service Layer to Update DB and Invalidate Cache
        const success = await updateStoryletOrCard(storyId, 'opportunities', data.id, data);
        
        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

    } catch (e) {
        console.error("Error in POST /api/admin/opportunities:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// --- DELETE Request (UPDATED) ---
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get('storyId');
        const id = searchParams.get('id');
        console.log(`[API: DELETE /admin/opportunities] Deleting opportunity '${id}' from story '${storyId}'.`);

        // 1. Security & Validation
        if (!storyId || !id) {
            return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
        }
        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }    
        
        // 2. Call Service Layer to Delete from DB and Invalidate Cache
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