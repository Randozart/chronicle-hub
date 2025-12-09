// src/app/api/user/acknowledge-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { messageId } = await request.json();
    
    if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { acknowledgedPlatformMessages: messageId } } as any
    );

    return NextResponse.json({ success: true });
}