import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    if (!query || query.length < 3) return NextResponse.json([]);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    
    const regex = { $regex: query, $options: 'i' };

    const storylets = await db.collection('storylets').find({
        $or: [{ name: regex }, { text: regex }]
    }).limit(20).project({ id: 1, name: 1, worldId: 1 }).toArray();

    const opportunities = await db.collection('opportunities').find({
        $or: [{ name: regex }, { text: regex }]
    }).limit(20).project({ id: 1, name: 1, worldId: 1 }).toArray();

    return NextResponse.json({ results: [...storylets, ...opportunities] });
}