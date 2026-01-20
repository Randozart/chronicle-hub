import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    const worlds = await db.collection('worlds')
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .project({ 
            worldId: 1, title: 1, ownerId: 1, published: 1, 
            createdAt: 1, contentConfig: 1 
        })
        .toArray();

    const enriched = await Promise.all(worlds.map(async (w) => {
        const owner = await db.collection('users').findOne({ _id: new ObjectId(w.ownerId) }, { projection: { username: 1 }});
        return { ...w, ownerName: owner?.username || "Unknown" };
    }));

    return NextResponse.json(enriched);
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { worldId, action } = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    if (action === 'unpublish') {
        await db.collection('worlds').updateOne({ worldId }, { $set: { published: false } });
    }

    return NextResponse.json({ success: true });
}