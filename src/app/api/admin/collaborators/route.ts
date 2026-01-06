import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// GET: List collaborators with emails
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    // Allow writers to see who else is collaborating
    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Fetch the world document
    const world = await db.collection('worlds').findOne({ worldId: storyId }, { projection: { collaborators: 1 } });
    
    if (!world || !world.collaborators || world.collaborators.length === 0) {
        return NextResponse.json([]);
    }

    // 2. Fetch User Emails
    // We need to map the string IDs back to ObjectIds for the lookup
    const userIds = world.collaborators.map((c: any) => new ObjectId(c.userId));
    
    const users = await db.collection('users').find(
        { _id: { $in: userIds } },
        { projection: { email: 1, name: 1 } } // Only fetch safe fields
    ).toArray();

    // 3. Merge Data
    const enrichedList = world.collaborators.map((c: any) => {
        const user = users.find(u => u._id.toString() === c.userId);
        return {
            userId: c.userId,
            role: c.role,
            email: user?.email || "Unknown User",
            name: user?.name
        };
    });
    
    return NextResponse.json(enrichedList);
}

// POST: Add collaborator
export async function POST(request: NextRequest) {
    const { storyId, email, role } = await request.json();
    
    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Find User by Email
    // Case-insensitive search is safer for invites
    const user = await db.collection('users').findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (!user) return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 });

    // 2. Add to World
    // Use $addToSet to prevent duplicates
    await db.collection('worlds').updateOne(
        { worldId: storyId },
        { 
            $addToSet: { 
                collaborators: { userId: user._id.toString(), role } 
            } 
        }
    );

    // Return the enriched object so the frontend can display it immediately
    return NextResponse.json({ 
        success: true, 
        collaborator: { 
            userId: user._id.toString(), 
            role, 
            email: user.email,
            name: user.name 
        } 
    });
}

// DELETE: Remove collaborator
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const userId = searchParams.get('userId');

    if (!storyId || !userId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection('worlds').updateOne(
        { worldId: storyId },
        { 
            $pull: { 
                collaborators: { userId: userId } as any 
            } 
        }
    );

    return NextResponse.json({ success: true });
}