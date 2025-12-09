// src/app/api/character/acknowledge-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { characterId, messageId } = await request.json();
    if (!characterId || !messageId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    // Use $addToSet to prevent duplicates
    await db.collection('characters').updateOne(
        { characterId, userId: (session.user as any).id },
        { $addToSet: { acknowledgedMessages: messageId } } as any
    );

    return NextResponse.json({ success: true });
}