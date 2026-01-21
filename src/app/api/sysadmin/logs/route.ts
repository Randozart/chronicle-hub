import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    const logs = await db.collection('system_logs')
        .find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

    return NextResponse.json(logs);
}