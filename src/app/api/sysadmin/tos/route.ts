import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content } = await request.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    
    await db.collection('system_config').replaceOne(
        { _id: "terms_of_service" as any },
        {
            _id: "terms_of_service",
            content,
            updatedAt: new Date(),
            modifiedBy: session.user.email
        },
        { upsert: true }
    );

    return NextResponse.json({ success: true });
}