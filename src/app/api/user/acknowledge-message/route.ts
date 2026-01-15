import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const FREE_LIMIT_BYTES = 20 * 1024 * 1024;

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isPremium = (user.roles || []).includes('admin') || (user.roles || []).includes('premium');
        
        return NextResponse.json({
            usage: user.storageUsage || 0,
            limit: isPremium ? 1024 * 1024 * 1024 : FREE_LIMIT_BYTES,
            isPremium
        });

    } catch (error) {
        console.error('Usage fetch error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}