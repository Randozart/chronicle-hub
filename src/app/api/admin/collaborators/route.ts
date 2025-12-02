import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';
import { getWorldConfig } from '@/engine/worldService';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// GET: List collaborators
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    // FIX 1: Change 'owner' to 'writer' so collaborators can load this list without 403
    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const world = await db.collection('worlds').findOne({ worldId: storyId }, { projection: { collaborators: 1 } });
    
    return NextResponse.json(world?.collaborators || []);
}

// POST: Add collaborator
export async function POST(request: NextRequest) {
    const { storyId, email, role } = await request.json();
    
    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Find User by Email
    const user = await db.collection('users').findOne({ email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Add to World
    await db.collection('worlds').updateOne(
        { worldId: storyId },
        { 
            $addToSet: { 
                collaborators: { userId: user._id.toString(), role } 
            } 
        }
    );

    return NextResponse.json({ success: true, user: { email: user.email, id: user._id } });
}

// DELETE: Remove collaborator
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const userId = searchParams.get('userId');

    // 1. Validate Params (Fixes 'string | null' error)
    if (!storyId || !userId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 2. Fix $pull type error by using 'any' or specific type
    // The official MongoDB driver types for $pull on arrays can be finicky.
    await db.collection('worlds').updateOne(
        { worldId: storyId },
        { 
            $pull: { 
                collaborators: { userId: userId } as any // Force cast to satisfy TS
            } 
        }
    );

    return NextResponse.json({ success: true });
}