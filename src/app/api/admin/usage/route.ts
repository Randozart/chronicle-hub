import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = String((session.user as any).id);

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        const userEmail = session.user.email;

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        
        const isSysAdmin = (ADMIN_EMAIL && userEmail === ADMIN_EMAIL) || 
                                user.roles?.includes('admin');

        const isPremium = (user.roles || []).includes('admin') || (user.roles || []).includes('premium') || isSysAdmin;
        const usage = user.storageUsage || 0;
        const limit = user.storageLimit || (isPremium ? 1024 * 1024 * 1024 : 20 * 1024 * 1024);

        return NextResponse.json({
            usage,
            limit,
            isPremium
        });

    } catch (error) {
        console.error('Usage fetch error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}