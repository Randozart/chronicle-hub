import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    if (!await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const world = await db.collection('worlds').findOne({ worldId: storyId }, { projection: { collaborators: 1 } });
    
    if (!world || !world.collaborators || world.collaborators.length === 0) {
        return NextResponse.json([]);
    }
    const userIds = world.collaborators.map((c: any) => new ObjectId(c.userId));
    const users = await db.collection('users').find(
        { _id: { $in: userIds } },
        { projection: { email: 1, username: 1, image: 1 } }
    ).toArray();
    const enrichedList = world.collaborators.map((c: any) => {
        const user = users.find(u => u._id.toString() === c.userId);
        return {
            userId: c.userId,
            role: c.role,
            email: user?.email || "Unknown User",
            username: user?.username || "Drifter",
            image: user?.image || null
        };
    });
    
    return NextResponse.json(enrichedList);
}
export async function POST(request: NextRequest) {
    const { storyId, email, role } = await request.json();
    console.log(`[API: POST /admin/collaborators] User adding collaborator '${email}' as '${role}' to story '${storyId}'.`);

    if (!await verifyWorldAccess(storyId, 'owner')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const user = await db.collection('users').findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (!user) return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 });
    await db.collection('worlds').updateOne(
        { worldId: storyId },
        { 
            $addToSet: { 
                collaborators: { userId: user._id.toString(), role } 
            } 
        }
    );
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
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const userId = searchParams.get('userId');
    console.log(`[API: DELETE /admin/collaborators] User removing collaborator '${userId}' from story '${storyId}'.`);

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