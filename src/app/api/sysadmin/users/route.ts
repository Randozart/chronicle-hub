import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    const query: any = {};
    if (search) {
        query.$or = [
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } }
        ];
    }

    const users = await db.collection('users')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(50) // Cap for performance
        .project({ password: 0, verificationToken: 0, resetToken: 0 })
        .toArray();

    return NextResponse.json(users);
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId, role } = await request.json();
    
    if ((session.user as any).id === userId) {}
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    
    let dbRoles: string[] = [];
    if (role === 'illuminator') dbRoles = ['premium', 'writer'];
    else if (role === 'archivist') dbRoles = ['archivist', 'writer'];
    else if (role === 'admin') dbRoles = ['admin', 'premium', 'writer'];
    else if (role === 'owner') dbRoles = ['owner', 'admin', 'premium', 'writer'];
    else dbRoles = ['writer']; // Default Scribe

    await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { roles: dbRoles } }
    );

    return NextResponse.json({ success: true });
}